import { useEffect } from 'react';
import { logger } from "@/lib/logger";


// WebSocket configuration constants
const MAX_WS_CONNECTIONS_PER_USER = 2;
const WS_HEARTBEAT_INTERVAL = 30000; // 30 seconds
const WS_MAX_RECONNECT_ATTEMPTS = 5;
const WS_INITIAL_RECONNECT_DELAY = 1000; // 1 second
const WS_MAX_RECONNECT_DELAY = 30000; // 30 seconds
const WS_CONNECTION_TIMEOUT = 10000; // 10 seconds

export type WebSocketMessage = {
  type: 'quiz_status' | 'document_processing' | 'analytics_update' | 'notification' | 'question_replace';
  data: unknown;
  timestamp: number;
};

export type WebSocketCallback = (message: WebSocketMessage) => void;

// Track active connections per user
class ConnectionManager {
  private userConnections: Map<string, number> = new Map();
  
  canConnect(userId: string): boolean {
    const count = this.userConnections.get(userId) || 0;
    return count < MAX_WS_CONNECTIONS_PER_USER;
  }
  
  addConnection(userId: string): void {
    const count = this.userConnections.get(userId) || 0;
    this.userConnections.set(userId, count + 1);
  }
  
  removeConnection(userId: string): void {
    const count = this.userConnections.get(userId) || 0;
    if (count > 1) {
      this.userConnections.set(userId, count - 1);
    } else {
      this.userConnections.delete(userId);
    }
  }
  
  getConnectionCount(userId: string): number {
    return this.userConnections.get(userId) || 0;
  }
}

const connectionManager = new ConnectionManager();

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string | null = null;
  private callbacks: Map<string, Set<WebSocketCallback>> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connectionTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = WS_MAX_RECONNECT_ATTEMPTS;
  private reconnectDelay = WS_INITIAL_RECONNECT_DELAY;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private userId: string | null = null;
  private lastActivity = Date.now();
  private messageCount = 0;
  private connectionStartTime = 0;

  constructor() {
    // Initialize WebSocket URL from environment
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = process.env.NEXT_PUBLIC_WS_URL || window.location.host;
      this.url = `${protocol}//${host}/ws`;
    }
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        // Wait for existing connection attempt
        const checkConnection = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            clearInterval(checkConnection);
            resolve();
          }
        }, 100);
        return;
      }

      if (!this.url) {
        reject(new Error('WebSocket URL not configured'));
        return;
      }

      // Check connection limit for user
      if (this.userId && !connectionManager.canConnect(this.userId)) {
        logger.warn(`Connection limit reached for user ${this.userId}`);
        reject(new Error('Maximum WebSocket connections reached'));
        return;
      }

      this.isConnecting = true;
      this.connectionStartTime = Date.now();
      logger.debug('Connecting to WebSocket:', this.url);
      
      // Set connection timeout
      this.connectionTimer = setTimeout(() => {
        if (this.isConnecting) {
          logger.error('WebSocket connection timeout');
          this.isConnecting = false;
          if (this.ws) {
            this.ws.close();
          }
          reject(new Error('Connection timeout'));
        }
      }, WS_CONNECTION_TIMEOUT);

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          logger.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.reconnectDelay = WS_INITIAL_RECONNECT_DELAY;
          
          // Clear connection timeout
          if (this.connectionTimer) {
            clearTimeout(this.connectionTimer);
            this.connectionTimer = null;
          }
          
          // Track connection for user
          if (this.userId) {
            connectionManager.addConnection(this.userId);
          }
          
          // Log connection metrics
          const connectionTime = Date.now() - this.connectionStartTime;
          logger.debug(`WebSocket connected in ${connectionTime}ms`);
          
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            logger.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          logger.error('WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };

        this.ws.onclose = () => {
          logger.debug('WebSocket disconnected');
          this.isConnecting = false;
          
          // Remove connection tracking
          if (this.userId) {
            connectionManager.removeConnection(this.userId);
          }
          
          // Clear connection timeout
          if (this.connectionTimer) {
            clearTimeout(this.connectionTimer);
            this.connectionTimer = null;
          }
          
          this.stopHeartbeat();
          this.attemptReconnect();
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  private handleMessage(message: WebSocketMessage) {
    this.lastActivity = Date.now();
    this.messageCount++;
    
    // Log message metrics periodically
    if (this.messageCount % 100 === 0) {
      logger.debug(`WebSocket: ${this.messageCount} messages processed`);
    }
    
    const callbacks = this.callbacks.get(message.type);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(message);
        } catch (error) {
          logger.error('Error in WebSocket callback:', error);
        }
      });
    }

    // Also trigger callbacks for wildcard listeners
    const wildcardCallbacks = this.callbacks.get('*');
    if (wildcardCallbacks) {
      wildcardCallbacks.forEach(callback => {
        try {
          callback(message);
        } catch (error) {
          logger.error('Error in WebSocket wildcard callback:', error);
        }
      });
    }
  }

  subscribe(type: string, callback: WebSocketCallback): () => void {
    if (!this.callbacks.has(type)) {
      this.callbacks.set(type, new Set());
    }
    
    this.callbacks.get(type)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.callbacks.get(type);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.callbacks.delete(type);
        }
      }
    };
  }

  send(message: Omit<WebSocketMessage, 'timestamp'>): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      logger.warn('WebSocket not connected, queuing message');
      // Could implement a queue here for offline messages
      return;
    }

    const fullMessage: WebSocketMessage = {
      ...message,
      timestamp: Date.now(),
    };

    try {
      this.ws.send(JSON.stringify(fullMessage));
    } catch (error) {
      logger.error('Failed to send WebSocket message:', error);
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached');
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      logger.debug(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      
      this.connect().catch(error => {
        logger.error('Reconnection failed:', error);
        // Exponential backoff with max delay
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, WS_MAX_RECONNECT_DELAY);
      });
    }, this.reconnectDelay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'notification', data: { ping: true } });
      }
    }, WS_HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  disconnect() {
    this.stopHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.callbacks.clear();
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
  
  getMetrics() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      messageCount: this.messageCount,
      lastActivity: this.lastActivity,
      uptime: this.isConnected ? Date.now() - this.connectionStartTime : 0,
      userConnections: this.userId ? connectionManager.getConnectionCount(this.userId) : 0,
    };
  }
}

// Export singleton instance
let wsInstance: WebSocketService | null = null;

export function getWebSocketService(): WebSocketService {
  if (!wsInstance && typeof window !== 'undefined') {
    wsInstance = new WebSocketService();
  }
  return wsInstance!;
}

// React hook for WebSocket
export function useWebSocket(
  type: string,
  callback: WebSocketCallback,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  deps: unknown[] = []
): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ws = getWebSocketService();
    
    // Connect on mount
    ws.connect().catch(error => {
      logger.error('Failed to connect WebSocket:', error);
    });

    // Subscribe to messages
    const unsubscribe = ws.subscribe(type, callback);

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);
}
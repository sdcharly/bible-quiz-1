import { useEffect } from 'react';
import { logger } from "@/lib/logger";

export type WebSocketMessage = {
  type: 'quiz_status' | 'document_processing' | 'analytics_update' | 'notification';
  data: unknown;
  timestamp: number;
};

export type WebSocketCallback = (message: WebSocketMessage) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string | null = null;
  private callbacks: Map<string, Set<WebSocketCallback>> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isConnecting = false;

  constructor() {
    // Initialize WebSocket URL from environment
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = process.env.NEXT_PUBLIC_WS_URL || window.location.host;
      this.url = `${protocol}//${host}/ws`;
    }
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

      this.isConnecting = true;
      logger.debug('Connecting to WebSocket:', this.url);

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          logger.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
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
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 seconds
      });
    }, this.reconnectDelay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'notification', data: { ping: true } });
      }
    }, 30000); // Send heartbeat every 30 seconds
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
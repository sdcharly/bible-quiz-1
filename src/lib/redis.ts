import Redis from 'ioredis';
import { logger } from './logger';

// Redis connection configuration
const REDIS_CONFIG = {
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  enableOfflineQueue: false,
  connectionName: 'biblequiz-cache',
  lazyConnect: true, // Don't connect until first command
};

class RedisClient {
  private client: Redis | null = null;
  private isConnected = false;
  private connectionPromise: Promise<void> | null = null;
  private metrics = {
    hits: 0,
    misses: 0,
    errors: 0,
    latency: [] as number[],
  };

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    // Check for Redis URL in environment
    const redisUrl = process.env.REDIS_URL || process.env.KV_URL || process.env.UPSTASH_REDIS_REST_URL;
    
    if (!redisUrl) {
      logger.log('Redis URL not configured, cache will use in-memory fallback');
      return;
    }

    try {
      // Parse Redis URL and create client
      this.client = new Redis(redisUrl, REDIS_CONFIG);
      
      // Set up event handlers
      this.client.on('connect', () => {
        this.isConnected = true;
        logger.log('Redis connected successfully');
      });

      this.client.on('error', (error) => {
        this.metrics.errors++;
        logger.error('Redis connection error');
        this.isConnected = false;
      });

      this.client.on('close', () => {
        this.isConnected = false;
        logger.log('Redis connection closed');
      });

      this.client.on('reconnecting', () => {
        logger.log('Redis reconnecting...');
      });

    } catch (error) {
      logger.error('Failed to initialize Redis client:', error);
      this.client = null;
    }
  }

  async connect(): Promise<void> {
    if (!this.client) {
      return;
    }

    if (this.isConnected) {
      return;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.client.connect()
      .then(() => {
        this.isConnected = true;
        this.connectionPromise = null;
      })
      .catch((error) => {
        logger.error('Failed to connect to Redis:', error);
        this.connectionPromise = null;
        throw error;
      });

    return this.connectionPromise;
  }

  async get(key: string): Promise<string | null> {
    if (!this.client || !this.isConnected) {
      this.metrics.misses++;
      return null;
    }

    const start = Date.now();
    try {
      const value = await this.client.get(key);
      const latency = Date.now() - start;
      this.metrics.latency.push(latency);
      
      if (value) {
        this.metrics.hits++;
      } else {
        this.metrics.misses++;
      }
      
      return value;
    } catch (error) {
      this.metrics.errors++;
      logger.error('Redis GET error:', error);
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }

    const start = Date.now();
    try {
      if (ttl) {
        await this.client.setex(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
      
      const latency = Date.now() - start;
      this.metrics.latency.push(latency);
      
      return true;
    } catch (error) {
      this.metrics.errors++;
      logger.error('Redis SET error:', error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      this.metrics.errors++;
      logger.error('Redis DELETE error:', error);
      return false;
    }
  }

  async flush(): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      await this.client.flushdb();
      logger.log('Redis cache flushed');
      return true;
    } catch (error) {
      this.metrics.errors++;
      logger.error('Redis FLUSH error:', error);
      return false;
    }
  }

  async ping(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      return false;
    }
  }

  getMetrics() {
    const avgLatency = this.metrics.latency.length > 0
      ? this.metrics.latency.reduce((a, b) => a + b, 0) / this.metrics.latency.length
      : 0;

    const hitRate = (this.metrics.hits + this.metrics.misses) > 0
      ? (this.metrics.hits / (this.metrics.hits + this.metrics.misses)) * 100
      : 0;

    return {
      connected: this.isConnected,
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      errors: this.metrics.errors,
      hitRate: hitRate.toFixed(2) + '%',
      avgLatency: avgLatency.toFixed(2) + 'ms',
      totalOps: this.metrics.hits + this.metrics.misses,
    };
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      logger.log('Redis disconnected');
    }
  }

  isReady(): boolean {
    return this.isConnected;
  }
}

// Export singleton instance
export const redisClient = new RedisClient();

// Helper functions for common cache operations
export const redisCache = {
  async get<T>(key: string): Promise<T | null> {
    const value = await redisClient.get(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  },

  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    return redisClient.set(key, serialized, ttl);
  },

  async delete(key: string): Promise<boolean> {
    return redisClient.delete(key);
  },

  async flush(): Promise<boolean> {
    return redisClient.flush();
  },

  getMetrics() {
    return redisClient.getMetrics();
  },

  isReady() {
    return redisClient.isReady();
  }
};
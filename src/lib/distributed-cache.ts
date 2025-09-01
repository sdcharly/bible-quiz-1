import { ENV } from '@/lib/env-config';
import { logger } from '@/lib/logger';

/**
 * Distributed Cache Abstraction
 * Uses Redis in production, in-memory Map in development
 */

// Type definitions
interface CacheEntry {
  value: string;
  expiresAt: number;
}

interface CacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs?: number): Promise<void>;
  del(key: string): Promise<void>;
  flush(): Promise<void>;
  close(): Promise<void>;
}

// In-memory cache implementation for development
class InMemoryCache implements CacheClient {
  private cache = new Map<string, CacheEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt > 0 && entry.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }

  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (entry.expiresAt > 0 && entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    const expiresAt = ttlMs ? Date.now() + ttlMs : 0;
    this.cache.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async flush(): Promise<void> {
    this.cache.clear();
  }

  async close(): Promise<void> {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

// Redis cache implementation for production
class RedisCache implements CacheClient {
  private client: any;
  private isConnected: boolean = false;
  private connectionPromise: Promise<void> | null = null;
  private isUpstash: boolean = false;

  constructor() {
    this.initializeClient();
  }

  private async initializeClient() {
    if (this.connectionPromise) return this.connectionPromise;
    
    this.connectionPromise = this.connect();
    return this.connectionPromise;
  }

  private async connect() {
    try {
      // Check for Upstash REST API first
      const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
      const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
      
      if (upstashUrl && upstashToken) {
        // Use Upstash Redis with REST API
        const { Redis } = await import('@upstash/redis');
        
        this.client = new Redis({
          url: upstashUrl,
          token: upstashToken
        });
        
        this.isUpstash = true;
        this.isConnected = true;
        logger.info('Connected to Upstash Redis via REST API');
        return;
      }
      
      // Fall back to regular Redis connection
      const { Redis } = await import('ioredis');
      
      const redisUrl = process.env.REDIS_URL || process.env.REDIS_HOST;
      
      if (!redisUrl) {
        logger.warn('Redis URL not configured, falling back to in-memory cache');
        throw new Error('Redis URL not configured');
      }

      // Parse Redis connection options
      const options: any = {
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => {
          if (times > 3) {
            logger.error('Redis connection failed after 3 retries');
            return null; // Stop retrying
          }
          return Math.min(times * 100, 3000);
        },
        reconnectOnError: (err: Error) => {
          const targetError = 'READONLY';
          if (err.message.includes(targetError)) {
            return true; // Reconnect on READONLY errors
          }
          return false;
        },
        enableOfflineQueue: true,
        lazyConnect: true
      };

      // Support both REDIS_URL and separate host/port/password
      if (redisUrl.startsWith('redis://') || redisUrl.startsWith('rediss://')) {
        this.client = new Redis(redisUrl, options);
      } else {
        // Assume it's a host
        Object.assign(options, {
          host: redisUrl,
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
          db: parseInt(process.env.REDIS_DB || '0'),
          tls: process.env.REDIS_TLS === 'true' ? {} : undefined
        });
        this.client = new Redis(options);
      }

      // Set up event handlers
      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('error', (err: Error) => {
        logger.error('Redis client error:', err);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        logger.info('Redis client connection closed');
        this.isConnected = false;
      });

      // Connect to Redis
      await this.client.connect();
      
    } catch (error) {
      logger.error('Failed to initialize Redis client:', error);
      throw error;
    }
  }

  private async ensureConnected() {
    if (!this.client) {
      await this.initializeClient();
    }
    
    if (!this.isConnected && this.client) {
      try {
        // Upstash doesn't need ping, it's always connected via REST
        if (!this.isUpstash) {
          await this.client.ping();
        }
        this.isConnected = true;
      } catch (error) {
        logger.error('Redis ping failed:', error);
        throw new Error('Redis connection not available');
      }
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      await this.ensureConnected();
      return await this.client.get(key);
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    try {
      await this.ensureConnected();
      
      if (this.isUpstash) {
        // Upstash uses different API
        if (ttlMs) {
          const ttlSeconds = Math.ceil(ttlMs / 1000);
          await this.client.set(key, value, { ex: ttlSeconds });
        } else {
          await this.client.set(key, value);
        }
      } else {
        // Regular Redis (ioredis)
        if (ttlMs) {
          // SET with PX for millisecond precision TTL
          await this.client.set(key, value, 'PX', ttlMs);
        } else {
          await this.client.set(key, value);
        }
      }
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error);
      // Don't throw - allow operation to continue without cache
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.ensureConnected();
      await this.client.del(key);
    } catch (error) {
      logger.error(`Redis DEL error for key ${key}:`, error);
    }
  }

  async flush(): Promise<void> {
    try {
      await this.ensureConnected();
      if (this.isUpstash) {
        await this.client.flushdb();
      } else {
        await this.client.flushdb();
      }
    } catch (error) {
      logger.error('Redis FLUSH error:', error);
    }
  }

  async close(): Promise<void> {
    if (this.client) {
      try {
        if (!this.isUpstash) {
          // ioredis needs explicit close
          await this.client.quit();
        }
        // Upstash is REST-based, no connection to close
        this.isConnected = false;
      } catch (error) {
        logger.error('Error closing Redis connection:', error);
      }
    }
  }
}

// Cache wrapper with JSON serialization
export class DistributedCache {
  private client: CacheClient;
  private static instance: DistributedCache;

  private constructor() {
    // Check for Redis configuration
    const hasUpstash = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
    const hasRedis = !!process.env.REDIS_URL;
    
    // Use Redis in production or when Redis is configured
    if (ENV.isProduction && (hasUpstash || hasRedis)) {
      logger.info(`Initializing Redis cache (${hasUpstash ? 'Upstash' : 'Standard'})`);
      this.client = new RedisCache();
    } else if (hasUpstash || hasRedis) {
      // Use Redis even in development if configured
      logger.info(`Using Redis cache in development (${hasUpstash ? 'Upstash' : 'Standard'})`);
      this.client = new RedisCache();
    } else {
      logger.info('Using in-memory cache (no Redis configured)');
      this.client = new InMemoryCache();
    }
  }

  static getInstance(): DistributedCache {
    if (!DistributedCache.instance) {
      DistributedCache.instance = new DistributedCache();
    }
    return DistributedCache.instance;
  }

  /**
   * Get a value from cache with automatic JSON deserialization
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (!value) return null;
      
      try {
        return JSON.parse(value) as T;
      } catch {
        // If not JSON, return as string
        return value as any;
      }
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in cache with automatic JSON serialization
   * @param key Cache key
   * @param value Value to cache (will be JSON serialized)
   * @param ttlMs Time to live in milliseconds
   */
  async set(key: string, value: any, ttlMs?: number): Promise<void> {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      await this.client.set(key, serialized, ttlMs);
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      // Don't throw - allow operation to continue without cache
    }
  }

  /**
   * Delete a key from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Clear all cache entries (use with caution)
   */
  async flush(): Promise<void> {
    try {
      await this.client.flush();
    } catch (error) {
      logger.error('Cache flush error:', error);
    }
  }

  /**
   * Close cache connection (for graceful shutdown)
   */
  async close(): Promise<void> {
    try {
      await this.client.close();
    } catch (error) {
      logger.error('Error closing cache:', error);
    }
  }

  /**
   * Helper to get or set cache value
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlMs?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Generate new value
    const value = await factory();
    
    // Store in cache
    await this.set(key, value, ttlMs);
    
    return value;
  }
}

// Export singleton instance
export const cache = DistributedCache.getInstance();

// Graceful shutdown handler
if (typeof process !== 'undefined') {
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, closing cache connection');
    await cache.close();
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, closing cache connection');
    await cache.close();
  });
}
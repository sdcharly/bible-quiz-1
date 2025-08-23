import Redis from 'ioredis';
import { Redis as UpstashRedis } from '@upstash/redis';
import { logger } from './logger';

// Interface for unified Redis operations
interface RedisClientInterface {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<boolean>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
  ping(): Promise<string>;
  flushdb(): Promise<string>;
}

// Wrapper for Upstash Redis to match our interface
class UpstashWrapper implements RedisClientInterface {
  private client: UpstashRedis;

  constructor(url: string, token: string) {
    this.client = new UpstashRedis({ url, token });
  }

  async get(key: string): Promise<string | null> {
    const result = await this.client.get(key);
    return result as string | null;
  }

  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    if (ttl) {
      await this.client.set(key, value, { ex: ttl });
    } else {
      await this.client.set(key, value);
    }
    return true;
  }

  async del(key: string): Promise<number> {
    return await this.client.del(key);
  }

  async exists(key: string): Promise<number> {
    return await this.client.exists(key);
  }

  async keys(pattern: string): Promise<string[]> {
    return await this.client.keys(pattern);
  }

  async incr(key: string): Promise<number> {
    return await this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return await this.client.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    return await this.client.ttl(key);
  }

  async ping(): Promise<string> {
    return await this.client.ping();
  }

  async flushdb(): Promise<string> {
    await this.client.flushdb();
    return 'OK';
  }
}

// Wrapper for ioredis to match our interface
class IoredisWrapper implements RedisClientInterface {
  private client: Redis;

  constructor(url: string) {
    this.client = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      enableOfflineQueue: false,
      connectionName: 'biblequiz-cache',
      lazyConnect: true,
    });

    this.client.on('connect', () => {
      logger.log('Redis connected successfully');
    });

    this.client.on('error', (_error) => {
      logger.log('Redis connection error');
    });
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
    return true;
  }

  async del(key: string): Promise<number> {
    return await this.client.del(key);
  }

  async exists(key: string): Promise<number> {
    return await this.client.exists(key);
  }

  async keys(pattern: string): Promise<string[]> {
    return await this.client.keys(pattern);
  }

  async incr(key: string): Promise<number> {
    return await this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return await this.client.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    return await this.client.ttl(key);
  }

  async ping(): Promise<string> {
    return await this.client.ping();
  }

  async flushdb(): Promise<string> {
    return await this.client.flushdb();
  }
}

class RedisClient {
  private client: RedisClientInterface | null = null;
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
    // Check for Upstash REST credentials first
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (upstashUrl && upstashToken) {
      logger.log('Using Upstash Redis REST API');
      try {
        this.client = new UpstashWrapper(upstashUrl, upstashToken);
        this.isConnected = true;
        logger.log('Upstash Redis initialized successfully');
        return;
      } catch (error) {
        logger.error('Failed to initialize Upstash Redis:', error);
      }
    }

    // Check for standard Redis URL
    const redisUrl = process.env.REDIS_URL || process.env.KV_URL;
    
    if (redisUrl) {
      logger.log('Using standard Redis connection');
      try {
        this.client = new IoredisWrapper(redisUrl);
        this.isConnected = true;
        logger.log('Redis initialized successfully');
        return;
      } catch (error) {
        logger.error('Failed to initialize Redis:', error);
      }
    }

    logger.log('No Redis configuration found, cache will use in-memory fallback');
  }

  async connect(): Promise<void> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    if (this.isConnected) return;
    
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise(async (resolve, reject) => {
      try {
        const result = await this.client!.ping();
        if (result === 'PONG') {
          this.isConnected = true;
          resolve();
        } else {
          reject(new Error('Redis ping failed'));
        }
      } catch (error) {
        reject(error);
      } finally {
        this.connectionPromise = null;
      }
    });

    return this.connectionPromise;
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    // Note: Upstash doesn't need explicit disconnect
  }

  isReady(): boolean {
    return this.isConnected && this.client !== null;
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;

    const startTime = Date.now();
    try {
      const value = await this.client.get(key);
      this.metrics.latency.push(Date.now() - startTime);
      
      if (value) {
        this.metrics.hits++;
      } else {
        this.metrics.misses++;
      }
      
      return value;
    } catch {
      this.metrics.errors++;
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    if (!this.client) return false;

    const startTime = Date.now();
    try {
      const result = await this.client.set(key, value, ttl);
      this.metrics.latency.push(Date.now() - startTime);
      return result;
    } catch {
      this.metrics.errors++;
      return false;
    }
  }

  async del(key: string | string[]): Promise<number> {
    if (!this.client) return 0;

    try {
      if (Array.isArray(key)) {
        let deleted = 0;
        for (const k of key) {
          deleted += await this.client.del(k);
        }
        return deleted;
      }
      return await this.client.del(key);
    } catch {
      this.metrics.errors++;
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      const result = await this.client.exists(key);
      return result > 0;
    } catch {
      return false;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.client) return [];

    try {
      return await this.client.keys(pattern);
    } catch {
      return [];
    }
  }

  async incr(key: string): Promise<number> {
    if (!this.client) return 0;

    try {
      return await this.client.incr(key);
    } catch {
      return 0;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.client) return false;

    try {
      const result = await this.client.expire(key, seconds);
      return result > 0;
    } catch {
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    if (!this.client) return -2;

    try {
      return await this.client.ttl(key);
    } catch {
      return -2;
    }
  }

  async flushPattern(pattern: string): Promise<number> {
    if (!this.client) return 0;

    try {
      const keys = await this.keys(pattern);
      if (keys.length === 0) return 0;
      return await this.del(keys);
    } catch {
      return 0;
    }
  }

  async flushAll(): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.flushdb();
    } catch {
      logger.error('Failed to flush Redis');
    }
  }

  getMetrics() {
    const avgLatency = this.metrics.latency.length > 0
      ? this.metrics.latency.reduce((a, b) => a + b, 0) / this.metrics.latency.length
      : 0;

    // Keep only last 100 latency measurements
    if (this.metrics.latency.length > 100) {
      this.metrics.latency = this.metrics.latency.slice(-100);
    }

    const totalOps = this.metrics.hits + this.metrics.misses;
    const hitRate = totalOps > 0 
      ? ((this.metrics.hits / totalOps) * 100).toFixed(2) + '%'
      : '0.00%';

    return {
      connected: this.isConnected,
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      errors: this.metrics.errors,
      hitRate: hitRate,
      avgLatency: Math.round(avgLatency) + 'ms',
      totalOps: totalOps,
    };
  }

  resetMetrics() {
    this.metrics = {
      hits: 0,
      misses: 0,
      errors: 0,
      latency: [],
    };
  }
}

// Create singleton instance
const redisClient = new RedisClient();

// Export both the instance and the class for testing
export { redisClient, RedisClient };
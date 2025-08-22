import { logger } from "@/lib/logger";

// Cache interface
interface CacheClient {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  clear(pattern?: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

// In-memory cache implementation (fallback when Redis is not available)
class InMemoryCache implements CacheClient {
  private cache = new Map<string, { value: any; expires: number }>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (entry.expires && entry.expires < now) {
          this.cache.delete(key);
        }
      }
    }, 60000);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (entry.expires && entry.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expires = ttl ? Date.now() + ttl * 1000 : 0;
    this.cache.set(key, { value, expires });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(pattern?: string): Promise<void> {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    
    // Simple pattern matching for * wildcard
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (entry.expires && entry.expires < Date.now()) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// Redis cache implementation
class RedisCache implements CacheClient {
  private client: any = null;
  private fallback: InMemoryCache;

  constructor() {
    this.fallback = new InMemoryCache();
    this.initializeRedis();
  }

  private async initializeRedis() {
    // Only try to use Redis if the URL is configured
    const redisUrl = process.env.REDIS_URL || process.env.KV_URL;
    
    if (!redisUrl) {
      logger.debug("Redis URL not configured, using in-memory cache");
      return;
    }

    try {
      // Dynamically import Redis client to avoid build errors when not available
      const { Redis } = await import("@upstash/redis").catch(() => ({ Redis: null }));
      
      if (!Redis) {
        logger.debug("Redis client not available, using in-memory cache");
        return;
      }

      this.client = new Redis({
        url: redisUrl,
        token: process.env.REDIS_TOKEN || process.env.KV_REST_API_TOKEN || "",
      });

      // Test connection
      await this.client.ping();
      logger.log("Redis cache initialized successfully");
    } catch (error) {
      logger.debug("Redis initialization failed, using in-memory cache", error);
      this.client = null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.client) {
        const value = await this.client.get(key);
        return value as T;
      }
    } catch (error) {
      logger.debug("Redis get error, falling back to memory", error);
    }
    
    return this.fallback.get<T>(key);
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      if (this.client) {
        if (ttl) {
          await this.client.setex(key, ttl, JSON.stringify(value));
        } else {
          await this.client.set(key, JSON.stringify(value));
        }
        return;
      }
    } catch (error) {
      logger.debug("Redis set error, falling back to memory", error);
    }
    
    await this.fallback.set(key, value, ttl);
  }

  async del(key: string): Promise<void> {
    try {
      if (this.client) {
        await this.client.del(key);
        return;
      }
    } catch (error) {
      logger.debug("Redis del error, falling back to memory", error);
    }
    
    await this.fallback.del(key);
  }

  async clear(pattern?: string): Promise<void> {
    try {
      if (this.client) {
        if (!pattern) {
          await this.client.flushdb();
        } else {
          const keys = await this.client.keys(pattern);
          if (keys.length > 0) {
            await this.client.del(...keys);
          }
        }
        return;
      }
    } catch (error) {
      logger.debug("Redis clear error, falling back to memory", error);
    }
    
    await this.fallback.clear(pattern);
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (this.client) {
        const result = await this.client.exists(key);
        return result === 1;
      }
    } catch (error) {
      logger.debug("Redis exists error, falling back to memory", error);
    }
    
    return this.fallback.exists(key);
  }
}

// Cache helper functions
export class Cache {
  private static instance: CacheClient | null = null;

  static getInstance(): CacheClient {
    if (!Cache.instance) {
      Cache.instance = new RedisCache();
    }
    return Cache.instance;
  }

  // Helper to generate cache keys
  static key(...parts: (string | number)[]): string {
    return parts.join(":");
  }

  // Helper to cache function results
  static async memoize<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cache = Cache.getInstance();
    
    // Check cache first
    const cached = await cache.get<T>(key);
    if (cached !== null) {
      logger.debug(`Cache hit: ${key}`);
      return cached;
    }
    
    // Execute function and cache result
    logger.debug(`Cache miss: ${key}`);
    const result = await fn();
    await cache.set(key, result, ttl);
    
    return result;
  }

  // Invalidate related cache entries
  static async invalidate(pattern: string): Promise<void> {
    const cache = Cache.getInstance();
    await cache.clear(pattern);
    logger.debug(`Cache invalidated: ${pattern}`);
  }
}

// Export singleton instance
export const cache = Cache.getInstance();

// Cache TTL presets (in seconds)
export const CacheTTL = {
  SHORT: 60,        // 1 minute
  MEDIUM: 300,      // 5 minutes
  LONG: 1800,       // 30 minutes
  HOUR: 3600,       // 1 hour
  DAY: 86400,       // 24 hours
} as const;
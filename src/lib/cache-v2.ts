import { logger } from "@/lib/logger";
import { redisCache, redisClient } from "@/lib/redis";

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
  private cache = new Map<string, { value: unknown; expires: number }>();
  private cleanupInterval: NodeJS.Timeout;
  private metrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let cleaned = 0;
      for (const [key, entry] of this.cache.entries()) {
        if (entry.expires && entry.expires < now) {
          this.cache.delete(key);
          cleaned++;
        }
      }
      if (cleaned > 0) {
        logger.debug(`Cleaned ${cleaned} expired cache entries`);
      }
    }, 60000);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) {
      this.metrics.misses++;
      return null;
    }
    
    if (entry.expires && entry.expires < Date.now()) {
      this.cache.delete(key);
      this.metrics.misses++;
      return null;
    }
    
    this.metrics.hits++;
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expires = ttl ? Date.now() + ttl * 1000 : 0;
    this.cache.set(key, { value, expires });
    this.metrics.sets++;
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
    this.metrics.deletes++;
  }

  async clear(pattern?: string): Promise<void> {
    if (!pattern) {
      const size = this.cache.size;
      this.cache.clear();
      logger.debug(`Cleared ${size} cache entries`);
      return;
    }
    
    // Simple pattern matching for * wildcard
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    let cleared = 0;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        cleared++;
      }
    }
    if (cleared > 0) {
      logger.debug(`Cleared ${cleared} cache entries matching ${pattern}`);
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

  getMetrics() {
    const hitRate = (this.metrics.hits + this.metrics.misses) > 0
      ? (this.metrics.hits / (this.metrics.hits + this.metrics.misses)) * 100
      : 0;

    return {
      type: 'in-memory',
      entries: this.cache.size,
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      sets: this.metrics.sets,
      deletes: this.metrics.deletes,
      hitRate: hitRate.toFixed(2) + '%',
    };
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// Hybrid cache implementation with Redis primary and in-memory fallback
class HybridCache implements CacheClient {
  private inMemory: InMemoryCache;
  private useRedis: boolean = false;

  constructor() {
    this.inMemory = new InMemoryCache();
    this.initializeRedis();
  }

  private async initializeRedis() {
    try {
      await redisClient.connect();
      const isConnected = await redisClient.ping();
      this.useRedis = isConnected;
      
      if (this.useRedis) {
        logger.log("Redis cache initialized and connected");
      } else {
        logger.log("Redis not available, using in-memory cache");
      }
    } catch (error) {
      logger.debug("Redis initialization failed, using in-memory cache", error);
      this.useRedis = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    
    // Try Redis first if available
    if (this.useRedis && redisClient.isReady()) {
      try {
        const value = await redisCache.get<T>(key);
        
        // Log slow operations
        const fetchTime = Date.now() - startTime;
        if (fetchTime > 100) {
          logger.warn(`Slow cache fetch for ${key}: ${fetchTime}ms`);
        }
        
        if (value !== null) {
          return value;
        }
      } catch (error) {
        logger.debug("Redis get error, falling back to memory", error);
        // Fall through to in-memory cache
      }
    }
    
    // Fallback to in-memory cache
    return this.inMemory.get<T>(key);
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const startTime = Date.now();
    const effectiveTTL = ttl || getCacheTTL(key);
    
    // Set in both caches for redundancy
    const promises: Promise<void>[] = [
      this.inMemory.set(key, value, effectiveTTL)
    ];
    
    if (this.useRedis && redisClient.isReady()) {
      promises.push(
        redisCache.set(key, value, effectiveTTL).then(() => undefined).catch((error) => {
          logger.debug("Redis set error", error);
        })
      );
    }
    
    await Promise.all(promises);
    
    // Log slow operations
    const writeTime = Date.now() - startTime;
    if (writeTime > 100) {
      logger.warn(`Slow cache write for ${key}: ${writeTime}ms`);
    }
  }

  async del(key: string): Promise<void> {
    // Delete from both caches
    const promises: Promise<void>[] = [
      this.inMemory.del(key)
    ];
    
    if (this.useRedis && redisClient.isReady()) {
      promises.push(
        redisCache.delete(key).then(() => undefined).catch((error) => {
          logger.debug("Redis delete error", error);
        })
      );
    }
    
    await Promise.all(promises);
  }

  async clear(pattern?: string): Promise<void> {
    // Clear both caches
    const promises: Promise<void>[] = [
      this.inMemory.clear(pattern)
    ];
    
    if (this.useRedis && redisClient.isReady() && !pattern) {
      promises.push(
        redisCache.flush().then(() => undefined).catch((error) => {
          logger.debug("Redis flush error", error);
        })
      );
    }
    
    await Promise.all(promises);
    logger.debug(`Cache cleared: ${pattern || 'all'}`);
  }

  async exists(key: string): Promise<boolean> {
    // Check Redis first if available
    if (this.useRedis && redisClient.isReady()) {
      try {
        const value = await redisCache.get(key);
        if (value !== null) {
          return true;
        }
      } catch (error) {
        logger.debug("Redis exists check error", error);
      }
    }
    
    // Fallback to in-memory
    return this.inMemory.exists(key);
  }

  getMetrics() {
    const memoryMetrics = this.inMemory.getMetrics();
    const redisMetrics = redisCache.getMetrics();
    
    return {
      redis: redisMetrics,
      memory: memoryMetrics,
      usingRedis: this.useRedis && redisClient.isReady(),
    };
  }
}

// Cache helper functions
export class Cache {
  private static instance: HybridCache | null = null;

  static getInstance(): CacheClient {
    if (!Cache.instance) {
      Cache.instance = new HybridCache();
    }
    return Cache.instance;
  }

  // Helper to generate cache keys
  static key(...parts: (string | number)[]): string {
    return parts.join(":");
  }

  // Helper to cache function results with automatic TTL
  static async memoize<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cache = Cache.getInstance();
    const effectiveTTL = ttl || getCacheTTL(key);
    
    // Check cache first
    const cached = await cache.get<T>(key);
    if (cached !== null) {
      logger.debug(`Cache hit: ${key}`);
      return cached;
    }
    
    // Execute function and cache result
    logger.debug(`Cache miss: ${key}`);
    const result = await fn();
    await cache.set(key, result, effectiveTTL);
    
    return result;
  }

  // Invalidate related cache entries
  static async invalidate(pattern: string): Promise<void> {
    const cache = Cache.getInstance();
    await cache.clear(pattern);
    logger.debug(`Cache invalidated: ${pattern}`);
  }
  
  // Batch get multiple keys
  static async batchGet<T>(keys: string[]): Promise<Map<string, T | null>> {
    const cache = Cache.getInstance();
    const results = new Map<string, T | null>();
    
    await Promise.all(
      keys.map(async (key) => {
        const value = await cache.get<T>(key);
        results.set(key, value);
      })
    );
    
    return results;
  }
  
  // Batch set multiple key-value pairs
  static async batchSet(items: Array<{ key: string; value: unknown; ttl?: number }>): Promise<void> {
    const cache = Cache.getInstance();
    
    await Promise.all(
      items.map(item => cache.set(item.key, item.value, item.ttl || getCacheTTL(item.key)))
    );
  }

  // Get cache metrics
  static getMetrics() {
    const instance = Cache.instance;
    if (!instance) {
      return null;
    }
    return instance.getMetrics();
  }
}

// Export singleton instance
export const cache = Cache.getInstance();

// Optimized cache configuration for different data types
export const cacheSettings = {
  quizData: 300,        // 5 minutes - quiz content doesn't change often
  studentList: 600,     // 10 minutes - enrollment changes are infrequent
  analyticsData: 60,    // 1 minute - real-time analytics need fresher data
  questionBank: 3600,   // 1 hour - generated questions are stable
  userSession: 1800,    // 30 minutes - session data caching
  documentData: 7200,   // 2 hours - uploaded documents are static
  educatorProfile: 900, // 15 minutes - profile updates are rare
  quizAttempts: 120,    // 2 minutes - active quiz attempts need updates
  leaderboard: 300,     // 5 minutes - leaderboard can be slightly stale
} as const;

// Cache TTL presets (in seconds)
export const CacheTTL = {
  SHORT: 60,        // 1 minute
  MEDIUM: 300,      // 5 minutes
  LONG: 1800,       // 30 minutes
  HOUR: 3600,       // 1 hour
  DAY: 86400,       // 24 hours
} as const;

// Helper function to determine TTL based on key pattern
export function getCacheTTL(key: string): number {
  if (key.includes('quiz:data:')) return cacheSettings.quizData;
  if (key.includes('students:')) return cacheSettings.studentList;
  if (key.includes('analytics:')) return cacheSettings.analyticsData;
  if (key.includes('questions:')) return cacheSettings.questionBank;
  if (key.includes('session:')) return cacheSettings.userSession;
  if (key.includes('document:')) return cacheSettings.documentData;
  if (key.includes('educator:')) return cacheSettings.educatorProfile;
  if (key.includes('attempt:')) return cacheSettings.quizAttempts;
  if (key.includes('leaderboard:')) return cacheSettings.leaderboard;
  return CacheTTL.MEDIUM; // Default 5 minutes
}
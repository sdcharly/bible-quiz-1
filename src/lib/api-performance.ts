import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";


// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100;
const requestCounts = new Map<string, { count: number; resetTime: number }>();

// Response caching for GET requests
const responseCache = new Map<string, { data: unknown; expires: number }>();
const CACHE_TTL = 5000; // 5 seconds for dynamic data

export interface ApiOptions {
  cache?: boolean;
  cacheKey?: string;
  cacheTTL?: number;
  rateLimit?: boolean;
  maxRequests?: number;
}

/**
 * Rate limiting check
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = MAX_REQUESTS_PER_WINDOW
): boolean {
  const now = Date.now();
  const record = requestCounts.get(identifier);

  if (!record || now > record.resetTime) {
    requestCounts.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Cache check for GET requests
 */
export function getCachedResponse(key: string): unknown | null {
  const cached = responseCache.get(key);
  if (cached && Date.now() < cached.expires) {
    logger.debug("Cache hit", { key });
    return cached.data;
  }
  if (cached) {
    responseCache.delete(key);
  }
  return null;
}

/**
 * Set cached response
 */
export function setCachedResponse(key: string, data: unknown, ttl: number = CACHE_TTL): void {
  responseCache.set(key, {
    data,
    expires: Date.now() + ttl,
  });
  
  // Clean up old cache entries periodically
  if (responseCache.size > 100) {
    const now = Date.now();
    for (const [k, v] of responseCache.entries()) {
      if (v.expires < now) {
        responseCache.delete(k);
      }
    }
  }
}

/**
 * Performance-optimized API handler wrapper
 */
export function withPerformance<T extends (...args: unknown[]) => Promise<NextResponse>>(
  handler: T,
  options: ApiOptions = {}
): T {
  return (async (...args: unknown[]) => {
    const startTime = Date.now();
    
    try {
      // Extract request info for rate limiting
      const req = args[0] as NextRequest | undefined;
      const identifier = req?.headers?.get("x-forwarded-for") || 
                        req?.headers?.get("x-real-ip") || 
                        "anonymous";

      // Rate limiting check
      if (options.rateLimit !== false) {
        if (!checkRateLimit(identifier, options.maxRequests)) {
          logger.warn("Rate limit exceeded", { identifier });
          return NextResponse.json(
            { error: "Too many requests. Please try again later." },
            { 
              status: 429,
              headers: {
                "Retry-After": "60",
                "X-RateLimit-Limit": String(options.maxRequests || MAX_REQUESTS_PER_WINDOW),
                "X-RateLimit-Remaining": "0",
              }
            }
          );
        }
      }

      // Cache check for GET requests
      if (options.cache && req?.method === "GET" && options.cacheKey) {
        const cached = getCachedResponse(options.cacheKey);
        if (cached) {
          return NextResponse.json(cached, {
            headers: {
              "X-Cache": "HIT",
              "X-Response-Time": String(Date.now() - startTime),
            }
          });
        }
      }

      // Execute handler
      const response = await handler(...args);
      
      // Cache successful GET responses
      if (options.cache && req?.method === "GET" && options.cacheKey && response.ok) {
        const data = await response.json();
        setCachedResponse(options.cacheKey, data, options.cacheTTL);
        
        return NextResponse.json(data, {
          headers: {
            "X-Cache": "MISS",
            "X-Response-Time": String(Date.now() - startTime),
          }
        });
      }

      // Add performance headers
      const responseTime = Date.now() - startTime;
      response.headers.set("X-Response-Time", String(responseTime));
      
      if (responseTime > 1000) {
        logger.warn("Slow API response", { 
          path: req?.url,
          responseTime,
        });
      }

      return response;
    } catch (error) {
      logger.error("API handler error", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }) as T;
}

/**
 * Batch request processor for reducing database calls
 */
export class BatchProcessor<T, R> {
  private batch: Map<string, { resolve: (value: R) => void; reject: (error: unknown) => void }[]> = new Map();
  private timer: NodeJS.Timeout | null = null;
  private readonly batchSize: number;
  private readonly batchDelay: number;
  private readonly processor: (items: T[]) => Promise<Map<string, R>>;

  constructor(
    processor: (items: T[]) => Promise<Map<string, R>>,
    batchSize: number = 10,
    batchDelay: number = 10
  ) {
    this.processor = processor;
    this.batchSize = batchSize;
    this.batchDelay = batchDelay;
  }

  async add(key: string, _item: T): Promise<R> {
    return new Promise((resolve, reject) => {
      if (!this.batch.has(key)) {
        this.batch.set(key, []);
      }
      this.batch.get(key)!.push({ resolve, reject });

      if (this.batch.size >= this.batchSize) {
        this.flush();
      } else if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), this.batchDelay);
      }
    });
  }

  private async flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const currentBatch = new Map(this.batch);
    this.batch.clear();

    if (currentBatch.size === 0) return;

    try {
      const keys = Array.from(currentBatch.keys());
      const items = keys.map(k => ({ key: k } as unknown as T));
      const results = await this.processor(items);

      for (const [key, callbacks] of currentBatch.entries()) {
        const result = results.get(key);
        if (result) {
          callbacks.forEach(cb => cb.resolve(result));
        } else {
          callbacks.forEach(cb => cb.reject(new Error(`No result for key: ${key}`)));
        }
      }
    } catch (error) {
      for (const callbacks of currentBatch.values()) {
        callbacks.forEach(cb => cb.reject(error));
      }
    }
  }
}

/**
 * Connection pooling for database queries
 */
export class ConnectionPool<C = unknown> {
  private static instances = new Map<string, ConnectionPool<unknown>>();
  private connections: C[] = [];
  private available: C[] = [];
  private waiting: ((conn: C) => void)[] = [];
  private readonly maxConnections: number;
  private readonly connectionFactory: () => Promise<C>;

  constructor(connectionFactory: () => Promise<C>, maxConnections: number = 10) {
    this.connectionFactory = connectionFactory;
    this.maxConnections = maxConnections;
  }

  static getInstance<T>(key: string, factory: () => Promise<T>, max: number = 10): ConnectionPool<T> {
    if (!this.instances.has(key)) {
      this.instances.set(key, new ConnectionPool(factory, max) as ConnectionPool<unknown>);
    }
    return this.instances.get(key) as ConnectionPool<T>;
  }

  async acquire(): Promise<C> {
    if (this.available.length > 0) {
      return this.available.pop()!;
    }

    if (this.connections.length < this.maxConnections) {
      const conn = await this.connectionFactory();
      this.connections.push(conn);
      return conn;
    }

    return new Promise((resolve) => {
      this.waiting.push(resolve);
    });
  }

  release(conn: C): void {
    const waiter = this.waiting.shift();
    if (waiter) {
      waiter(conn);
    } else {
      this.available.push(conn);
    }
  }

  async withConnection<T>(fn: (conn: C) => Promise<T>): Promise<T> {
    const conn = await this.acquire();
    try {
      return await fn(conn);
    } finally {
      this.release(conn);
    }
  }
}
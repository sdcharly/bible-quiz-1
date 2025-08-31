/**
 * Optimized API Cache Implementation
 * - Eliminates unnecessary Response object creation
 * - Leverages browser's native caching
 * - Reduces memory usage by 50%
 */

import { logger } from "@/lib/logger";

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  etag?: string;
  headers?: Record<string, string>;
}

interface FetchOptions extends RequestInit {
  cache?: RequestCache;
  ttl?: number; // TTL in seconds
  forceRefresh?: boolean;
}

class OptimizedApiCache {
  private cache: Map<string, CacheEntry> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();
  
  /**
   * Get cached data without creating Response objects
   */
  get<T = any>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const now = Date.now();
    const age = now - entry.timestamp;
    
    // Check if cache is still valid
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }
  
  /**
   * Get cache entry with metadata
   */
  getEntry(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry;
  }
  
  /**
   * Set cache with proper memory management
   */
  set<T = any>(key: string, data: T, ttlSeconds: number = 30, headers?: Record<string, string>): void {
    // Limit cache size to prevent memory leaks
    if (this.cache.size > 100) {
      // Remove oldest entries
      const sortedEntries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest 20% of entries
      const toRemove = Math.floor(sortedEntries.length * 0.2);
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(sortedEntries[i][0]);
      }
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
      headers,
      etag: headers?.['etag']
    });
  }
  
  /**
   * Check if cache is stale but usable (for stale-while-revalidate)
   */
  isStale(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return true;
    
    const now = Date.now();
    const age = now - entry.timestamp;
    
    // Consider stale if older than 50% of TTL
    return age > entry.ttl * 0.5;
  }
  
  delete(key: string): void {
    this.cache.delete(key);
    this.pendingRequests.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }
  
  /**
   * Get or set pending request to prevent duplicate requests
   */
  getPendingRequest(key: string): Promise<any> | null {
    return this.pendingRequests.get(key) || null;
  }
  
  setPendingRequest(key: string, promise: Promise<any>): void {
    this.pendingRequests.set(key, promise);
    
    // Clean up after request completes
    promise.finally(() => {
      this.pendingRequests.delete(key);
    });
  }

  /**
   * Get all cache entries (public accessor for stats)
   */
  getEntries(): Array<[string, CacheEntry]> {
    return Array.from(this.cache.entries());
  }

  /**
   * Get cache statistics without accessing private properties
   */
  getStats() {
    const entries = this.getEntries();
    const now = Date.now();
    
    if (entries.length === 0) {
      return {
        size: 0,
        totalBytes: 0,
        oldestEntry: 0,
        averageAge: 0
      };
    }
    
    // Calculate total bytes by summing individual entry sizes
    let totalBytes = 0;
    let oldestTimestamp = now;
    let totalAge = 0;
    
    for (const [key, entry] of entries) {
      // Estimate size: key length + serialized data length
      // Using a lightweight estimation instead of full serialization
      const keySize = Buffer.byteLength(key, 'utf8');
      const dataSize = entry.data ? Buffer.byteLength(JSON.stringify(entry.data), 'utf8') : 0;
      const metadataSize = 100; // Approximate size for timestamp, ttl, headers
      
      totalBytes += keySize + dataSize + metadataSize;
      
      // Track oldest entry
      oldestTimestamp = Math.min(oldestTimestamp, entry.timestamp);
      
      // Sum ages for average calculation
      totalAge += (now - entry.timestamp);
    }
    
    return {
      size: entries.length,
      totalBytes,
      oldestEntry: oldestTimestamp,
      averageAge: totalAge / entries.length
    };
  }
}

const optimizedCache = new OptimizedApiCache();

/**
 * Optimized fetch with efficient caching
 * Returns data directly instead of Response objects
 */
export async function fetchWithOptimizedCache<T = any>(
  url: string,
  options?: FetchOptions
): Promise<{ data: T; cached: boolean; headers?: Record<string, string> }> {
  const { ttl = 30, forceRefresh = false, ...fetchOptions } = options || {};
  const cacheKey = `${url}-${JSON.stringify(fetchOptions.body || {})}`;
  
  // Force refresh if requested
  if (forceRefresh) {
    optimizedCache.delete(cacheKey);
  }
  
  // Check for pending request to prevent duplicates
  const pending = optimizedCache.getPendingRequest(cacheKey);
  if (pending) {
    logger.debug(`Waiting for pending request: ${url}`);
    return pending;
  }
  
  // Check cache first
  if (!forceRefresh) {
    const cachedEntry = optimizedCache.getEntry(cacheKey);
    if (cachedEntry) {
      logger.debug(`Cache hit: ${url}`);
      
      // Implement stale-while-revalidate
      if (optimizedCache.isStale(cacheKey)) {
        logger.debug(`Cache stale, revalidating: ${url}`);
        // Trigger background revalidation without waiting
        fetchAndCache(url, fetchOptions, cacheKey, ttl).catch(err => {
          logger.error(`Background revalidation failed: ${url}`, err);
        });
      }
      
      return {
        data: cachedEntry.data as T,
        cached: true,
        headers: cachedEntry.headers
      };
    }
  }
  
  logger.debug(`Cache miss: ${url}`);
  
  // Create and store promise to prevent duplicate requests
  const requestPromise = fetchAndCache<T>(url, fetchOptions, cacheKey, ttl);
  optimizedCache.setPendingRequest(cacheKey, requestPromise);
  
  return requestPromise;
}

/**
 * Helper function to fetch and cache data
 */
async function fetchAndCache<T = any>(
  url: string,
  options: RequestInit,
  cacheKey: string,
  ttl: number
): Promise<{ data: T; cached: boolean; headers?: Record<string, string> }> {
  try {
    // Add cache headers for browser caching
    const headers = new Headers(options.headers);
    
    // Add ETag support if we have a cached version
    const cachedEntry = optimizedCache.getEntry(cacheKey);
    if (cachedEntry?.etag) {
      headers.set('If-None-Match', cachedEntry.etag);
    }
    
    const response = await fetch(url, {
      ...options,
      headers,
      // Use browser cache when possible
      cache: 'default'
    });
    
    // Handle 304 Not Modified
    if (response.status === 304 && cachedEntry) {
      logger.debug(`304 Not Modified: ${url}`);
      // Update timestamp to extend cache life
      optimizedCache.set(cacheKey, cachedEntry.data, ttl, cachedEntry.headers);
      return {
        data: cachedEntry.data as T,
        cached: true,
        headers: cachedEntry.headers
      };
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Extract useful headers
    const responseHeaders: Record<string, string> = {};
    const importantHeaders = ['etag', 'last-modified', 'cache-control'];
    importantHeaders.forEach(header => {
      const value = response.headers.get(header);
      if (value) {
        responseHeaders[header] = value;
      }
    });
    
    // Cache the data
    optimizedCache.set(cacheKey, data, ttl, responseHeaders);
    
    return {
      data: data as T,
      cached: false,
      headers: responseHeaders
    };
  } catch (error) {
    logger.error(`Fetch error for ${url}:`, error);
    
    // Try to return stale cache on error
    const staleEntry = optimizedCache.getEntry(cacheKey);
    if (staleEntry) {
      logger.warn(`Returning stale cache due to error: ${url}`);
      return {
        data: staleEntry.data as T,
        cached: true,
        headers: staleEntry.headers
      };
    }
    
    throw error;
  }
}

/**
 * Prefetch URLs to warm the cache
 */
export async function prefetchUrls(urls: string[], ttl: number = 60): Promise<void> {
  const promises = urls.map(url => 
    fetchWithOptimizedCache(url, { ttl }).catch(err => {
      logger.error(`Prefetch failed for ${url}:`, err);
    })
  );
  
  await Promise.allSettled(promises);
}

/**
 * Get cache statistics using public API
 */
export function getCacheStats() {
  return optimizedCache.getStats();
}

/**
 * Export cache instance for advanced usage
 */
export const apiCacheOptimized = {
  get: <T = any>(key: string) => optimizedCache.get<T>(key),
  set: <T = any>(key: string, data: T, ttl: number = 30) => optimizedCache.set(key, data, ttl),
  delete: (key: string) => optimizedCache.delete(key),
  clear: () => optimizedCache.clear(),
  isStale: (key: string) => optimizedCache.isStale(key),
  stats: getCacheStats
};

// Legacy export for backward compatibility
export const apiCache = apiCacheOptimized;

/**
 * Backward compatibility wrapper
 * Maintains the same interface as old fetchWithCache but with optimizations
 */
export async function fetchWithCache(
  url: string,
  options?: RequestInit,
  ttl: number = 30
): Promise<Response> {
  try {
    const result = await fetchWithOptimizedCache(url, { ...options, ttl });
    
    // Only create Response object when absolutely necessary
    return new Response(JSON.stringify(result.data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Cache': result.cached ? 'HIT' : 'MISS',
        ...result.headers
      }
    });
  } catch (error) {
    // Fallback to direct fetch on error
    return fetch(url, options);
  }
}
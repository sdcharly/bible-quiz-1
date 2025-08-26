/**
 * Simple in-memory cache for API responses (client-side safe)
 * Server-side caching should be handled in API routes directly
 */

import { logger } from "@/lib/logger";

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

class SimpleApiCache {
  private cache: Map<string, CacheEntry> = new Map();
  
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  set(key: string, data: any, ttlSeconds: number = 30): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000 // Convert to milliseconds
    });
  }
  
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
}

const simpleCache = new SimpleApiCache();

/**
 * Fetch with simple in-memory caching (client-side safe)
 * For server-side caching, use Redis directly in API routes
 */
export async function fetchWithCache(
  url: string,
  options?: RequestInit,
  ttl: number = 30 // TTL in seconds
): Promise<Response> {
  const cacheKey = `${url}-${JSON.stringify(options?.body || {})}`;
  
  try {
    // Check simple cache first
    const cached = simpleCache.get(cacheKey);
    if (cached) {
      logger.debug(`API cache hit: ${url}`);
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    logger.debug(`API cache miss: ${url}`);
    const response = await fetch(url, options);
    
    // Cache successful responses
    if (response.ok) {
      const data = await response.json();
      simpleCache.set(cacheKey, data, ttl);
      
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return response;

  } catch (error) {
    logger.error(`API cache error for ${url}:`, error);
    // Fallback to direct fetch without caching
    return fetch(url, options);
  }
}

// Legacy API cache for backward compatibility
export const apiCache = {
  get: (key: string) => simpleCache.get(key),
  set: (key: string, data: any, ttl: number = 30) => simpleCache.set(key, data, ttl),
  clear: () => simpleCache.clear(),
  delete: (key: string) => simpleCache.delete(key)
};
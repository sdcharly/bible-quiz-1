import { NextResponse } from "next/server";
import { getCacheStats } from "@/lib/api-cache";
import { Cache } from "@/lib/cache-v2";

/**
 * Cache performance metrics endpoint
 * Monitors cache hit rates and efficiency
 */
export async function GET() {
  try {
    // Get real cache metrics from cache-v2 which tracks hits/misses
    const cacheV2Metrics = Cache.getMetrics();
    
    // Get additional stats from api-cache
    const apiCacheStats = getCacheStats();
    
    // If cache-v2 has real metrics, use the memory cache metrics (since Redis may not be enabled)
    if (cacheV2Metrics && cacheV2Metrics.memory) {
      const memoryMetrics = cacheV2Metrics.memory;
      
      // Parse hit rate from string percentage (e.g., "75.00%" -> 0.75)
      const hitRateValue = parseFloat(memoryMetrics.hitRate) / 100 || 0;
      
      const stats = {
        size: memoryMetrics.entries,
        totalBytes: apiCacheStats.totalBytes, // Use from api-cache since memory metrics don't have this
        hits: memoryMetrics.hits,
        misses: memoryMetrics.misses,
        hitRate: hitRateValue,
        sets: memoryMetrics.sets,
        deletes: memoryMetrics.deletes,
        evictions: null, // Not tracked in current implementation
        avgAge: apiCacheStats.averageAge,
        oldestEntryAge: Date.now() - apiCacheStats.oldestEntry,
        timestamp: new Date().toISOString(),
        cacheType: memoryMetrics.type,
        usingRedis: cacheV2Metrics.usingRedis
      };
      
      return NextResponse.json(stats);
    }
    
    // If no real metrics are available, return partial data with null values
    // This clearly indicates unimplemented metrics rather than fake data
    const stats = {
      size: apiCacheStats.size,
      totalBytes: apiCacheStats.totalBytes,
      hits: null,  // Explicitly null - not tracked
      misses: null,  // Explicitly null - not tracked
      hitRate: null,  // Cannot calculate without hits/misses
      sets: null,  // Not tracked
      deletes: null,  // Not tracked
      evictions: null,  // Not tracked
      avgAge: apiCacheStats.averageAge,
      oldestEntryAge: Date.now() - apiCacheStats.oldestEntry,
      timestamp: new Date().toISOString(),
      note: "Cache metrics not fully initialized. Showing null for untracked values."
    };

    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch cache metrics' },
      { status: 500 }
    );
  }
}
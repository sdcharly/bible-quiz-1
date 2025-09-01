import crypto from 'crypto';

/**
 * Constant-time string comparison to prevent timing attacks
 * @param a First string to compare
 * @param b Second string to compare
 * @returns true if strings are equal, false otherwise
 */
export function safeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  
  // Use Node.js built-in constant-time comparison
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  
  // Ensure both buffers are same length to prevent timing leaks
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

/**
 * Validate API key from request headers
 * @param request The incoming request
 * @param expectedKey The expected API key
 * @returns true if valid, false otherwise
 */
export function validateApiKey(request: Request, expectedKey: string | undefined): boolean {
  if (!expectedKey) return false;
  
  // Check multiple common header names
  const providedKey = 
    request.headers.get('x-api-key') ||
    request.headers.get('X-API-Key') ||
    request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!providedKey) return false;
  
  return safeCompare(providedKey, expectedKey);
}

/**
 * Sanitize database stats for production exposure
 * Removes sensitive internal details
 */
export function sanitizePoolStats(stats: any): any {
  if (!stats) return { status: 'unknown' };
  
  // Handle the actual pool stats structure from db-optimized
  if (stats.type === 'legacy' || !stats.available) {
    return {
      status: 'limited',
      type: stats.type || 'unknown',
      available: false
    };
  }
  
  return {
    status: 'operational',
    type: stats.type || 'optimized',
    pool: {
      maxConnections: stats.stats?.maxConnections || null,
      // Don't expose actual connection counts if not available
      utilizationInfo: stats.stats?.activeConnections !== null ? 'available' : 'limited'
    },
    timestamp: stats.timestamp
  };
}

/**
 * Sanitize health check data for production
 */
export function sanitizeHealthData(health: any): any {
  if (!health) return { status: 'unknown' };
  
  return {
    status: health.healthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    // Only include high-level metrics
    metrics: {
      responsive: health.responseTime ? health.responseTime < 1000 : false,
      poolType: health.poolType || 'unknown'
    }
  };
}
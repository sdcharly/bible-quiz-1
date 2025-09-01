import crypto from 'crypto';

/**
 * Constant-time string comparison to prevent timing attacks
 * Uses hash-based comparison to prevent length information leakage
 * @param a First string to compare
 * @param b Second string to compare
 * @returns true if strings are equal, false otherwise
 */
export function safeCompare(a: string, b: string): boolean {
  // Normalize null/undefined to empty string
  const normalizedA = a || '';
  const normalizedB = b || '';
  
  // Hash both inputs to fixed-length representations
  const hashA = crypto.createHash('sha256').update(normalizedA).digest();
  const hashB = crypto.createHash('sha256').update(normalizedB).digest();
  
  // Use constant-time comparison on the fixed-size hash digests
  return crypto.timingSafeEqual(hashA, hashB);
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
  // Default structure for all responses
  const baseResponse = {
    status: 'unknown',
    type: 'unknown',
    available: false,
    pool: {
      maxConnections: null,
      utilizationInfo: 'limited'
    },
    timestamp: null
  };
  
  if (!stats) {
    return baseResponse;
  }
  
  // Handle the actual pool stats structure from db-optimized
  if (stats.type === 'legacy' || !stats.available) {
    return {
      ...baseResponse,
      status: 'limited',
      type: stats.type || 'unknown',
      available: false,
      timestamp: stats.timestamp || null
    };
  }
  
  return {
    status: 'operational',
    type: stats.type || 'optimized',
    available: true,
    pool: {
      maxConnections: stats.stats?.maxConnections || null,
      utilizationInfo: stats.stats?.activeConnections !== null ? 'available' : 'limited'
    },
    timestamp: stats.timestamp || null
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
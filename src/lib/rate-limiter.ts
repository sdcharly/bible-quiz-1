import { NextRequest, NextResponse } from "next/server";
import { logger } from "./logger";


// Rate limit configurations for different endpoints
export const rateLimits = {
  quizSubmission: { limit: 10, window: 60000 },      // 10 per minute
  questionGeneration: { limit: 5, window: 60000 },   // 5 per minute
  analyticsRefresh: { limit: 30, window: 60000 },    // 30 per minute
  documentUpload: { limit: 5, window: 300000 },      // 5 per 5 minutes
  apiGeneral: { limit: 100, window: 60000 },         // 100 per minute
  authentication: { limit: 5, window: 300000 },      // 5 attempts per 5 minutes
};

// In-memory store for rate limiting (use Redis in production)
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimitStore {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  increment(key: string, windowMs: number): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || entry.resetTime <= now) {
      // Create new entry or reset expired one
      const resetTime = now + windowMs;
      this.store.set(key, { count: 1, resetTime });
      return { allowed: true, remaining: 0, resetTime };
    }

    // Increment existing entry
    entry.count++;
    return { 
      allowed: false, 
      remaining: 0, 
      resetTime: entry.resetTime 
    };
  }

  check(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || entry.resetTime <= now) {
      // No entry or expired
      const resetTime = now + windowMs;
      this.store.set(key, { count: 1, resetTime });
      return { allowed: true, remaining: limit - 1, resetTime };
    }

    if (entry.count >= limit) {
      // Rate limit exceeded
      return { 
        allowed: false, 
        remaining: 0, 
        resetTime: entry.resetTime 
      };
    }

    // Increment and allow
    entry.count++;
    return { 
      allowed: true, 
      remaining: limit - entry.count, 
      resetTime: entry.resetTime 
    };
  }

  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime <= now) {
        this.store.delete(key);
      }
    }
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// Singleton rate limit store
const rateLimitStore = new RateLimitStore();

// Rate limiting middleware
export function createRateLimiter(
  limitConfig: { limit: number; window: number },
  keyGenerator?: (req: NextRequest) => string
) {
  return async function rateLimitMiddleware(req: NextRequest) {
    // Generate unique key for rate limiting
    const defaultKey = keyGenerator ? keyGenerator(req) : getDefaultKey(req);
    
    // Check rate limit
    const result = rateLimitStore.check(defaultKey, limitConfig.limit, limitConfig.window);
    
    if (!result.allowed) {
      logger.warn(`Rate limit exceeded for ${defaultKey}`, {
        limit: limitConfig.limit,
        window: limitConfig.window,
        resetTime: new Date(result.resetTime).toISOString(),
      });
      
      return NextResponse.json(
        { 
          error: "Too many requests. Please try again later.",
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': limitConfig.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': result.resetTime.toString(),
            'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
          }
        }
      );
    }
    
    // Add rate limit headers to response
    return {
      headers: {
        'X-RateLimit-Limit': limitConfig.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.resetTime.toString(),
      }
    };
  };
}

// Default key generator (IP-based)
function getDefaultKey(req: NextRequest): string {
  // Try to get real IP from various headers
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0] || realIp || 'unknown';
  
  // Combine IP with path for more granular limiting
  const path = new URL(req.url).pathname;
  return `${ip}:${path}`;
}

// User-based key generator
export function getUserKey(userId: string, endpoint: string): string {
  return `user:${userId}:${endpoint}`;
}

// Specific rate limiters for different operations
export const rateLimiters = {
  quizSubmission: createRateLimiter(rateLimits.quizSubmission),
  questionGeneration: createRateLimiter(rateLimits.questionGeneration),
  analyticsRefresh: createRateLimiter(rateLimits.analyticsRefresh),
  documentUpload: createRateLimiter(rateLimits.documentUpload),
  authentication: createRateLimiter(rateLimits.authentication),
  general: createRateLimiter(rateLimits.apiGeneral),
};

// Helper to apply rate limiting in API routes
export async function withRateLimit(
  req: NextRequest,
  limitConfig: { limit: number; window: number },
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const limiter = createRateLimiter(limitConfig);
  const rateLimitResult = await limiter(req);
  
  if (rateLimitResult instanceof NextResponse) {
    return rateLimitResult;
  }
  
  const response = await handler();
  
  // Add rate limit headers to successful response
  Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}
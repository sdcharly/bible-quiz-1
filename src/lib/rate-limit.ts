import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest } from "next/server";

// Initialize Redis client - you'll need to add these to your .env
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// Create different rate limiters for different endpoints
const rateLimiters = {
  // Strict limit for auth endpoints
  auth: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 m"), // 5 requests per minute
    analytics: true,
    prefix: "@upstash/ratelimit:auth",
  }) : null,

  // Login specific (even stricter)
  login: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "5 m"), // 3 attempts per 5 minutes
    analytics: true,
    prefix: "@upstash/ratelimit:login",
  }) : null,

  // API endpoints (general)
  api: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, "1 m"), // 30 requests per minute
    analytics: true,
    prefix: "@upstash/ratelimit:api",
  }) : null,

  // File upload endpoints
  upload: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "10 m"), // 5 uploads per 10 minutes
    analytics: true,
    prefix: "@upstash/ratelimit:upload",
  }) : null,

  // Quiz creation (resource intensive)
  quizCreate: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "5 m"), // 3 quiz creations per 5 minutes
    analytics: true,
    prefix: "@upstash/ratelimit:quiz-create",
  }) : null,

  // Admin endpoints
  admin: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "1 m"), // 100 requests per minute for admin
    analytics: true,
    prefix: "@upstash/ratelimit:admin",
  }) : null,
};

// In-memory rate limiting fallback (for development/when Redis is not available)
class InMemoryRateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly maxLimit: number;
  private readonly window: number; // in milliseconds

  constructor(limit: number, windowInMs: number) {
    this.maxLimit = limit;
    this.window = windowInMs;
  }

  async limit(identifier: string) {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    // Clean up old entries
    if (record && now > record.resetTime) {
      this.attempts.delete(identifier);
    }

    const current = this.attempts.get(identifier);

    if (!current) {
      // First attempt
      this.attempts.set(identifier, {
        count: 1,
        resetTime: now + this.window,
      });
      return { success: true, remaining: this.maxLimit - 1 };
    }

    if (current.count >= this.maxLimit) {
      // Rate limit exceeded
      return { 
        success: false, 
        remaining: 0,
        reset: current.resetTime,
      };
    }

    // Increment count
    current.count++;
    return { 
      success: true, 
      remaining: this.maxLimit - current.count,
    };
  }
}

// Fallback rate limiters for when Redis is not available
const inMemoryLimiters = {
  auth: new InMemoryRateLimiter(5, 60000), // 5 per minute
  login: new InMemoryRateLimiter(3, 300000), // 3 per 5 minutes
  api: new InMemoryRateLimiter(30, 60000), // 30 per minute
  upload: new InMemoryRateLimiter(5, 600000), // 5 per 10 minutes
  quizCreate: new InMemoryRateLimiter(3, 300000), // 3 per 5 minutes
  admin: new InMemoryRateLimiter(100, 60000), // 100 per minute
};

/**
 * Rate limit a request
 */
export async function rateLimit(
  request: NextRequest,
  type: keyof typeof rateLimiters = "api"
) {
  try {
    // Get identifier (IP address or user ID)
    const identifier = getIdentifier(request);

    // Use Redis rate limiter if available, otherwise use in-memory
    const limiter = rateLimiters[type];
    
    if (limiter) {
      const result = await limiter.limit(identifier);
      return {
        success: result.success,
        remaining: result.remaining,
        reset: result.reset,
        limit: result.limit,
      };
    } else {
      // Use in-memory fallback
      const result = await inMemoryLimiters[type].limit(identifier);
      return result;
    }
  } catch (error) {
    console.error("Rate limiting error:", error);
    // On error, allow the request but log it
    return { success: true, remaining: -1 };
  }
}

/**
 * Get identifier for rate limiting (IP or authenticated user)
 */
function getIdentifier(request: NextRequest): string {
  // Try to get IP from various headers
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwardedFor?.split(",")[0] || realIp || "127.0.0.1";

  // You could also include user ID if authenticated
  // const userId = await getUserIdFromRequest(request);
  // if (userId) return `user:${userId}`;

  return `ip:${ip}`;
}

/**
 * Rate limit response headers
 */
export function rateLimitHeaders(result: {
  limit?: number;
  remaining?: number;
  reset?: number;
}) {
  return {
    "X-RateLimit-Limit": result.limit?.toString() || "unknown",
    "X-RateLimit-Remaining": result.remaining?.toString() || "0",
    "X-RateLimit-Reset": result.reset ? new Date(result.reset).toISOString() : "unknown",
  };
}
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitHeaders } from "./rate-limit";


type RouteHandler = (
  request: NextRequest
) => Promise<NextResponse> | NextResponse;

interface MiddlewareOptions {
  rateLimit?: {
    type: "auth" | "login" | "api" | "upload" | "quizCreate" | "admin";
    skipForAdmin?: boolean;
  };
  requireAuth?: boolean;
  requireAdmin?: boolean;
}

/**
 * Middleware wrapper for API routes
 */
export function withMiddleware(
  handler: RouteHandler,
  options: MiddlewareOptions = {}
): RouteHandler {
  return async (request: NextRequest) => {
    try {
      // Apply rate limiting if configured
      if (options.rateLimit) {
        const result = await rateLimit(request, options.rateLimit.type);
        
        if (!result.success) {
          return NextResponse.json(
            { 
              error: "Too many requests. Please try again later.",
              retryAfter: result.reset ? Math.ceil((result.reset - Date.now()) / 1000) : 60,
            },
            { 
              status: 429,
              headers: rateLimitHeaders(result),
            }
          );
        }

        // Add rate limit headers to successful responses
        const response = await handler(request);
        const headers = rateLimitHeaders(result);
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return response;
      }

      // If no rate limiting, just call the handler
      return await handler(request);
    } catch (error) {
      // [REMOVED: Console statement for performance]
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { logger } from "@/lib/logger";


/**
 * Middleware function to check admin authentication for API routes
 * Returns the admin session if authenticated, or returns an unauthorized response
 */
export async function requireAdminApiAuth() {
  try {
    const session = await getAdminSession();
    
    if (!session) {
      logger.warn("Unauthorized admin API access attempt");
      return {
        authorized: false,
        response: NextResponse.json(
          { error: "Unauthorized - Admin access required" },
          { status: 401 }
        )
      };
    }
    
    return {
      authorized: true,
      session
    };
  } catch (error) {
    logger.error("Admin API auth check failed:", error);
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Authentication failed" },
        { status: 500 }
      )
    };
  }
}

/**
 * Wrapper function to protect admin API routes
 * Use this at the beginning of any admin API route handler
 */
export async function withAdminAuth<T>(
  handler: (session: { id: string; email: string; role: string }) => Promise<NextResponse<T>>
): Promise<NextResponse<T | { error: string }>> {
  const auth = await requireAdminApiAuth();
  
  if (!auth.authorized) {
    return auth.response as NextResponse<T | { error: string }>;
  }
  
  if (!auth.session) {
    return NextResponse.json(
      { error: "Session not found" },
      { status: 401 }
    ) as NextResponse<T | { error: string }>;
  }
  
  return handler(auth.session);
}
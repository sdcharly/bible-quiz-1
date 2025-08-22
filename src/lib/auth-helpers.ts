import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Get authenticated user session
 * Always requires authentication unless explicitly disabled via environment variable
 */
export async function getAuthenticatedUser() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session?.user) {
    // Only bypass auth if explicitly enabled via environment variable
    // This should NEVER be true in production
    if (process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true' && process.env.NODE_ENV !== 'production') {
      console.warn('⚠️ AUTH BYPASS ENABLED - DO NOT USE IN PRODUCTION');
      return null;
    }
    
    // Always require authentication by default
    throw new Error('Authentication required');
  }

  return session.user;
}

/**
 * Require authenticated user for API routes
 * Returns user or sends 401 response
 */
export async function requireAuth() {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      // Only provide test user if explicitly enabled and NOT in production
      if (process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true' && process.env.NODE_ENV !== 'production') {
        console.warn('⚠️ Using test user - AUTH BYPASS ENABLED');
        // Return a test user for development ONLY
        return {
          id: 'dev-test-user',
          email: 'test@example.com',
          name: 'Test User',
          role: 'educator' // Default to educator for testing
        };
      }
      
      return null;
    }
    
    return user;
  } catch (error) {
    return null;
  }
}

/**
 * Create an unauthorized response
 */
export function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  );
}

/**
 * Create a forbidden response
 */
export function forbiddenResponse(message = 'Forbidden') {
  return NextResponse.json(
    { error: message },
    { status: 403 }
  );
}

/**
 * Check if user has educator role
 */
export async function requireEducatorRole() {
  const user = await requireAuth();
  
  if (!user) {
    return null;
  }
  
  // Always check the actual role
  if (user.role !== 'educator' && user.role !== 'admin') {
    return null;
  }
  
  return user;
}

/**
 * Check if user has student role
 */
export async function requireStudentRole() {
  const user = await requireAuth();
  
  if (!user) {
    return null;
  }
  
  // Always check the actual role
  if (user.role !== 'student') {
    return null;
  }
  
  return user;
}
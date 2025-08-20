import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Get authenticated user session
 * Returns null in development if no session (for testing)
 * Throws error in production if no session
 */
export async function getAuthenticatedUser() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session?.user) {
    // In development, allow testing without auth
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ No authenticated user in development mode');
      return null;
    }
    
    // In production, always require authentication
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
      // Development mode without auth
      if (process.env.NODE_ENV === 'development') {
        // Return a test user for development
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
  
  // In production, check actual role from database
  if (process.env.NODE_ENV === 'production') {
    // You might want to fetch the role from database here
    // For now, we'll trust the session role
    if (user.role !== 'educator') {
      return null;
    }
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
  
  // In production, check actual role from database
  if (process.env.NODE_ENV === 'production') {
    if (user.role !== 'student') {
      return null;
    }
  }
  
  return user;
}
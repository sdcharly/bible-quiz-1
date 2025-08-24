import { randomBytes } from "crypto";
import { cookies, headers } from "next/headers";
import { NextRequest } from "next/server";

const CSRF_TOKEN_COOKIE = "csrf_token";
const CSRF_HEADER = "x-csrf-token";
const TOKEN_LENGTH = 32;

/**
 * Generate a new CSRF token
 */
export function generateCSRFToken(): string {
  return randomBytes(TOKEN_LENGTH).toString("hex");
}

/**
 * Set CSRF token in cookies
 */
export async function setCSRFToken(): Promise<string> {
  const token = generateCSRFToken();
  const cookieStore = await cookies();
  
  cookieStore.set(CSRF_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  });
  
  return token;
}

/**
 * Get CSRF token from cookies
 */
export async function getCSRFToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CSRF_TOKEN_COOKIE)?.value;
  return token || null;
}

/**
 * Validate CSRF token from request
 */
export async function validateCSRFToken(request: NextRequest): Promise<boolean> {
  // Get token from cookie
  const cookieToken = await getCSRFToken();
  if (!cookieToken) {
    return false;
  }
  
  // Get token from header or body
  const headerToken = request.headers.get(CSRF_HEADER);
  
  // For JSON requests, also check body
  let bodyToken: string | null = null;
  if (request.headers.get("content-type")?.includes("application/json")) {
    try {
      const body = await request.clone().json();
      bodyToken = body.csrfToken || null;
    } catch {
      // Ignore parse errors
    }
  }
  
  const requestToken = headerToken || bodyToken;
  
  // Constant-time comparison to prevent timing attacks
  if (!requestToken || cookieToken.length !== requestToken.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < cookieToken.length; i++) {
    result |= cookieToken.charCodeAt(i) ^ requestToken.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Middleware to enforce CSRF protection
 */
export async function requireCSRFToken(request: NextRequest): Promise<{ valid: boolean; error?: string }> {
  // Skip CSRF check for GET, HEAD, OPTIONS requests
  const method = request.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return { valid: true };
  }
  
  const isValid = await validateCSRFToken(request);
  
  if (!isValid) {
    return {
      valid: false,
      error: "Invalid or missing CSRF token",
    };
  }
  
  return { valid: true };
}

/**
 * Get CSRF token for client-side usage
 */
export async function getClientCSRFToken(): Promise<string> {
  let token = await getCSRFToken();
  
  if (!token) {
    token = await setCSRFToken();
  }
  
  return token;
}
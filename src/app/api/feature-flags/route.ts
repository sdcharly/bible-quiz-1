import { NextRequest, NextResponse } from "next/server";
import { getEnabledFeatures, getFeatureFlagsStatus, FEATURES, type FeatureFlag } from "@/lib/feature-flags";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createHmac } from "crypto";
import { logger } from "@/lib/logger";

/**
 * Feature Flags Management API
 * GET: Returns current feature flag status (requires authentication)
 * POST: Toggle feature flags temporarily (admin only, development only)
 * 
 * IMPORTANT: POST changes are temporary and only affect the current process.
 * For production use, feature flags should be set via environment variables.
 */

// Define non-sensitive features that can be controlled via cookies (for A/B testing, UI preferences)
const CLIENT_CONTROLLABLE_FLAGS: FeatureFlag[] = [
  'BROWSER_CACHE_OPTIMIZATION',
  'COMPONENT_LAZY_LOADING',
  'DEBUG_PERFORMANCE' // Only in dev
];

// Secret for signing cookies - REQUIRED in production
let COOKIE_SECRET: string | null = null;
let COOKIE_SECRET_ERROR: string | null = null;

try {
  const secret = process.env.FEATURE_FLAG_SECRET;
  
  // In development, allow fallback to dev secret
  if (process.env.NODE_ENV === 'development' && !secret) {
    logger.warn('FEATURE_FLAG_SECRET not set, using development fallback. This is NOT safe for production!');
    COOKIE_SECRET = 'dev-secret-only-for-development';
  } else if (!secret) {
    // In production/test, require the environment variable
    const errorMsg = 'FEATURE_FLAG_SECRET environment variable is required in non-development environments';
    logger.error(errorMsg);
    COOKIE_SECRET_ERROR = errorMsg;
  } else {
    COOKIE_SECRET = secret;
  }
} catch (error) {
  COOKIE_SECRET_ERROR = 'Failed to initialize cookie secret';
  logger.error('Cookie secret initialization error:', error);
}

/**
 * Sign a value for cookie integrity verification
 */
function signValue(value: string): string | null {
  if (!COOKIE_SECRET) {
    logger.error('Cannot sign value: Cookie secret not initialized');
    return null;
  }
  const hmac = createHmac('sha256', COOKIE_SECRET);
  hmac.update(value);
  return `${value}.${hmac.digest('hex')}`;
}

/**
 * Verify and extract signed value
 */
function verifySignedValue(signedValue: string): string | null {
  if (!COOKIE_SECRET) {
    logger.error('Cannot verify value: Cookie secret not initialized');
    return null;
  }
  
  const parts = signedValue.split('.');
  if (parts.length !== 2) return null;
  
  const [value, signature] = parts;
  const hmac = createHmac('sha256', COOKIE_SECRET);
  hmac.update(value);
  const expectedSignature = hmac.digest('hex');
  
  // Constant-time comparison to prevent timing attacks
  if (signature.length !== expectedSignature.length) return null;
  
  let match = true;
  for (let i = 0; i < signature.length; i++) {
    if (signature[i] !== expectedSignature[i]) match = false;
  }
  
  return match ? value : null;
}

/**
 * Get client-controllable flags from verified cookies
 */
function getClientFlags(req: NextRequest): FeatureFlag[] {
  const enabledFlags: FeatureFlag[] = [];
  
  for (const flag of CLIENT_CONTROLLABLE_FLAGS) {
    // Skip non-controllable flags in production
    if (flag === 'DEBUG_PERFORMANCE' && process.env.NODE_ENV === 'production') {
      continue;
    }
    
    const cookie = req.cookies.get(`ff_${flag}`);
    if (!cookie?.value) continue;
    
    // Verify signed cookie
    const verifiedValue = verifySignedValue(cookie.value);
    if (verifiedValue === '1') {
      enabledFlags.push(flag);
    }
  }
  
  return enabledFlags;
}

export async function GET(req: NextRequest) {
  // Check if cookie secret is properly configured
  if (COOKIE_SECRET_ERROR) {
    logger.error('Feature flags API unavailable:', COOKIE_SECRET_ERROR);
    return NextResponse.json(
      { error: 'Feature flags configuration error. Please check server logs.' },
      { status: 500 }
    );
  }
  
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers()
    });

    // Public response - limited info for security
    if (!session?.user) {
      return NextResponse.json({
        message: "Feature flags are active",
        environment: process.env.NODE_ENV,
        // Don't expose flag names or status to unauthenticated users
      });
    }

    // Get feature flags status
    const status = getFeatureFlagsStatus();
    const enabled = getEnabledFeatures();
    
    // Only get client-controllable flags from verified cookies
    const sessionEnabled = getClientFlags(req);

    // Admin users get full details
    if (session.user.role === 'admin') {
      return NextResponse.json({
        allFlags: Object.keys(FEATURES),
        enabled,
        sessionEnabled,
        status,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      });
    }

    // Regular users get limited info
    return NextResponse.json({
      enabled,
      sessionEnabled,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to retrieve feature flags' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Check if cookie secret is properly configured
  if (COOKIE_SECRET_ERROR) {
    logger.error('Feature flags API unavailable:', COOKIE_SECRET_ERROR);
    return NextResponse.json(
      { error: 'Feature flags configuration error. Please check server logs.' },
      { status: 500 }
    );
  }
  
  // Only allow toggling in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Feature flag modification only allowed in development' },
      { status: 403 }
    );
  }

  try {
    // Check authentication - admin only
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { feature, enabled } = body;

    if (!feature || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request. Provide feature and enabled boolean' },
        { status: 400 }
      );
    }

    if (!(feature in FEATURES)) {
      return NextResponse.json(
        { error: `Unknown feature flag: ${feature}` },
        { status: 400 }
      );
    }

    // Set environment variable temporarily (for this process only)
    // WARNING: This is a development-only feature for testing
    // Changes will be lost on server restart or won't affect other processes
    const envKey = `NEXT_PUBLIC_FF_${feature}`;
    process.env[envKey] = enabled.toString();

    // Also set a session cookie for persistence within this session
    const res = NextResponse.json({
      success: true,
      feature,
      enabled,
      warning: 'This change is temporary and only affects the current server process. ' +
               'It will be lost on restart and may not affect all parts of the application. ' +
               'For permanent changes, set environment variables in your deployment configuration.',
      message: `Feature ${feature} temporarily ${enabled ? 'enabled' : 'disabled'} in current process`,
      user: session.user.email,
      timestamp: new Date().toISOString()
    });

    // Only set signed cookie for client-controllable flags
    if (CLIENT_CONTROLLABLE_FLAGS.includes(feature as FeatureFlag)) {
      const signedValue = signValue(enabled ? '1' : '0');
      
      // Only set cookie if signing was successful
      if (signedValue) {
        // Configure cookie expiry from environment with sensible default
        // Default to 5 minutes (300 seconds) for temporary feature flags
        const DEFAULT_MAX_AGE = 300; // 5 minutes default
        const MAX_ALLOWED_AGE = 86400; // 24 hours max to prevent excessive cookie lifetimes
        
        let maxAge = DEFAULT_MAX_AGE;
        
        if (process.env.FEATURE_FLAG_COOKIE_MAX_AGE) {
          const parsedValue = parseInt(process.env.FEATURE_FLAG_COOKIE_MAX_AGE, 10);
          
          // Validate the parsed value
          if (Number.isInteger(parsedValue) && parsedValue > 0) {
            // Clamp to reasonable max to prevent misconfiguration
            maxAge = Math.min(parsedValue, MAX_ALLOWED_AGE);
            
            if (parsedValue > MAX_ALLOWED_AGE) {
              logger.warn(
                `FEATURE_FLAG_COOKIE_MAX_AGE value ${parsedValue} exceeds maximum allowed ${MAX_ALLOWED_AGE}. ` +
                `Using ${MAX_ALLOWED_AGE} seconds instead.`
              );
            }
          } else {
            logger.warn(
              `Invalid FEATURE_FLAG_COOKIE_MAX_AGE value: "${process.env.FEATURE_FLAG_COOKIE_MAX_AGE}". ` +
              `Must be a positive integer. Using default ${DEFAULT_MAX_AGE} seconds.`
            );
          }
        }
        
        // Determine if we should use secure cookie (HTTPS/production)
        // Use type assertion to handle Next.js NODE_ENV typing
        const isProduction = (process.env.NODE_ENV as string) === 'production';
        
        res.cookies.set(`ff_${feature}`, signedValue, {
          httpOnly: true,
          secure: isProduction, // Secure flag in production only
          sameSite: 'strict',
          path: '/',
          maxAge: maxAge,
        });
      } else {
        logger.error('Failed to sign cookie value - cookie not set');
      }
    }

    return res;
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update feature flag' },
      { status: 500 }
    );
  }
}
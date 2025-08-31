import { NextRequest, NextResponse } from "next/server";
import { getEnabledFeatures, getFeatureFlagsStatus, FEATURES, type FeatureFlag } from "@/lib/feature-flags";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createHmac } from "crypto";

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

// Secret for signing cookies (should be in env vars in production)
const COOKIE_SECRET = process.env.FEATURE_FLAG_SECRET || 'dev-secret-change-in-production';

/**
 * Sign a value for cookie integrity verification
 */
function signValue(value: string): string {
  const hmac = createHmac('sha256', COOKIE_SECRET);
  hmac.update(value);
  return `${value}.${hmac.digest('hex')}`;
}

/**
 * Verify and extract signed value
 */
function verifySignedValue(signedValue: string): string | null {
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
      
      // Configure cookie expiry from environment with sensible default
      // Default to 5 minutes (300 seconds) for temporary feature flags
      const maxAge = process.env.FEATURE_FLAG_COOKIE_MAX_AGE 
        ? parseInt(process.env.FEATURE_FLAG_COOKIE_MAX_AGE, 10)
        : 300; // 5 minutes default for temporary flags
      
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
    }

    return res;
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update feature flag' },
      { status: 500 }
    );
  }
}
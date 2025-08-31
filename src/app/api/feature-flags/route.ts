import { NextRequest, NextResponse } from "next/server";
import { getEnabledFeatures, getFeatureFlagsStatus, FEATURES, type FeatureFlag } from "@/lib/feature-flags";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * Feature Flags Management API
 * GET: Returns current feature flag status (requires authentication)
 * POST: Toggle feature flags temporarily (admin only, development only)
 * 
 * IMPORTANT: POST changes are temporary and only affect the current process.
 * For production use, feature flags should be set via environment variables.
 */

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
    const sessionEnabled = Object.keys(FEATURES).filter(
      (k) => req.cookies.get(`ff_${k}`)?.value === '1'
    );

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

    // Set cookie for session persistence
    res.cookies.set(`ff_${feature}`, enabled ? '1' : '0', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60, // 1 hour
    });

    return res;
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update feature flag' },
      { status: 500 }
    );
  }
}
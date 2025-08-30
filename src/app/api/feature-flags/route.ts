import { NextRequest, NextResponse } from "next/server";
import { getEnabledFeatures, getFeatureFlagsStatus, FEATURES, type FeatureFlag } from "@/lib/feature-flags";

/**
 * Feature Flags Management API
 * GET: Returns current feature flag status
 * POST: Toggle feature flags (development only)
 */

export async function GET(req: NextRequest) {
  try {
    const status = getFeatureFlagsStatus();
    const enabled = getEnabledFeatures();
    
    return NextResponse.json({
      allFlags: Object.keys(FEATURES),
      enabled,
      status,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch feature flags' },
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

    // Set environment variable temporarily (for this process)
    const envKey = `NEXT_PUBLIC_FF_${feature}`;
    process.env[envKey] = enabled.toString();

    return NextResponse.json({
      success: true,
      feature,
      enabled,
      message: `Feature ${feature} ${enabled ? 'enabled' : 'disabled'} for this session`
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update feature flag' },
      { status: 500 }
    );
  }
}
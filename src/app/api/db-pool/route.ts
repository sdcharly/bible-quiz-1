import { NextRequest, NextResponse } from "next/server";
import { checkDbHealth, getPoolStats, refreshConnectionPool } from "@/lib/db-optimized";
import { isFeatureEnabled } from "@/lib/feature-flags";

/**
 * Database Pool Management API
 * GET: Returns pool status and health
 * POST: Allows pool management operations (dev only)
 */

export async function GET(req: NextRequest) {
  try {
    // Get health and stats in parallel
    const [health, stats] = await Promise.all([
      checkDbHealth(),
      getPoolStats()
    ]);

    const response = {
      health,
      stats,
      features: {
        optimizedPool: isFeatureEnabled('OPTIMIZED_DB_POOL'),
        monitoring: isFeatureEnabled('DB_CONNECTION_MONITORING'),
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to get database pool status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Only allow pool management in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Pool management only allowed in development' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'refresh':
        const refreshResult = await refreshConnectionPool();
        return NextResponse.json(refreshResult);
        
      case 'health-check':
        const health = await checkDbHealth();
        return NextResponse.json(health);
        
      case 'stats':
        const stats = getPoolStats();
        return NextResponse.json(stats);
        
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Pool management operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
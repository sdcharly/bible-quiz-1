import { NextRequest, NextResponse } from "next/server";
import { checkDbHealth, getPoolStats, refreshConnectionPool } from "@/lib/db-optimized";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { ENV } from "@/lib/env-config";
import { validateApiKey, sanitizePoolStats, sanitizeHealthData } from "@/lib/security-utils";
import { logger } from "@/lib/logger";

/**
 * Database Pool Management API
 * GET: Returns pool status and health (requires API key in production)
 * POST: Allows pool management operations (dev only)
 * 
 * Production access requires DB_POOL_API_KEY environment variable
 */

export async function GET(req: NextRequest) {
  try {
    // In production, require API key authentication
    if (ENV.isProduction) {
      const apiKey = process.env.DB_POOL_API_KEY;
      
      // If API key is not configured, block access entirely
      if (!apiKey) {
        logger.warn('DB pool endpoint accessed but DB_POOL_API_KEY not configured');
        return NextResponse.json(
          { error: 'Service unavailable' },
          { status: 503 }
        );
      }
      
      // Validate the provided API key
      if (!validateApiKey(req, apiKey)) {
        logger.warn('DB pool endpoint accessed with invalid API key');
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }
    }

    // Get health and stats in parallel
    const [health, stats] = await Promise.all([
      checkDbHealth(),
      getPoolStats()
    ]);

    // In production, return sanitized data
    if (ENV.isProduction) {
      const sanitizedResponse = {
        status: health?.healthy ? 'ok' : 'degraded',
        pool: sanitizePoolStats(stats),
        health: sanitizeHealthData(health),
        timestamp: new Date().toISOString()
      };
      
      return NextResponse.json(sanitizedResponse);
    }

    // In development/staging, return full details
    const response = {
      health,
      stats,
      features: {
        optimizedPool: isFeatureEnabled('OPTIMIZED_DB_POOL'),
        monitoring: isFeatureEnabled('DB_CONNECTION_MONITORING'),
      },
      environment: ENV.isDevelopment ? 'development' : 'staging',
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);
  } catch (error) {
    // In production, don't expose error details
    if (ENV.isProduction) {
      logger.error('DB pool status check failed:', error);
      return NextResponse.json(
        { 
          error: 'Service error',
          status: 'error'
        },
        { status: 500 }
      );
    }
    
    // In development, show detailed error
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
        const stats = await getPoolStats();
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
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import crypto from "crypto";
import { logger } from "@/lib/logger";

/**
 * Database performance metrics endpoint
 * Monitors connection pool and query performance
 */
export async function GET(req: NextRequest) {
  // Auth guard - check for valid token
  const authHeader = req.headers.get("authorization");
  const apiKey = req.headers.get("x-api-key");
  const providedToken = authHeader?.replace("Bearer ", "") || apiKey;
  
  const expectedToken = process.env.METRICS_TOKEN;
  
  // If no token configured, block access (secure by default)
  if (!expectedToken) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  // Perform constant-time comparison to prevent timing attacks
  if (!providedToken || providedToken.length !== expectedToken.length) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  const providedBuffer = Buffer.from(providedToken);
  const expectedBuffer = Buffer.from(expectedToken);
  
  if (!crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  try {
    // Get database connection statistics
    // Note: These queries are PostgreSQL specific
    const poolStats = await db.execute(sql`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections,
        max(query_start) as last_query_time
      FROM pg_stat_activity
      WHERE datname = current_database()
    `);

    // Get query performance stats (simplified)
    const queryStats = await db.execute(sql`
      SELECT 
        count(*) as total_queries,
        avg(mean_exec_time) as avg_query_time,
        max(mean_exec_time) as max_query_time
      FROM pg_stat_statements
      WHERE query NOT LIKE '%pg_stat%'
      LIMIT 1
    `).catch(() => ({
      rows: [{ total_queries: 0, avg_query_time: 0, max_query_time: 0 }]
    }));

    // Normalize both results to handle array or object with rows property
    const poolRows = Array.isArray(poolStats) ? poolStats : (poolStats as any)?.rows || [];
    const poolData = poolRows[0] || {};
    
    const queryRows = Array.isArray(queryStats) ? queryStats : (queryStats as any)?.rows || [];
    const queryData = queryRows[0] || {};

    const stats = {
      activeConnections: Number(poolData.active_connections) || 0,
      idleConnections: Number(poolData.idle_connections) || 0,
      totalConnections: Number(poolData.total_connections) || 0,
      poolUtilization: Number(poolData.total_connections) 
        ? (Number(poolData.active_connections) / Number(poolData.total_connections))
        : 0,
      avgQueryTime: Number(queryData.avg_query_time) || 0,
      maxQueryTime: Number(queryData.max_query_time) || 0,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(stats);
  } catch (error) {
    // Log the error for visibility
    logger.error('Database metrics error:', error);
    
    // Check for opt-in via query parameter or environment flag
    const searchParams = new URL(req.url).searchParams;
    const allowMock = searchParams.get('allowMock') === 'true' || 
                      process.env.ALLOW_MOCK_METRICS === 'true';
    
    if (!allowMock) {
      // Default: return 503 Service Unavailable
      return NextResponse.json(
        { error: 'Database metrics unavailable' },
        { status: 503 }
      );
    }
    
    // Opt-in: return deterministic placeholder values (not random)
    return NextResponse.json({
      activeConnections: 0,
      idleConnections: 0,
      totalConnections: 0,
      poolUtilization: 0,
      avgQueryTime: 0,
      maxQueryTime: 0,
      timestamp: new Date().toISOString()
    });
  }
}
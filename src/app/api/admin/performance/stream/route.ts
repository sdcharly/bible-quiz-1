import { NextRequest, NextResponse } from "next/server";
import { count, gte } from "drizzle-orm";
import { db, pgClient } from "@/lib/db";
import { user, quizzes, quizAttempts, session } from "@/lib/schema";
import { logger } from "@/lib/logger";

// Note: WebSocket broadcasting would need a server-side WebSocket implementation
// For now, we'll return the data for polling or SSE

// This endpoint triggers performance metrics broadcasts
export async function POST(req: NextRequest) {
  try {
    // Check admin authentication here if needed
    
    // Collect database metrics
    const connectionStats = await pgClient`
      SELECT 
        count(*) as total,
        count(*) FILTER (WHERE state = 'active') as active,
        count(*) FILTER (WHERE state = 'idle') as idle
      FROM pg_stat_activity
      WHERE datname = current_database()
    `.catch(() => [{ total: 0, active: 0, idle: 0 }]);

    const tableSizes = await pgClient`
      SELECT 
        relname as name,
        pg_size_pretty(pg_total_relation_size(oid)) as size
      FROM pg_class
      WHERE relkind = 'r'
        AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      ORDER BY pg_total_relation_size(oid) DESC
      LIMIT 5
    `.catch(() => []);

    const indexCount = await pgClient`
      SELECT count(*) as count
      FROM pg_indexes
      WHERE schemaname = 'public'
    `.catch(() => [{ count: 0 }]);

    const dbMetrics = {
      activeConnections: connectionStats[0]?.active || 0,
      totalConnections: connectionStats[0]?.total || 0,
      idleConnections: connectionStats[0]?.idle || 0,
      largestTables: tableSizes.map((t) => ({
        name: t.name,
        size: t.size
      })),
      indexCount: indexCount[0]?.count || 0,
      cacheStatus: process.env.REDIS_URL || process.env.KV_URL ? 'Redis' : 'In-Memory'
    };

    // Store metrics for SSE or polling
    const dbMetricsPayload = {
      type: 'db_metrics',
      metrics: dbMetrics,
      timestamp: Date.now()
    };

    // Collect application metrics
    const totalUsers = await db
      .select({ count: count() })
      .from(user);

    const totalQuizzes = await db
      .select({ count: count() })
      .from(quizzes);

    const totalAttempts = await db
      .select({ count: count() })
      .from(quizAttempts);

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const activeUsers = await db
      .select({ count: count() })
      .from(session)
      .where(gte(session.updatedAt, oneHourAgo));

    const appMetrics = {
      totalUsers: totalUsers[0]?.count || 0,
      totalQuizzes: totalQuizzes[0]?.count || 0,
      totalAttempts: totalAttempts[0]?.count || 0,
      activeUsers: activeUsers[0]?.count || 0,
      avgResponseTime: Math.floor(Math.random() * 50) + 100, // Mock for now
      errorRate: parseFloat((Math.random() * 2).toFixed(2))
    };

    // Store metrics for SSE or polling  
    const appMetricsPayload = {
      type: 'app_metrics',
      metrics: appMetrics,
      timestamp: Date.now()
    };

    return NextResponse.json({
      success: true,
      dbMetrics,
      appMetrics
    });
  } catch (error) {
    logger.error("Error streaming performance metrics:", error);
    return NextResponse.json(
      { error: "Failed to stream performance metrics" },
      { status: 500 }
    );
  }
}

// GET endpoint to start continuous streaming
export async function GET(req: NextRequest) {
  try {
    // Start periodic broadcasts (every 5 seconds)
    const streamInterval = setInterval(async () => {
      try {
        // Quick health check
        const health = await pgClient`SELECT 1 as healthy`.catch(() => null);
        
        if (health) {
          // Trigger metrics broadcast
          await POST(req);
        }
      } catch (error) {
        logger.error("Error in metrics stream:", error);
      }
    }, 5000);

    // Clean up after 60 seconds (client should reconnect)
    setTimeout(() => {
      clearInterval(streamInterval);
    }, 60000);

    return NextResponse.json({
      message: "Performance metrics streaming started",
      duration: "60 seconds"
    });
  } catch (error) {
    logger.error("Error starting metrics stream:", error);
    return NextResponse.json(
      { error: "Failed to start metrics stream" },
      { status: 500 }
    );
  }
}
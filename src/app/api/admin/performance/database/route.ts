import { NextRequest, NextResponse } from "next/server";
import { db, pgClient } from "@/lib/db";
import { logger } from "@/lib/logger";


export async function GET(_req: NextRequest) {
  try {
    // Check admin authentication here if needed
    
    // Get connection statistics
    const connectionStats = await pgClient`
      SELECT 
        count(*) as total,
        count(*) FILTER (WHERE state = 'active') as active,
        count(*) FILTER (WHERE state = 'idle') as idle
      FROM pg_stat_activity
      WHERE datname = current_database()
    `.catch(() => [{ total: 0, active: 0, idle: 0 }]);

    // Get table sizes
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

    // Get index count
    const indexCount = await pgClient`
      SELECT count(*) as count
      FROM pg_indexes
      WHERE schemaname = 'public'
    `.catch(() => [{ count: 0 }]);

    // Check cache status
    const cacheStatus = process.env.REDIS_URL || process.env.KV_URL ? 'Redis' : 'In-Memory';

    return NextResponse.json({
      activeConnections: connectionStats[0]?.active || 0,
      totalConnections: connectionStats[0]?.total || 0,
      idleConnections: connectionStats[0]?.idle || 0,
      largestTables: tableSizes.map((t) => ({
        name: t.name,
        size: t.size
      })),
      indexCount: indexCount[0]?.count || 0,
      cacheStatus
    });
  } catch (error) {
    logger.error("Error fetching database metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch database metrics" },
      { status: 500 }
    );
  }
}
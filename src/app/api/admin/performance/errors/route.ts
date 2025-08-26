import { NextResponse } from "next/server";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { getAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { activityLogs } from "@/lib/schema";
import { logger } from "@/lib/logger";


export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get error logs from the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Get error counts by type
    const errorLogs = await db
      .select({
        actionType: activityLogs.actionType,
        count: sql<number>`count(*)`,
      })
      .from(activityLogs)
      .where(
        and(
          sql`${activityLogs.actionType} LIKE '%error%' OR ${activityLogs.actionType} LIKE '%fail%'`,
          gte(activityLogs.createdAt, twentyFourHoursAgo)
        )
      )
      .groupBy(activityLogs.actionType);

    // Get recent errors
    const recentErrors = await db
      .select()
      .from(activityLogs)
      .where(
        and(
          sql`${activityLogs.actionType} LIKE '%error%' OR ${activityLogs.actionType} LIKE '%fail%'`,
          gte(activityLogs.createdAt, twentyFourHoursAgo)
        )
      )
      .orderBy(desc(activityLogs.createdAt))
      .limit(10);

    // Calculate metrics
    const totalErrors = errorLogs.reduce((sum, log) => sum + Number(log.count), 0);
    const errorsByType: Record<string, number> = {};
    
    errorLogs.forEach(log => {
      const type = log.actionType.includes('api') ? 'API Error' :
                   log.actionType.includes('database') ? 'Database Error' :
                   log.actionType.includes('auth') ? 'Authentication Error' :
                   log.actionType.includes('validation') ? 'Validation Error' :
                   'Other Error';
      errorsByType[type] = (errorsByType[type] || 0) + Number(log.count);
    });

    // Get total requests for error rate calculation
    const totalRequests = await db
      .select({ count: sql<number>`count(*)` })
      .from(activityLogs)
      .where(gte(activityLogs.createdAt, twentyFourHoursAgo));

    const errorRate = totalRequests[0]?.count 
      ? (totalErrors / Number(totalRequests[0].count)) * 100
      : 0;

    // Determine trend (mock for now)
    const trend = totalErrors > 50 ? 'increasing' : 
                  totalErrors < 10 ? 'decreasing' : 
                  'stable';

    const errorMetrics = {
      total: totalErrors,
      byType: errorsByType,
      recent: recentErrors.map(error => ({
        type: error.actionType,
        message: error.details?.message || error.actionType,
        timestamp: error.createdAt,
        count: 1
      })),
      errorRate,
      trend
    };

    return NextResponse.json(errorMetrics);
  } catch (error) {
    logger.error("Failed to fetch error metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch error metrics" },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user, quizzes, quizAttempts, session } from "@/lib/schema";
import { eq, gte, count, avg, desc } from "drizzle-orm";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    // Check admin authentication here if needed
    
    // Get total users
    const totalUsers = await db
      .select({ count: count() })
      .from(user);

    // Get total quizzes
    const totalQuizzes = await db
      .select({ count: count() })
      .from(quizzes);

    // Get total attempts
    const totalAttempts = await db
      .select({ count: count() })
      .from(quizAttempts);

    // Get active users (sessions in last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const activeUsers = await db
      .select({ count: count() })
      .from(session)
      .where(gte(session.updatedAt, oneHourAgo));

    // Calculate average response time (mock for now)
    // In production, you'd track this with actual request timing
    const avgResponseTime = Math.floor(Math.random() * 50) + 100; // 100-150ms

    // Calculate error rate (mock for now)
    // In production, you'd track actual errors
    const errorRate = (Math.random() * 2).toFixed(2); // 0-2%

    return NextResponse.json({
      totalUsers: totalUsers[0]?.count || 0,
      totalQuizzes: totalQuizzes[0]?.count || 0,
      totalAttempts: totalAttempts[0]?.count || 0,
      activeUsers: activeUsers[0]?.count || 0,
      avgResponseTime,
      errorRate: parseFloat(errorRate)
    });
  } catch (error) {
    logger.error("Error fetching application metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch application metrics" },
      { status: 500 }
    );
  }
}
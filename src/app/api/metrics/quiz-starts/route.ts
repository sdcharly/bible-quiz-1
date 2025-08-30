import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quizAttempts } from "@/lib/schema";
import { desc, gte, sql } from "drizzle-orm";

/**
 * Quiz start metrics endpoint
 * Tracks how long it takes students to start quizzes
 */
export async function GET(req: NextRequest) {
  try {
    // Get recent quiz starts (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const recentStarts = await db
      .select({
        attemptId: quizAttempts.id,
        quizId: quizAttempts.quizId,
        startTime: quizAttempts.startTime,
        status: quizAttempts.status
      })
      .from(quizAttempts)
      .where(gte(quizAttempts.startTime, oneHourAgo))
      .orderBy(desc(quizAttempts.startTime))
      .limit(100);

    // Calculate statistics
    const stats = {
      totalStarts: recentStarts.length,
      recentStarts: recentStarts.map(attempt => ({
        id: attempt.attemptId,
        time: attempt.startTime,
        // In production, you'd calculate actual duration from logs
        duration: Math.random() * 3000 + 500 // Simulated for now
      })),
      hourlyRate: recentStarts.length,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch quiz start metrics' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quizAttempts } from "@/lib/schema";
import { eq, gte, sql } from "drizzle-orm";

/**
 * Quiz submission metrics endpoint
 * Tracks submission times and success rates
 */
export async function GET(req: NextRequest) {
  try {
    // Get recent submissions (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const recentSubmissions = await db
      .select({
        attemptId: quizAttempts.id,
        quizId: quizAttempts.quizId,
        endTime: quizAttempts.endTime,
        status: quizAttempts.status,
        score: quizAttempts.score,
        startTime: quizAttempts.startTime
      })
      .from(quizAttempts)
      .where(
        sql`${quizAttempts.endTime} >= ${oneHourAgo} AND ${quizAttempts.status} = 'completed'`
      )
      .limit(100);

    // Calculate submission statistics
    const submissions = recentSubmissions.map(attempt => ({
      id: attempt.attemptId,
      time: attempt.endTime,
      duration: attempt.endTime && attempt.startTime 
        ? new Date(attempt.endTime).getTime() - new Date(attempt.startTime).getTime()
        : null,
      score: attempt.score
    }));

    const validDurations = submissions
      .map(s => s.duration)
      .filter(d => d !== null && d > 0) as number[];

    const stats = {
      totalSubmissions: submissions.length,
      recentSubmissions: submissions,
      avgSubmissionTime: validDurations.length > 0 
        ? validDurations.reduce((a, b) => a + b, 0) / validDurations.length
        : 0,
      successRate: 1.0, // All completed are successful
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch submission metrics' },
      { status: 500 }
    );
  }
}
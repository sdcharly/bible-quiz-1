import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { quizAttempts, quizzes } from "@/lib/schema";
import { eq, and, lt, or, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    const now = new Date();
    const results: {
      timedOut: number;
      abandoned: number;
      errors: { attemptId: string; error: string }[];
    } = {
      timedOut: 0,
      abandoned: 0,
      errors: [],
    };

    // Get all in-progress attempts
    const stuckAttempts = await db
      .select({
        attempt: quizAttempts,
        quiz: quizzes,
      })
      .from(quizAttempts)
      .leftJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
      .where(eq(quizAttempts.status, "in_progress"));

    logger.info(`Found ${stuckAttempts.length} in-progress attempts to check`);

    for (const { attempt, quiz } of stuckAttempts) {
      try {
        if (!quiz) continue;

        // Parse quiz configuration to get duration
        let quizDuration = 30; // Default 30 minutes
        if (quiz.duration) {
          quizDuration = quiz.duration;
        } else if (quiz.timeConfiguration) {
          const timeConfig = JSON.parse(quiz.timeConfiguration as string);
          if (timeConfig.timeLimit) {
            quizDuration = Math.ceil(timeConfig.timeLimit / 60); // Convert seconds to minutes
          }
        }

        // Calculate time elapsed
        const startTime = attempt.startTime || attempt.createdAt;
        const timeElapsed = (now.getTime() - startTime.getTime()) / 1000 / 60; // in minutes

        // Check if attempt exceeded 2x the quiz duration
        const maxAllowedTime = quizDuration * 2;
        
        if (timeElapsed > maxAllowedTime) {
          // Mark as timed out
          await db
            .update(quizAttempts)
            .set({
              status: "timeout",
              endTime: now,
              updatedAt: now,
            })
            .where(eq(quizAttempts.id, attempt.id));
          
          results.timedOut++;
          
          logger.info(`Marked attempt ${attempt.id} as timeout`, {
            studentId: attempt.studentId,
            quizId: attempt.quizId,
            timeElapsed: Math.round(timeElapsed),
            maxAllowedTime,
          });
        } else if (timeElapsed > quizDuration * 1.5 && !attempt.startTime) {
          // If never started and been more than 1.5x duration, mark as abandoned
          await db
            .update(quizAttempts)
            .set({
              status: "abandoned",
              updatedAt: now,
            })
            .where(eq(quizAttempts.id, attempt.id));
          
          results.abandoned++;
          
          logger.info(`Marked attempt ${attempt.id} as abandoned`, {
            studentId: attempt.studentId,
            quizId: attempt.quizId,
            timeElapsed: Math.round(timeElapsed),
          });
        }
      } catch (error) {
        logger.error(`Error processing attempt ${attempt.id}:`, error);
        results.errors.push({
          attemptId: attempt.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Clean up old auto-save data (older than 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    await db
      .update(quizAttempts)
      .set({
        answers: [],
      })
      .where(
        and(
          or(
            eq(quizAttempts.status, "timeout"),
            eq(quizAttempts.status, "abandoned")
          ),
          lt(quizAttempts.updatedAt, sevenDaysAgo)
        )
      );

    return NextResponse.json({
      success: true,
      message: "Cleanup completed",
      results: {
        ...results,
        totalProcessed: stuckAttempts.length,
      },
    });
  } catch (error) {
    logger.error("Cleanup error:", error);
    return NextResponse.json(
      { error: "Failed to cleanup stuck attempts" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    // Get statistics on stuck attempts
    const stats = await db
      .select({
        status: quizAttempts.status,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(quizAttempts)
      .groupBy(quizAttempts.status);

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get stuck attempts by age
    const [recentStuck] = await db
      .select({
        count: sql<number>`count(*)`.as("count"),
      })
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.status, "in_progress"),
          lt(quizAttempts.createdAt, oneHourAgo)
        )
      );

    const [oldStuck] = await db
      .select({
        count: sql<number>`count(*)`.as("count"),
      })
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.status, "in_progress"),
          lt(quizAttempts.createdAt, oneDayAgo)
        )
      );

    return NextResponse.json({
      statistics: stats,
      stuckAttempts: {
        moreThanHour: recentStuck?.count || 0,
        moreThanDay: oldStuck?.count || 0,
      },
      recommendation: oldStuck?.count > 0 
        ? "Run cleanup to process stuck attempts" 
        : "No cleanup needed",
    });
  } catch (error) {
    logger.error("Get cleanup stats error:", error);
    return NextResponse.json(
      { error: "Failed to get cleanup statistics" },
      { status: 500 }
    );
  }
}
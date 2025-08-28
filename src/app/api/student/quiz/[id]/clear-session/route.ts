import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { quizAttempts } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/logger";

/**
 * Clear all quiz session data for a fresh start
 * This includes:
 * - Abandoning any in-progress attempts
 * - Clearing autosave data
 * - Resetting any cached data
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: quizId } = await context.params;
    const studentId = session.user.id;

    // Find all in-progress attempts for this quiz and student
    const activeAttempts = await db
      .select()
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.quizId, quizId),
          eq(quizAttempts.studentId, studentId),
          eq(quizAttempts.status, "in_progress")
        )
      );

    let clearedCount = 0;

    // Abandon all in-progress attempts
    for (const attempt of activeAttempts) {
      await db
        .update(quizAttempts)
        .set({
          status: "abandoned",
          endTime: new Date(),
          updatedAt: new Date(),
          answers: [], // Clear all saved answers
        })
        .where(eq(quizAttempts.id, attempt.id));
      
      clearedCount++;
    }

    logger.info("Quiz session cleared completely", {
      quizId,
      studentId,
      clearedAttempts: clearedCount,
    });

    return NextResponse.json({
      success: true,
      message: "Session cleared successfully",
      clearedAttempts: clearedCount,
    });
  } catch (error) {
    logger.error("Error clearing quiz session:", error);
    return NextResponse.json(
      { error: "Failed to clear session" },
      { status: 500 }
    );
  }
}
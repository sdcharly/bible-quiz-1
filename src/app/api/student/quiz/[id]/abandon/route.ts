import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { quizAttempts } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/logger";

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
    const body = await request.json();
    const { attemptId } = body;

    if (!attemptId) {
      return NextResponse.json(
        { error: "Attempt ID is required" },
        { status: 400 }
      );
    }

    // Verify the attempt belongs to the user and quiz
    const [attempt] = await db
      .select()
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.id, attemptId),
          eq(quizAttempts.quizId, quizId),
          eq(quizAttempts.studentId, session.user.id)
        )
      )
      .limit(1);

    if (!attempt) {
      return NextResponse.json(
        { error: "Attempt not found" },
        { status: 404 }
      );
    }

    // Only abandon if it's in progress
    if (attempt.status === "in_progress") {
      // 1. Mark the attempt as abandoned in database
      await db
        .update(quizAttempts)
        .set({
          status: "abandoned",
          endTime: new Date(),
          updatedAt: new Date(),
          answers: [], // Clear any saved answers
        })
        .where(eq(quizAttempts.id, attemptId));

      // 2. Clear any autosave data by setting empty metadata
      // This ensures the autosave endpoint won't find any data
      await db
        .update(quizAttempts)
        .set({
          answers: [], // Empty array means no autosave data
        })
        .where(
          and(
            eq(quizAttempts.studentId, session.user.id),
            eq(quizAttempts.quizId, quizId),
            eq(quizAttempts.status, "in_progress")
          )
        );

      logger.info("Quiz attempt abandoned and session cleared", {
        attemptId,
        quizId,
        studentId: session.user.id,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Previous attempt abandoned successfully",
    });
  } catch (error) {
    logger.error("Error abandoning quiz attempt:", error);
    return NextResponse.json(
      { error: "Failed to abandon attempt" },
      { status: 500 }
    );
  }
}
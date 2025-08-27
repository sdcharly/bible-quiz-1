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
    const { attemptId, answers, currentQuestionIndex, timeRemaining } = body;

    // Validate attempt belongs to user
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
        { error: "Invalid attempt" },
        { status: 404 }
      );
    }

    // Check if attempt is still in progress
    if (attempt.status !== "in_progress") {
      return NextResponse.json(
        { 
          error: "Attempt already completed",
          status: attempt.status 
        },
        { status: 400 }
      );
    }

    // Store auto-save data in answers array (using first element for metadata)
    // This is a workaround since we need to maintain the type
    const autoSaveAnswers = [
      {
        questionId: "_autosave_metadata",
        answer: JSON.stringify({
          currentQuestionIndex,
          timeRemaining,
          lastAutoSave: new Date().toISOString(),
        }),
        timeSpent: 0,
      },
      ...answers,
    ];

    // Update the attempt with auto-saved data
    await db
      .update(quizAttempts)
      .set({
        answers: autoSaveAnswers,
        updatedAt: new Date(),
      })
      .where(eq(quizAttempts.id, attemptId));

    logger.debug("Quiz auto-saved", {
      attemptId,
      quizId,
      answersCount: answers.length,
      studentId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Auto-save error:", error);
    return NextResponse.json(
      { error: "Failed to auto-save" },
      { status: 500 }
    );
  }
}

export async function GET(
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

    // Get the latest in-progress attempt
    const [attempt] = await db
      .select()
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.quizId, quizId),
          eq(quizAttempts.studentId, session.user.id),
          eq(quizAttempts.status, "in_progress")
        )
      )
      .orderBy(quizAttempts.createdAt)
      .limit(1);

    if (!attempt) {
      return NextResponse.json(
        { hasAutoSave: false },
        { status: 200 }
      );
    }

    // Parse auto-saved data if exists
    let autoSaveData = null;
    if (attempt.answers && Array.isArray(attempt.answers)) {
      const answers = attempt.answers as Array<{questionId: string, answer: string, timeSpent: number}>;
      
      // Look for metadata in first element
      const metadata = answers.find(a => a.questionId === "_autosave_metadata");
      
      if (metadata) {
        try {
          const metaData = JSON.parse(metadata.answer);
          autoSaveData = {
            attemptId: attempt.id,
            answers: answers.filter(a => a.questionId !== "_autosave_metadata"),
            currentQuestionIndex: metaData.currentQuestionIndex || 0,
            timeRemaining: metaData.timeRemaining,
            lastSaved: metaData.lastAutoSave,
          };
        } catch {
          // No valid metadata
        }
      }
    }

    return NextResponse.json({
      hasAutoSave: !!autoSaveData,
      autoSaveData,
    });
  } catch (error) {
    logger.error("Get auto-save error:", error);
    return NextResponse.json(
      { error: "Failed to get auto-save" },
      { status: 500 }
    );
  }
}
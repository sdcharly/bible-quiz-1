import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quizAttempts, questionResponses, questions, quizzes, user } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { quizCache } from "@/lib/quiz-cache";
// REMOVED RATE LIMITING: To support 100+ concurrent students taking quizzes
// Rate limiting was causing legitimate quiz submissions to fail

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const quizId = params.id;
    
    // Get session
    const session = await auth.api.getSession({
      headers: await headers()
    });

    // For testing, use a default student ID if no session
    let studentId = "default-student-id";
    let userTimezone = "Asia/Kolkata"; // Default timezone
    
    if (session?.user) {
      studentId = session.user.id;
      
      // Get user's timezone
      const [userRecord] = await db
        .select()
        .from(user)
        .where(eq(user.id, studentId));
      
      if (userRecord?.timezone) {
        userTimezone = userRecord.timezone;
      }
    }

    const body = await req.json();
    const { answers, timeSpent, attemptId } = body;

    // Fetch the quiz details
    const [quiz] = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, quizId));

    if (!quiz) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    // CRITICAL: Validate quiz time constraints
    const now = new Date();
    
    // Check if quiz has a start time
    if (!quiz.startTime) {
      return NextResponse.json(
        { error: "Quiz not scheduled", message: "This quiz has not been scheduled yet." },
        { status: 400 }
      );
    }
    
    // Check if quiz has started
    if (now < quiz.startTime) {
      return NextResponse.json(
        { error: "Quiz not started", message: "Cannot submit quiz before it starts." },
        { status: 425 }
      );
    }
    
    // Check if quiz has ended (with 5 minute grace period for network delays)
    const graceMinutes = 5;
    const endTime = new Date(quiz.startTime.getTime() + (quiz.duration + graceMinutes) * 60 * 1000);
    if (now > endTime) {
      return NextResponse.json(
        { error: "Quiz ended", message: "This quiz has ended and no longer accepts submissions." },
        { status: 410 }
      );
    }

    // Fetch all questions for this quiz to get correct answers
    const quizQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.quizId, quizId));

    // Calculate score
    let correctAnswers = 0;
    const totalQuestions = quizQuestions.length;
    
    interface AnswerInput {
      questionId: string;
      answer: string;
      markedForReview: boolean;
      timeSpent: number;
    }
    
    const evaluatedAnswers = answers.map((answer: AnswerInput) => {
      const question = quizQuestions.find(q => q.id === answer.questionId);
      const isCorrect = question?.correctAnswer === answer.answer;
      if (isCorrect) correctAnswers++;
      
      return {
        questionId: answer.questionId,
        answer: answer.answer,
        isCorrect,
        markedForReview: answer.markedForReview,
        timeSpent: answer.timeSpent,
      };
    });

    const score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    
    // If attemptId is provided, update the existing attempt
    // Otherwise, check for an existing in-progress attempt
    let finalAttemptId = attemptId;
    
    if (!attemptId) {
      // Check for existing in-progress attempt (backward compatibility)
      const [existingAttempt] = await db
        .select()
        .from(quizAttempts)
        .where(
          and(
            eq(quizAttempts.quizId, quizId),
            eq(quizAttempts.studentId, studentId),
            eq(quizAttempts.status, "in_progress")
          )
        );
      
      if (existingAttempt) {
        finalAttemptId = existingAttempt.id;
      } else {
        // No attempt found - this shouldn't happen in normal flow
        logger.error("No in-progress attempt found for quiz submission", {
          quizId,
          studentId
        });
        return NextResponse.json(
          { error: "No active quiz attempt found. Please start the quiz first." },
          { status: 400 }
        );
      }
    }
    
    // Verify the attempt belongs to this student and is in progress
    const [attemptToUpdate] = await db
      .select()
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.id, finalAttemptId),
          eq(quizAttempts.studentId, studentId),
          eq(quizAttempts.quizId, quizId)
        )
      );
    
    if (!attemptToUpdate) {
      logger.error("Invalid attempt ID for submission", {
        attemptId: finalAttemptId,
        studentId,
        quizId
      });
      return NextResponse.json(
        { error: "Invalid quiz attempt" },
        { status: 403 }
      );
    }
    
    if (attemptToUpdate.status === "completed") {
      logger.warn("Attempt to submit already completed quiz", {
        attemptId: finalAttemptId,
        studentId
      });
      return NextResponse.json(
        { 
          error: "Quiz already submitted",
          message: "This quiz has already been completed and submitted.",
          attemptId: finalAttemptId
        },
        { status: 400 }
      );
    }
    
    // Update the existing attempt
    await db
      .update(quizAttempts)
      .set({
        endTime: new Date(),
        score: Math.round(score),
        totalQuestions,
        totalCorrect: correctAnswers,
        timeSpent: timeSpent,
        timezone: userTimezone,
        status: "completed",
        answers: evaluatedAnswers,
        updatedAt: new Date(),
      })
      .where(eq(quizAttempts.id, finalAttemptId));

    // Save individual question responses
    for (const answer of evaluatedAnswers) {
      await db.insert(questionResponses).values({
        id: crypto.randomUUID(),
        attemptId: finalAttemptId,
        questionId: answer.questionId,
        selectedAnswer: answer.answer,
        isCorrect: answer.isCorrect,
        timeSpent: answer.timeSpent,
        markedForReview: answer.markedForReview,
        answeredAt: new Date(),
      });
    }
    
    logger.info("Quiz submitted successfully", {
      attemptId: finalAttemptId,
      studentId,
      score: Math.round(score)
    });

    // Security: Don't return score or results immediately
    // Students must wait until quiz duration expires to see results
    // This prevents sharing answers with other students still taking the quiz
    return NextResponse.json({
      success: true,
      attemptId: finalAttemptId,
      message: "Quiz submitted successfully. Results will be available after the quiz time expires for all students."
    });

  } catch (error) {
    console.error("Error submitting quiz:", error);
    return NextResponse.json(
      { error: "Failed to submit quiz" },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quizAttempts, questionResponses, questions, quizzes, user } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

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
    const { answers, timeSpent } = body;

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
    
    // Note: Grade calculation happens when results are retrieved, not during submission
    // This ensures consistent grading across the application and prevents data leakage

    // Create quiz attempt record
    const attemptId = crypto.randomUUID();
    
    await db.insert(quizAttempts).values({
      id: attemptId,
      quizId,
      studentId,
      startTime: new Date(Date.now() - (timeSpent * 1000)), // Calculate start time
      endTime: new Date(),
      score: Math.round(score),
      totalQuestions,
      totalCorrect: correctAnswers,
      timeSpent: timeSpent,
      timezone: userTimezone, // Store the user's timezone with the attempt
      status: "completed",
      answers: evaluatedAnswers,
      createdAt: new Date(),
    });

    // Save individual question responses
    for (const answer of evaluatedAnswers) {
      await db.insert(questionResponses).values({
        id: crypto.randomUUID(),
        attemptId,
        questionId: answer.questionId,
        selectedAnswer: answer.answer,
        isCorrect: answer.isCorrect,
        timeSpent: answer.timeSpent,
        markedForReview: answer.markedForReview,
        answeredAt: new Date(),
      });
    }

    // Security: Don't return score or results immediately
    // Students must wait until quiz duration expires to see results
    // This prevents sharing answers with other students still taking the quiz
    return NextResponse.json({
      success: true,
      attemptId,
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
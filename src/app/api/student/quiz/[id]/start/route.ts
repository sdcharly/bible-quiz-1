import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quizzes, questions, quizAttempts } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
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
    
    if (session?.user) {
      studentId = session.user.id;
    }

    // Check if student has already attempted this quiz
    const existingAttempt = await db
      .select()
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.quizId, quizId),
          eq(quizAttempts.studentId, studentId)
        )
      );

    if (existingAttempt.length > 0) {
      const attempt = existingAttempt[0];
      
      // If quiz is completed, don't allow restart
      if (attempt.status === "completed") {
        return NextResponse.json(
          { 
            error: "Quiz already completed",
            message: "You have already completed this quiz. Each quiz can only be taken once.",
            attemptId: attempt.id
          },
          { status: 403 }
        );
      }
      
      // If quiz is in progress, resume it
      if (attempt.status === "in_progress") {
        // Calculate remaining time
        const elapsedTime = Math.floor((Date.now() - attempt.startTime.getTime()) / 1000);
        const quiz = await db
          .select()
          .from(quizzes)
          .where(eq(quizzes.id, quizId));
          
        const remainingTime = Math.max(0, (quiz[0].duration * 60) - elapsedTime);
        
        if (remainingTime <= 0) {
          // Time's up, mark as completed
          await db
            .update(quizAttempts)
            .set({ 
              status: "completed",
              endTime: new Date()
            })
            .where(eq(quizAttempts.id, attempt.id));
            
          return NextResponse.json(
            { 
              error: "Quiz time expired",
              message: "Your quiz time has expired. The quiz has been automatically submitted.",
              attemptId: attempt.id
            },
            { status: 403 }
          );
        }
        
        // Return existing quiz data with remaining time
        const quizQuestions = await db
          .select()
          .from(questions)
          .where(eq(questions.quizId, quizId));

        return NextResponse.json({
          quiz: {
            id: quiz[0].id,
            title: quiz[0].title,
            duration: quiz[0].duration,
            totalQuestions: quiz[0].totalQuestions,
            questions: quizQuestions.map(q => ({
              id: q.id,
              questionText: q.questionText,
              options: q.options,
              orderIndex: q.orderIndex,
              book: q.book,
              chapter: q.chapter,
              topic: q.topic,
              bloomsLevel: q.bloomsLevel,
            })).sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
          },
          attemptId: attempt.id,
          remainingTime,
          resumed: true
        });
      }
    }

    // Fetch quiz details
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

    // Check if quiz has started
    const now = new Date();
    if (quiz.startTime && now < quiz.startTime) {
      return NextResponse.json(
        { 
          error: "Quiz not started",
          message: `This quiz will start at ${quiz.startTime.toLocaleString()}`
        },
        { status: 425 }
      );
    }

    // Fetch quiz questions (without correct answers)
    const quizQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.quizId, quizId));

    // Create new attempt
    const attemptId = crypto.randomUUID();
    
    await db.insert(quizAttempts).values({
      id: attemptId,
      quizId,
      studentId,
      startTime: new Date(),
      status: "in_progress",
      answers: [],
      totalQuestions: quizQuestions.length,
      createdAt: new Date(),
    });

    // Return quiz data without correct answers
    return NextResponse.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        duration: quiz.duration,
        totalQuestions: quiz.totalQuestions,
        questions: quizQuestions.map(q => ({
          id: q.id,
          questionText: q.questionText,
          options: q.options,
          orderIndex: q.orderIndex,
          book: q.book,
          chapter: q.chapter,
          topic: q.topic,
          bloomsLevel: q.bloomsLevel,
        })).sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
      },
      attemptId,
      remainingTime: quiz.duration * 60 // Full time in seconds
    });

  } catch (error) {
    console.error("Error starting quiz:", error);
    return NextResponse.json(
      { error: "Failed to start quiz" },
      { status: 500 }
    );
  }
}
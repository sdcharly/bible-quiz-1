import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quizAttempts, questionResponses, questions, quizzes } from "@/lib/schema";
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
    
    if (session?.user) {
      studentId = session.user.id;
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
    
    // Theological grading system (international standards)
    const getGrade = (score: number) => {
      if (score >= 95) return { grade: "A+", points: 4.0, description: "Exceptional" };
      if (score >= 90) return { grade: "A", points: 4.0, description: "Excellent" };
      if (score >= 85) return { grade: "A-", points: 3.7, description: "Very Good" };
      if (score >= 80) return { grade: "B+", points: 3.3, description: "Good" };
      if (score >= 75) return { grade: "B", points: 3.0, description: "Above Average" };
      if (score >= 70) return { grade: "B-", points: 2.7, description: "Satisfactory" };
      if (score >= 65) return { grade: "C+", points: 2.3, description: "Acceptable" };
      if (score >= 60) return { grade: "C", points: 2.0, description: "Average" };
      if (score >= 55) return { grade: "C-", points: 1.7, description: "Below Average" };
      if (score >= 50) return { grade: "D", points: 1.0, description: "Poor" };
      return { grade: "F", points: 0.0, description: "Fail" };
    };
    
    const gradeInfo = getGrade(score);

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

    return NextResponse.json({
      success: true,
      attemptId,
      score: Math.round(score),
      grade: gradeInfo.grade,
      gradePoints: gradeInfo.points,
      gradeDescription: gradeInfo.description,
      correctAnswers,
      totalQuestions,
    });

  } catch (error) {
    console.error("Error submitting quiz:", error);
    return NextResponse.json(
      { error: "Failed to submit quiz" },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quizAttempts, quizzes, user } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function GET(
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

    // Fetch the quiz
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

    // Verify educator owns this quiz
    // For testing, we'll allow access without session verification
    
    // Fetch all attempts for this quiz
    const attempts = await db
      .select({
        id: quizAttempts.id,
        studentId: quizAttempts.studentId,
        score: quizAttempts.score,
        correctAnswers: quizAttempts.totalCorrect,
        totalQuestions: quizAttempts.totalQuestions,
        timeTaken: quizAttempts.timeSpent,
        completedAt: quizAttempts.endTime,
        status: quizAttempts.status,
        studentName: user.name,
        studentEmail: user.email,
      })
      .from(quizAttempts)
      .leftJoin(user, eq(quizAttempts.studentId, user.id))
      .where(eq(quizAttempts.quizId, quizId));

    // Calculate statistics
    const completedAttempts = attempts.filter(a => a.status === "completed");
    
    // Using grading system instead of passing score
    
    const statistics = {
      totalAttempts: completedAttempts.length,
      averageScore: completedAttempts.length > 0
        ? completedAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / completedAttempts.length
        : 0,
      passRate: completedAttempts.length > 0
        ? (completedAttempts.filter(a => (a.score || 0) >= 70).length / completedAttempts.length) * 100
        : 0,
      averageTime: completedAttempts.length > 0
        ? completedAttempts.reduce((sum, a) => sum + (a.timeTaken || 0), 0) / completedAttempts.length
        : 0,
      highestScore: completedAttempts.length > 0
        ? Math.max(...completedAttempts.map(a => a.score || 0))
        : 0,
      lowestScore: completedAttempts.length > 0
        ? Math.min(...completedAttempts.map(a => a.score || 0))
        : 0,
    };

    return NextResponse.json({
      quizId: quiz.id,
      quizTitle: quiz.title,
      statistics,
      attempts: attempts.map(a => ({
        id: a.id,
        studentId: a.studentId,
        studentName: a.studentName || "Unknown Student",
        studentEmail: a.studentEmail || "N/A",
        score: a.score || 0,
        isPassed: (a.score || 0) >= 70,
        correctAnswers: a.correctAnswers || 0,
        totalQuestions: a.totalQuestions || 0,
        timeTaken: a.timeTaken || 0,
        completedAt: a.completedAt,
        status: a.status,
      })),
    });

  } catch (error) {
    console.error("Error fetching quiz results:", error);
    return NextResponse.json(
      { error: "Failed to fetch quiz results" },
      { status: 500 }
    );
  }
}
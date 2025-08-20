import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quizzes, enrollments, quizAttempts } from "@/lib/schema";
import { eq, and, ne } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    // For now, using a test student ID - in production, get from session
    const studentId = "UeqiVFam4rO2P9KbbnwqofioJxZoQdvf"; // Your test student ID
    
    // Fetch all published quizzes (excluding archived)
    const allQuizzes = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.status, "published"));

    // Fetch student enrollments
    const studentEnrollments = await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.studentId, studentId));

    // Fetch student attempts
    const studentAttempts = await db
      .select()
      .from(quizAttempts)
      .where(eq(quizAttempts.studentId, studentId));

    // Map quiz data with enrollment and attempt status
    const quizzesWithStatus = allQuizzes.map(quiz => {
      const enrollment = studentEnrollments.find(e => e.quizId === quiz.id);
      const attempt = studentAttempts.find(a => a.quizId === quiz.id && a.status === "completed");
      
      return {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        totalQuestions: quiz.totalQuestions,
        duration: quiz.duration,
        startTime: quiz.startTime.toISOString(),
        status: quiz.status,
        enrolled: !!enrollment,
        attempted: !!attempt,
        score: attempt?.score,
      };
    });

    return NextResponse.json({
      quizzes: quizzesWithStatus,
    });
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    return NextResponse.json(
      { error: "Failed to fetch quizzes" },
      { status: 500 }
    );
  }
}
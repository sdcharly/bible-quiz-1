import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quizzes, enrollments, quizAttempts, educatorStudents } from "@/lib/schema";
import { eq, and, ne, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    // Get session
    const session = await auth.api.getSession({
      headers: await headers()
    });

    // Require authenticated student
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json(
        { error: "Unauthorized - Student access required" },
        { status: 401 }
      );
    }
    
    const studentId = session.user.id;
    
    // First, get all educators this student is associated with
    const studentEducators = await db
      .select({ educatorId: educatorStudents.educatorId })
      .from(educatorStudents)
      .where(
        and(
          eq(educatorStudents.studentId, studentId),
          eq(educatorStudents.status, "active")
        )
      );

    if (studentEducators.length === 0) {
      // Student not associated with any educator yet
      return NextResponse.json({
        quizzes: [],
        message: "You are not enrolled with any educator yet. Please accept an invitation from an educator first."
      });
    }

    const educatorIds = studentEducators.map(se => se.educatorId);

    // Fetch only published quizzes from associated educators
    const educatorQuizzes = await db
      .select()
      .from(quizzes)
      .where(
        and(
          eq(quizzes.status, "published"),
          inArray(quizzes.educatorId, educatorIds)
        )
      );

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
    const quizzesWithStatus = educatorQuizzes.map(quiz => {
      const enrollment = studentEnrollments.find(e => e.quizId === quiz.id);
      const attempt = studentAttempts.find(a => a.quizId === quiz.id && a.status === "completed");
      
      return {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        totalQuestions: quiz.totalQuestions,
        duration: quiz.duration,
        startTime: quiz.startTime.toISOString(),
        timezone: quiz.timezone,
        status: quiz.status,
        enrolled: !!enrollment,
        attempted: !!attempt,
        attemptId: attempt?.id,
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
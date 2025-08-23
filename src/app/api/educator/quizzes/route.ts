import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quizzes, enrollments } from "@/lib/schema";
import { eq, count } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    // Get session
    const session = await auth.api.getSession({
      headers: await headers()
    });

    // Require authenticated educator
    if (!session?.user || session.user.role !== 'educator') {
      return NextResponse.json(
        { error: "Unauthorized - Educator access required" },
        { status: 401 }
      );
    }
    
    const educatorId = session.user.id;

    // Fetch all quizzes for this educator
    const educatorQuizzes = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.educatorId, educatorId))
      .orderBy(quizzes.createdAt);

    // Get enrollment counts for each quiz
    const quizzesWithStats = await Promise.all(
      educatorQuizzes.map(async (quiz) => {
        // Count enrolled students
        const enrollmentCount = await db
          .select({ count: count() })
          .from(enrollments)
          .where(eq(enrollments.quizId, quiz.id));

        return {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          status: quiz.status,
          totalQuestions: quiz.totalQuestions,
          duration: quiz.duration,
          startTime: quiz.startTime?.toISOString() || null,
          timezone: quiz.timezone,
          createdAt: quiz.createdAt.toISOString(),
          updatedAt: quiz.updatedAt.toISOString(),
          enrolledStudents: enrollmentCount[0]?.count || 0,
          configuration: quiz.configuration,
        };
      })
    );

    return NextResponse.json({
      quizzes: quizzesWithStats,
    });
  } catch (error) {
    console.error("Error fetching educator quizzes:", error);
    return NextResponse.json(
      { error: "Failed to fetch quizzes" },
      { status: 500 }
    );
  }
}
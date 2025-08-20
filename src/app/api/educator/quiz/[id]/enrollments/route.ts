import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enrollments, user, quizAttempts } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const quizId = params.id;

    // Fetch all enrollments for this quiz with user details and attempt status
    const quizEnrollments = await db
      .select({
        id: enrollments.id,
        studentId: enrollments.studentId,
        enrolledAt: enrollments.enrolledAt,
        status: enrollments.status,
        startedAt: enrollments.startedAt,
        completedAt: enrollments.completedAt,
        name: user.name,
        email: user.email,
      })
      .from(enrollments)
      .leftJoin(user, eq(enrollments.studentId, user.id))
      .where(eq(enrollments.quizId, quizId));

    // Get attempt data for completed quizzes
    const attemptData = await db
      .select({
        studentId: quizAttempts.studentId,
        score: quizAttempts.score,
        completedAt: quizAttempts.endTime,
      })
      .from(quizAttempts)
      .where(eq(quizAttempts.quizId, quizId));

    // Combine enrollment data with attempt results
    const enrollmentsWithResults = quizEnrollments.map(enrollment => {
      const attempt = attemptData.find(a => a.studentId === enrollment.studentId);
      
      return {
        id: enrollment.id,
        name: enrollment.name,
        email: enrollment.email,
        enrolledAt: enrollment.enrolledAt.toISOString(),
        status: enrollment.status,
        score: attempt?.score ? Math.round(attempt.score) : undefined,
        completedAt: attempt?.completedAt?.toISOString() || enrollment.completedAt?.toISOString(),
      };
    });

    return NextResponse.json({
      enrollments: enrollmentsWithResults
    });
  } catch (error) {
    console.error("Error fetching enrollments:", error);
    return NextResponse.json(
      { error: "Failed to fetch enrollments" },
      { status: 500 }
    );
  }
}
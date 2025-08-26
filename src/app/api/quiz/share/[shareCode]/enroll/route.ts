import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";
import * as crypto from "crypto";
import { db } from "@/lib/db";
import { quizShareLinks, quizzes, enrollments, educatorStudents } from "@/lib/schema";
import { auth } from "@/lib/auth";


export async function POST(
  req: NextRequest,
  context: { params: Promise<{ shareCode: string }> }
) {
  try {
    const params = await context.params;
    const shareCode = params.shareCode;

    // Get session - require authenticated student
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json(
        { error: "Student authentication required" },
        { status: 401 }
      );
    }

    const studentId = session.user.id;

    // Find the share link
    const [shareLink] = await db
      .select()
      .from(quizShareLinks)
      .where(eq(quizShareLinks.shareCode, shareCode));

    if (!shareLink) {
      return NextResponse.json(
        { error: "Invalid share link" },
        { status: 404 }
      );
    }

    // Check if link has expired
    if (shareLink.expiresAt && new Date(shareLink.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "This share link has expired" },
        { status: 410 }
      );
    }

    // Get quiz details
    const [quiz] = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, shareLink.quizId));

    if (!quiz || quiz.status !== 'published') {
      return NextResponse.json(
        { error: "Quiz not available for enrollment" },
        { status: 404 }
      );
    }

    // Check if already enrolled
    const [existingEnrollment] = await db
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.quizId, quiz.id),
          eq(enrollments.studentId, studentId)
        )
      );

    if (existingEnrollment) {
      return NextResponse.json({
        message: "Already enrolled",
        enrollmentId: existingEnrollment.id,
        quizId: quiz.id
      });
    }

    // Check if student has relation with educator, if not create it
    const [educatorRelation] = await db
      .select()
      .from(educatorStudents)
      .where(
        and(
          eq(educatorStudents.studentId, studentId),
          eq(educatorStudents.educatorId, quiz.educatorId)
        )
      );

    if (!educatorRelation) {
      // Create educator-student relationship
      await db.insert(educatorStudents).values({
        id: crypto.randomUUID(),
        educatorId: quiz.educatorId,
        studentId: studentId,
        status: 'active',
        enrolledAt: new Date(),
        updatedAt: new Date()
      });
    }

    // Create enrollment
    const enrollmentId = crypto.randomUUID();
    await db.insert(enrollments).values({
      id: enrollmentId,
      quizId: quiz.id,
      studentId: studentId,
      enrolledAt: new Date(),
      status: 'enrolled'
    });

    return NextResponse.json({
      success: true,
      message: "Successfully enrolled in quiz",
      enrollmentId,
      quizId: quiz.id
    });

  } catch (error) {
    // [REMOVED: Console statement for performance]
    return NextResponse.json(
      { error: "Failed to enroll in quiz" },
      { status: 500 }
    );
  }
}
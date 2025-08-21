import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enrollments, quizzes, educatorStudents } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import * as crypto from "crypto";

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

    // Require authenticated student
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json(
        { error: "Unauthorized - Student access required" },
        { status: 401 }
      );
    }
    
    const studentId = session.user.id;

    // Check if quiz exists and is published
    const quiz = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, quizId))
      .limit(1);

    if (!quiz.length) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    if (quiz[0].status !== "published") {
      return NextResponse.json(
        { error: "Quiz is not available for enrollment" },
        { status: 400 }
      );
    }

    // Check if student is associated with the quiz's educator
    const educatorRelation = await db
      .select()
      .from(educatorStudents)
      .where(
        and(
          eq(educatorStudents.studentId, studentId),
          eq(educatorStudents.educatorId, quiz[0].educatorId),
          eq(educatorStudents.status, "active")
        )
      )
      .limit(1);

    if (educatorRelation.length === 0) {
      return NextResponse.json(
        { 
          error: "Access denied",
          message: "You must be associated with this quiz's educator to enroll"
        },
        { status: 403 }
      );
    }

    // Check if already enrolled
    const existingEnrollment = await db
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.quizId, quizId),
          eq(enrollments.studentId, studentId)
        )
      )
      .limit(1);

    if (existingEnrollment.length > 0) {
      return NextResponse.json(
        { 
          success: true,
          message: "You are already enrolled in this quiz",
          alreadyEnrolled: true
        }
      );
    }

    // Create enrollment
    const enrollmentId = crypto.randomUUID();
    await db.insert(enrollments).values({
      id: enrollmentId,
      quizId,
      studentId,
      enrolledAt: new Date(),
      status: "enrolled",
    });

    return NextResponse.json({
      success: true,
      message: "Successfully enrolled in quiz",
      enrollmentId
    });

  } catch (error) {
    console.error("Error enrolling in quiz:", error);
    return NextResponse.json(
      { error: "Failed to enroll in quiz" },
      { status: 500 }
    );
  }
}
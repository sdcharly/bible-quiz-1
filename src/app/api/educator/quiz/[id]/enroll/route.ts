import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import * as crypto from "crypto";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { enrollments, user, quizzes, educatorStudents } from "@/lib/schema";
import { calculateQuizAvailability } from "@/lib/quiz-availability";
import { auth } from "@/lib/auth";


export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const quizId = params.id;
    const { studentEmail } = await req.json();

    // Get session and verify educator
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user || session.user.role !== 'educator') {
      return NextResponse.json(
        { error: "Unauthorized - Educator access required" },
        { status: 401 }
      );
    }

    const educatorId = session.user.id;

    if (!studentEmail) {
      return NextResponse.json(
        { error: "Student email is required" },
        { status: 400 }
      );
    }

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

    // CRITICAL: Verify educator owns this quiz
    if (quiz[0].educatorId !== educatorId) {
      return NextResponse.json(
        { error: "Unauthorized - You don't own this quiz" },
        { status: 403 }
      );
    }

    if (quiz[0].status !== "published") {
      return NextResponse.json(
        { error: "Quiz is not published yet" },
        { status: 400 }
      );
    }

    // Check if quiz has expired
    const availability = calculateQuizAvailability({
      startTime: quiz[0].startTime,
      timezone: quiz[0].timezone,
      duration: quiz[0].duration,
      status: quiz[0].status,
      isReassignment: false,
      attempted: false
    });
    if (availability.status === 'ended') {
      const endTime = availability.endTime ? new Date(availability.endTime).toLocaleString() : 'unknown';
      return NextResponse.json(
        { 
          error: `Cannot enroll students in an expired quiz. This quiz ended on ${endTime}.`,
          suggestion: "You can create a new quiz with the same content or use the reassignment feature for specific students who missed the original deadline."
        },
        { status: 400 }
      );
    }

    // Find student by email
    const student = await db
      .select()
      .from(user)
      .where(eq(user.email, studentEmail.toLowerCase().trim()))
      .limit(1);

    if (!student.length) {
      return NextResponse.json(
        { error: "Student not found. The student needs to create an account first." },
        { status: 404 }
      );
    }

    const studentId = student[0].id;

    // CRITICAL: Verify student belongs to this educator
    const relationship = await db
      .select()
      .from(educatorStudents)
      .where(
        and(
          eq(educatorStudents.educatorId, educatorId),
          eq(educatorStudents.studentId, studentId),
          eq(educatorStudents.status, "active")
        )
      )
      .limit(1);

    if (!relationship.length) {
      return NextResponse.json(
        { error: "Student is not associated with your educator account. Please add them as your student first." },
        { status: 403 }
      );
    }

    // Check if student is already enrolled
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
        { error: "Student is already enrolled in this quiz" },
        { status: 409 }
      );
    }

    // Enroll the student
    const enrollmentId = crypto.randomUUID();
    await db.insert(enrollments).values({
      id: enrollmentId,
      quizId,
      studentId,
      enrolledAt: new Date(),
      status: "enrolled"
    });

    return NextResponse.json({
      success: true,
      message: `${student[0].name} has been enrolled in the quiz successfully`,
      enrollment: {
        id: enrollmentId,
        studentName: student[0].name,
        studentEmail: student[0].email,
        enrolledAt: new Date().toISOString()
      }
    });

  } catch (error) {
    // [REMOVED: Console statement for performance]
    return NextResponse.json(
      { error: "Failed to enroll student" },
      { status: 500 }
    );
  }
}
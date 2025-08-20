import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enrollments, educatorStudents, user, quizzes } from "@/lib/schema";
import { eq, and, inArray } from "drizzle-orm";
import * as crypto from "crypto";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const quizId = params.id;
    const { studentIds, enrollAll } = await req.json();

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
        { error: "Quiz must be published before enrolling students" },
        { status: 400 }
      );
    }

    const educatorId = quiz[0].educatorId;
    let studentsToEnroll: string[] = [];

    if (enrollAll) {
      // Get all active students under this educator
      const allStudents = await db
        .select({ studentId: educatorStudents.studentId })
        .from(educatorStudents)
        .where(
          and(
            eq(educatorStudents.educatorId, educatorId),
            eq(educatorStudents.status, "active")
          )
        );
      
      studentsToEnroll = allStudents.map(s => s.studentId);
    } else if (studentIds && Array.isArray(studentIds)) {
      // Verify that all provided student IDs belong to this educator
      const validStudents = await db
        .select({ studentId: educatorStudents.studentId })
        .from(educatorStudents)
        .where(
          and(
            eq(educatorStudents.educatorId, educatorId),
            inArray(educatorStudents.studentId, studentIds)
          )
        );
      
      studentsToEnroll = validStudents.map(s => s.studentId);
    } else {
      return NextResponse.json(
        { error: "No students specified for enrollment" },
        { status: 400 }
      );
    }

    // Check existing enrollments
    const existingEnrollments = await db
      .select({ studentId: enrollments.studentId })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.quizId, quizId),
          inArray(enrollments.studentId, studentsToEnroll)
        )
      );

    const alreadyEnrolled = new Set(existingEnrollments.map(e => e.studentId));
    const newEnrollments = studentsToEnroll.filter(id => !alreadyEnrolled.has(id));

    // Create new enrollments
    const enrollmentRecords = [];
    for (const studentId of newEnrollments) {
      enrollmentRecords.push({
        id: crypto.randomUUID(),
        quizId,
        studentId,
        enrolledAt: new Date(),
        status: "enrolled" as const,
      });
    }

    if (enrollmentRecords.length > 0) {
      await db.insert(enrollments).values(enrollmentRecords);
    }

    // Get student details for response
    const enrolledStudentDetails = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
      })
      .from(user)
      .where(inArray(user.id, newEnrollments));

    return NextResponse.json({
      success: true,
      message: `Successfully enrolled ${newEnrollments.length} student(s)`,
      enrolledCount: newEnrollments.length,
      alreadyEnrolledCount: alreadyEnrolled.size,
      enrolledStudents: enrolledStudentDetails,
    });

  } catch (error) {
    console.error("Error bulk enrolling students:", error);
    return NextResponse.json(
      { error: "Failed to enroll students" },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch educator's students for selection
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const quizId = params.id;

    // Get quiz to find educator
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

    const educatorId = quiz[0].educatorId;

    // Get all students under this educator
    const students = await db
      .select({
        studentId: educatorStudents.studentId,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
      })
      .from(educatorStudents)
      .innerJoin(user, eq(educatorStudents.studentId, user.id))
      .where(
        and(
          eq(educatorStudents.educatorId, educatorId),
          eq(educatorStudents.status, "active")
        )
      );

    // Check which students are already enrolled
    const enrollmentStatus = await db
      .select({ studentId: enrollments.studentId })
      .from(enrollments)
      .where(eq(enrollments.quizId, quizId));

    const enrolledSet = new Set(enrollmentStatus.map(e => e.studentId));

    const studentsWithEnrollment = students.map(student => ({
      ...student,
      isEnrolled: enrolledSet.has(student.studentId),
    }));

    return NextResponse.json({
      students: studentsWithEnrollment,
      total: students.length,
      enrolled: enrolledSet.size,
    });

  } catch (error) {
    console.error("Error fetching students for enrollment:", error);
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 }
    );
  }
}
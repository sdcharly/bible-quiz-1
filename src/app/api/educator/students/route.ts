import { NextRequest, NextResponse } from "next/server";
import { eq, and, count, desc } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { educatorStudents, user, enrollments, quizAttempts } from "@/lib/schema";
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

    // Fetch all students under this educator - sorted by latest signup first
    const students = await db
      .select({
        relationshipId: educatorStudents.id,
        studentId: educatorStudents.studentId,
        status: educatorStudents.status,
        enrolledAt: educatorStudents.enrolledAt,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
      })
      .from(educatorStudents)
      .innerJoin(user, eq(educatorStudents.studentId, user.id))
      .where(eq(educatorStudents.educatorId, educatorId))
      .orderBy(desc(educatorStudents.enrolledAt));

    // Get statistics for each student
    const studentsWithStats = await Promise.all(
      students.map(async (student) => {
        // Count enrollments
        const enrollmentCount = await db
          .select({ count: count() })
          .from(enrollments)
          .where(eq(enrollments.studentId, student.studentId));

        // Count completed quizzes
        const completedCount = await db
          .select({ count: count() })
          .from(quizAttempts)
          .where(
            and(
              eq(quizAttempts.studentId, student.studentId),
              eq(quizAttempts.status, "completed")
            )
          );

        return {
          ...student,
          totalEnrollments: enrollmentCount[0]?.count || 0,
          completedQuizzes: completedCount[0]?.count || 0,
        };
      })
    );

    return NextResponse.json({
      students: studentsWithStats,
      total: studentsWithStats.length,
    });

  } catch (error) {
    // [REMOVED: Console statement for performance]
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 }
    );
  }
}

// Add a new student to educator's list
export async function POST(req: NextRequest) {
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

    const { studentEmail } = await req.json();
    
    if (!studentEmail) {
      return NextResponse.json(
        { error: "Student email is required" },
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
        { error: "Student not found. Please send an invitation first." },
        { status: 404 }
      );
    }

    const studentId = student[0].id;

    // Check if relationship already exists
    const existingRelation = await db
      .select()
      .from(educatorStudents)
      .where(
        and(
          eq(educatorStudents.educatorId, educatorId),
          eq(educatorStudents.studentId, studentId)
        )
      )
      .limit(1);

    if (existingRelation.length > 0) {
      // Reactivate if inactive
      if (existingRelation[0].status === "inactive") {
        await db
          .update(educatorStudents)
          .set({ status: "active", updatedAt: new Date() })
          .where(eq(educatorStudents.id, existingRelation[0].id));

        return NextResponse.json({
          success: true,
          message: "Student reactivated successfully",
        });
      }

      return NextResponse.json(
        { error: "Student already exists in your list" },
        { status: 409 }
      );
    }

    // Create new educator-student relationship
    await db.insert(educatorStudents).values({
      id: crypto.randomUUID(),
      educatorId,
      studentId,
      status: "active",
      enrolledAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: `${student[0].name} has been added to your student list`,
      student: {
        id: studentId,
        name: student[0].name,
        email: student[0].email,
        phoneNumber: student[0].phoneNumber,
      },
    });

  } catch (error) {
    // [REMOVED: Console statement for performance]
    return NextResponse.json(
      { error: "Failed to add student" },
      { status: 500 }
    );
  }
}
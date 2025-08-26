import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { getAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { educatorStudents, user, activityLogs } from "@/lib/schema";
import { logger } from "@/lib/logger";


export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    const { educatorId } = await request.json();

    if (!educatorId) {
      return NextResponse.json(
        { error: "Educator ID is required" },
        { status: 400 }
      );
    }

    const [student] = await db
      .select()
      .from(user)
      .where(and(eq(user.id, params.id), eq(user.role, "student")));

    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    const [educator] = await db
      .select()
      .from(user)
      .where(
        and(
          eq(user.id, educatorId),
          eq(user.role, "educator"),
          eq(user.approvalStatus, "approved")
        )
      );

    if (!educator) {
      return NextResponse.json(
        { error: "Educator not found or not approved" },
        { status: 404 }
      );
    }

    const [existingConnection] = await db
      .select()
      .from(educatorStudents)
      .where(
        and(
          eq(educatorStudents.studentId, params.id),
          eq(educatorStudents.educatorId, educatorId)
        )
      );

    if (existingConnection) {
      return NextResponse.json(
        { error: "Student is already connected to this educator" },
        { status: 400 }
      );
    }

    const connectionId = crypto.randomUUID();
    await db.insert(educatorStudents).values({
      id: connectionId,
      educatorId,
      studentId: params.id,
      status: "active",
      enrolledAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(activityLogs).values({
      id: crypto.randomUUID(),
      userId: session.id,
      actionType: "attach_student_to_educator",
      entityType: "educator_students",
      entityId: connectionId,
      details: {
        studentId: params.id,
        studentEmail: student.email,
        educatorId,
        educatorEmail: educator.email,
        attachedBy: session.email,
      },
      createdAt: new Date(),
    });

    logger.info("Student attached to educator", {
      studentId: params.id,
      educatorId,
      adminEmail: session.email,
    });

    return NextResponse.json({
      success: true,
      message: "Student successfully attached to educator",
      data: {
        connectionId,
        studentEmail: student.email,
        educatorEmail: educator.email,
      },
    });
  } catch (error) {
    logger.error("Error attaching student to educator:", error);
    return NextResponse.json(
      { error: "Failed to attach student to educator" },
      { status: 500 }
    );
  }
}
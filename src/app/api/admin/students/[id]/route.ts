import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth, logActivity } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdminAuth();
    const studentId = params.id;

    // Get student details before deletion
    const [student] = await db
      .select()
      .from(user)
      .where(eq(user.id, studentId))
      .limit(1);

    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    if (student.role !== "student") {
      return NextResponse.json(
        { error: "User is not a student" },
        { status: 400 }
      );
    }

    // Delete the student (cascading will handle related records)
    await db
      .delete(user)
      .where(eq(user.id, studentId));

    // Log activity
    await logActivity(
      session.id,
      "delete_student",
      "user",
      studentId,
      {
        studentEmail: student.email,
        studentName: student.name,
        deletedBy: session.email,
      }
    );

    return NextResponse.json({
      success: true,
      message: "Student deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting student:", error);
    
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete student" },
      { status: 500 }
    );
  }
}
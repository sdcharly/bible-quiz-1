import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth, logActivity } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdminAuth();
    const educatorId = params.id;

    // Get educator details
    const [educator] = await db
      .select()
      .from(user)
      .where(eq(user.id, educatorId))
      .limit(1);

    if (!educator) {
      return NextResponse.json(
        { error: "Educator not found" },
        { status: 404 }
      );
    }

    // Update educator status to suspended
    await db
      .update(user)
      .set({
        approvalStatus: "suspended",
        permissions: {
          canPublishQuiz: false,
          canAddStudents: false,
          canEditQuiz: false,
          canDeleteQuiz: false,
          canViewAnalytics: true, // Allow viewing but not modifying
          canExportData: false,
          maxStudents: 0,
          maxQuizzes: 0,
          maxQuestionsPerQuiz: 0,
        },
      })
      .where(eq(user.id, educatorId));

    // Log activity
    await logActivity(
      session.id,
      "suspend_educator",
      "user",
      educatorId,
      {
        educatorEmail: educator.email,
        educatorName: educator.name,
        suspendedBy: session.email,
      }
    );

    return NextResponse.json({
      success: true,
      message: "Educator suspended successfully",
    });
  } catch (error) {
    console.error("Error suspending educator:", error);
    
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to suspend educator" },
      { status: 500 }
    );
  }
}
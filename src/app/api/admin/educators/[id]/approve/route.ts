import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth, logActivity } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: educatorId } = await params;
    console.log("Approve educator API called with ID:", educatorId);
    
    const session = await requireAdminAuth();
    console.log("Admin session:", session);

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

    // Update educator status
    await db
      .update(user)
      .set({
        role: "educator",
        approvalStatus: "approved",
        approvedBy: session.id,
        approvedAt: new Date(),
        permissions: {
          canPublishQuiz: true,
          canAddStudents: true,
          canEditQuiz: true,
          canDeleteQuiz: true,
          canViewAnalytics: true,
          canExportData: true,
          maxStudents: 100,
          maxQuizzes: 50,
          maxQuestionsPerQuiz: 100,
        },
      })
      .where(eq(user.id, educatorId));

    // Log activity
    await logActivity(
      session.id,
      "approve_educator",
      "user",
      educatorId,
      {
        educatorEmail: educator.email,
        educatorName: educator.name,
        approvedBy: session.email,
      }
    );

    // TODO: Send approval email to educator

    return NextResponse.json({
      success: true,
      message: "Educator approved successfully",
    });
  } catch (error) {
    console.error("Error approving educator:", error);
    
    // Check if it's an auth error
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to approve educator" },
      { status: 500 }
    );
  }
}
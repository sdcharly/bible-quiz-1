import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, logActivity } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify admin authentication
  const session = await getAdminSession();
  if (!session) {
    logger.warn("Unauthorized admin API access attempt to src/app/api/admin/educators/[id]/reject/route.ts");
    return NextResponse.json(
      { error: "Unauthorized - Admin access required" },
      { status: 401 }
    );
  }
  logger.log(`Admin ${session.email} accessing POST src/app/api/admin/educators/[id]/reject/route.ts`);

  try {
    // Admin already authenticated above
    const { id: educatorId } = await params;
    const { reason } = await request.json();

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
        approvalStatus: "rejected",
        rejectionReason: reason || "Application did not meet requirements",
        approvedBy: session.id,
        approvedAt: new Date(),
        permissions: {
          canPublishQuiz: false,
          canAddStudents: false,
          canEditQuiz: false,
          canDeleteQuiz: false,
          canViewAnalytics: false,
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
      "reject_educator",
      "user",
      educatorId,
      {
        educatorEmail: educator.email,
        educatorName: educator.name,
        rejectedBy: session.email,
        reason,
      }
    );

    // TODO: Send rejection email to educator

    return NextResponse.json({
      success: true,
      message: "Educator rejected",
    });
  } catch (error) {
    console.error("Error rejecting educator:", error);
    return NextResponse.json(
      { error: "Failed to reject educator" },
      { status: 500 }
    );
  }
}
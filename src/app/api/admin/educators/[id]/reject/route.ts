import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getAdminSession, logActivity } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { logger } from "@/lib/logger";
import { notifyEducatorStatusChange } from "@/lib/admin-notifications";
import { emailTemplates, sendEmail } from "@/lib/email-service";


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

    // Send admin notification about status change
    try {
      await notifyEducatorStatusChange({
        name: educator.name || 'Unknown',
        email: educator.email,
        oldStatus: educator.approvalStatus || 'pending',
        newStatus: 'rejected',
        adminName: session.email || 'Admin'
      });
    } catch (notificationError) {
      logger.error('Failed to send admin notification for educator rejection:', notificationError);
    }

    // Send rejection email to educator
    try {
      const rejectionEmail = emailTemplates.educatorRejectionNotification(
        educator.name || 'Educator',
        educator.email,
        reason
      );
      
      await sendEmail({
        to: educator.email,
        subject: rejectionEmail.subject,
        html: rejectionEmail.html,
        text: rejectionEmail.text
      });
      
      logger.log(`Rejection email sent to educator: ${educator.email}`);
    } catch (emailError) {
      logger.error('Failed to send rejection email to educator:', emailError);
      // Don't fail the rejection if email fails
    }

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
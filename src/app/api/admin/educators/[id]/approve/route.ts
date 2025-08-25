import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, logActivity } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { 
  getDefaultPermissionTemplate,
  getPermissionTemplate 
} from "@/lib/permission-templates";
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
    logger.warn("Unauthorized admin API access attempt to src/app/api/admin/educators/[id]/approve/route.ts");
    return NextResponse.json(
      { error: "Unauthorized - Admin access required" },
      { status: 401 }
    );
  }
  logger.log(`Admin ${session.email} accessing POST src/app/api/admin/educators/[id]/approve/route.ts`);

  try {
    const { id: educatorId } = await params;
    logger.log("Approve educator API called with ID:", educatorId);
    
    // Admin already authenticated above
    logger.log("Admin session:", session);

    // Get request body for optional template ID
    const body = await request.json().catch(() => ({}));
    const { templateId } = body;

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
    
    // Check if educator has verified their email
    if (!educator.emailVerified) {
      return NextResponse.json(
        { error: "Cannot approve educator: Email not verified" },
        { status: 400 }
      );
    }

    // Determine which template to use
    let permissionTemplateId = templateId;
    let templatePermissions = null;

    if (templateId) {
      // Use specified template
      const template = await getPermissionTemplate(templateId);
      if (template) {
        templatePermissions = template.permissions;
      } else {
        return NextResponse.json(
          { error: "Invalid template ID" },
          { status: 400 }
        );
      }
    } else {
      // Use default template
      const defaultTemplate = await getDefaultPermissionTemplate();
      if (defaultTemplate) {
        permissionTemplateId = defaultTemplate.id;
        templatePermissions = defaultTemplate.permissions;
      }
    }

    // Update educator status
    await db
      .update(user)
      .set({
        role: "educator",
        approvalStatus: "approved",
        approvedBy: session.id,
        approvedAt: new Date(),
        permissionTemplateId: permissionTemplateId || null,
        permissions: templatePermissions || {
          // Fallback permissions if no template is available
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
        templateId: permissionTemplateId,
      }
    );

    // Send admin notification about status change
    try {
      await notifyEducatorStatusChange({
        name: educator.name || 'Unknown',
        email: educator.email,
        oldStatus: educator.approvalStatus || 'pending',
        newStatus: 'approved',
        adminName: session.email || 'Admin'
      });
    } catch (notificationError) {
      logger.error('Failed to send admin notification for educator approval:', notificationError);
    }

    // Send approval email to educator
    try {
      const approvalEmail = emailTemplates.educatorApprovalNotification(
        educator.name || 'Educator',
        educator.email
      );
      
      await sendEmail({
        to: educator.email,
        subject: approvalEmail.subject,
        html: approvalEmail.html,
        text: approvalEmail.text
      });
      
      logger.log(`Approval email sent to educator: ${educator.email}`);
    } catch (emailError) {
      logger.error('Failed to send approval email to educator:', emailError);
      // Don't fail the approval if email fails
    }

    return NextResponse.json({
      success: true,
      message: "Educator approved successfully",
      templateId: permissionTemplateId,
    });
  } catch (error) {
    logger.error("Error approving educator:", error);
    
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
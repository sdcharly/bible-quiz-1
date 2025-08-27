import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getAdminSession, logActivity } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { applyTemplateToUser, getPermissionTemplate } from "@/lib/permission-templates";
import { logger } from "@/lib/logger";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify admin authentication
  const session = await getAdminSession();
  if (!session) {
    logger.warn("Unauthorized admin API access attempt to src/app/api/admin/educators/[id]/template/route.ts");
    return NextResponse.json(
      { error: "Unauthorized - Admin access required" },
      { status: 401 }
    );
  }
  logger.log(`Admin ${session.email} accessing PUT src/app/api/admin/educators/[id]/template/route.ts`);

  try {
    const { id: educatorId } = await params;
    const body = await request.json();
    const { templateId } = body;

    if (!templateId) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      );
    }

    // Verify template exists
    const template = await getPermissionTemplate(templateId);
    if (!template) {
      return NextResponse.json(
        { error: "Invalid template ID" },
        { status: 400 }
      );
    }

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

    // Apply template to educator
    const success = await applyTemplateToUser(educatorId, templateId);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to apply template" },
        { status: 500 }
      );
    }

    // Log activity
    await logActivity(
      session.id,
      "update_educator_template",
      "user",
      educatorId,
      {
        educatorEmail: educator.email,
        educatorName: educator.name,
        oldTemplateId: educator.permissionTemplateId,
        newTemplateId: templateId,
        templateName: template.name,
        updatedBy: session.email,
      }
    );

    logger.log(`Template ${templateId} assigned to educator ${educatorId} by admin ${session.email}`);

    return NextResponse.json({
      success: true,
      message: "Template assigned successfully",
      templateId: templateId,
      templateName: template.name,
    });
  } catch (error) {
    logger.error("Error assigning template to educator:", error);
    
    // Check if it's an auth error
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to assign template" },
      { status: 500 }
    );
  }
}
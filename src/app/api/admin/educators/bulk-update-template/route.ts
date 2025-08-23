import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, logActivity } from "@/lib/admin-auth";
import { bulkApplyTemplate } from "@/lib/permission-templates";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  // Verify admin authentication
  const session = await getAdminSession();
  if (!session) {
    logger.warn("Unauthorized admin API access attempt to src/app/api/admin/educators/bulk-update-template/route.ts");
    return NextResponse.json(
      { error: "Unauthorized - Admin access required" },
      { status: 401 }
    );
  }
  logger.log(`Admin ${session.email} accessing POST src/app/api/admin/educators/bulk-update-template/route.ts`);

  try {
    // Admin already authenticated above
    const body = await request.json();
    
    const { userIds, templateId } = body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "User IDs array is required" },
        { status: 400 }
      );
    }
    
    if (!templateId) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      );
    }
    
    const result = await bulkApplyTemplate(userIds, templateId);
    
    await logActivity(
      session.id,
      "bulk_update_educator_templates",
      "user",
      null,
      {
        userCount: userIds.length,
        templateId,
        success: result.success,
        failed: result.failed,
      }
    );
    
    return NextResponse.json({
      success: true,
      message: `Updated ${result.success} educators, ${result.failed} failed`,
      result,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to bulk update templates" },
      { status: 500 }
    );
  }
}
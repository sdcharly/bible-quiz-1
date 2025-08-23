import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adminSettings } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getAdminSession, requireAdminAuth, logActivity } from "@/lib/admin-auth";
import { logger } from "@/lib/logger";

export async function GET() {
  // Verify admin authentication
  const session = await getAdminSession();
  if (!session) {
    logger.warn("Unauthorized admin API access attempt to src/app/api/admin/settings/permissions/route.ts");
    return NextResponse.json(
      { error: "Unauthorized - Admin access required" },
      { status: 401 }
    );
  }
  logger.log(`Admin ${session.email} accessing GET src/app/api/admin/settings/permissions/route.ts`);

  try {
    // Use proper admin authentication
    const adminSession = await requireAdminAuth();
    
    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await db
      .select()
      .from(adminSettings)
      .where(eq(adminSettings.settingKey, "permission_templates"));

    if (result.length === 0) {
      return NextResponse.json({ templates: null });
    }

    return NextResponse.json({ templates: result[0].settingValue });
  } catch (error) {
    console.error("Error fetching permission templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch permission templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Verify admin authentication
  const session = await getAdminSession();
  if (!session) {
    logger.warn("Unauthorized admin API access attempt to src/app/api/admin/settings/permissions/route.ts");
    return NextResponse.json(
      { error: "Unauthorized - Admin access required" },
      { status: 401 }
    );
  }
  logger.log(`Admin ${session.email} accessing POST src/app/api/admin/settings/permissions/route.ts`);

  try {
    // Use proper admin authentication
    const adminSession = await requireAdminAuth();
    
    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { templates } = await request.json();

    // Check if setting exists
    const existing = await db
      .select()
      .from(adminSettings)
      .where(eq(adminSettings.settingKey, "permission_templates"));

    if (existing.length > 0) {
      // Update existing setting
      await db
        .update(adminSettings)
        .set({
          settingValue: templates,
          updatedAt: new Date(),
        })
        .where(eq(adminSettings.settingKey, "permission_templates"));
    } else {
      // Create new setting
      await db.insert(adminSettings).values({
        id: nanoid(),
        settingKey: "permission_templates",
        settingValue: templates,
        description: "Permission templates for educator accounts",
        updatedAt: new Date(),
      });
    }

    // Log the activity using proper logging function
    await logActivity(
      adminSession.id,
      "update_permission_templates",
      "admin_settings",
      "permission_templates",
      {
        updatedBy: adminSession.email,
        templatesCount: Object.keys(templates).length,
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving permission templates:", error);
    return NextResponse.json(
      { error: "Failed to save permission templates" },
      { status: 500 }
    );
  }
}
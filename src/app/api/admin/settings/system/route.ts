import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adminSettings, activityLogs } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { requireAdminAuth, logActivity } from "@/lib/admin-auth";
import { clearMaintenanceCache } from "@/lib/maintenance";

export async function GET() {
  try {
    // Use proper admin authentication
    const adminSession = await requireAdminAuth();
    
    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await db
      .select()
      .from(adminSettings);

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error fetching system settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch system settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Use proper admin authentication
    const adminSession = await requireAdminAuth();
    
    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { settings } = await request.json();

    // Update or insert each setting category
    for (const [key, value] of Object.entries(settings)) {
      const existing = await db
        .select()
        .from(adminSettings)
        .where(eq(adminSettings.settingKey, key));

      if (existing.length > 0) {
        // Update existing setting
        await db
          .update(adminSettings)
          .set({
            settingValue: value,
            updatedAt: new Date(),
          })
          .where(eq(adminSettings.settingKey, key));
      } else {
        // Create new setting
        await db.insert(adminSettings).values({
          id: nanoid(),
          settingKey: key,
          settingValue: value,
          description: getSettingDescription(key),
          updatedAt: new Date(),
        });
      }
    }

    // Clear maintenance cache if system_config was updated
    if (settings.system_config) {
      clearMaintenanceCache();
    }

    // Log the activity using proper logging function
    await logActivity(
      adminSession.id,
      "update_system_settings",
      "admin_settings",
      "system_config",
      {
        updatedBy: adminSession.email,
        settingsUpdated: Object.keys(settings),
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving system settings:", error);
    return NextResponse.json(
      { error: "Failed to save system settings" },
      { status: 500 }
    );
  }
}

function getSettingDescription(key: string): string {
  const descriptions: Record<string, string> = {
    system_config: "General system configuration settings",
    quiz_defaults: "Default settings for quiz creation",
    registration_settings: "User registration configuration",
    email_settings: "Email notification settings",
    security_settings: "Security and authentication settings",
    permission_templates: "Permission templates for educator accounts",
  };
  return descriptions[key] || "System setting";
}
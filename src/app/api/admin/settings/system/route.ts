import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { adminSettings, activityLogs } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const adminSessionCookie = cookieStore.get("admin_session");
    
    if (!adminSessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSession = JSON.parse(adminSessionCookie.value);
    
    if (!adminSession.isAuthenticated || adminSession.role !== "superadmin") {
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
    const cookieStore = await cookies();
    const adminSessionCookie = cookieStore.get("admin_session");
    
    if (!adminSessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSession = JSON.parse(adminSessionCookie.value);
    
    if (!adminSession.isAuthenticated || adminSession.role !== "superadmin") {
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

    // Log the activity
    await db.insert(activityLogs).values({
      id: nanoid(),
      actionType: "update_system_settings",
      entityType: "admin_settings",
      entityId: "system_config",
      details: {
        updatedBy: adminSession.email,
        settingsUpdated: Object.keys(settings),
      },
      createdAt: new Date(),
    });

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
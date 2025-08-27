import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "@/lib/db";
import { adminSettings } from "@/lib/schema";
import { getAdminSession, requireAdminAuth, logActivity } from "@/lib/admin-auth";
import { clearMaintenanceCache } from "@/lib/maintenance";
import { logger } from "@/lib/logger";


// Validation schema for system settings
const SystemSettingsSchema = z.object({
  settings: z.record(
    z.string().min(1).max(100),
    z.unknown() // Will validate specific types based on key
  )
}).strict();

// Validate specific setting values based on key
function validateSettingValue(key: string, value: unknown): unknown {
  const validators: Record<string, z.ZodSchema> = {
    system_config: z.object({
      maintenanceMode: z.boolean().optional(),
      maintenanceMessage: z.string().max(500).optional(),
      sessionTimeout: z.number().min(300000).max(86400000).optional(), // 5 min to 24 hours
      adminSessionTimeout: z.number().min(300000).max(86400000).optional(),
      maxLoginAttempts: z.number().min(3).max(10).optional(),
      lockoutDuration: z.number().min(300000).max(3600000).optional(), // 5 min to 1 hour
      youtubeVideoUrl: z.string().url().optional(), // YouTube video URL for homepage
    }).strict(),
    quiz_defaults: z.object({
      timeLimit: z.number().min(60).max(7200).optional(), // 1 min to 2 hours
      questionsPerQuiz: z.number().min(5).max(100).optional(),
      attemptsAllowed: z.number().min(1).max(10).optional(),
    }).strict(),
    registration_settings: z.object({
      requireEmailVerification: z.boolean().optional(),
      allowStudentSignup: z.boolean().optional(),
      allowEducatorSignup: z.boolean().optional(),
      requireApproval: z.boolean().optional(),
    }).strict(),
    email_settings: z.object({
      enableNotifications: z.boolean().optional(),
      fromEmail: z.string().email().optional(),
      fromName: z.string().max(100).optional(),
    }).strict(),
    security_settings: z.object({
      enforcePasswordPolicy: z.boolean().optional(),
      minPasswordLength: z.number().min(8).max(32).optional(),
      requireUppercase: z.boolean().optional(),
      requireNumbers: z.boolean().optional(),
      requireSpecialChars: z.boolean().optional(),
      sessionExpiry: z.number().min(300000).max(86400000).optional(),
    }).strict(),
  };

  const validator = validators[key];
  if (!validator) {
    throw new Error(`Unknown setting key: ${key}`);
  }

  return validator.parse(value);
}

async function handleGET() {
  // Verify admin authentication
  const session = await getAdminSession();
  if (!session) {
    logger.warn("Unauthorized admin API access attempt to src/app/api/admin/settings/system/route.ts");
    return NextResponse.json(
      { error: "Unauthorized - Admin access required" },
      { status: 401 }
    );
  }
  logger.log(`Admin ${session.email} accessing GET src/app/api/admin/settings/system/route.ts`);

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

async function handlePOST(request: NextRequest) {
  // Verify admin authentication
  const session = await getAdminSession();
  if (!session) {
    logger.warn("Unauthorized admin API access attempt to src/app/api/admin/settings/system/route.ts");
    return NextResponse.json(
      { error: "Unauthorized - Admin access required" },
      { status: 401 }
    );
  }
  logger.log(`Admin ${session.email} accessing POST src/app/api/admin/settings/system/route.ts`);

  try {
    // Use proper admin authentication
    const adminSession = await requireAdminAuth();
    
    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate request body structure
    let validatedBody;
    try {
      validatedBody = SystemSettingsSchema.parse(body);
    } catch (error) {
      logger.warn(`Invalid settings format from ${adminSession.email}: ${error}`);
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 }
      );
    }

    const { settings } = validatedBody;

    // Validate and process each setting
    const validatedSettings: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(settings)) {
      try {
        validatedSettings[key] = validateSettingValue(key, value);
      } catch (error) {
        logger.warn(`Invalid setting value for ${key} from ${adminSession.email}: ${error}`);
        return NextResponse.json(
          { error: `Invalid value for setting: ${key}` },
          { status: 400 }
        );
      }
    }

    // Update or insert each validated setting
    for (const [key, value] of Object.entries(validatedSettings)) {
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
    if (validatedSettings.system_config) {
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
        settingsUpdated: Object.keys(validatedSettings),
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

// Export directly - rate limiting can be applied at middleware level
export { handleGET as GET, handlePOST as POST };

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
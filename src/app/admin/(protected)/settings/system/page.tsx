import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { adminSettings } from "@/lib/schema";
import { eq, or } from "drizzle-orm";
import { getAdminSession } from "@/lib/admin-auth";
import SystemConfiguration from "./SystemConfiguration";

async function getAdminData() {
  const session = await getAdminSession();
  
  if (!session) {
    redirect("/admin/login");
  }

  // Get all system settings
  const systemSettingsResult = await db
    .select()
    .from(adminSettings)
    .where(
      or(
        eq(adminSettings.settingKey, "system_config"),
        eq(adminSettings.settingKey, "quiz_defaults"),
        eq(adminSettings.settingKey, "registration_settings"),
        eq(adminSettings.settingKey, "email_settings"),
        eq(adminSettings.settingKey, "security_settings")
      )
    );

  // Initialize default settings
  const defaultSettings = {
    system_config: {
      siteName: "SimpleQuiz",
      siteDescription: "Advanced Quiz Management System",
      maintenanceMode: false,
      maintenanceMessage: "System is under maintenance. Please check back later.",
      allowRegistration: true,
      requireEmailVerification: true,
      defaultTimezone: "Asia/Kolkata",
      maxFileUploadSize: 10, // MB
      supportedFileTypes: ["pdf", "docx", "txt"],
    },
    quiz_defaults: {
      defaultDuration: 60, // minutes
      maxQuestionsPerQuiz: 100,
      allowRetake: false,
      showResults: true,
      showCorrectAnswers: false,
      shuffleQuestions: false,
      shuffleOptions: false,
    },
    registration_settings: {
      autoApproveEducators: false,
      requirePhoneNumber: false,
      allowStudentSelfRegistration: true,
      defaultStudentQuota: 50,
      defaultQuizQuota: 10,
    },
    email_settings: {
      sendWelcomeEmail: true,
      sendApprovalEmail: true,
      sendRejectionEmail: true,
      sendQuizInvitation: true,
      sendQuizReminder: true,
      reminderHoursBefore: 24,
    },
    security_settings: {
      sessionTimeout: 24, // hours
      maxLoginAttempts: 5,
      lockoutDuration: 30, // minutes
      requireStrongPassword: true,
      minPasswordLength: 8,
      require2FA: false,
      allowedDomains: [], // empty means all domains allowed
    }
  };

  // Merge existing settings with defaults
  const settings = { ...defaultSettings };
  systemSettingsResult.forEach((setting) => {
    const key = setting.settingKey as keyof typeof settings;
    if (key in settings) {
      (settings as Record<string, unknown>)[key] = setting.settingValue;
    }
  });

  return {
    adminEmail: session.email,
    systemSettings: settings
  };
}

export default async function SystemPage() {
  const { adminEmail, systemSettings } = await getAdminData();

  return (
    <SystemConfiguration 
      adminEmail={adminEmail}
      initialSettings={systemSettings}
    />
  );
}
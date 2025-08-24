import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { adminSettings } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getAdminSession } from "@/lib/admin-auth";
import PermissionTemplates, { type PermissionTemplate } from "./PermissionTemplates";

async function getAdminData() {
  const session = await getAdminSession();
  
  if (!session) {
    redirect("/admin/login");
  }

  // Get permission templates from admin settings
  const permissionTemplatesResult = await db
    .select()
    .from(adminSettings)
    .where(eq(adminSettings.settingKey, "permission_templates"));

  let permissionTemplates: Record<string, PermissionTemplate> = {};
  if (permissionTemplatesResult.length > 0) {
    permissionTemplates = permissionTemplatesResult[0].settingValue as Record<string, PermissionTemplate>;
  } else {
    // Default permission templates
    permissionTemplates = {
      basic: {
        name: "Basic Educator",
        description: "Standard permissions for new educators",
        permissions: {
          canPublishQuiz: true,
          canAddStudents: true,
          canEditQuiz: true,
          canDeleteQuiz: false,
          canViewAnalytics: true,
          canExportData: false,
          maxStudents: 50,
          maxQuizzes: 10,
          maxQuestionsPerQuiz: 30
        }
      },
      advanced: {
        name: "Advanced Educator",
        description: "Enhanced permissions for experienced educators",
        permissions: {
          canPublishQuiz: true,
          canAddStudents: true,
          canEditQuiz: true,
          canDeleteQuiz: true,
          canViewAnalytics: true,
          canExportData: true,
          maxStudents: 200,
          maxQuizzes: 50,
          maxQuestionsPerQuiz: 100
        }
      },
      premium: {
        name: "Premium Educator",
        description: "Full permissions for premium educators",
        permissions: {
          canPublishQuiz: true,
          canAddStudents: true,
          canEditQuiz: true,
          canDeleteQuiz: true,
          canViewAnalytics: true,
          canExportData: true,
          maxStudents: 1000,
          maxQuizzes: 999,
          maxQuestionsPerQuiz: 999
        }
      }
    };
  }

  return {
    adminEmail: session.email,
    permissionTemplates
  };
}

export default async function PermissionsPage() {
  const { adminEmail, permissionTemplates } = await getAdminData();

  return (
    <PermissionTemplates 
      adminEmail={adminEmail}
      initialTemplates={permissionTemplates as Record<string, PermissionTemplate>}
    />
  );
}
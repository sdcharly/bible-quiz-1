import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user, permissionTemplates } from "@/lib/schema";
import { logger } from "@/lib/logger";


export interface EducatorPermissions {
  canPublishQuiz: boolean;
  canAddStudents: boolean;
  canEditQuiz: boolean;
  canDeleteQuiz: boolean;
  canViewAnalytics: boolean;
  canExportData: boolean;
  maxStudents: number;
  maxQuizzes: number;
  maxQuestionsPerQuiz: number;
}

export const DEFAULT_PERMISSIONS = {
  pending: {
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
  approved: {
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
  premium: {
    canPublishQuiz: true,
    canAddStudents: true,
    canEditQuiz: true,
    canDeleteQuiz: true,
    canViewAnalytics: true,
    canExportData: true,
    maxStudents: -1, // unlimited
    maxQuizzes: -1,
    maxQuestionsPerQuiz: -1,
  },
  suspended: {
    canPublishQuiz: false,
    canAddStudents: false,
    canEditQuiz: false,
    canDeleteQuiz: false,
    canViewAnalytics: true,
    canExportData: false,
    maxStudents: 0,
    maxQuizzes: 0,
    maxQuestionsPerQuiz: 0,
  },
};

export async function getUserPermissions(userId: string): Promise<EducatorPermissions | null> {
  try {
    const [userData] = await db
      .select({
        role: user.role,
        approvalStatus: user.approvalStatus,
        permissions: user.permissions,
        permissionTemplateId: user.permissionTemplateId,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!userData) {
      return null;
    }

    // Return custom permissions if set
    if (userData.permissions && Object.keys(userData.permissions).length > 0) {
      return userData.permissions as EducatorPermissions;
    }

    // If user has a template, fetch and use template permissions
    if (userData.permissionTemplateId) {
      const [template] = await db
        .select({ permissions: permissionTemplates.permissions })
        .from(permissionTemplates)
        .where(eq(permissionTemplates.id, userData.permissionTemplateId))
        .limit(1);
      
      if (template?.permissions) {
        return template.permissions as EducatorPermissions;
      }
    }

    // Fallback to default permissions based on approval status
    switch (userData.approvalStatus) {
      case "approved":
        return DEFAULT_PERMISSIONS.approved;
      case "rejected":
      case "suspended":
        return DEFAULT_PERMISSIONS.suspended;
      case "pending":
      default:
        return DEFAULT_PERMISSIONS.pending;
    }
  } catch (error) {
    logger.error("Error fetching user permissions:", error);
    return null;
  }
}

export async function checkEducatorPermission(
  userId: string,
  permission: keyof EducatorPermissions
): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  
  if (!permissions) {
    return false;
  }

  // For numeric permissions, check if limit is exceeded
  if (typeof permissions[permission] === "number") {
    return permissions[permission] !== 0;
  }

  return permissions[permission] === true;
}

export async function checkEducatorLimits(
  userId: string,
  limitType: "maxStudents" | "maxQuizzes" | "maxQuestionsPerQuiz",
  currentCount: number
): Promise<{ allowed: boolean; limit: number; remaining: number }> {
  const permissions = await getUserPermissions(userId);
  
  if (!permissions) {
    return { allowed: false, limit: 0, remaining: 0 };
  }

  const limit = permissions[limitType];
  
  // -1 means unlimited
  if (limit === -1) {
    return { allowed: true, limit: -1, remaining: -1 };
  }

  const allowed = currentCount < limit;
  const remaining = Math.max(0, limit - currentCount);

  return { allowed, limit, remaining };
}

export function getPermissionMessage(permission: keyof EducatorPermissions): string {
  const messages: Record<keyof EducatorPermissions, string> = {
    canPublishQuiz: "You don't have permission to publish quizzes. Your account needs approval from an administrator.",
    canAddStudents: "You don't have permission to add students. Your account needs approval from an administrator.",
    canEditQuiz: "You don't have permission to edit quizzes. Your account needs approval from an administrator.",
    canDeleteQuiz: "You don't have permission to delete quizzes. Your account needs approval from an administrator.",
    canViewAnalytics: "You don't have permission to view analytics. Your account needs approval from an administrator.",
    canExportData: "You don't have permission to export data. Your account needs approval from an administrator.",
    maxStudents: "You have reached your maximum student limit. Please contact support to upgrade your account.",
    maxQuizzes: "You have reached your maximum quiz limit. Please contact support to upgrade your account.",
    maxQuestionsPerQuiz: "You have reached the maximum questions per quiz limit. Please contact support to upgrade your account.",
  };

  return messages[permission] || "You don't have permission to perform this action.";
}
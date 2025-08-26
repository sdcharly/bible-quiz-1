import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/db";
import { permissionTemplates, user } from "@/lib/schema";
import { logger } from "@/lib/logger";


export interface PermissionTemplate {
  id: string;
  name: string;
  description: string | null;
  permissions: {
    canPublishQuiz: boolean;
    canAddStudents: boolean;
    canEditQuiz: boolean;
    canDeleteQuiz: boolean;
    canViewAnalytics: boolean;
    canExportData: boolean;
    maxStudents: number;
    maxQuizzes: number;
    maxQuestionsPerQuiz: number;
  };
  isDefault: boolean;
  isActive: boolean;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Get all active templates
export async function getPermissionTemplates(): Promise<PermissionTemplate[]> {
  try {
    const templates = await db
      .select()
      .from(permissionTemplates)
      .where(eq(permissionTemplates.isActive, true));
    
    return templates as PermissionTemplate[];
  } catch (error) {
    logger.error("Error fetching permission templates:", error);
    return [];
  }
}

// Get a single template by ID
export async function getPermissionTemplate(templateId: string): Promise<PermissionTemplate | null> {
  try {
    const [template] = await db
      .select()
      .from(permissionTemplates)
      .where(eq(permissionTemplates.id, templateId))
      .limit(1);
    
    return template as PermissionTemplate | null;
  } catch (error) {
    logger.error("Error fetching permission template:", error);
    return null;
  }
}

// Get the default template
export async function getDefaultPermissionTemplate(): Promise<PermissionTemplate | null> {
  try {
    const [template] = await db
      .select()
      .from(permissionTemplates)
      .where(and(
        eq(permissionTemplates.isDefault, true),
        eq(permissionTemplates.isActive, true)
      ))
      .limit(1);
    
    return template as PermissionTemplate | null;
  } catch (error) {
    logger.error("Error fetching default permission template:", error);
    return null;
  }
}

// Create a new template
export async function createPermissionTemplate(
  data: {
    name: string;
    description?: string;
    permissions: PermissionTemplate["permissions"];
    isDefault?: boolean;
    createdBy?: string;
  }
): Promise<PermissionTemplate | null> {
  try {
    // If setting as default, unset other defaults
    if (data.isDefault) {
      await db
        .update(permissionTemplates)
        .set({ isDefault: false })
        .where(eq(permissionTemplates.isDefault, true));
    }

    const [template] = await db
      .insert(permissionTemplates)
      .values({
        id: uuidv4(),
        name: data.name,
        description: data.description || null,
        permissions: data.permissions,
        isDefault: data.isDefault || false,
        isActive: true,
        createdBy: data.createdBy || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return template as PermissionTemplate;
  } catch (error) {
    logger.error("Error creating permission template:", error);
    return null;
  }
}

// Update a template
export async function updatePermissionTemplate(
  templateId: string,
  data: {
    name?: string;
    description?: string;
    permissions?: PermissionTemplate["permissions"];
    isDefault?: boolean;
    isActive?: boolean;
  }
): Promise<PermissionTemplate | null> {
  try {
    // If setting as default, unset other defaults
    if (data.isDefault) {
      await db
        .update(permissionTemplates)
        .set({ isDefault: false })
        .where(eq(permissionTemplates.isDefault, true));
    }

    const [template] = await db
      .update(permissionTemplates)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(permissionTemplates.id, templateId))
      .returning();
    
    return template as PermissionTemplate;
  } catch (error) {
    logger.error("Error updating permission template:", error);
    return null;
  }
}

// Delete a template (soft delete by setting isActive to false)
export async function deletePermissionTemplate(templateId: string): Promise<boolean> {
  try {
    const [template] = await db
      .select({ isDefault: permissionTemplates.isDefault })
      .from(permissionTemplates)
      .where(eq(permissionTemplates.id, templateId))
      .limit(1);

    if (template?.isDefault) {
      logger.warn("Cannot delete default template");
      return false;
    }

    await db
      .update(permissionTemplates)
      .set({ 
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(permissionTemplates.id, templateId));
    
    return true;
  } catch (error) {
    logger.error("Error deleting permission template:", error);
    return false;
  }
}

// Apply a template to a user
export async function applyTemplateToUser(userId: string, templateId: string): Promise<boolean> {
  try {
    const template = await getPermissionTemplate(templateId);
    if (!template) {
      logger.error("Template not found:", templateId);
      return false;
    }

    await db
      .update(user)
      .set({
        permissionTemplateId: templateId,
        permissions: template.permissions,
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId));
    
    logger.log(`Applied template ${templateId} to user ${userId}`);
    return true;
  } catch (error) {
    logger.error("Error applying template to user:", error);
    return false;
  }
}

// Bulk apply template to multiple users
export async function bulkApplyTemplate(
  userIds: string[],
  templateId: string
): Promise<{ success: number; failed: number }> {
  const template = await getPermissionTemplate(templateId);
  if (!template) {
    logger.error("Template not found:", templateId);
    return { success: 0, failed: userIds.length };
  }

  let success = 0;
  let failed = 0;

  for (const userId of userIds) {
    try {
      await db
        .update(user)
        .set({
          permissionTemplateId: templateId,
          permissions: template.permissions,
          updatedAt: new Date(),
        })
        .where(eq(user.id, userId));
      success++;
    } catch (error) {
      logger.error(`Failed to apply template to user ${userId}:`, error);
      failed++;
    }
  }

  return { success, failed };
}

// Get users by template
export async function getUsersByTemplate(templateId: string) {
  try {
    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        approvalStatus: user.approvalStatus,
      })
      .from(user)
      .where(eq(user.permissionTemplateId, templateId));
    
    return users;
  } catch (error) {
    logger.error("Error fetching users by template:", error);
    return [];
  }
}
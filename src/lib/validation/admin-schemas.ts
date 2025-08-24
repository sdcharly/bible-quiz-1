import { z } from "zod";

// Permission schema for educator permissions
export const EducatorPermissionsSchema = z.object({
  canPublishQuiz: z.boolean(),
  canAddStudents: z.boolean(),
  canEditQuiz: z.boolean(),
  canDeleteQuiz: z.boolean(),
  canViewAnalytics: z.boolean(),
  canExportData: z.boolean(),
  maxStudents: z.number().int().min(-1).max(10000),
  maxQuizzes: z.number().int().min(-1).max(1000),
  maxQuestionsPerQuiz: z.number().int().min(-1).max(500),
}).strict();

// System settings schema
export const SystemSettingsSchema = z.object({
  settings: z.record(z.string(), z.union([
    z.string().max(1000),
    z.number(),
    z.boolean(),
    z.array(z.string().max(100)).max(50)
  ]))
}).strict();

// Permission template schema
export const PermissionTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  permissions: EducatorPermissionsSchema,
  isDefault: z.boolean().optional()
}).strict();

// Validate with error details
export function validatePermissions(data: unknown) {
  const result = EducatorPermissionsSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`);
    throw new Error(`Invalid permissions: ${errors.join(', ')}`);
  }
  return result.data;
}

export function validateSystemSettings(data: unknown) {
  const result = SystemSettingsSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`);
    throw new Error(`Invalid settings: ${errors.join(', ')}`);
  }
  return result.data;
}
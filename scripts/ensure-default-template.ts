import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/db";
import { permissionTemplates } from "@/lib/schema";
import { logger } from "@/lib/logger";

async function ensureDefaultTemplate() {
  logger.log("Checking for default permission template...");

  try {
    // Check if a default template exists
    const [existingDefault] = await db
      .select()
      .from(permissionTemplates)
      .where(and(
        eq(permissionTemplates.isDefault, true),
        eq(permissionTemplates.isActive, true)
      ))
      .limit(1);

    if (existingDefault) {
      logger.log("Default template already exists:", existingDefault.name);
      return;
    }

    // Create default templates
    const templates = [
      {
        id: uuidv4(),
        name: "Basic Educator",
        description: "Default template for new educators with basic permissions",
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
        },
        isDefault: true,
        isActive: true,
        createdBy: "system",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        name: "Premium Educator",
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
        },
        isDefault: false,
        isActive: true,
        createdBy: "system",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        name: "Unlimited Access",
        description: "Full access with unlimited resources",
        permissions: {
          canPublishQuiz: true,
          canAddStudents: true,
          canEditQuiz: true,
          canDeleteQuiz: true,
          canViewAnalytics: true,
          canExportData: true,
          maxStudents: -1, // Unlimited
          maxQuizzes: -1, // Unlimited
          maxQuestionsPerQuiz: -1 // Unlimited
        },
        isDefault: false,
        isActive: true,
        createdBy: "system",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        name: "Restricted Access",
        description: "Limited permissions for trial or probationary educators",
        permissions: {
          canPublishQuiz: false,
          canAddStudents: false,
          canEditQuiz: false,
          canDeleteQuiz: false,
          canViewAnalytics: false,
          canExportData: false,
          maxStudents: 10,
          maxQuizzes: 3,
          maxQuestionsPerQuiz: 10
        },
        isDefault: false,
        isActive: true,
        createdBy: "system",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Insert templates
    for (const template of templates) {
      await db.insert(permissionTemplates).values(template);
      logger.log(`Created template: ${template.name}`);
    }

    logger.log("Default permission templates created successfully");
  } catch (error) {
    logger.error("Error creating default templates:", error);
    process.exit(1);
  }
}

// Run the script
ensureDefaultTemplate()
  .then(() => {
    logger.log("Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    logger.error("Script failed:", error);
    process.exit(1);
  });
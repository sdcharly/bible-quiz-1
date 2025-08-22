import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { permissionTemplates } from "@/lib/schema";
import { sql } from "drizzle-orm";

export async function POST() {
  try {
    await requireAdminAuth();

    const templates = [
      {
        id: "basic-educator",
        name: "Basic Educator",
        description: "Standard permissions for approved educators",
        permissions: {
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
        isDefault: true,
        isActive: true,
      },
      {
        id: "premium-educator",
        name: "Premium Educator",
        description: "Enhanced permissions with higher limits",
        permissions: {
          canPublishQuiz: true,
          canAddStudents: true,
          canEditQuiz: true,
          canDeleteQuiz: true,
          canViewAnalytics: true,
          canExportData: true,
          maxStudents: 500,
          maxQuizzes: 200,
          maxQuestionsPerQuiz: 250,
        },
        isDefault: false,
        isActive: true,
      },
      {
        id: "unlimited-educator",
        name: "Unlimited Educator",
        description: "No limits on resources",
        permissions: {
          canPublishQuiz: true,
          canAddStudents: true,
          canEditQuiz: true,
          canDeleteQuiz: true,
          canViewAnalytics: true,
          canExportData: true,
          maxStudents: -1,
          maxQuizzes: -1,
          maxQuestionsPerQuiz: -1,
        },
        isDefault: false,
        isActive: true,
      },
      {
        id: "restricted-educator",
        name: "Restricted Educator",
        description: "Limited permissions for new educators",
        permissions: {
          canPublishQuiz: false,
          canAddStudents: true,
          canEditQuiz: true,
          canDeleteQuiz: false,
          canViewAnalytics: false,
          canExportData: false,
          maxStudents: 20,
          maxQuizzes: 5,
          maxQuestionsPerQuiz: 50,
        },
        isDefault: false,
        isActive: true,
      },
      {
        id: "read-only-educator",
        name: "Read Only",
        description: "View only access",
        permissions: {
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
        isDefault: false,
        isActive: true,
      },
    ];

    const results = [];
    
    for (const template of templates) {
      // Check if template exists
      const existing = await db
        .select()
        .from(permissionTemplates)
        .where(sql`id = ${template.id}`)
        .limit(1);

      if (existing.length > 0) {
        // Update existing template
        await db
          .update(permissionTemplates)
          .set({
            name: template.name,
            description: template.description,
            permissions: template.permissions,
            isDefault: template.isDefault,
            isActive: template.isActive,
            updatedAt: new Date(),
          })
          .where(sql`id = ${template.id}`);
        results.push({ name: template.name, action: "updated" });
      } else {
        // Insert new template
        await db
          .insert(permissionTemplates)
          .values({
            ...template,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        results.push({ name: template.name, action: "created" });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Permission templates seeded successfully",
      results,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to seed templates", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { eq, and, isNull, or } from "drizzle-orm";
import { getAdminSession, requireAdminAuth } from "@/lib/admin-auth";
import { logger } from "@/lib/logger";

export async function POST(_request: NextRequest) {
  // Verify admin authentication
  const session = await getAdminSession();
  if (!session) {
    logger.warn("Unauthorized admin API access attempt to src/app/api/admin/fix-educator-status/route.ts");
    return NextResponse.json(
      { error: "Unauthorized - Admin access required" },
      { status: 401 }
    );
  }
  logger.log(`Admin ${session.email} accessing POST src/app/api/admin/fix-educator-status/route.ts`);

  try {
    // Check admin auth
    await requireAdminAuth();

    // Find all educators who have null or missing approval status
    const educatorsToFix = await db.select()
      .from(user)
      .where(
        and(
          or(
            eq(user.role, "educator"),
            eq(user.role, "pending_educator")
          ),
          or(
            isNull(user.approvalStatus),
            eq(user.approvalStatus, "pending")
          )
        )
      );

    const results = [];

    // Update each educator to have pending status if they don't have proper approval
    for (const educator of educatorsToFix) {
      // Skip admin users
      if (educator.email === process.env.SUPER_ADMIN_EMAIL) {
        continue;
      }

      // If educator role but no approval status, set to pending
      if (educator.role === "educator" && !educator.approvalStatus) {
        await db.update(user)
          .set({
            approvalStatus: "pending",
            role: "pending_educator", // Change role to pending_educator
            permissions: {
              canPublishQuiz: false,
              canAddStudents: false,
              canEditQuiz: false,
              canDeleteQuiz: false,
              canViewAnalytics: false,
              canExportData: false,
              maxStudents: 0,
              maxQuizzes: 0,
              maxQuestionsPerQuiz: 0,
            }
          })
          .where(eq(user.id, educator.id));

        results.push({
          id: educator.id,
          email: educator.email,
          name: educator.name,
          action: "Set to pending_educator with pending approval status"
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${results.length} educator(s)`,
      results
    });
  } catch (error) {
    console.error("Error fixing educator status:", error);
    return NextResponse.json(
      { error: "Failed to fix educator status" },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getAdminSession, logActivity } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { logger } from "@/lib/logger";
import { validatePermissions } from "@/lib/validation/admin-schemas";


async function handlePUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { params } = context;
  // Verify admin authentication
  const session = await getAdminSession();
  if (!session) {
    logger.warn("Unauthorized admin API access attempt to src/app/api/admin/educators/[id]/permissions/route.ts");
    return NextResponse.json(
      { error: "Unauthorized - Admin access required" },
      { status: 401 }
    );
  }
  logger.log(`Admin ${session.email} accessing PUT src/app/api/admin/educators/[id]/permissions/route.ts`);

  try {
    // Admin already authenticated above
    const { id: educatorId } = await params;
    const body = await request.json();
    
    // Validate permissions schema
    let validatedPermissions;
    try {
      validatedPermissions = validatePermissions(body.permissions);
    } catch (validationError) {
      logger.warn(`Invalid permissions update attempt by ${session.email}: ${validationError}`);
      return NextResponse.json(
        { error: "Invalid permissions format" },
        { status: 400 }
      );
    }

    // Get educator details
    const [educator] = await db
      .select()
      .from(user)
      .where(eq(user.id, educatorId))
      .limit(1);

    if (!educator) {
      return NextResponse.json(
        { error: "Educator not found" },
        { status: 404 }
      );
    }

    // Update educator permissions with validated data
    await db
      .update(user)
      .set({
        permissions: validatedPermissions,
      })
      .where(eq(user.id, educatorId));

    // Log activity
    await logActivity(
      session.id,
      "update_educator_permissions",
      "user",
      educatorId,
      {
        educatorEmail: educator.email,
        educatorName: educator.name,
        updatedBy: session.email,
        permissions: validatedPermissions,
      }
    );

    return NextResponse.json({
      success: true,
      message: "Permissions updated successfully",
    });
  } catch (error) {
    console.error("Error updating educator permissions:", error);
    
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }
    
    // Don't expose internal error details to client
    logger.error("Error updating educator permissions:", error);
    return NextResponse.json(
      { error: "Failed to update permissions" },
      { status: 500 }
    );
  }
}

// Export directly with rate limiting applied via middleware when available
export { handlePUT as PUT };
import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth, logActivity } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdminAuth();
    const educatorId = params.id;
    const { permissions } = await request.json();

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

    // Update educator permissions
    await db
      .update(user)
      .set({
        permissions,
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
        permissions,
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
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update permissions" },
      { status: 500 }
    );
  }
}
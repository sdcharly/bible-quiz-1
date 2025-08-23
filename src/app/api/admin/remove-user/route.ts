import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { withAdminAuth } from "@/lib/admin-api-auth";
import { logger } from "@/lib/logger";

export async function DELETE(req: NextRequest) {
  return withAdminAuth(async (session) => {
    try {
      const { searchParams } = new URL(req.url);
      const email = searchParams.get("email");
      
      logger.log(`Admin ${session.email} attempting to remove user: ${email}`);
    
    if (!email) {
      return NextResponse.json(
        { error: "Email parameter is required" },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json(
        { error: `User with email ${email} not found` },
        { status: 404 }
      );
    }

    // Delete the user
    await db.delete(user).where(eq(user.email, email));
    
      return NextResponse.json({
        success: true,
        message: `Successfully removed user: ${email}`,
        deletedUser: {
          id: existingUser[0].id,
          name: existingUser[0].name,
          email: existingUser[0].email
        }
      }) as NextResponse;
    } catch (error) {
      logger.error("Error removing user:", error);
      return NextResponse.json(
        { error: "Failed to remove user" },
        { status: 500 }
      );
    }
  });
}
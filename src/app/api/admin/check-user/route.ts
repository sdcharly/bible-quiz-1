import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { getAdminSession } from "@/lib/admin-auth";
import { logger } from "@/lib/logger";


export async function GET(req: NextRequest) {
  // Verify admin authentication
  const session = await getAdminSession();
  if (!session) {
    logger.warn("Unauthorized admin API access attempt to src/app/api/admin/check-user/route.ts");
    return NextResponse.json(
      { error: "Unauthorized - Admin access required" },
      { status: 401 }
    );
  }
  logger.log(`Admin ${session.email} accessing GET src/app/api/admin/check-user/route.ts`);

  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    
    if (!email) {
      return NextResponse.json(
        { error: "Email parameter is required" },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      })
      .from(user)
      .where(eq(user.email, email.toLowerCase()))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json({
        exists: false,
        message: `User with email ${email} not found`
      });
    }

    return NextResponse.json({
      exists: true,
      user: existingUser[0],
      message: `User ${email} exists in the database`
    });
    
  } catch (error) {
    console.error("Error checking user:", error);
    return NextResponse.json(
      { error: "Failed to check user" },
      { status: 500 }
    );
  }
}
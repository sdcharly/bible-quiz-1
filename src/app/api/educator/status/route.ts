import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get full user data including approval status and permissions
    const [userData] = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
        rejectionReason: user.rejectionReason,
        permissions: user.permissions,
        approvedAt: user.approvedAt,
      })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (!userData) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // If user is not an educator or pending educator, return basic info
    if (userData.role !== "educator" && userData.role !== "pending_educator") {
      return NextResponse.json({
        status: "not_educator",
        role: userData.role,
      });
    }

    // Return full educator status
    return NextResponse.json({
      status: "success",
      data: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        approvalStatus: userData.approvalStatus,
        rejectionReason: userData.rejectionReason,
        permissions: userData.permissions || {},
        approvedAt: userData.approvedAt,
      }
    });
  } catch (error) {
    console.error("Error fetching educator status:", error);
    return NextResponse.json(
      { error: "Failed to fetch educator status" },
      { status: 500 }
    );
  }
}
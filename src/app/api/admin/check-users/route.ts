import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { getAdminSession } from "@/lib/admin-auth";
import { logger } from "@/lib/logger";


export async function GET(_request: NextRequest) {
  // Verify admin authentication
  const session = await getAdminSession();
  if (!session) {
    logger.warn("Unauthorized admin API access attempt to src/app/api/admin/check-users/route.ts");
    return NextResponse.json(
      { error: "Unauthorized - Admin access required" },
      { status: 401 }
    );
  }
  logger.log(`Admin ${session.email} accessing GET src/app/api/admin/check-users/route.ts`);

  try {
    // Get all users with their approval status
    const users = await db.select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      approvalStatus: user.approvalStatus,
      approvedBy: user.approvedBy,
      approvedAt: user.approvedAt,
      rejectionReason: user.rejectionReason,
      permissions: user.permissions,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(desc(user.createdAt));

    // Group users by role and approval status
    const summary = {
      total: users.length,
      byRole: {
        admin: users.filter(u => u.role === "admin").length,
        educator: users.filter(u => u.role === "educator").length,
        pending_educator: users.filter(u => u.role === "pending_educator").length,
        student: users.filter(u => u.role === "student").length,
      },
      byApprovalStatus: {
        pending: users.filter(u => u.approvalStatus === "pending").length,
        approved: users.filter(u => u.approvalStatus === "approved").length,
        rejected: users.filter(u => u.approvalStatus === "rejected").length,
        suspended: users.filter(u => u.approvalStatus === "suspended").length,
      },
      needsApproval: users.filter(u => 
        (u.role === "educator" || u.role === "pending_educator") && 
        u.approvalStatus === "pending"
      ),
      users: users,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
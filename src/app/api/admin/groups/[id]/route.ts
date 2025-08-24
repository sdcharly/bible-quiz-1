import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { studentGroups, user, groupMembers } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    
    // Get session and verify admin
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Get group details with educator info
    const [groupData] = await db
      .select({
        id: studentGroups.id,
        name: studentGroups.name,
        description: studentGroups.description,
        educatorId: studentGroups.educatorId,
        educatorName: user.name,
        educatorEmail: user.email,
        createdAt: studentGroups.createdAt
      })
      .from(studentGroups)
      .leftJoin(user, eq(studentGroups.educatorId, user.id))
      .where(eq(studentGroups.id, params.id));

    if (!groupData) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      );
    }

    // Get group members
    const members = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        joinedAt: groupMembers.joinedAt
      })
      .from(groupMembers)
      .innerJoin(user, eq(groupMembers.studentId, user.id))
      .where(eq(groupMembers.groupId, params.id))
      .orderBy(desc(groupMembers.joinedAt));

    const groupDetails = {
      ...groupData,
      members
    };

    return NextResponse.json({
      success: true,
      group: groupDetails
    });

  } catch (error) {
    logger.error("Error fetching group details:", error);
    return NextResponse.json(
      { error: "Failed to fetch group details" },
      { status: 500 }
    );
  }
}
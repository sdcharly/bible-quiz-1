import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { studentGroups, user, groupMembers } from "@/lib/schema";
import { eq, sql, desc } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
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

    // Get all groups with educator info and member count
    const allGroups = await db
      .select({
        id: studentGroups.id,
        name: studentGroups.name,
        description: studentGroups.description,
        educatorId: studentGroups.educatorId,
        educatorName: user.name,
        educatorEmail: user.email,
        createdAt: studentGroups.createdAt,
        memberCount: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${groupMembers} 
          WHERE ${groupMembers.groupId} = ${studentGroups.id}
        )`
      })
      .from(studentGroups)
      .leftJoin(user, eq(studentGroups.educatorId, user.id))
      .orderBy(desc(studentGroups.createdAt));

    // Format the response
    const formattedGroups = allGroups.map(group => ({
      ...group,
      _count: {
        members: group.memberCount || 0
      }
    }));

    return NextResponse.json({
      success: true,
      groups: formattedGroups
    });

  } catch (error) {
    logger.error("Error fetching groups for admin:", error);
    return NextResponse.json(
      { error: "Failed to fetch groups" },
      { status: 500 }
    );
  }
}
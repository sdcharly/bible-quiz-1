import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { studentGroups, groupMembers, user } from "@/lib/schema";
import { eq, and, count, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

// Biblical group name suggestions
const BIBLICAL_GROUP_NAMES = [
  "Disciples",
  "Apostles", 
  "Prophets",
  "Elders",
  "Saints",
  "Shepherds",
  "Witnesses",
  "Messengers",
  "Servants",
  "Warriors",
  "Watchmen",
  "Believers",
  "Followers",
  "Chosen Ones",
  "Faithful",
  "Redeemed",
  "Blessed",
  "Anointed"
];

const GROUP_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#8B5CF6", // Purple
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#EC4899", // Pink
  "#14B8A6", // Teal
  "#6366F1", // Indigo
];

export async function GET(req: NextRequest) {
  try {
    // Get session
    const session = await auth.api.getSession({
      headers: await headers()
    });

    // Require authenticated educator
    if (!session?.user || session.user.role !== 'educator') {
      return NextResponse.json(
        { error: "Unauthorized - Educator access required" },
        { status: 401 }
      );
    }
    
    const educatorId = session.user.id;

    // Fetch all groups for this educator with member counts
    const groups = await db
      .select({
        id: studentGroups.id,
        name: studentGroups.name,
        description: studentGroups.description,
        theme: studentGroups.theme,
        color: studentGroups.color,
        maxSize: studentGroups.maxSize,
        isActive: studentGroups.isActive,
        createdAt: studentGroups.createdAt,
        updatedAt: studentGroups.updatedAt,
        memberCount: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${groupMembers} gm
          WHERE gm.group_id = ${studentGroups.id} 
          AND gm.is_active = true
        )`.as('memberCount')
      })
      .from(studentGroups)
      .where(
        and(
          eq(studentGroups.educatorId, educatorId),
          eq(studentGroups.isActive, true)
        )
      )
      .orderBy(studentGroups.createdAt);

    // Get total student count for this educator
    const totalStudents = await db
      .select({ count: count() })
      .from(groupMembers)
      .innerJoin(studentGroups, eq(groupMembers.groupId, studentGroups.id))
      .where(
        and(
          eq(studentGroups.educatorId, educatorId),
          eq(groupMembers.isActive, true)
        )
      );

    return NextResponse.json({
      groups,
      total: groups.length,
      totalStudents: totalStudents[0]?.count || 0,
      suggestions: BIBLICAL_GROUP_NAMES,
      colors: GROUP_COLORS
    });

  } catch (error) {
    logger.error("Error fetching groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch groups" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get session
    const session = await auth.api.getSession({
      headers: await headers()
    });

    // Require authenticated educator
    if (!session?.user || session.user.role !== 'educator') {
      return NextResponse.json(
        { error: "Unauthorized - Educator access required" },
        { status: 401 }
      );
    }
    
    const educatorId = session.user.id;

    const { name, description, color, maxSize } = await req.json();
    
    if (!name) {
      return NextResponse.json(
        { error: "Group name is required" },
        { status: 400 }
      );
    }

    // Check educator's permissions for max groups
    const currentGroups = await db
      .select({ count: count() })
      .from(studentGroups)
      .where(
        and(
          eq(studentGroups.educatorId, educatorId),
          eq(studentGroups.isActive, true)
        )
      );

    const maxGroups = 10; // Default max groups per educator
    if (currentGroups[0].count >= maxGroups) {
      return NextResponse.json(
        { error: `You have reached your maximum limit of ${maxGroups} groups` },
        { status: 403 }
      );
    }

    // Check if group name already exists for this educator
    const existingGroup = await db
      .select()
      .from(studentGroups)
      .where(
        and(
          eq(studentGroups.educatorId, educatorId),
          eq(studentGroups.name, name),
          eq(studentGroups.isActive, true)
        )
      )
      .limit(1);

    if (existingGroup.length > 0) {
      return NextResponse.json(
        { error: "A group with this name already exists" },
        { status: 409 }
      );
    }

    // Determine group color (use provided or assign from palette)
    const groupColor = color || GROUP_COLORS[currentGroups[0].count % GROUP_COLORS.length];

    // Create new group
    const newGroup = await db.insert(studentGroups).values({
      id: crypto.randomUUID(),
      educatorId,
      name: name.trim(),
      description: description?.trim(),
      theme: "biblical",
      color: groupColor,
      maxSize: maxSize || 30,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json({
      success: true,
      message: `Group "${name}" created successfully`,
      group: newGroup[0]
    });

  } catch (error) {
    logger.error("Error creating group:", error);
    return NextResponse.json(
      { error: "Failed to create group" },
      { status: 500 }
    );
  }
}
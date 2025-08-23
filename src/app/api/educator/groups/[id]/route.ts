import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { studentGroups, groupMembers, enrollments, groupEnrollments } from "@/lib/schema";
import { eq, and, count, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    
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
    const groupId = params.id;

    // Fetch group details
    const group = await db
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
        )`.as('memberCount'),
        assignedQuizzes: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${groupEnrollments} ge
          WHERE ge.group_id = ${studentGroups.id}
        )`.as('assignedQuizzes')
      })
      .from(studentGroups)
      .where(
        and(
          eq(studentGroups.id, groupId),
          eq(studentGroups.educatorId, educatorId),
          eq(studentGroups.isActive, true)
        )
      )
      .limit(1);

    if (!group.length) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(group[0]);

  } catch (error) {
    logger.error("Error fetching group:", error);
    return NextResponse.json(
      { error: "Failed to fetch group" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    
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
    const groupId = params.id;

    const { name, description, color, maxSize } = await req.json();

    // Verify group ownership
    const existingGroup = await db
      .select()
      .from(studentGroups)
      .where(
        and(
          eq(studentGroups.id, groupId),
          eq(studentGroups.educatorId, educatorId),
          eq(studentGroups.isActive, true)
        )
      )
      .limit(1);

    if (!existingGroup.length) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      );
    }

    // Check if new name conflicts with another group
    if (name && name !== existingGroup[0].name) {
      const nameConflict = await db
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

      if (nameConflict.length > 0) {
        return NextResponse.json(
          { error: "A group with this name already exists" },
          { status: 409 }
        );
      }
    }

    // Update group
    const updatedGroup = await db
      .update(studentGroups)
      .set({
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() }),
        ...(color && { color }),
        ...(maxSize && { maxSize }),
        updatedAt: new Date()
      })
      .where(eq(studentGroups.id, groupId))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Group updated successfully",
      group: updatedGroup[0]
    });

  } catch (error) {
    logger.error("Error updating group:", error);
    return NextResponse.json(
      { error: "Failed to update group" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    
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
    const groupId = params.id;

    // Verify group ownership
    const existingGroup = await db
      .select()
      .from(studentGroups)
      .where(
        and(
          eq(studentGroups.id, groupId),
          eq(studentGroups.educatorId, educatorId),
          eq(studentGroups.isActive, true)
        )
      )
      .limit(1);

    if (!existingGroup.length) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      );
    }

    // Check if group has active quiz enrollments
    const activeEnrollments = await db
      .select({ count: count() })
      .from(groupEnrollments)
      .where(eq(groupEnrollments.groupId, groupId));

    if (activeEnrollments[0].count > 0) {
      // Soft delete - preserve for history
      await db
        .update(studentGroups)
        .set({
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(studentGroups.id, groupId));

      // Mark all members as inactive
      await db
        .update(groupMembers)
        .set({
          isActive: false,
          removedAt: new Date(),
          removedBy: educatorId
        })
        .where(eq(groupMembers.groupId, groupId));

      return NextResponse.json({
        success: true,
        message: "Group archived successfully (has active quiz enrollments)"
      });
    } else {
      // Hard delete if no quiz enrollments
      await db.delete(groupMembers).where(eq(groupMembers.groupId, groupId));
      await db.delete(studentGroups).where(eq(studentGroups.id, groupId));

      return NextResponse.json({
        success: true,
        message: "Group deleted successfully"
      });
    }

  } catch (error) {
    logger.error("Error deleting group:", error);
    return NextResponse.json(
      { error: "Failed to delete group" },
      { status: 500 }
    );
  }
}
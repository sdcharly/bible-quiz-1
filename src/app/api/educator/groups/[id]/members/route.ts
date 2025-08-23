import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { studentGroups, groupMembers, user, educatorStudents, enrollments, quizAttempts } from "@/lib/schema";
import { eq, and, or, inArray, count, notInArray, sql } from "drizzle-orm";
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

    // Verify group ownership
    const group = await db
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

    if (!group.length) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      );
    }

    // Fetch group members with their details
    const members = await db
      .select({
        memberId: groupMembers.id,
        studentId: groupMembers.studentId,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        joinedAt: groupMembers.joinedAt,
        role: groupMembers.role,
        isActive: groupMembers.isActive,
        // Stats
        totalEnrollments: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${enrollments} e
          WHERE e.student_id = ${groupMembers.studentId}
        )`.as('totalEnrollments'),
        completedQuizzes: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${quizAttempts} qa
          WHERE qa.student_id = ${groupMembers.studentId} 
          AND qa.status = 'completed'
        )`.as('completedQuizzes')
      })
      .from(groupMembers)
      .innerJoin(user, eq(groupMembers.studentId, user.id))
      .where(
        and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.isActive, true)
        )
      )
      .orderBy(groupMembers.joinedAt);

    // Get available students (not in this group)
    const currentMemberIds = members.map(m => m.studentId);
    
    const availableStudents = await db
      .select({
        studentId: educatorStudents.studentId,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        // Check if in any other group
        inOtherGroup: sql<boolean>`EXISTS (
          SELECT 1 FROM ${groupMembers} gm
          INNER JOIN ${studentGroups} sg ON gm.group_id = sg.id
          WHERE gm.student_id = ${educatorStudents.studentId}
          AND gm.is_active = true
          AND sg.educator_id = ${educatorId}
          AND sg.id != ${groupId}
          AND sg.is_active = true
        )`.as('inOtherGroup')
      })
      .from(educatorStudents)
      .innerJoin(user, eq(educatorStudents.studentId, user.id))
      .where(
        and(
          eq(educatorStudents.educatorId, educatorId),
          eq(educatorStudents.status, "active"),
          currentMemberIds.length > 0 
            ? notInArray(educatorStudents.studentId, currentMemberIds)
            : sql`true`
        )
      );

    return NextResponse.json({
      group: {
        id: group[0].id,
        name: group[0].name,
        maxSize: group[0].maxSize
      },
      members,
      availableStudents,
      stats: {
        currentSize: members.length,
        maxSize: group[0].maxSize,
        availableCount: availableStudents.length
      }
    });

  } catch (error) {
    logger.error("Error fetching group members:", error);
    return NextResponse.json(
      { error: "Failed to fetch group members" },
      { status: 500 }
    );
  }
}

export async function POST(
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

    const { studentIds } = await req.json();
    
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { error: "Student IDs are required" },
        { status: 400 }
      );
    }

    // Verify group ownership
    const group = await db
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

    if (!group.length) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      );
    }

    // Check current group size
    const currentMembers = await db
      .select({ count: count() })
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.isActive, true)
        )
      );

    const currentSize = currentMembers[0].count;
    const maxSize = group[0].maxSize || 30;
    
    if (currentSize + studentIds.length > maxSize) {
      return NextResponse.json(
        { error: `Adding ${studentIds.length} students would exceed the group limit of ${maxSize}` },
        { status: 400 }
      );
    }

    // Verify all students belong to this educator
    const validStudents = await db
      .select({ studentId: educatorStudents.studentId })
      .from(educatorStudents)
      .where(
        and(
          eq(educatorStudents.educatorId, educatorId),
          eq(educatorStudents.status, "active"),
          inArray(educatorStudents.studentId, studentIds)
        )
      );

    if (validStudents.length !== studentIds.length) {
      return NextResponse.json(
        { error: "Some students are not in your student list" },
        { status: 400 }
      );
    }

    // Check for existing members
    const existingMembers = await db
      .select({ studentId: groupMembers.studentId })
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, groupId),
          inArray(groupMembers.studentId, studentIds)
        )
      );

    const existingStudentIds = new Set(existingMembers.map(m => m.studentId));
    const newStudentIds = studentIds.filter(id => !existingStudentIds.has(id));

    // Reactivate existing inactive members
    const inactiveMembers = existingMembers.filter(m => !newStudentIds.includes(m.studentId));
    if (inactiveMembers.length > 0) {
      await db
        .update(groupMembers)
        .set({
          isActive: true,
          removedAt: null,
          removedBy: null
        })
        .where(
          and(
            eq(groupMembers.groupId, groupId),
            inArray(groupMembers.studentId, inactiveMembers.map(m => m.studentId))
          )
        );
    }

    // Add new members
    if (newStudentIds.length > 0) {
      const newMembers = newStudentIds.map(studentId => ({
        id: crypto.randomUUID(),
        groupId,
        studentId,
        joinedAt: new Date(),
        role: "member",
        isActive: true,
        addedBy: educatorId
      }));

      await db.insert(groupMembers).values(newMembers);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully added ${studentIds.length} student(s) to the group`,
      added: newStudentIds.length,
      reactivated: inactiveMembers.length
    });

  } catch (error) {
    logger.error("Error adding group members:", error);
    return NextResponse.json(
      { error: "Failed to add group members" },
      { status: 500 }
    );
  }
}

// Bulk operations endpoint
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

    const { action, studentIds, targetGroupId } = await req.json();
    
    if (!action || !studentIds || !Array.isArray(studentIds)) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    // Verify group ownership
    const group = await db
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

    if (!group.length) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      );
    }

    if (action === "move" && targetGroupId) {
      // Verify target group ownership
      const targetGroup = await db
        .select()
        .from(studentGroups)
        .where(
          and(
            eq(studentGroups.id, targetGroupId),
            eq(studentGroups.educatorId, educatorId),
            eq(studentGroups.isActive, true)
          )
        )
        .limit(1);

      if (!targetGroup.length) {
        return NextResponse.json(
          { error: "Target group not found" },
          { status: 404 }
        );
      }

      // Remove from current group
      await db
        .update(groupMembers)
        .set({
          isActive: false,
          removedAt: new Date(),
          removedBy: educatorId
        })
        .where(
          and(
            eq(groupMembers.groupId, groupId),
            inArray(groupMembers.studentId, studentIds)
          )
        );

      // Add to target group
      const newMembers = studentIds.map(studentId => ({
        id: crypto.randomUUID(),
        groupId: targetGroupId,
        studentId,
        joinedAt: new Date(),
        role: "member",
        isActive: true,
        addedBy: educatorId
      }));

      await db.insert(groupMembers).values(newMembers);

      return NextResponse.json({
        success: true,
        message: `Moved ${studentIds.length} student(s) to ${targetGroup[0].name}`
      });

    } else if (action === "remove") {
      // Remove from group
      await db
        .update(groupMembers)
        .set({
          isActive: false,
          removedAt: new Date(),
          removedBy: educatorId
        })
        .where(
          and(
            eq(groupMembers.groupId, groupId),
            inArray(groupMembers.studentId, studentIds)
          )
        );

      return NextResponse.json({
        success: true,
        message: `Removed ${studentIds.length} student(s) from the group`
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );

  } catch (error) {
    logger.error("Error in bulk operation:", error);
    return NextResponse.json(
      { error: "Failed to perform bulk operation" },
      { status: 500 }
    );
  }
}
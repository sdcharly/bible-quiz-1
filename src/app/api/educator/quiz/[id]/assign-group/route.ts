import { NextRequest, NextResponse } from "next/server";
import { eq, and, inArray, notInArray } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { quizzes, studentGroups, groupMembers, groupEnrollments, enrollments, user } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { sendEmail, emailTemplates } from "@/lib/email-service";
import { getQuizAvailabilityStatus } from "@/lib/quiz-scheduling";


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
    const quizId = params.id;

    const { groupId, sendNotifications = true, excludedStudentIds = [] } = await req.json();
    
    if (!groupId) {
      return NextResponse.json(
        { error: "Group ID is required" },
        { status: 400 }
      );
    }

    // Verify quiz ownership
    const quiz = await db
      .select()
      .from(quizzes)
      .where(
        and(
          eq(quizzes.id, quizId),
          eq(quizzes.educatorId, educatorId)
        )
      )
      .limit(1);

    if (!quiz.length) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    // Check if quiz has expired
    const quizWithStatus = {
      ...quiz[0],
      schedulingStatus: quiz[0].schedulingStatus || 'legacy'
    };
    const availability = getQuizAvailabilityStatus(quizWithStatus);
    if (availability.status === 'ended') {
      const endTime = availability.endTime ? new Date(availability.endTime).toLocaleString() : 'unknown';
      return NextResponse.json(
        { 
          error: `Cannot assign groups to an expired quiz. This quiz ended on ${endTime}.`,
          suggestion: "You can create a new quiz with the same content or use the reassignment feature for specific students who missed the original deadline."
        },
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

    // Check if group is already enrolled in this quiz
    const existingGroupEnrollment = await db
      .select()
      .from(groupEnrollments)
      .where(
        and(
          eq(groupEnrollments.groupId, groupId),
          eq(groupEnrollments.quizId, quizId)
        )
      )
      .limit(1);

    if (existingGroupEnrollment.length > 0) {
      return NextResponse.json(
        { error: "This group is already assigned to this quiz" },
        { status: 409 }
      );
    }

    // Get all active group members
    const members = await db
      .select({
        studentId: groupMembers.studentId,
        name: user.name,
        email: user.email,
        timezone: user.timezone
      })
      .from(groupMembers)
      .innerJoin(user, eq(groupMembers.studentId, user.id))
      .where(
        and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.isActive, true),
          excludedStudentIds.length > 0 
            ? notInArray(groupMembers.studentId, excludedStudentIds)
            : undefined
        )
      );

    if (members.length === 0) {
      return NextResponse.json(
        { error: "No active members in this group to enroll" },
        { status: 400 }
      );
    }

    // Create group enrollment record
    const groupEnrollment = await db.insert(groupEnrollments).values({
      id: crypto.randomUUID(),
      groupId,
      quizId,
      enrolledBy: educatorId,
      enrolledAt: new Date(),
      sendNotifications,
      excludedStudentIds
    }).returning();

    // Check which students are already enrolled individually
    const existingEnrollments = await db
      .select({ studentId: enrollments.studentId })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.quizId, quizId),
          inArray(enrollments.studentId, members.map(m => m.studentId))
        )
      );

    const existingStudentIds = new Set(existingEnrollments.map(e => e.studentId));
    const newEnrollments = members.filter(m => !existingStudentIds.has(m.studentId));

    // Create individual enrollments for group members
    if (newEnrollments.length > 0) {
      const enrollmentRecords = newEnrollments.map(member => ({
        id: crypto.randomUUID(),
        quizId,
        studentId: member.studentId,
        enrolledAt: new Date(),
        status: "enrolled" as const,
        groupEnrollmentId: groupEnrollment[0].id
      }));

      await db.insert(enrollments).values(enrollmentRecords);
    }

    // Send email notifications if enabled
    let notificationsSent = 0;
    if (sendNotifications) {
      const educatorData = await db
        .select({ name: user.name })
        .from(user)
        .where(eq(user.id, educatorId))
        .limit(1);

      for (const member of newEnrollments) {
        try {
          const emailContent = emailTemplates.quizEnrollmentNotification(
            member.name,
            educatorData[0]?.name || 'Your Educator',
            quiz[0].title,
            quiz[0].description,
            quiz[0].totalQuestions,
            quiz[0].duration,
            quiz[0].startTime ? new Date(quiz[0].startTime) : null,
            group[0].name,
            undefined, // No quiz URL for group enrollments yet
            member.timezone // Pass student's timezone for proper time display
          );
          
          await sendEmail({
            to: member.email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text
          });
          notificationsSent++;
        } catch (emailError) {
          logger.error(`Failed to send email to ${member.email}:`, emailError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully assigned quiz to group "${group[0].name}"`,
      stats: {
        groupName: group[0].name,
        totalMembers: members.length,
        newEnrollments: newEnrollments.length,
        alreadyEnrolled: existingEnrollments.length,
        excluded: excludedStudentIds.length,
        notificationsSent
      }
    });

  } catch (error) {
    logger.error("Error assigning quiz to group:", error);
    return NextResponse.json(
      { error: "Failed to assign quiz to group" },
      { status: 500 }
    );
  }
}

// Get group enrollments for a quiz
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
    const quizId = params.id;

    // Verify quiz ownership
    const quiz = await db
      .select()
      .from(quizzes)
      .where(
        and(
          eq(quizzes.id, quizId),
          eq(quizzes.educatorId, educatorId)
        )
      )
      .limit(1);

    if (!quiz.length) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    // Get all group enrollments for this quiz
    const groupEnrollmentsList = await db
      .select({
        enrollmentId: groupEnrollments.id,
        groupId: groupEnrollments.groupId,
        groupName: studentGroups.name,
        groupColor: studentGroups.color,
        enrolledAt: groupEnrollments.enrolledAt,
        sendNotifications: groupEnrollments.sendNotifications,
        excludedStudentIds: groupEnrollments.excludedStudentIds
      })
      .from(groupEnrollments)
      .innerJoin(studentGroups, eq(groupEnrollments.groupId, studentGroups.id))
      .where(eq(groupEnrollments.quizId, quizId));

    // Get member counts for each group enrollment
    const enrichedEnrollments = await Promise.all(
      groupEnrollmentsList.map(async (enrollment) => {
        const memberCount = await db
          .select({ count: eq(enrollments.groupEnrollmentId, enrollment.enrollmentId) })
          .from(enrollments)
          .where(eq(enrollments.groupEnrollmentId, enrollment.enrollmentId));

        return {
          ...enrollment,
          memberCount: memberCount.length,
          excludedCount: enrollment.excludedStudentIds?.length || 0
        };
      })
    );

    return NextResponse.json({
      quiz: {
        id: quiz[0].id,
        title: quiz[0].title
      },
      groupEnrollments: enrichedEnrollments,
      total: enrichedEnrollments.length
    });

  } catch (error) {
    logger.error("Error fetching group enrollments:", error);
    return NextResponse.json(
      { error: "Failed to fetch group enrollments" },
      { status: 500 }
    );
  }
}
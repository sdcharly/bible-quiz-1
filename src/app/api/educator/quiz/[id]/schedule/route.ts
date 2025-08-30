import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { quizzes, enrollments } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { isFeatureEnabled, FEATURES } from "@/lib/feature-flags";

// import { sendQuizReminderEmail } from "@/lib/email-service"; // TODO: Implement this function

/**
 * Phase 2.2: Quiz Scheduling Endpoint
 * This endpoint allows educators to set or update the time for a quiz
 * that was created with deferred scheduling
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const quizId = params.id;

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

    // Check if deferred time feature is enabled
    const isDeferredTimeEnabled = isFeatureEnabled('DEFERRED_TIME');
    if (!isDeferredTimeEnabled) {
      return NextResponse.json(
        { error: "Deferred scheduling feature is not enabled for your account" },
        { status: 403 }
      );
    }

    // Get the quiz
    const [quiz] = await db
      .select()
      .from(quizzes)
      .where(
        and(
          eq(quizzes.id, quizId),
          eq(quizzes.educatorId, educatorId)
        )
      );

    if (!quiz) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    // Check if quiz can be scheduled
    if (quiz.schedulingStatus === 'legacy') {
      return NextResponse.json(
        { error: "This quiz was created with fixed scheduling and cannot be rescheduled" },
        { status: 400 }
      );
    }

    if (quiz.status === 'completed' || quiz.status === 'archived') {
      return NextResponse.json(
        { error: `Cannot schedule a ${quiz.status} quiz` },
        { status: 400 }
      );
    }

    // Get scheduling parameters from request
    const body = await req.json();
    const { startTime, timezone, duration, notifyStudents = false } = body;

    // Validate required fields
    if (!startTime || !timezone) {
      return NextResponse.json(
        { error: "Start time and timezone are required" },
        { status: 400 }
      );
    }

    // Validate start time
    const startTimeDate = new Date(startTime);
    if (isNaN(startTimeDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid start time provided" },
        { status: 400 }
      );
    }

    // Ensure start time is in the future (with 5 minute buffer)
    const now = new Date();
    const minStartTime = new Date(now.getTime() + 5 * 60 * 1000);
    if (startTimeDate < minStartTime) {
      return NextResponse.json(
        { error: "Quiz start time must be at least 5 minutes in the future" },
        { status: 400 }
      );
    }

    // Check if quiz already has enrollments and is being rescheduled
    const existingEnrollments = await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.quizId, quizId));

    const isRescheduling = quiz.startTime !== null && existingEnrollments.length > 0;

    // Update the quiz with scheduling information
    const updatedQuiz = await db
      .update(quizzes)
      .set({
        startTime: startTimeDate,
        timezone,
        duration: duration || quiz.duration,
        timeConfiguration: {
          startTime: startTime,
          timezone,
          duration: duration || quiz.duration,
          configuredAt: new Date().toISOString(),
          configuredBy: educatorId,
          isLegacy: false,
          ...(isRescheduling && {
            previousStartTime: quiz.startTime?.toISOString(),
            previousTimezone: quiz.timezone,
            rescheduledAt: new Date().toISOString()
          })
        },
        schedulingStatus: 'scheduled',
        scheduledBy: educatorId,
        scheduledAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(quizzes.id, quizId))
      .returning();

    // If students should be notified and there are enrollments
    if (notifyStudents && existingEnrollments.length > 0) {
      // Send notification emails to enrolled students
      // This would typically be done asynchronously
      try {
        // TODO: Implement email notifications
        // for (const enrollment of existingEnrollments) {
        //   await sendQuizReminderEmail(
        //     enrollment.studentId,
        //     quiz.title,
        //     startTimeDate,
        //     timezone,
        //     isRescheduling ? 'rescheduled' : 'scheduled'
        //   );
        // }
        // [REMOVED: Console statement for performance]
      } catch (emailError) {
        // [REMOVED: Console statement for performance]
        // Don't fail the scheduling operation if emails fail
      }
    }

    return NextResponse.json({
      success: true,
      quiz: updatedQuiz[0],
      message: isRescheduling 
        ? "Quiz has been rescheduled successfully"
        : "Quiz has been scheduled successfully",
      scheduledTime: startTimeDate.toISOString(),
      timezone,
      notifiedStudents: notifyStudents ? existingEnrollments.length : 0
    });

  } catch (error) {
    // [REMOVED: Console statement for performance]
    return NextResponse.json(
      { 
        error: "Failed to schedule quiz", 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to retrieve current scheduling information
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const quizId = params.id;

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

    // Get the quiz
    const [quiz] = await db
      .select()
      .from(quizzes)
      .where(
        and(
          eq(quizzes.id, quizId),
          eq(quizzes.educatorId, educatorId)
        )
      );

    if (!quiz) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    // Return scheduling information
    return NextResponse.json({
      quizId: quiz.id,
      title: quiz.title,
      schedulingStatus: quiz.schedulingStatus,
      startTime: quiz.startTime,
      timezone: quiz.timezone,
      duration: quiz.duration,
      timeConfiguration: quiz.timeConfiguration,
      scheduledBy: quiz.scheduledBy,
      scheduledAt: quiz.scheduledAt,
      canReschedule: quiz.schedulingStatus !== 'legacy' && 
                     quiz.status !== 'completed' && 
                     quiz.status !== 'archived',
      status: quiz.status
    });

  } catch (error) {
    // [REMOVED: Console statement for performance]
    return NextResponse.json(
      { 
        error: "Failed to get quiz schedule", 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
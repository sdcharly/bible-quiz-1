import { NextRequest, NextResponse } from "next/server";
import { eq, and, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { quizzes, enrollments, quizAttempts, educatorStudents } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { getQuizAvailabilityStatus } from "@/lib/quiz-scheduling";


/**
 * Phase 5: Enhanced student quiz listing with scheduling information
 */
export async function GET(req: NextRequest) {
  try {
    // Get session
    const session = await auth.api.getSession({
      headers: await headers()
    });

    // Require authenticated student
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json(
        { error: "Unauthorized - Student access required" },
        { status: 401 }
      );
    }
    
    const studentId = session.user.id;
    
    // First, get all educators this student is associated with
    const studentEducators = await db
      .select({ educatorId: educatorStudents.educatorId })
      .from(educatorStudents)
      .where(
        and(
          eq(educatorStudents.studentId, studentId),
          eq(educatorStudents.status, "active")
        )
      );

    if (studentEducators.length === 0) {
      // Student not associated with any educator yet
      return NextResponse.json({
        quizzes: [],
        message: "You are not enrolled with any educator yet. Please accept an invitation from an educator first."
      });
    }

    const educatorIds = studentEducators.filter(se => se && se.educatorId).map(se => se.educatorId);

    // Fetch only published quizzes from associated educators
    const educatorQuizzes = await db
      .select()
      .from(quizzes)
      .where(
        and(
          eq(quizzes.status, "published"),
          inArray(quizzes.educatorId, educatorIds)
        )
      );

    // Fetch student enrollments
    const studentEnrollments = await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.studentId, studentId));

    // Fetch student attempts
    const studentAttempts = await db
      .select()
      .from(quizAttempts)
      .where(eq(quizAttempts.studentId, studentId));

    // Map quiz data with enrollment, attempt status, and scheduling info
    const quizzesWithStatus = educatorQuizzes.filter(quiz => quiz && quiz.id && quiz.title).map(quiz => {
      const enrollment = studentEnrollments.find(e => e && e.quizId === quiz.id);
      const attempt = studentAttempts.find(a => a && a.quizId === quiz.id && a.status === "completed");
      
      // Get availability status
      const availability = getQuizAvailabilityStatus({
        id: quiz.id,
        title: quiz.title,
        startTime: quiz.startTime,
        timezone: quiz.timezone,
        duration: quiz.duration,
        schedulingStatus: quiz.schedulingStatus || 'legacy',
        timeConfiguration: quiz.timeConfiguration,
        status: quiz.status
      });

      return {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        totalQuestions: quiz.totalQuestions,
        duration: quiz.duration,
        
        // Time fields - handle null startTime for deferred quizzes
        startTime: quiz.startTime?.toISOString() || null,
        timezone: quiz.timezone,
        
        // Scheduling information
        schedulingStatus: quiz.schedulingStatus || 'legacy',
        hasScheduledTime: !!quiz.startTime,
        timeConfiguration: quiz.timeConfiguration,
        
        // Availability
        availability: {
          status: availability.status,
          available: availability.available,
          message: availability.message,
          startTime: availability.startTime?.toISOString(),
          endTime: availability.endTime?.toISOString()
        },
        
        // Quiz status
        status: quiz.status,
        
        // Student's relationship with quiz
        enrolled: !!enrollment,
        enrolledAt: enrollment?.enrolledAt?.toISOString(),
        attempted: !!attempt,
        attemptId: attempt?.id,
        score: attempt?.score,
        completedAt: attempt?.endTime?.toISOString(),
        
        // Additional metadata
        createdAt: quiz.createdAt.toISOString(),
        updatedAt: quiz.updatedAt.toISOString()
      };
    });

    // Sort quizzes by availability and enrollment status
    const sortedQuizzes = quizzesWithStatus.sort((a, b) => {
      // Enrolled quizzes first
      if (a.enrolled !== b.enrolled) {
        return a.enrolled ? -1 : 1;
      }
      
      // Active quizzes first
      if (a.availability.available !== b.availability.available) {
        return a.availability.available ? -1 : 1;
      }
      
      // Upcoming quizzes before ended ones
      if (a.availability.status !== b.availability.status) {
        const statusOrder = ['active', 'upcoming', 'not_scheduled', 'ended'];
        return statusOrder.indexOf(a.availability.status) - statusOrder.indexOf(b.availability.status);
      }
      
      // Finally, sort by start time (nulls last)
      if (a.startTime && b.startTime) {
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      }
      return a.startTime ? -1 : 1;
    });

    return NextResponse.json({
      quizzes: sortedQuizzes,
      stats: {
        total: sortedQuizzes.length,
        enrolled: sortedQuizzes.filter(q => q.enrolled).length,
        completed: sortedQuizzes.filter(q => q.attempted).length,
        available: sortedQuizzes.filter(q => q.availability.available).length,
        upcoming: sortedQuizzes.filter(q => q.availability.status === 'upcoming').length,
        unscheduled: sortedQuizzes.filter(q => q.availability.status === 'not_scheduled').length
      }
    });
  } catch (error) {
    // [REMOVED: Console statement for performance]
    return NextResponse.json(
      { error: "Failed to fetch quizzes" },
      { status: 500 }
    );
  }
}
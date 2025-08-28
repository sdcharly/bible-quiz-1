import { NextRequest, NextResponse } from "next/server";
import { eq, and, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { quizzes, enrollments, quizAttempts, educatorStudents } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { withPerformance } from "@/lib/api-performance";
import { logger } from "@/lib/logger";
import { getQuizAvailabilityStatus } from "@/lib/quiz-scheduling";


async function getHandler(req: NextRequest) {
  try {
    const startTime = Date.now();
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

    // Fetch data in parallel for better performance
    const [educatorQuizzes, studentEnrollments, studentAttempts] = await Promise.all([
      // Fetch only published quizzes from associated educators
      db
        .select()
        .from(quizzes)
        .where(
          and(
            eq(quizzes.status, "published"),
            inArray(quizzes.educatorId, educatorIds)
          )
        ),
      // Fetch student enrollments
      db
        .select()
        .from(enrollments)
        .where(eq(enrollments.studentId, studentId)),
      // Fetch student attempts
      db
        .select()
        .from(quizAttempts)
        .where(eq(quizAttempts.studentId, studentId))
    ]);

    // Create lookup maps for O(1) access
    const enrollmentMap = new Map();
    for (const enrollment of studentEnrollments) {
      if (!enrollment || !enrollment.quizId) continue;
      
      const existing = enrollmentMap.get(enrollment.quizId);
      // Prioritize reassignments over original enrollments
      if (!existing || enrollment.isReassignment) {
        enrollmentMap.set(enrollment.quizId, enrollment);
      }
    }
    const attemptMap = new Map(
      studentAttempts
        .filter(a => a && a.status === "completed" && a.quizId)
        .map(a => [a.quizId, a])
    );

    // Map quiz data with enrollment and attempt status
    const quizzesWithStatus = educatorQuizzes
      .map(quiz => {
        // Basic validation
        if (!quiz || !quiz.id || !quiz.title) return null;
        
        const enrollment = enrollmentMap.get(quiz.id);
        const attempt = attemptMap.get(quiz.id);
        
        // Only show enrolled quizzes
        if (!enrollment) return null;
        
        // Get quiz availability status using existing function
        const quizSchedulingInfo = {
          id: quiz.id,
          title: quiz.title,
          startTime: quiz.startTime,
          timezone: quiz.timezone,
          duration: quiz.duration || 30,
          schedulingStatus: quiz.schedulingStatus || 'legacy',
          timeConfiguration: quiz.timeConfiguration as any,
          status: quiz.status
        };
        
        const availability = getQuizAvailabilityStatus(quizSchedulingInfo);
        
        const isReassignment = enrollment?.isReassignment || false;
        const reassignmentReason = enrollment?.reassignmentReason || null;
        
        // CRITICAL FIX: Filter out expired quizzes unless:
        // 1. Student has COMPLETED them (to show results) OR
        // 2. This is a reassignment (reassignments bypass time constraints)
        if (availability.status === 'ended' && !attempt && !isReassignment) {
          return null;
        }
        
        // For reassignments, override availability to make them always active
        const effectiveAvailability = isReassignment && !attempt
          ? { status: 'active', message: 'Reassigned - Available to take' }
          : availability;
        
        return {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          totalQuestions: quiz.totalQuestions,
          duration: quiz.duration,
          startTime: quiz.startTime?.toISOString() || null,
          timezone: quiz.timezone,
          status: quiz.status,
          enrolled: !!enrollment,
          attempted: !!attempt,
          attemptId: attempt?.id,
          score: attempt?.score,
          isActive: effectiveAvailability.status === 'active',
          isUpcoming: effectiveAvailability.status === 'upcoming',
          isExpired: effectiveAvailability.status === 'ended',
          availabilityMessage: effectiveAvailability.message,
          availabilityStatus: effectiveAvailability.status,
          isReassignment,
          reassignmentReason,
          enrollmentStatus: enrollment?.status
        };
      })
      .filter(quiz => quiz !== null);

    const responseTime = Date.now() - startTime;
    logger.debug("Student quizzes fetched", { 
      count: quizzesWithStatus.length, 
      responseTime 
    });

    return NextResponse.json({
      quizzes: quizzesWithStatus,
    }, {
      headers: {
        "Cache-Control": "private, max-age=10",
        "X-Response-Time": String(responseTime),
      }
    });
  } catch (error) {
    logger.error("Error fetching quizzes", error);
    return NextResponse.json(
      { error: "Failed to fetch quizzes" },
      { status: 500 }
    );
  }
}

// Export with performance optimizations
export const GET = withPerformance(getHandler as (...args: unknown[]) => Promise<NextResponse>, {
  cache: true,
  cacheKey: "student-quizzes",
  cacheTTL: 10000, // Cache for 10 seconds
  rateLimit: true,
  maxRequests: 200, // Allow 200 requests per minute per IP
});
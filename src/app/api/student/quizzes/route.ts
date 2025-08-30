import { NextRequest, NextResponse } from "next/server";
import { eq, and, inArray, or, isNull, gte, lte, like, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { quizzes, enrollments, quizAttempts, educatorStudents, user } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { withPerformance } from "@/lib/api-performance";
import { logger } from "@/lib/logger";
import { getQuizAvailabilityStatus } from "@/lib/quiz-scheduling";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { fetchWithOptimizedCache } from "@/lib/api-cache";

/**
 * Unified Student Quizzes API
 * Consolidates route.ts, optimized/route.ts, and enhanced/route.ts
 * Uses feature flags to control optimization level
 */

interface QueryFilters {
  status?: 'all' | 'available' | 'completed' | 'upcoming' | 'active';
  limit?: number;
  offset?: number;
  search?: string;
}

export async function GET(req: NextRequest) {
  return getHandler(req);
}

async function getHandler(req: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Parse query parameters for filtering
    const { searchParams } = new URL(req.url);
    const filters: QueryFilters = {
      status: (searchParams.get('status') as QueryFilters['status']) || 'all',
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
      search: searchParams.get('search') || undefined
    };
    
    // Validate filters
    if (filters.limit! > 100) filters.limit = 100; // Cap at 100 for performance
    
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
    
    // Get student's educators
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
      // Use optimized caching for empty response if enabled
      const cacheHeaders: Record<string, string> = {};
      if (isFeatureEnabled('CLASSROOM_CACHE')) {
        cacheHeaders["Cache-Control"] = "private, max-age=60";
        cacheHeaders["X-Response-Time"] = String(Date.now() - startTime);
      }
      
      return NextResponse.json({
        quizzes: [],
        total: 0,
        filters,
        message: "You are not enrolled with any educator yet. Please accept an invitation from an educator first."
      }, { headers: Object.keys(cacheHeaders).length > 0 ? cacheHeaders : undefined });
    }

    const educatorIds = studentEducators.filter(se => se?.educatorId).map(se => se.educatorId);
    
    // CRITICAL SECURITY: Only show quizzes from educators the student belongs to
    // This prevents cross-educator data leakage

    // Choose query strategy based on feature flags
    let quizData;
    
    if (isFeatureEnabled('OPTIMIZED_DB_POOL')) {
      // Use optimized single-query approach
      quizData = await getOptimizedQuizData(studentId, educatorIds, filters);
    } else {
      // Use legacy multi-query approach
      quizData = await getLegacyQuizData(studentId, educatorIds, filters);
    }

    // Apply client-side processing if enhanced features enabled
    if (isFeatureEnabled('CLASSROOM_CACHE')) {
      quizData = await processWithEnhancedFeatures(quizData);
    }

    const duration = Date.now() - startTime;
    
    // Set response headers based on feature flags
    const responseHeaders: Record<string, string> = {
      "X-Response-Time": String(duration),
    };
    
    if (isFeatureEnabled('CLASSROOM_CACHE')) {
      responseHeaders["Cache-Control"] = "private, max-age=300, stale-while-revalidate=60";
    }

    logger.debug(`Student quizzes query completed in ${duration}ms`);

    return NextResponse.json({
      quizzes: quizData.quizzes,
      total: quizData.total,
      filters,
      responseTime: duration,
      optimized: isFeatureEnabled('OPTIMIZED_DB_POOL'),
      cached: isFeatureEnabled('CLASSROOM_CACHE')
    }, { headers: responseHeaders });

  } catch (error) {
    logger.error("Error in student quizzes API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Optimized single-query approach (JOIN-based)
 */
async function getOptimizedQuizData(studentId: string, educatorIds: string[], filters: QueryFilters) {
  const now = new Date();
  
  // Single optimized query using JOINs
  // CRITICAL: Only fetch quizzes where:
  // 1. Quiz is published
  // 2. Quiz belongs to one of the student's educators
  // 3. Student is enrolled in the quiz
  const quizQuery = db
    .select({
      quiz: quizzes,
      enrollment: enrollments,
      attempt: quizAttempts,
      educator: user
    })
    .from(quizzes)
    .innerJoin(
      enrollments,
      and(
        eq(enrollments.quizId, quizzes.id),
        eq(enrollments.studentId, studentId)
      )
    )
    .leftJoin(
      quizAttempts,
      and(
        eq(quizAttempts.quizId, quizzes.id),
        eq(quizAttempts.studentId, studentId),
        eq(quizAttempts.status, "completed")
      )
    )
    .leftJoin(
      user,
      eq(user.id, quizzes.educatorId)
    )
    .where(
      and(
        eq(quizzes.status, "published"),
        inArray(quizzes.educatorId, educatorIds), // CRITICAL: Only from student's educators
        // Add search filter if provided
        filters.search ? 
          or(
            sql`LOWER(${quizzes.title}) LIKE LOWER(${`%${filters.search}%`})`,
            sql`LOWER(${quizzes.description}) LIKE LOWER(${`%${filters.search}%`})`
          ) : undefined
      )
    )
    .limit(filters.limit!)
    .offset(filters.offset!);

  const results = await quizQuery;

  // Process results in a single pass
  const processedQuizzes = results
    .map(({ quiz, enrollment, attempt, educator }) => {
      // Skip invalid data
      if (!quiz?.id || !quiz?.title || !enrollment) return null;
      
      // Calculate availability
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
      const isReassignment = enrollment.isReassignment || false;
      
      return {
        ...quiz,
        enrolled: true,
        attempted: !!attempt,
        attemptId: attempt?.id || null,
        score: attempt?.score || null,
        isReassignment,
        educatorName: educator?.name || "Unknown Educator",
        ...availability
      };
    })
    .filter(q => q !== null);

  return {
    quizzes: processedQuizzes,
    total: processedQuizzes.length
  };
}

/**
 * Legacy multi-query approach (backward compatibility)
 */
async function getLegacyQuizData(studentId: string, educatorIds: string[], filters: QueryFilters) {
  // Fetch data in parallel for better performance
  const [educatorQuizzes, studentEnrollments, studentAttempts, educators] = await Promise.all([
    db.select().from(quizzes).where(
      and(
        inArray(quizzes.educatorId, educatorIds),
        eq(quizzes.status, "published")
      )
    ),
    db.select().from(enrollments).where(
      eq(enrollments.studentId, studentId)
    ),
    db.select().from(quizAttempts).where(
      and(
        eq(quizAttempts.studentId, studentId),
        eq(quizAttempts.status, "completed")
      )
    ),
    db.select({ id: user.id, name: user.name }).from(user).where(
      inArray(user.id, educatorIds)
    )
  ]);

  // Create lookup maps for efficient processing
  const enrollmentMap = new Map(studentEnrollments.map(e => [e.quizId, e]));
  const attemptMap = new Map(studentAttempts.map(a => [a.quizId, a]));
  const educatorMap = new Map(educators.map(e => [e.id, e.name]));

  // Process quizzes - CRITICAL: Double-check educator ownership
  const processedQuizzes = educatorQuizzes
    .filter(quiz => {
      // Only include if:
      // 1. Student is enrolled
      // 2. Quiz belongs to one of student's educators (redundant check for safety)
      return enrollmentMap.has(quiz.id) && educatorIds.includes(quiz.educatorId);
    })
    .map(quiz => {
      const enrollment = enrollmentMap.get(quiz.id)!;
      const attempt = attemptMap.get(quiz.id);
      
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
      
      return {
        ...quiz,
        enrolled: true,
        attempted: !!attempt,
        attemptId: attempt?.id || null,
        score: attempt?.score || null,
        isReassignment: enrollment.isReassignment || false,
        educatorName: educatorMap.get(quiz.educatorId) || "Unknown Educator",
        ...availability
      };
    });

  return {
    quizzes: processedQuizzes,
    total: processedQuizzes.length
  };
}

/**
 * Enhanced processing with classroom-specific features
 */
async function processWithEnhancedFeatures(quizData: any) {
  // Add any enhanced processing here
  // e.g., pre-compute classroom statistics, add teacher insights, etc.
  
  // For now, just return the data as-is
  return quizData;
}
/**
 * Quiz Security Module
 * 
 * Handles security for quiz operations without rate limiting legitimate users.
 * Designed to support 100+ concurrent students while preventing abuse.
 */

import { db } from "@/lib/db";
import { quizAttempts, enrollments } from "@/lib/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";

interface ValidationResult {
  allowed: boolean;
  reason?: string;
  attemptCount?: number;
}

/**
 * Validates if a student can start a quiz attempt
 * Uses enrollment and attempt history instead of rate limiting
 */
export async function validateQuizStart(
  studentId: string,
  quizId: string,
  enrollmentId?: string
): Promise<ValidationResult> {
  try {
    // Check if student is enrolled (this is already checked in the API)
    if (enrollmentId) {
      const [enrollment] = await db
        .select()
        .from(enrollments)
        .where(eq(enrollments.id, enrollmentId));

      if (!enrollment) {
        return { 
          allowed: false, 
          reason: "Invalid enrollment" 
        };
      }

      // Check if already completed
      if (enrollment.status === "completed") {
        return { 
          allowed: false, 
          reason: "Quiz already completed for this enrollment" 
        };
      }
    }

    // Check for existing in-progress attempts
    const inProgressAttempts = await db
      .select()
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.studentId, studentId),
          eq(quizAttempts.quizId, quizId),
          eq(quizAttempts.status, "in_progress")
        )
      );

    if (inProgressAttempts.length > 0) {
      // Allow resuming the existing attempt instead of blocking
      logger.info("Student has existing in-progress attempt", {
        studentId,
        quizId,
        attemptId: inProgressAttempts[0].id
      });
      return { 
        allowed: true, 
        attemptCount: inProgressAttempts.length 
      };
    }

    // Check for suspicious patterns (e.g., too many attempts in short time)
    const recentAttempts = await db
      .select({
        count: sql<number>`count(*)`.as('count')
      })
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.studentId, studentId),
          eq(quizAttempts.quizId, quizId),
          gte(quizAttempts.createdAt, new Date(Date.now() - 5 * 60 * 1000)) // Last 5 minutes
        )
      );

    const attemptCount = recentAttempts[0]?.count || 0;

    // Allow up to 3 attempts in 5 minutes (for network issues/retries)
    if (attemptCount >= 3) {
      logger.warn("Too many quiz start attempts", {
        studentId,
        quizId,
        attemptCount
      });
      return { 
        allowed: false, 
        reason: "Too many attempts. Please wait a few minutes and try again.",
        attemptCount 
      };
    }

    return { allowed: true, attemptCount };

  } catch (error) {
    logger.error("Error validating quiz start:", error);
    // On error, allow the attempt (fail open, not closed)
    return { allowed: true };
  }
}

/**
 * Validates if a student can submit quiz answers
 * Ensures the attempt is legitimate and not duplicate
 */
export async function validateQuizSubmit(
  studentId: string,
  quizId: string,
  attemptId: string
): Promise<ValidationResult> {
  try {
    // Verify the attempt exists and belongs to the student
    const [attempt] = await db
      .select()
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.id, attemptId),
          eq(quizAttempts.studentId, studentId),
          eq(quizAttempts.quizId, quizId)
        )
      );

    if (!attempt) {
      return { 
        allowed: false, 
        reason: "Invalid attempt ID" 
      };
    }

    // Check if already submitted
    if (attempt.status === "completed") {
      return { 
        allowed: false, 
        reason: "Quiz already submitted" 
      };
    }

    // Check if attempt is too old (e.g., started more than 4 hours ago)
    const startTime = attempt.startTime || attempt.createdAt;
    const hoursElapsed = (Date.now() - new Date(startTime).getTime()) / (1000 * 60 * 60);
    
    if (hoursElapsed > 4) {
      logger.warn("Attempt to submit very old quiz", {
        studentId,
        attemptId,
        hoursElapsed
      });
      // Still allow submission but log it
    }

    return { allowed: true };

  } catch (error) {
    logger.error("Error validating quiz submit:", error);
    // On error, allow the submission (fail open)
    return { allowed: true };
  }
}

/**
 * Clean up abandoned quiz attempts
 * Run this periodically to free up stuck attempts
 */
export async function cleanupAbandonedAttempts(quizId?: string): Promise<number> {
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    const whereClause = quizId 
      ? and(
          eq(quizAttempts.status, "in_progress"),
          eq(quizAttempts.quizId, quizId),
          gte(quizAttempts.createdAt, twoHoursAgo)
        )
      : and(
          eq(quizAttempts.status, "in_progress"),
          gte(quizAttempts.createdAt, twoHoursAgo)
        );

    const result = await db
      .update(quizAttempts)
      .set({
        status: "abandoned",
        updatedAt: new Date()
      })
      .where(whereClause)
      .returning({ id: quizAttempts.id });

    const count = result.length;

    logger.info("Cleaned up abandoned attempts", {
      quizId,
      count
    });

    return count;

  } catch (error) {
    logger.error("Error cleaning up abandoned attempts:", error);
    return 0;
  }
}

/**
 * Monitors for potential abuse patterns
 */
export async function detectAbusePatterns(studentId: string): Promise<boolean> {
  try {
    // Check for patterns like:
    // - Multiple attempts across different quizzes in short time
    // - Attempts from multiple sessions/IPs (would need session tracking)
    // - Unusually fast completions
    
    const recentAttempts = await db
      .select({
        count: sql<number>`count(distinct quiz_id)`.as('count')
      })
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.studentId, studentId),
          gte(quizAttempts.createdAt, new Date(Date.now() - 10 * 60 * 1000)) // Last 10 minutes
        )
      );

    // If attempting more than 3 different quizzes in 10 minutes, flag as suspicious
    if ((recentAttempts[0]?.count || 0) > 3) {
      logger.warn("Suspicious activity detected", {
        studentId,
        quizCount: recentAttempts[0]?.count
      });
      return true;
    }

    return false;

  } catch (error) {
    logger.error("Error detecting abuse patterns:", error);
    return false;
  }
}
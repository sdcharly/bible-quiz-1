/**
 * Phase 6.2: Compatibility Checker
 * Ensures backward compatibility with existing quiz functionality
 */

import { logger } from "@/lib/logger";

export interface CompatibilityCheckResult {
  isCompatible: boolean;
  issues: string[];
  warnings: string[];
  suggestions: string[];
}

/**
 * Check if a quiz is compatible with the current system
 */
export function checkQuizCompatibility(quiz: Record<string, unknown>): CompatibilityCheckResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Check required fields
  if (!quiz.id) {
    issues.push("Quiz is missing an ID");
  }

  if (!quiz.title) {
    issues.push("Quiz is missing a title");
  }

  if (!quiz.educatorId) {
    issues.push("Quiz is missing an educator ID");
  }

  // Check scheduling compatibility
  if (!quiz.schedulingStatus) {
    // This is a legacy quiz that needs migration
    warnings.push("Quiz lacks scheduling status - will be treated as legacy");
    suggestions.push("Run migration script to add scheduling metadata");
  }

  // Check time fields
  if (quiz.schedulingStatus === 'legacy' || !quiz.schedulingStatus) {
    // Legacy quiz must have startTime
    if (!quiz.startTime) {
      issues.push("Legacy quiz is missing start time");
    }
  } else if (quiz.schedulingStatus === 'deferred') {
    // Deferred quiz can have null startTime
    if (quiz.status === 'published' && !quiz.startTime) {
      warnings.push("Published quiz has no scheduled time");
      suggestions.push("Set quiz time before students can start");
    }
  }

  // Check duration
  if (!quiz.duration || quiz.duration <= 0) {
    issues.push("Quiz has invalid duration");
  }

  // Check questions
  if (!quiz.totalQuestions || quiz.totalQuestions <= 0) {
    warnings.push("Quiz has no questions");
  }

  // Check status
  const validStatuses = ['draft', 'published', 'completed', 'archived'];
  if (!validStatuses.includes(quiz.status)) {
    issues.push(`Invalid quiz status: ${quiz.status}`);
  }

  return {
    isCompatible: issues.length === 0,
    issues,
    warnings,
    suggestions
  };
}

/**
 * Ensure quiz data is compatible for API responses
 */
export function ensureQuizCompatibility(quiz: Record<string, unknown>): Record<string, unknown> {
  // Add default scheduling status if missing
  if (!quiz.schedulingStatus) {
    quiz.schedulingStatus = 'legacy';
  }

  // Add time configuration if missing for legacy quizzes
  if (quiz.schedulingStatus === 'legacy' && !quiz.timeConfiguration) {
    quiz.timeConfiguration = {
      startTime: quiz.startTime?.toISOString ? quiz.startTime.toISOString() : quiz.startTime,
      timezone: quiz.timezone || 'UTC',
      duration: quiz.duration,
      configuredAt: quiz.createdAt?.toISOString ? quiz.createdAt.toISOString() : quiz.createdAt,
      configuredBy: quiz.educatorId,
      isLegacy: true
    };
  }

  // Ensure boolean flags
  quiz.hasScheduledTime = !!quiz.startTime;
  quiz.isDeferredScheduling = quiz.schedulingStatus === 'deferred';

  return quiz;
}

/**
 * Check if enrollment should be allowed based on quiz state
 */
export function checkEnrollmentCompatibility(quiz: Record<string, unknown>): {
  canEnroll: boolean;
  reason?: string;
} {
  // Must be published
  if (quiz.status !== 'published') {
    return {
      canEnroll: false,
      reason: "Quiz must be published before enrollment"
    };
  }

  // For legacy quizzes, check if time has passed
  if (quiz.schedulingStatus === 'legacy' || !quiz.schedulingStatus) {
    if (quiz.startTime) {
      const startTime = new Date(quiz.startTime);
      const endTime = new Date(startTime.getTime() + quiz.duration * 60 * 1000);
      
      if (new Date() > endTime) {
        return {
          canEnroll: false,
          reason: "Quiz has already ended"
        };
      }
    }
  }

  // For deferred quizzes, enrollment is allowed even without time
  // This is a key difference from legacy behavior
  if (quiz.schedulingStatus === 'deferred') {
    return {
      canEnroll: true
    };
  }

  return {
    canEnroll: true
  };
}

/**
 * Check if a student can start a quiz
 */
export function checkQuizStartCompatibility(quiz: Record<string, unknown>): {
  canStart: boolean;
  reason?: string;
} {
  // Must have a start time to begin
  if (!quiz.startTime) {
    if (quiz.schedulingStatus === 'deferred') {
      return {
        canStart: false,
        reason: "Quiz time has not been scheduled yet"
      };
    }
    return {
      canStart: false,
      reason: "Quiz has no start time"
    };
  }

  const now = new Date();
  const startTime = new Date(quiz.startTime);
  const endTime = new Date(startTime.getTime() + quiz.duration * 60 * 1000);

  // Check if quiz hasn't started
  if (now < startTime) {
    const minutesUntil = Math.ceil((startTime.getTime() - now.getTime()) / (1000 * 60));
    return {
      canStart: false,
      reason: `Quiz starts in ${minutesUntil} minutes`
    };
  }

  // Check if quiz has ended
  if (now > endTime) {
    return {
      canStart: false,
      reason: "Quiz has ended"
    };
  }

  return {
    canStart: true
  };
}

/**
 * Log compatibility issues for monitoring
 */
export function logCompatibilityIssue(
  context: string,
  quiz: Record<string, unknown>,
  issue: string
): void {
  logger.warn(`[Compatibility] ${context}`, {
    quizId: quiz.id,
    quizTitle: quiz.title,
    schedulingStatus: quiz.schedulingStatus,
    issue
  });
}

const compatibilityExports = {
  checkQuizCompatibility,
  ensureQuizCompatibility,
  checkEnrollmentCompatibility,
  checkQuizStartCompatibility,
  logCompatibilityIssue
};

export default compatibilityExports;
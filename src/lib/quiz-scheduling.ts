/**
 * Phase 2.3 & 2.4: Quiz Scheduling Utilities
 * Handles quiz time validation and provides helper functions
 * for both legacy and deferred scheduling modes
 */

import { quizzes } from "@/lib/schema";
import { logger } from "@/lib/logger";

export interface TimeConfiguration {
  startTime?: string;
  timezone?: string;
  duration?: number;
  configuredAt?: string | null;
  configuredBy?: string | null;
  isLegacy?: boolean;
  providedStartTime?: string;
  providedTimezone?: string;
  previousStartTime?: string;
  previousTimezone?: string;
  rescheduledAt?: string;
}

export interface QuizSchedulingInfo {
  id: string;
  title: string;
  startTime: Date | null;
  timezone: string;
  duration: number;
  schedulingStatus: string;
  timeConfiguration: TimeConfiguration | null;
  status: string;
}

/**
 * Get the effective start time for a quiz
 * Handles both legacy and deferred scheduling modes
 */
export function getEffectiveStartTime(quiz: QuizSchedulingInfo): Date | null {
  // If quiz has a direct startTime, use it (legacy mode)
  if (quiz.startTime) {
    return quiz.startTime;
  }

  // If quiz has time configuration, extract from there
  if (quiz.timeConfiguration?.startTime) {
    return new Date(quiz.timeConfiguration.startTime);
  }

  // No start time set (deferred mode, not yet scheduled)
  return null;
}

/**
 * Check if a quiz is ready to be published
 */
export function canPublishQuiz(quiz: QuizSchedulingInfo): {
  canPublish: boolean;
  reason?: string;
} {
  // Check basic requirements
  if (quiz.status === 'published') {
    return { canPublish: false, reason: "Quiz is already published" };
  }

  if (quiz.status === 'completed' || quiz.status === 'archived') {
    return { canPublish: false, reason: `Cannot publish a ${quiz.status} quiz` };
  }

  // Check scheduling requirements based on mode
  if (quiz.schedulingStatus === 'deferred') {
    // Deferred mode: must have time set before publishing
    const startTime = getEffectiveStartTime(quiz);
    if (!startTime) {
      return { 
        canPublish: false, 
        reason: "Quiz must be scheduled before publishing" 
      };
    }
  }

  const startTime = getEffectiveStartTime(quiz);
  if (startTime) {
    // Validate start time is in the future
    const now = new Date();
    const minStartTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes buffer
    
    if (startTime < minStartTime) {
      return { 
        canPublish: false, 
        reason: "Quiz start time must be at least 5 minutes in the future" 
      };
    }
  }

  return { canPublish: true };
}

/**
 * Check if a quiz can be rescheduled
 */
export function canRescheduleQuiz(quiz: QuizSchedulingInfo): {
  canReschedule: boolean;
  reason?: string;
} {
  // Legacy quizzes cannot be rescheduled
  if (quiz.schedulingStatus === 'legacy') {
    return { 
      canReschedule: false, 
      reason: "Legacy quizzes cannot be rescheduled" 
    };
  }

  // Completed or archived quizzes cannot be rescheduled
  if (quiz.status === 'completed' || quiz.status === 'archived') {
    return { 
      canReschedule: false, 
      reason: `Cannot reschedule a ${quiz.status} quiz` 
    };
  }

  // Check if quiz has already started
  const startTime = getEffectiveStartTime(quiz);
  if (startTime && startTime < new Date()) {
    return { 
      canReschedule: false, 
      reason: "Cannot reschedule a quiz that has already started" 
    };
  }

  return { canReschedule: true };
}

/**
 * Validate a proposed start time
 */
export function validateStartTime(
  startTime: Date | string,
  minBufferMinutes: number = 5
): {
  valid: boolean;
  error?: string;
} {
  const startTimeDate = typeof startTime === 'string' ? new Date(startTime) : startTime;
  
  // Check if date is valid
  if (isNaN(startTimeDate.getTime())) {
    return { valid: false, error: "Invalid start time provided" };
  }

  // Check if time is in the future
  const now = new Date();
  const minStartTime = new Date(now.getTime() + minBufferMinutes * 60 * 1000);
  
  if (startTimeDate < minStartTime) {
    return { 
      valid: false, 
      error: `Start time must be at least ${minBufferMinutes} minutes in the future` 
    };
  }

  // Check if time is not too far in the future (optional, e.g., 1 year)
  const maxStartTime = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  if (startTimeDate > maxStartTime) {
    return { 
      valid: false, 
      error: "Start time cannot be more than 1 year in the future" 
    };
  }

  return { valid: true };
}

/**
 * Format quiz scheduling info for API response
 */
export function formatQuizSchedulingResponse(quiz: QuizSchedulingInfo & Record<string, unknown>): Record<string, unknown> {
  const effectiveStartTime = getEffectiveStartTime(quiz);
  const publishable = canPublishQuiz(quiz);
  const reschedulable = canRescheduleQuiz(quiz);

  return {
    ...quiz,
    scheduling: {
      mode: quiz.schedulingStatus,
      startTime: effectiveStartTime,
      timezone: quiz.timezone,
      duration: quiz.duration,
      isScheduled: !!effectiveStartTime,
      canPublish: publishable.canPublish,
      canPublishReason: publishable.reason,
      canReschedule: reschedulable.canReschedule,
      canRescheduleReason: reschedulable.reason,
      scheduledBy: quiz.scheduledBy,
      scheduledAt: quiz.scheduledAt,
      configuration: quiz.timeConfiguration
    }
  };
}

/**
 * Check if enrollment should be allowed for a quiz
 */
export function canEnrollInQuiz(quiz: QuizSchedulingInfo): {
  canEnroll: boolean;
  reason?: string;
} {
  // Must be published
  if (quiz.status !== 'published') {
    return { 
      canEnroll: false, 
      reason: "Quiz is not yet published" 
    };
  }

  // For deferred scheduling, enrollment is allowed once published
  // even if time is not set (time will be set before quiz starts)
  if (quiz.schedulingStatus === 'deferred') {
    return { canEnroll: true };
  }

  // For legacy mode, check if quiz hasn't ended
  const startTime = getEffectiveStartTime(quiz);
  if (startTime) {
    const endTime = new Date(startTime.getTime() + quiz.duration * 60 * 1000);
    if (new Date() > endTime) {
      return { 
        canEnroll: false, 
        reason: "Quiz has already ended" 
      };
    }
  }

  return { canEnroll: true };
}

/**
 * Get quiz availability status for students
 */
export function getQuizAvailabilityStatus(quiz: QuizSchedulingInfo): {
  available: boolean;
  status: 'not_scheduled' | 'upcoming' | 'active' | 'ended';
  message: string;
  startTime?: Date;
  endTime?: Date;
} {
  const startTime = getEffectiveStartTime(quiz);
  
  // If no start time set (deferred mode)
  if (!startTime) {
    return {
      available: false,
      status: 'not_scheduled',
      message: 'Quiz time has not been scheduled yet'
    };
  }

  const now = new Date();
  const endTime = new Date(startTime.getTime() + quiz.duration * 60 * 1000);

  // Quiz hasn't started yet
  if (now < startTime) {
    const hoursUntilStart = Math.ceil((startTime.getTime() - now.getTime()) / (1000 * 60 * 60));
    return {
      available: false,
      status: 'upcoming',
      message: `Quiz starts in ${hoursUntilStart} hour${hoursUntilStart !== 1 ? 's' : ''}`,
      startTime,
      endTime
    };
  }

  // Quiz has ended
  if (now > endTime) {
    return {
      available: false,
      status: 'ended',
      message: 'Quiz has ended',
      startTime,
      endTime
    };
  }

  // Quiz is currently active
  const minutesRemaining = Math.ceil((endTime.getTime() - now.getTime()) / (1000 * 60));
  return {
    available: true,
    status: 'active',
    message: `Quiz is active (${minutesRemaining} minutes remaining)`,
    startTime,
    endTime
  };
}

/**
 * Migration helper: Convert legacy quiz to use timeConfiguration
 */
export function migrateLegacyQuizTime(quiz: QuizSchedulingInfo & Record<string, unknown>): QuizSchedulingInfo & Record<string, unknown> {
  if (quiz.schedulingStatus === 'legacy' || !quiz.schedulingStatus) {
    return {
      ...quiz,
      schedulingStatus: 'legacy',
      timeConfiguration: quiz.timeConfiguration || {
        startTime: quiz.startTime instanceof Date ? quiz.startTime.toISOString() : undefined,
        timezone: quiz.timezone || 'UTC',
        duration: quiz.duration,
        configuredAt: quiz.createdAt instanceof Date ? quiz.createdAt.toISOString() : null,
        configuredBy: quiz.educatorId || null,
        isLegacy: true
      } as TimeConfiguration
    };
  }
  return quiz;
}

const quizSchedulingExports = {
  getEffectiveStartTime,
  canPublishQuiz,
  canRescheduleQuiz,
  validateStartTime,
  formatQuizSchedulingResponse,
  canEnrollInQuiz,
  getQuizAvailabilityStatus,
  migrateLegacyQuizTime
};

export default quizSchedulingExports;
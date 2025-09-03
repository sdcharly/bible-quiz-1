/**
 * Quiz Availability Service
 * Single source of truth for quiz time and availability calculations
 * All quiz time logic should go through this service
 */

import { logger } from "@/lib/logger";

export interface QuizTimeData {
  startTime: Date | null;
  timezone: string;
  duration: number;
  status: string;
  isReassignment?: boolean;
  attempted?: boolean;
}

export interface QuizAvailability {
  available: boolean;
  status: 'not_scheduled' | 'upcoming' | 'active' | 'ended' | 'reassigned';
  message: string;
  startTime?: Date;
  endTime?: Date;
}

/**
 * Calculate quiz availability - Single source of truth
 * Used by both API and any other service that needs availability info
 */
export function calculateQuizAvailability(quiz: QuizTimeData): QuizAvailability {
  try {
    const now = new Date();
    
    // Handle reassignments first
    if (quiz.isReassignment && !quiz.attempted) {
      return {
        available: true,
        status: 'reassigned',
        message: 'Reassigned - Available',
        startTime: quiz.startTime || undefined,
        endTime: quiz.startTime ? new Date((quiz.startTime.getTime() + quiz.duration * 60 * 1000)) : undefined
      };
    }
    
    // No start time set
    if (!quiz.startTime) {
      return {
        available: false,
        status: 'not_scheduled',
        message: 'Quiz time not scheduled'
      };
    }
    
    const endTime = new Date(quiz.startTime.getTime() + quiz.duration * 60 * 1000);
    
    // Quiz ended
    if (now > endTime) {
      return {
        available: false,
        status: 'ended',
        message: 'Quiz has ended',
        startTime: quiz.startTime,
        endTime
      };
    }
    
    // Quiz not started
    if (now < quiz.startTime) {
      const minutesUntil = Math.ceil((quiz.startTime.getTime() - now.getTime()) / 60000);
      
      let message: string;
      if (minutesUntil <= 0) {
        message = 'Starting now';
      } else if (minutesUntil === 1) {
        message = 'Starts in 1 minute';
      } else if (minutesUntil < 60) {
        message = `Starts in ${minutesUntil} minutes`;
      } else {
        const hoursUntil = Math.floor(minutesUntil / 60);
        const remainingMinutes = minutesUntil % 60;
        
        if (hoursUntil === 1 && remainingMinutes === 0) {
          message = 'Starts in 1 hour';
        } else if (remainingMinutes === 0) {
          message = `Starts in ${hoursUntil} hours`;
        } else if (hoursUntil === 1) {
          message = `Starts in 1 hour ${remainingMinutes} ${remainingMinutes === 1 ? 'minute' : 'minutes'}`;
        } else {
          message = `Starts in ${hoursUntil} hours ${remainingMinutes} ${remainingMinutes === 1 ? 'minute' : 'minutes'}`;
        }
      }
      
      return {
        available: false,
        status: 'upcoming',
        message,
        startTime: quiz.startTime,
        endTime
      };
    }
    
    // Quiz is active
    const minutesRemaining = Math.ceil((endTime.getTime() - now.getTime()) / 60000);
    
    return {
      available: true,
      status: 'active',
      message: minutesRemaining === 1 
        ? 'Quiz is active (1 minute remaining)'
        : `Quiz is active (${minutesRemaining} minutes remaining)`,
      startTime: quiz.startTime,
      endTime
    };
    
  } catch (error) {
    logger.error('Error calculating quiz availability:', error);
    return {
      available: false,
      status: 'not_scheduled',
      message: 'Unable to determine availability'
    };
  }
}

/**
 * Format quiz time for display in user's local timezone
 * This is only for display, not for calculations
 */
export function formatQuizTimeForDisplay(
  dateTime: Date | string | null,
  userTimezone?: string
): string {
  if (!dateTime) return 'Not scheduled';
  
  try {
    const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
    
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    // Use user's browser timezone if not specified
    const timezone = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    return date.toLocaleString('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  } catch (error) {
    logger.error('Error formatting quiz time:', error);
    return 'Invalid date';
  }
}
"use client";

import { useUserContext } from '@/contexts/UserContext';
import { 
  formatDateInTimezone,
  convertUTCToUserTimezone,
  convertUserTimezoneToUTC,
  getCurrentTimeInUserTimezone,
  isQuizAvailable,
  getRelativeTime,
  convertUTCToDateTimeLocal
} from '@/lib/timezone';

/**
 * Custom hook for timezone-aware operations
 * Provides easy access to common timezone functions using user's timezone
 */
export function useTimezone() {
  const { timezone, setTimezone, isLoading } = useUserContext();

  return {
    timezone,
    setTimezone,
    isLoading,
    
    // Format UTC date in user's timezone
    formatDate: (utcDate: Date | string, options?: Intl.DateTimeFormatOptions) => 
      formatDateInTimezone(utcDate, timezone, options),
    
    // Convert UTC to user's timezone Date object
    toUserTimezone: (utcDate: Date | string) => 
      convertUTCToUserTimezone(utcDate, timezone),
    
    // Convert user's timezone input to UTC for storage
    toUTC: (dateTimeString: string) => 
      convertUserTimezoneToUTC(dateTimeString, timezone),
    
    // Get current time in user's timezone for datetime-local inputs
    getCurrentDateTime: () => 
      getCurrentTimeInUserTimezone(timezone),
    
    // Convert UTC to datetime-local format in user's timezone
    toDateTimeLocal: (utcDate: Date | string) => 
      convertUTCToDateTimeLocal(utcDate, timezone),
    
    // Check if quiz is available (started)
    isQuizAvailable,
    
    // Get relative time description
    getRelativeTime: (utcDate: Date | string) => 
      getRelativeTime(utcDate, timezone),
  };
}
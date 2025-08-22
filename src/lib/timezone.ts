/**
 * FOOLPROOF TIMEZONE STRATEGY FOR QUIZ APPLICATION
 * 
 * CORE PRINCIPLES:
 * 1. Database: ALL times stored as UTC timestamps
 * 2. Frontend: ALL times displayed in user's timezone
 * 3. Input: User inputs time in their timezone, convert to UTC for storage
 * 4. Display: Convert UTC back to user's timezone for display
 * 5. Validation: Always compare in the same timezone
 */

import { logger } from "@/lib/logger";

// Comprehensive timezone options
export const TIMEZONE_OPTIONS = [
  // Indian Timezones (Primary)
  { value: "Asia/Kolkata", label: "India Standard Time (IST)", offset: "+05:30", country: "India" },
  
  // Other South Asian
  { value: "Asia/Dhaka", label: "Bangladesh Standard Time (BST)", offset: "+06:00", country: "Bangladesh" },
  { value: "Asia/Karachi", label: "Pakistan Standard Time (PKT)", offset: "+05:00", country: "Pakistan" },
  { value: "Asia/Colombo", label: "Sri Lanka Standard Time", offset: "+05:30", country: "Sri Lanka" },
  { value: "Asia/Kathmandu", label: "Nepal Time (NPT)", offset: "+05:45", country: "Nepal" },
  
  // Major International Timezones
  { value: "UTC", label: "Coordinated Universal Time (UTC)", offset: "+00:00", country: "Global" },
  { value: "America/New_York", label: "Eastern Time (ET)", offset: "-05:00/-04:00", country: "USA" },
  { value: "America/Chicago", label: "Central Time (CT)", offset: "-06:00/-05:00", country: "USA" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)", offset: "-08:00/-07:00", country: "USA" },
  { value: "Europe/London", label: "Greenwich Mean Time (GMT)", offset: "+00:00/+01:00", country: "UK" },
  { value: "Europe/Berlin", label: "Central European Time (CET)", offset: "+01:00/+02:00", country: "Germany" },
  { value: "Asia/Dubai", label: "Gulf Standard Time (GST)", offset: "+04:00", country: "UAE" },
  { value: "Asia/Singapore", label: "Singapore Standard Time (SST)", offset: "+08:00", country: "Singapore" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (JST)", offset: "+09:00", country: "Japan" },
  { value: "Australia/Sydney", label: "Australian Eastern Time (AET)", offset: "+10:00/+11:00", country: "Australia" },
];

/**
 * Get user's browser timezone (RELIABLE)
 */
export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "Asia/Kolkata"; // Fallback to IST
  }
}

/**
 * Get user's preferred timezone with smart defaults
 */
export function getDefaultTimezone(): string {
  const browserTz = getBrowserTimezone();
  
  // Always prefer browser timezone if it's supported
  const supported = TIMEZONE_OPTIONS.find(tz => tz.value === browserTz);
  if (supported) {
    return browserTz;
  }
  
  // For any unrecognized timezone, default to IST (primary audience)
  return "Asia/Kolkata";
}

/**
 * Get current time in user's timezone as ISO string for datetime-local input
 */
export function getCurrentTimeInUserTimezone(timezone: string): string {
  try {
    const now = new Date();
    
    // Format the date in the user's timezone
    // Using sv-SE locale because it gives YYYY-MM-DD format
    const dateStr = now.toLocaleDateString('sv-SE', { 
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    const timeStr = now.toLocaleTimeString('sv-SE', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    // Combine date and time in datetime-local format
    return `${dateStr}T${timeStr}`;
  } catch (error) {
    logger.warn('Error formatting time in timezone:', timezone, error);
    // Fallback to current local time
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
}

/**
 * Format date for display in user's timezone
 * Safe function that always returns a formatted string
 */
export function formatDateInTimezone(
  date: Date | string,
  timezone: string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  try {
    // Ensure we have a valid date first
    const dateObj = convertUTCToUserTimezone(date, timezone);
    
    // Double-check validity
    if (!dateObj || isNaN(dateObj.getTime())) {
      logger.warn('Invalid date in formatDateInTimezone, using current time');
      const now = new Date(Date.now());
      return formatDateInTimezone(now, timezone, options);
    }
    
    // Validate timezone
    if (!isValidTimezone(timezone)) {
      logger.warn('Invalid timezone in formatDateInTimezone:', timezone);
      timezone = 'Asia/Kolkata';
    }
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
      ...options
    };
    
    try {
      const formatted = new Intl.DateTimeFormat('en-IN', {
        ...defaultOptions,
        timeZone: timezone
      }).format(dateObj);
      
      // Validate the output
      if (!formatted || formatted === 'Invalid Date') {
        throw new Error('Invalid formatted output');
      }
      
      return formatted;
    } catch (formatError) {
      // Try with IST as fallback timezone
      logger.warn('Formatting with specified timezone failed, trying IST:', formatError);
      
      try {
        const formatted = new Intl.DateTimeFormat('en-IN', {
          ...defaultOptions,
          timeZone: 'Asia/Kolkata'
        }).format(dateObj);
        
        if (!formatted || formatted === 'Invalid Date') {
          throw new Error('Invalid formatted output with IST');
        }
        
        return formatted;
      } catch (istError) {
        // Ultimate fallback: use basic formatting
        logger.warn('IST formatting also failed, using basic format:', istError);
        
        const year = dateObj.getFullYear();
        const month = dateObj.toLocaleString('en-IN', { month: 'long' });
        const day = dateObj.getDate();
        const hours = String(dateObj.getHours()).padStart(2, '0');
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');
        
        return `${month} ${day}, ${year} at ${hours}:${minutes}`;
      }
    }
  } catch (error) {
    logger.error('Error in formatDateInTimezone:', error);
    // Return a safe fallback string
    return 'Date unavailable';
  }
}

/**
 * CORE FUNCTION: Convert datetime from user's timezone to UTC for database storage
 * This is the MOST IMPORTANT function for foolproof timezone handling
 */
export function convertUserTimezoneToUTC(dateTimeString: string, userTimezone: string): Date {
  try {
    
    // Validate input
    if (!dateTimeString || typeof dateTimeString !== 'string') {
      logger.warn('Invalid dateTimeString provided to convertUserTimezoneToUTC:', dateTimeString);
      return new Date(Date.now());
    }
    
    // Validate timezone
    if (!isValidTimezone(userTimezone)) {
      logger.warn('Invalid timezone provided:', userTimezone);
      userTimezone = 'Asia/Kolkata'; // Fallback to IST
    }
    
    // The simplest and most reliable approach:
    // Use the Intl.DateTimeFormat to format the date in UTC from the user's timezone perspective
    
    // Parse the input datetime-local string
    const [datePart, timePart] = dateTimeString.split('T');
    if (!datePart || !timePart) {
      logger.warn('Invalid datetime format:', dateTimeString);
      return new Date(Date.now());
    }
    
    const [year, month, day] = datePart.split('-').map(Number);
    const timeParts = timePart.split(':');
    const hour = parseInt(timeParts[0], 10);
    const minute = parseInt(timeParts[1], 10);
    const second = timeParts[2] ? parseInt(timeParts[2], 10) : 0;
    
    // Validate parsed values
    if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) {
      logger.warn('Invalid date/time values:', { year, month, day, hour, minute });
      return new Date(Date.now());
    }
    
    // Build the ISO string for the date-time in user's timezone format
    const localISOString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
    
    // CRITICAL FIX: The input represents a time in the user's timezone
    // We need to find what UTC time corresponds to this local time
    
    // For Asia/Calcutta (IST), we know the offset is +5:30 (330 minutes ahead of UTC)
    // So if user enters 20:48 IST, the UTC time is 15:18 (20:48 - 5:30)
    
    let offsetMinutes = 0;
    if (userTimezone === 'Asia/Kolkata' || userTimezone === 'Asia/Calcutta') {
      offsetMinutes = 330; // IST is UTC+5:30
    } else {
      // For other timezones, calculate the offset
      // Create a date in the browser's local timezone first
      const tempDate = new Date(localISOString);
      offsetMinutes = getTimezoneOffsetMinutes(userTimezone, tempDate);
    }
    
    // Parse the local time string as if it were UTC (to get the raw timestamp)
    // Then SUBTRACT the offset to get the actual UTC time
    const localAsUTC = new Date(localISOString + 'Z'); // Parse as UTC
    const utcTimestamp = localAsUTC.getTime() - (offsetMinutes * 60 * 1000);
    const utcDate = new Date(utcTimestamp);
    
    
    // Validate the result
    if (isNaN(utcDate.getTime())) {
      logger.warn('Invalid UTC date calculated');
      return new Date(Date.now());
    }
    
    return utcDate;
  } catch (error) {
    logger.error('Error converting user timezone to UTC:', error);
    return new Date(Date.now());
  }
}

/**
 * Get timezone offset in minutes for a specific timezone and date
 * Handles DST transitions properly
 */
function getTimezoneOffsetMinutes(timezone: string, date: Date): number {
  try {
    // Validate the input date first
    if (!date || isNaN(date.getTime())) {
      logger.warn('Invalid date provided to getTimezoneOffsetMinutes');
      return 330; // IST fallback
    }
    
    // Method 1: Try using Intl.DateTimeFormat with timeZoneName
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'shortOffset'
      });
      
      const parts = formatter.formatToParts(date);
      const offsetPart = parts.find(p => p.type === 'timeZoneName');
      
      if (offsetPart && offsetPart.value) {
        // Parse offset string like "GMT+5:30" or "GMT-8"
        const offsetMatch = offsetPart.value.match(/GMT([+-])(\d{1,2}):?(\d{2})?/);
        if (offsetMatch) {
          const sign = offsetMatch[1] === '+' ? 1 : -1;
          const hours = parseInt(offsetMatch[2], 10);
          const minutes = parseInt(offsetMatch[3] || '0', 10);
          return sign * (hours * 60 + minutes);
        }
      }
    } catch (e) {
      // Fallback to Method 2 if shortOffset is not supported
    }
    
    // Method 2: Calculate offset by comparing UTC and local representations
    // This is more reliable but requires careful date manipulation
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    
    // Create a UTC date with the same "wall clock" time
    const utcDate = new Date(Date.UTC(year, month, day, hours, minutes, 0));
    
    // Format this UTC date in the target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    // Parse the formatted date to get the actual time in that timezone
    const formatted = formatter.format(utcDate);
    const match = formatted.match(/(\d{2})\/(\d{2})\/(\d{4}),?\s+(\d{2}):(\d{2}):(\d{2})/);
    
    if (match) {
      const tzMonth = parseInt(match[1], 10) - 1;
      const tzDay = parseInt(match[2], 10);
      const tzYear = parseInt(match[3], 10);
      const tzHours = parseInt(match[4], 10);
      const tzMinutes = parseInt(match[5], 10);
      
      // Create a date object representing the timezone's time
      const tzDate = new Date(tzYear, tzMonth, tzDay, tzHours, tzMinutes, 0);
      
      // Validate the timezone date
      if (!isNaN(tzDate.getTime())) {
        // Calculate the offset in minutes
        const offsetMs = utcDate.getTime() - tzDate.getTime();
        return Math.round(offsetMs / (1000 * 60));
      }
    }
    
    // Method 3: Use the browser's timezone offset if all else fails
    // This only works if the browser is in the same timezone
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (browserTz === timezone) {
      // Return the negative because getTimezoneOffset returns the opposite sign
      return -date.getTimezoneOffset();
    }
    
    // Ultimate fallback based on known timezone offsets
    const knownOffsets: Record<string, number> = {
      'Asia/Kolkata': 330,
      'Asia/Dhaka': 360,
      'Asia/Karachi': 300,
      'Asia/Colombo': 330,
      'Asia/Kathmandu': 345,
      'UTC': 0,
      'America/New_York': -300, // EST (will be wrong during DST)
      'America/Chicago': -360,  // CST (will be wrong during DST)
      'America/Los_Angeles': -480, // PST (will be wrong during DST)
      'Europe/London': 0, // GMT (will be wrong during BST)
      'Europe/Berlin': 60, // CET (will be wrong during CEST)
      'Asia/Dubai': 240,
      'Asia/Singapore': 480,
      'Asia/Tokyo': 540,
      'Australia/Sydney': 600 // AET (will be wrong during AEDT)
    };
    
    if (timezone in knownOffsets) {
      logger.warn(`Using fallback offset for ${timezone}, DST may not be accurate`);
      return knownOffsets[timezone];
    }
    
    // Final fallback to IST
    logger.warn(`Unknown timezone ${timezone}, falling back to IST offset`);
    return 330; // IST offset
    
  } catch (error) {
    logger.error('Error calculating timezone offset:', error);
    // Fallback to IST offset (+330 minutes)
    return 330; // 5 hours 30 minutes
  }
}

/**
 * Convert UTC datetime to user's timezone for display
 * Safe function that always returns a valid Date object
 */
export function convertUTCToUserTimezone(utcDateTime: Date | string, userTimezone: string): Date {
  try {
    // Handle string input
    let utcDate: Date;
    if (typeof utcDateTime === 'string') {
      // Sanitize the string input
      const trimmed = utcDateTime.trim();
      if (!trimmed) {
        logger.warn('Empty date string provided to convertUTCToUserTimezone');
        return new Date(Date.now());
      }
      
      // Try to parse the date string
      utcDate = new Date(trimmed);
      
      // If parsing failed, try alternative formats
      if (isNaN(utcDate.getTime())) {
        // Try parsing as ISO string if not already
        if (!trimmed.includes('T') && trimmed.includes(' ')) {
          // Convert space-separated format to ISO
          utcDate = new Date(trimmed.replace(' ', 'T'));
        }
        
        // Still invalid? Use current time
        if (isNaN(utcDate.getTime())) {
          logger.warn('Invalid date string provided to convertUTCToUserTimezone:', utcDateTime);
          return new Date(Date.now());
        }
      }
    } else if (utcDateTime instanceof Date) {
      utcDate = utcDateTime;
    } else {
      logger.warn('Invalid date type provided to convertUTCToUserTimezone:', typeof utcDateTime);
      return new Date(Date.now());
    }
    
    // Final validation of the date object
    if (!utcDate || isNaN(utcDate.getTime())) {
      logger.warn('Invalid date provided to convertUTCToUserTimezone:', utcDateTime);
      return new Date(Date.now());
    }
    
    // Validate timezone
    if (!isValidTimezone(userTimezone)) {
      logger.warn('Invalid timezone in convertUTCToUserTimezone:', userTimezone);
      userTimezone = 'Asia/Kolkata';
    }
    
    // The Date object itself remains in UTC internally
    // We return it as-is since display functions will handle timezone formatting
    return utcDate;
  } catch (error) {
    logger.error('Error in convertUTCToUserTimezone:', error);
    // Always return a valid date
    return new Date(Date.now());
  }
}

/**
 * Convert UTC datetime to datetime-local input format in user's timezone
 * Always returns a valid datetime-local string
 */
export function convertUTCToDateTimeLocal(utcDateTime: Date | string, userTimezone: string): string {
  try {
    // First ensure we have a valid date using our safe conversion
    const utcDate = convertUTCToUserTimezone(utcDateTime, userTimezone);
    
    // Double-check the date is valid (convertUTCToUserTimezone should guarantee this)
    if (!utcDate || isNaN(utcDate.getTime())) {
      logger.warn('Unexpected invalid date in convertUTCToDateTimeLocal');
      return getCurrentTimeInUserTimezone(userTimezone);
    }
    
    // Validate timezone
    if (!isValidTimezone(userTimezone)) {
      logger.warn('Invalid timezone in convertUTCToDateTimeLocal:', userTimezone);
      userTimezone = 'Asia/Kolkata';
    }
    
    // Format the date in the user's timezone with error handling
    let dateStr: string;
    let timeStr: string;
    
    try {
      dateStr = utcDate.toLocaleDateString('sv-SE', { 
        timeZone: userTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      
      timeStr = utcDate.toLocaleTimeString('sv-SE', {
        timeZone: userTimezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (formatError) {
      // Fallback to manual formatting if locale formatting fails
      logger.warn('Locale formatting failed, using fallback:', formatError);
      
      // Use the browser's local time as fallback
      const localDate = new Date(utcDate.getTime());
      const year = localDate.getFullYear();
      const month = String(localDate.getMonth() + 1).padStart(2, '0');
      const day = String(localDate.getDate()).padStart(2, '0');
      const hours = String(localDate.getHours()).padStart(2, '0');
      const minutes = String(localDate.getMinutes()).padStart(2, '0');
      
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    
    // Validate the formatted strings
    if (!dateStr || !timeStr || dateStr === 'Invalid Date' || timeStr === 'Invalid Date') {
      logger.warn('Invalid formatted date/time strings');
      return getCurrentTimeInUserTimezone(userTimezone);
    }
    
    return `${dateStr}T${timeStr}`;
  } catch (error) {
    logger.error('Error converting to datetime-local:', error);
    // Always return a valid datetime-local string
    return getCurrentTimeInUserTimezone(userTimezone);
  }
}

/**
 * Validate timezone string
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get timezone info by value
 */
export function getTimezoneInfo(timezoneValue: string) {
  return TIMEZONE_OPTIONS.find(tz => tz.value === timezoneValue) || 
         TIMEZONE_OPTIONS[0]; // Default to IST
}

/**
 * Get current time in specified timezone
 */
export function getCurrentTimeInTimezone(timezone: string): Date {
  try {
    const now = new Date();
    return convertUTCToUserTimezone(now, timezone);
  } catch {
    return new Date();
  }
}

/**
 * Check if quiz time is valid (in the future) considering user's timezone
 */
export function isQuizTimeValid(dateTimeString: string, userTimezone: string): boolean {
  try {
    // Convert the user's input to UTC for comparison
    const quizTimeUTC = convertUserTimezoneToUTC(dateTimeString, userTimezone);
    const nowUTC = new Date();
    
    // Quiz should be at least 5 minutes in the future
    const minFutureTime = new Date(nowUTC.getTime() + (5 * 60 * 1000));
    
    return quizTimeUTC > minFutureTime;
  } catch (error) {
    logger.error('Error in isQuizTimeValid:', error);
    return false;
  }
}

/**
 * Check if a UTC stored quiz time is currently available (started)
 */
export function isQuizAvailable(quizStartTimeUTC: Date | string): boolean {
  try {
    const startTime = typeof quizStartTimeUTC === 'string' ? new Date(quizStartTimeUTC) : quizStartTimeUTC;
    const now = new Date();
    return startTime <= now;
  } catch {
    return false;
  }
}

/**
 * Get relative time description ("in 2 hours", "started 30 minutes ago")
 * Note: userTimezone parameter kept for API compatibility but not needed for relative time
 * Safe function that always returns a valid string
 */
export function getRelativeTime(utcDateTime: Date | string, _userTimezone?: string): string {
  try {
    // Safely convert to Date object
    let targetTime: Date;
    
    if (typeof utcDateTime === 'string') {
      const trimmed = utcDateTime.trim();
      if (!trimmed) {
        logger.warn('Empty date string in getRelativeTime');
        return 'unknown';
      }
      
      targetTime = new Date(trimmed);
      
      // Try alternative formats if initial parsing failed
      if (isNaN(targetTime.getTime())) {
        if (!trimmed.includes('T') && trimmed.includes(' ')) {
          targetTime = new Date(trimmed.replace(' ', 'T'));
        }
      }
      
      // Still invalid?
      if (isNaN(targetTime.getTime())) {
        logger.warn('Invalid date string in getRelativeTime:', utcDateTime);
        return 'unknown';
      }
    } else if (utcDateTime instanceof Date) {
      if (isNaN(utcDateTime.getTime())) {
        logger.warn('Invalid Date object in getRelativeTime');
        return 'unknown';
      }
      targetTime = utcDateTime;
    } else {
      logger.warn('Invalid date type in getRelativeTime:', typeof utcDateTime);
      return 'unknown';
    }
    
    const now = new Date(Date.now());
    
    // Ensure both dates are valid
    if (isNaN(targetTime.getTime()) || isNaN(now.getTime())) {
      logger.warn('Invalid date in relative time calculation');
      return 'unknown';
    }
    
    const diffMs = targetTime.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    // Handle edge case of exactly 0 minutes
    if (diffMinutes === 0) {
      return 'just now';
    }
    
    if (diffMinutes > 0) {
      // Future time
      if (diffMinutes < 60) {
        return `in ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
      } else if (diffMinutes < 1440) {
        const hours = Math.floor(diffMinutes / 60);
        return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
      } else {
        const days = Math.floor(diffMinutes / 1440);
        return `in ${days} day${days !== 1 ? 's' : ''}`;
      }
    } else {
      // Past time
      const absDiffMinutes = Math.abs(diffMinutes);
      if (absDiffMinutes < 60) {
        return `${absDiffMinutes} minute${absDiffMinutes !== 1 ? 's' : ''} ago`;
      } else if (absDiffMinutes < 1440) {
        const hours = Math.floor(absDiffMinutes / 60);
        return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
      } else {
        const days = Math.floor(absDiffMinutes / 1440);
        return `${days} day${days !== 1 ? 's' : ''} ago`;
      }
    }
  } catch (error) {
    logger.error('Error in getRelativeTime:', error);
    return 'unknown';
  }
}
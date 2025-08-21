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
    // Convert to user's timezone and format for datetime-local input
    const tzTime = new Date(now.toLocaleString('sv-SE', { timeZone: timezone }));
    return tzTime.toISOString().slice(0, 16);
  } catch {
    // Fallback to current local time
    const now = new Date();
    return now.toISOString().slice(0, 16);
  }
}

/**
 * Format date for display in user's timezone
 */
export function formatDateInTimezone(
  date: Date | string,
  timezone: string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
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
    return new Intl.DateTimeFormat('en-IN', {
      ...defaultOptions,
      timeZone: timezone
    }).format(dateObj);
  } catch {
    // Fallback to IST if timezone is invalid
    return new Intl.DateTimeFormat('en-IN', {
      ...defaultOptions,
      timeZone: 'Asia/Kolkata'
    }).format(dateObj);
  }
}

/**
 * CORE FUNCTION: Convert datetime from user's timezone to UTC for database storage
 * This is the MOST IMPORTANT function for foolproof timezone handling
 */
export function convertUserTimezoneToUTC(dateTimeString: string, userTimezone: string): Date {
  try {
    // Parse the datetime string as if it's in the user's timezone
    // The dateTimeString comes from datetime-local input (no timezone info)
    const [datePart, timePart] = dateTimeString.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);
    
    // Create a date object in UTC, then adjust to user's timezone
    const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
    
    // Get the timezone offset for the user's timezone at this date
    const tempDate = new Date(year, month - 1, day, hour, minute, 0);
    const userOffset = getTimezoneOffsetMinutes(userTimezone, tempDate);
    
    // Convert to UTC by subtracting the user's timezone offset
    return new Date(utcDate.getTime() - (userOffset * 60 * 1000));
  } catch (error) {
    console.error('Error converting user timezone to UTC:', error);
    // Fallback: treat as current time
    return new Date();
  }
}

/**
 * Get timezone offset in minutes for a specific timezone and date
 */
function getTimezoneOffsetMinutes(timezone: string, date: Date): number {
  try {
    // Create formatter for UTC and target timezone
    const utcDate = new Date(date.toLocaleString('en-CA', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-CA', { timeZone: timezone }));
    
    // Calculate difference in minutes
    return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60);
  } catch {
    // Fallback to IST offset (+330 minutes)
    return 330; // 5 hours 30 minutes
  }
}

/**
 * Convert UTC datetime to user's timezone for display
 */
export function convertUTCToUserTimezone(utcDateTime: Date | string, userTimezone: string): Date {
  const utcDate = typeof utcDateTime === 'string' ? new Date(utcDateTime) : utcDateTime;
  
  try {
    // Use built-in timezone conversion
    const tzString = utcDate.toLocaleString('sv-SE', { timeZone: userTimezone });
    return new Date(tzString);
  } catch {
    // Fallback: return UTC time (better than wrong timezone)
    console.warn(`Invalid timezone: ${userTimezone}, returning UTC`);
    return utcDate;
  }
}

/**
 * Convert UTC datetime to datetime-local input format in user's timezone
 */
export function convertUTCToDateTimeLocal(utcDateTime: Date | string, userTimezone: string): string {
  const localDate = convertUTCToUserTimezone(utcDateTime, userTimezone);
  return localDate.toISOString().slice(0, 16);
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
  } catch {
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
 */
export function getRelativeTime(utcDateTime: Date | string, _userTimezone?: string): string {
  try {
    const targetTime = typeof utcDateTime === 'string' ? new Date(utcDateTime) : utcDateTime;
    const now = new Date();
    const diffMs = targetTime.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
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
  } catch {
    return 'unknown';
  }
}
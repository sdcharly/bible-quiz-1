/**
 * Timezone utilities for production-ready quiz scheduling
 * Handles timezone conversion, validation, and display
 */

// Common Indian timezones and international options
export const TIMEZONE_OPTIONS = [
  // Indian Timezones (Primary)
  { value: "Asia/Kolkata", label: "India Standard Time (IST)", offset: "UTC+05:30", country: "India" },
  
  // Other South Asian
  { value: "Asia/Dhaka", label: "Bangladesh Standard Time (BST)", offset: "UTC+06:00", country: "Bangladesh" },
  { value: "Asia/Karachi", label: "Pakistan Standard Time (PKT)", offset: "UTC+05:00", country: "Pakistan" },
  { value: "Asia/Colombo", label: "Sri Lanka Standard Time", offset: "UTC+05:30", country: "Sri Lanka" },
  { value: "Asia/Kathmandu", label: "Nepal Time (NPT)", offset: "UTC+05:45", country: "Nepal" },
  
  // Major International Timezones
  { value: "UTC", label: "Coordinated Universal Time (UTC)", offset: "UTC+00:00", country: "Global" },
  { value: "America/New_York", label: "Eastern Time (ET)", offset: "UTC-05:00/-04:00", country: "USA" },
  { value: "America/Chicago", label: "Central Time (CT)", offset: "UTC-06:00/-05:00", country: "USA" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)", offset: "UTC-08:00/-07:00", country: "USA" },
  { value: "Europe/London", label: "Greenwich Mean Time (GMT)", offset: "UTC+00:00/+01:00", country: "UK" },
  { value: "Europe/Berlin", label: "Central European Time (CET)", offset: "UTC+01:00/+02:00", country: "Germany" },
  { value: "Asia/Dubai", label: "Gulf Standard Time (GST)", offset: "UTC+04:00", country: "UAE" },
  { value: "Asia/Singapore", label: "Singapore Standard Time (SST)", offset: "UTC+08:00", country: "Singapore" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (JST)", offset: "UTC+09:00", country: "Japan" },
  { value: "Australia/Sydney", label: "Australian Eastern Time (AET)", offset: "UTC+10:00/+11:00", country: "Australia" },
];

/**
 * Get user's browser timezone
 */
export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "Asia/Kolkata"; // Fallback to IST
  }
}

/**
 * Get user's preferred timezone with IST as default for Indian users
 */
export function getDefaultTimezone(): string {
  const browserTz = getBrowserTimezone();
  
  // If user is in Indian timezone, use it
  if (browserTz === "Asia/Kolkata" || browserTz === "Asia/Calcutta") {
    return "Asia/Kolkata";
  }
  
  // Check if browser timezone is in our supported list
  const supported = TIMEZONE_OPTIONS.find(tz => tz.value === browserTz);
  if (supported) {
    return browserTz;
  }
  
  // Default to IST for Indian audience
  return "Asia/Kolkata";
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
 * Convert local datetime input to UTC for database storage
 */
export function convertLocalToUTC(localDateTime: string, timezone: string): Date {
  try {
    // Create a date object from the local datetime string
    const localDate = new Date(localDateTime);
    
    // Get the timezone offset for the specified timezone
    const tempDate = new Date();
    const utcTime = tempDate.getTime() + (tempDate.getTimezoneOffset() * 60000);
    const targetTime = new Date(utcTime + getTimezoneOffset(timezone, tempDate));
    const offset = targetTime.getTimezoneOffset();
    
    // Apply the offset to convert to UTC
    const utcDate = new Date(localDate.getTime() - (offset * 60000));
    
    return utcDate;
  } catch {
    // Fallback: treat as IST
    return convertISTToUTC(localDateTime);
  }
}

/**
 * Convert IST datetime to UTC (fallback function)
 */
function convertISTToUTC(istDateTime: string): Date {
  const localDate = new Date(istDateTime);
  // IST is UTC+5:30, so subtract 5.5 hours
  return new Date(localDate.getTime() - (5.5 * 60 * 60 * 1000));
}

/**
 * Get timezone offset in milliseconds
 */
function getTimezoneOffset(timezone: string, date: Date): number {
  try {
    // Create a date in the target timezone
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    return tzDate.getTime() - utcDate.getTime();
  } catch {
    // Default to IST offset (5.5 hours)
    return 5.5 * 60 * 60 * 1000;
  }
}

/**
 * Convert UTC to local timezone for display
 */
export function convertUTCToLocal(utcDateTime: Date | string, timezone: string): Date {
  const utcDate = typeof utcDateTime === 'string' ? new Date(utcDateTime) : utcDateTime;
  
  try {
    // This will handle the conversion properly
    const localString = utcDate.toLocaleString('sv-SE', { timeZone: timezone });
    return new Date(localString);
  } catch {
    // Fallback to IST
    return new Date(utcDate.getTime() + (5.5 * 60 * 60 * 1000));
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
    const localString = now.toLocaleString('sv-SE', { timeZone: timezone });
    return new Date(localString);
  } catch {
    // Fallback to current time
    return new Date();
  }
}

/**
 * Check if quiz time is in the future for given timezone
 */
export function isQuizTimeValid(quizDateTime: string, timezone: string): boolean {
  try {
    const quizTime = new Date(quizDateTime);
    const currentTimeInTz = getCurrentTimeInTimezone(timezone);
    
    // Quiz should be at least 5 minutes in the future
    const minFutureTime = new Date(currentTimeInTz.getTime() + (5 * 60 * 1000));
    
    return quizTime > minFutureTime;
  } catch {
    return false;
  }
}
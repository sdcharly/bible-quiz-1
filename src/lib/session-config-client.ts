/**
 * Client-side Session Configuration
 * Shared constants and types for session management
 */

export const SESSION_CONFIG = {
  // Standard Session Timeouts (milliseconds)
  STUDENT: {
    IDLE_TIMEOUT: 30 * 60 * 1000,          // 30 minutes - Student idle timeout
    ABSOLUTE_TIMEOUT: 4 * 60 * 60 * 1000,  // 4 hours - Maximum session duration
    WARNING_BEFORE: 5 * 60 * 1000,         // 5 minutes - Warning before timeout
  },
  
  // Quiz Session Settings
  QUIZ: {
    ACTIVE_TIMEOUT: 3 * 60 * 60 * 1000,    // 3 hours - Active quiz session
    GRACE_PERIOD: 10 * 60 * 1000,          // 10 minutes - Network issue grace
    AUTO_SAVE_INTERVAL: 30 * 1000,         // 30 seconds - Auto-save answers
  },
  
  // Admin/Educator Session Settings  
  ADMIN: {
    IDLE_TIMEOUT: 15 * 60 * 1000,          // 15 minutes - Admin idle timeout
    ABSOLUTE_TIMEOUT: 2 * 60 * 60 * 1000,  // 2 hours - Maximum admin session
    WARNING_BEFORE: 3 * 60 * 1000,         // 3 minutes - Warning before timeout
  },
  
  // Activity Detection
  ACTIVITY: {
    CHECK_INTERVAL: 60 * 1000,             // 1 minute - Activity check interval
    HEARTBEAT_INTERVAL: 5 * 60 * 1000,     // 5 minutes - Server heartbeat
    DEBOUNCE_DELAY: 1000,                  // 1 second - Activity debounce
  },
  
  // Session Extension Rules
  EXTENSION: {
    THRESHOLD: 10 * 60 * 1000,             // 10 minutes - Time before auto-extend
    MAX_EXTENSIONS: 3,                      // Maximum session extensions allowed
    EXTENSION_DURATION: 30 * 60 * 1000,    // 30 minutes - Extension duration
  },
} as const;

export enum SessionState {
  ACTIVE = 'active',
  IDLE = 'idle',
  WARNING = 'warning',
  EXPIRED = 'expired',
  QUIZ_ACTIVE = 'quiz_active',
  EXTENDED = 'extended',
}
/**
 * Session Configuration and Management System
 * 
 * Implements international standards for session security:
 * - OWASP Session Management Cheat Sheet
 * - NIST SP 800-63B Digital Identity Guidelines  
 * - ISO/IEC 27001:2013 Information Security Management
 * 
 * Key Features:
 * - Absolute and idle timeout management
 * - Activity tracking and automatic extension
 * - Quiz-specific session handling
 * - Warning system before timeout
 * - Automatic cleanup of expired sessions
 */

import { db } from "@/lib/db";
import { adminSettings, session } from "@/lib/schema";
import { eq, lt, and } from "drizzle-orm";
import { logger } from "@/lib/logger";

// ============================================================================
// CONFIGURATION CONSTANTS (Following NIST & OWASP Standards)
// ============================================================================

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
  
  // Cleanup Settings
  CLEANUP: {
    INTERVAL: 10 * 60 * 1000,              // 10 minutes - Cleanup check interval
    BATCH_SIZE: 100,                        // Sessions to cleanup per batch
    RETENTION_PERIOD: 24 * 60 * 60 * 1000, // 24 hours - Keep expired sessions
  },
  
  // Security Settings
  SECURITY: {
    SECURE_COOKIE: process.env.NODE_ENV === 'production',
    SAME_SITE: 'lax' as const,
    HTTP_ONLY: true,
    TOKEN_ROTATION: 15 * 60 * 1000,        // 15 minutes - Token rotation interval
  },
} as const;

// ============================================================================
// SESSION STATE MANAGEMENT
// ============================================================================

export enum SessionState {
  ACTIVE = 'active',
  IDLE = 'idle',
  WARNING = 'warning',
  EXPIRED = 'expired',
  QUIZ_ACTIVE = 'quiz_active',
  EXTENDED = 'extended',
}

export interface SessionMetadata {
  userId: string;
  email: string;
  role: 'student' | 'educator' | 'admin' | 'super_admin';
  startTime: number;
  lastActivity: number;
  idleTime: number;
  extensions: number;
  state: SessionState;
  quizId?: string;
  quizStartTime?: number;
  warningShown: boolean;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
}

export interface ActivityLog {
  sessionId: string;
  timestamp: number;
  type: 'click' | 'scroll' | 'keypress' | 'api' | 'quiz' | 'heartbeat';
  path: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

const sessionCache = new Map<string, {
  metadata: SessionMetadata;
  lastChecked: number;
}>();

const CACHE_TTL = 60 * 1000; // 1 minute cache

// ============================================================================
// CORE SESSION FUNCTIONS
// ============================================================================

/**
 * Get session configuration based on user role
 */
export async function getSessionConfig(role: string = 'student'): Promise<{
  idleTimeout: number;
  absoluteTimeout: number;
  warningBefore: number;
}> {
  try {
    // Check for custom settings in database
    const settings = await db
      .select()
      .from(adminSettings)
      .where(eq(adminSettings.settingKey, 'session_settings'))
      .limit(1);

    if (settings.length > 0 && settings[0].settingValue) {
      const customSettings = settings[0].settingValue as any;
      // Ensure we return the expected shape even with custom settings
      if (role === 'admin' || role === 'super_admin' || role === 'educator') {
        return {
          idleTimeout: customSettings.ADMIN?.IDLE_TIMEOUT || SESSION_CONFIG.ADMIN.IDLE_TIMEOUT,
          absoluteTimeout: customSettings.ADMIN?.ABSOLUTE_TIMEOUT || SESSION_CONFIG.ADMIN.ABSOLUTE_TIMEOUT,
          warningBefore: customSettings.ADMIN?.WARNING_BEFORE || SESSION_CONFIG.ADMIN.WARNING_BEFORE,
        };
      }
      return {
        idleTimeout: customSettings.STUDENT?.IDLE_TIMEOUT || SESSION_CONFIG.STUDENT.IDLE_TIMEOUT,
        absoluteTimeout: customSettings.STUDENT?.ABSOLUTE_TIMEOUT || SESSION_CONFIG.STUDENT.ABSOLUTE_TIMEOUT,
        warningBefore: customSettings.STUDENT?.WARNING_BEFORE || SESSION_CONFIG.STUDENT.WARNING_BEFORE,
      };
    }
  } catch (error) {
    logger.error('Failed to get session config:', error);
  }

  // Return role-based defaults
  if (role === 'admin' || role === 'super_admin' || role === 'educator') {
    return {
      idleTimeout: SESSION_CONFIG.ADMIN.IDLE_TIMEOUT,
      absoluteTimeout: SESSION_CONFIG.ADMIN.ABSOLUTE_TIMEOUT,
      warningBefore: SESSION_CONFIG.ADMIN.WARNING_BEFORE,
    };
  }
  
  return {
    idleTimeout: SESSION_CONFIG.STUDENT.IDLE_TIMEOUT,
    absoluteTimeout: SESSION_CONFIG.STUDENT.ABSOLUTE_TIMEOUT,
    warningBefore: SESSION_CONFIG.STUDENT.WARNING_BEFORE,
  };
}

/**
 * Calculate session state based on activity
 */
export function calculateSessionState(
  metadata: SessionMetadata,
  config: { absoluteTimeout: number; idleTimeout: number; warningBefore: number }
): SessionState {
  const now = Date.now();
  const sessionAge = now - metadata.startTime;
  const idleTime = now - metadata.lastActivity;
  
  // Check absolute timeout
  if (sessionAge > config.absoluteTimeout) {
    return SessionState.EXPIRED;
  }
  
  // Check if in quiz
  if (metadata.quizId && metadata.quizStartTime) {
    const quizDuration = now - metadata.quizStartTime;
    if (quizDuration < SESSION_CONFIG.QUIZ.ACTIVE_TIMEOUT) {
      return SessionState.QUIZ_ACTIVE;
    }
  }
  
  // Check idle timeout
  if (idleTime > config.idleTimeout) {
    return SessionState.EXPIRED;
  }
  
  // Check warning threshold
  if (idleTime > config.idleTimeout - config.warningBefore) {
    return SessionState.WARNING;
  }
  
  // Check if recently extended
  if (metadata.extensions > 0 && idleTime < SESSION_CONFIG.ACTIVITY.CHECK_INTERVAL) {
    return SessionState.EXTENDED;
  }
  
  // Active or idle based on recent activity
  return idleTime < SESSION_CONFIG.ACTIVITY.CHECK_INTERVAL 
    ? SessionState.ACTIVE 
    : SessionState.IDLE;
}

/**
 * Check if session should be extended
 */
export function shouldExtendSession(
  metadata: SessionMetadata,
  config: { absoluteTimeout: number; idleTimeout: number }
): boolean {
  const now = Date.now();
  const idleTime = now - metadata.lastActivity;
  const sessionAge = now - metadata.startTime;
  
  // Don't extend if max extensions reached
  if (metadata.extensions >= SESSION_CONFIG.EXTENSION.MAX_EXTENSIONS) {
    return false;
  }
  
  // Don't extend if absolute timeout approaching
  if (sessionAge > config.absoluteTimeout - SESSION_CONFIG.EXTENSION.THRESHOLD) {
    return false;
  }
  
  // Extend if active and approaching idle timeout
  if (idleTime < SESSION_CONFIG.EXTENSION.THRESHOLD &&
      idleTime > config.idleTimeout - SESSION_CONFIG.EXTENSION.THRESHOLD) {
    return true;
  }
  
  // Extend if in active quiz
  if (metadata.state === SessionState.QUIZ_ACTIVE) {
    return true;
  }
  
  return false;
}

/**
 * Update session activity
 */
export async function updateSessionActivity(
  sessionId: string,
  activityType: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const now = Date.now();
    
    // Update cache
    const cached = sessionCache.get(sessionId);
    if (cached) {
      cached.metadata.lastActivity = now;
      cached.metadata.idleTime = 0;
      cached.lastChecked = now;
    }
    
    // Update database
    await db
      .update(session)
      .set({
        expiresAt: new Date(now + SESSION_CONFIG.STUDENT.IDLE_TIMEOUT),
        updatedAt: new Date(),
      })
      .where(eq(session.id, sessionId));
    
    // Log activity
    logger.debug('Session activity updated', {
      sessionId,
      activityType,
      metadata,
    });
  } catch (error) {
    logger.error('Failed to update session activity:', error);
  }
}

/**
 * Extend session duration
 */
export async function extendSession(
  sessionId: string,
  duration: number = SESSION_CONFIG.EXTENSION.EXTENSION_DURATION
): Promise<boolean> {
  try {
    const cached = sessionCache.get(sessionId);
    if (!cached) return false;
    
    const config = await getSessionConfig(cached.metadata.role);
    
    if (!shouldExtendSession(cached.metadata, config)) {
      return false;
    }
    
    const newExpiry = Date.now() + duration;
    
    // Update database
    await db
      .update(session)
      .set({
        expiresAt: new Date(newExpiry),
        updatedAt: new Date(),
      })
      .where(eq(session.id, sessionId));
    
    // Update cache
    cached.metadata.extensions += 1;
    cached.metadata.state = SessionState.EXTENDED;
    cached.lastChecked = Date.now();
    
    logger.info('Session extended', {
      sessionId,
      extensions: cached.metadata.extensions,
      newExpiry,
    });
    
    return true;
  } catch (error) {
    logger.error('Failed to extend session:', error);
    return false;
  }
}

/**
 * Mark session for quiz activity
 */
export async function startQuizSession(
  sessionId: string,
  quizId: string
): Promise<void> {
  try {
    const now = Date.now();
    
    // Update cache
    const cached = sessionCache.get(sessionId);
    if (cached) {
      cached.metadata.quizId = quizId;
      cached.metadata.quizStartTime = now;
      cached.metadata.state = SessionState.QUIZ_ACTIVE;
    }
    
    // Extend session for quiz duration
    await db
      .update(session)
      .set({
        expiresAt: new Date(now + SESSION_CONFIG.QUIZ.ACTIVE_TIMEOUT),
        updatedAt: new Date(),
      })
      .where(eq(session.id, sessionId));
    
    logger.info('Quiz session started', { sessionId, quizId });
  } catch (error) {
    logger.error('Failed to start quiz session:', error);
  }
}

/**
 * End quiz session
 */
export async function endQuizSession(
  sessionId: string
): Promise<void> {
  try {
    const cached = sessionCache.get(sessionId);
    if (cached) {
      cached.metadata.quizId = undefined;
      cached.metadata.quizStartTime = undefined;
      cached.metadata.state = SessionState.ACTIVE;
    }
    
    // Reset to normal timeout
    const config = await getSessionConfig(cached?.metadata.role);
    await db
      .update(session)
      .set({
        expiresAt: new Date(Date.now() + config.idleTimeout),
        updatedAt: new Date(),
      })
      .where(eq(session.id, sessionId));
    
    logger.info('Quiz session ended', { sessionId });
  } catch (error) {
    logger.error('Failed to end quiz session:', error);
  }
}

/**
 * Cleanup expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const cutoffTime = new Date(Date.now() - SESSION_CONFIG.CLEANUP.RETENTION_PERIOD);
    
    // Delete expired sessions in batches
    const result = await db
      .delete(session)
      .where(
        and(
          lt(session.expiresAt, new Date()),
          lt(session.createdAt, cutoffTime)
        )
      );
    
    // Clear cache for expired sessions
    for (const [sessionId, cached] of sessionCache.entries()) {
      const config = await getSessionConfig(cached.metadata.role);
      const state = calculateSessionState(cached.metadata, config);
      
      if (state === SessionState.EXPIRED) {
        sessionCache.delete(sessionId);
      }
    }
    
    logger.info('Cleaned up expired sessions', {
      count: result.length || 0,
    });
    
    return result.length || 0;
  } catch (error) {
    logger.error('Failed to cleanup expired sessions:', error);
    return 0;
  }
}

/**
 * Get session statistics
 */
export async function getSessionStats() {
  try {
    const now = new Date();
    
    // Get active sessions
    const activeSessions = await db
      .select()
      .from(session)
      .where(lt(session.expiresAt, now));
    
    // Calculate statistics
    const stats = {
      total: activeSessions.length,
      active: 0,
      idle: 0,
      warning: 0,
      quiz: 0,
    };
    
    for (const sess of activeSessions) {
      const cached = sessionCache.get(sess.id);
      if (cached) {
        const config = await getSessionConfig(cached.metadata.role);
        const state = calculateSessionState(cached.metadata, config);
        
        switch (state) {
          case SessionState.ACTIVE:
          case SessionState.EXTENDED:
            stats.active++;
            break;
          case SessionState.IDLE:
            stats.idle++;
            break;
          case SessionState.WARNING:
            stats.warning++;
            break;
          case SessionState.QUIZ_ACTIVE:
            stats.quiz++;
            break;
        }
      }
    }
    
    return stats;
  } catch (error) {
    logger.error('Failed to get session stats:', error);
    return null;
  }
}

/**
 * Initialize session metadata
 */
export function createSessionMetadata(
  userId: string,
  email: string,
  role: string,
  ipAddress?: string,
  userAgent?: string
): SessionMetadata {
  const now = Date.now();
  
  return {
    userId,
    email,
    role: role as 'student' | 'educator' | 'admin' | 'super_admin',
    startTime: now,
    lastActivity: now,
    idleTime: 0,
    extensions: 0,
    state: SessionState.ACTIVE,
    warningShown: false,
    ipAddress,
    userAgent,
    deviceId: generateDeviceId(userAgent),
  };
}

/**
 * Generate device ID from user agent
 */
function generateDeviceId(userAgent?: string): string {
  if (!userAgent) return 'unknown';
  
  // Simple hash function for device ID
  let hash = 0;
  for (let i = 0; i < userAgent.length; i++) {
    const char = userAgent.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(36);
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  sessionCache,
  CACHE_TTL,
};

// Legacy exports for backward compatibility
export const DEFAULT_SESSION_TIMEOUT = SESSION_CONFIG.STUDENT.IDLE_TIMEOUT;
export const DEFAULT_ADMIN_SESSION_TIMEOUT = SESSION_CONFIG.ADMIN.IDLE_TIMEOUT;
export const DEFAULT_REMEMBER_ME_TIMEOUT = 7 * 24 * 60 * 60 * 1000;

export function isSessionExpired(sessionStartTime: number, timeout: number): boolean {
  return Date.now() - sessionStartTime > timeout;
}

export function getRemainingSessionTime(sessionStartTime: number, timeout: number): number {
  const elapsed = Date.now() - sessionStartTime;
  const remaining = timeout - elapsed;
  return Math.max(0, remaining);
}

export function getSessionWarningTime(timeout: number): number {
  return Math.max(timeout - SESSION_CONFIG.STUDENT.WARNING_BEFORE, timeout * 0.8);
}

export function clearSessionConfigCache() {
  sessionCache.clear();
}
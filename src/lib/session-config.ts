/**
 * Session configuration and timeout management
 */

import { db } from "@/lib/db";
import { adminSettings } from "@/lib/schema";
import { eq } from "drizzle-orm";

// Default session timeout values (in milliseconds)
export const DEFAULT_SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
export const DEFAULT_ADMIN_SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
export const DEFAULT_REMEMBER_ME_TIMEOUT = 7 * 24 * 60 * 60 * 1000; // 7 days

// Cache for session settings
let sessionConfigCache: {
  sessionTimeout: number;
  adminSessionTimeout: number;
  rememberMeTimeout: number;
  lastChecked: number;
} | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

/**
 * Get session configuration from admin settings
 */
export async function getSessionConfig() {
  // Check cache first
  if (sessionConfigCache && Date.now() - sessionConfigCache.lastChecked < CACHE_DURATION) {
    return sessionConfigCache;
  }

  try {
    const settings = await db
      .select()
      .from(adminSettings)
      .where(eq(adminSettings.settingKey, "security_settings"))
      .limit(1);

    if (settings.length > 0 && settings[0].settingValue) {
      const securitySettings = settings[0].settingValue as {
        sessionTimeout?: number;
        adminSessionTimeout?: number;
        rememberMeTimeout?: number;
      };

      // Convert minutes to milliseconds
      const config = {
        sessionTimeout: (securitySettings.sessionTimeout || 30) * 60 * 1000,
        adminSessionTimeout: (securitySettings.adminSessionTimeout || 30) * 60 * 1000,
        rememberMeTimeout: (securitySettings.rememberMeTimeout || 10080) * 60 * 1000, // 10080 minutes = 7 days
        lastChecked: Date.now(),
      };

      sessionConfigCache = config;
      return config;
    }
  } catch (error) {
    console.error("Failed to get session config:", error);
  }

  // Return defaults if settings not found
  const defaultConfig = {
    sessionTimeout: DEFAULT_SESSION_TIMEOUT,
    adminSessionTimeout: DEFAULT_ADMIN_SESSION_TIMEOUT,
    rememberMeTimeout: DEFAULT_REMEMBER_ME_TIMEOUT,
    lastChecked: Date.now(),
  };

  sessionConfigCache = defaultConfig;
  return defaultConfig;
}

/**
 * Clear session config cache
 */
export function clearSessionConfigCache() {
  sessionConfigCache = null;
}

/**
 * Check if a session has expired
 */
export function isSessionExpired(sessionStartTime: number, timeout: number): boolean {
  return Date.now() - sessionStartTime > timeout;
}

/**
 * Calculate remaining session time
 */
export function getRemainingSessionTime(sessionStartTime: number, timeout: number): number {
  const elapsed = Date.now() - sessionStartTime;
  const remaining = timeout - elapsed;
  return Math.max(0, remaining);
}

/**
 * Get session warning time (5 minutes before expiry)
 */
export function getSessionWarningTime(timeout: number): number {
  return Math.max(timeout - (5 * 60 * 1000), timeout * 0.8); // 5 minutes or 80% of timeout
}
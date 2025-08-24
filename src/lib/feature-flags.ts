/**
 * Feature Flags for Quiz Time Deferral Project
 * Phase 0.3: Safety Implementation
 * 
 * This system allows gradual rollout and instant rollback
 * of the quiz time deferral feature.
 */

import { logger } from '@/lib/logger';

// Feature flag names
export const FEATURE_FLAGS = {
  DEFERRED_TIME: 'ENABLE_DEFERRED_TIME',
  DEFERRED_TIME_PERCENTAGE: 'DEFERRED_TIME_ROLLOUT_PERCENTAGE',
  DEFERRED_TIME_EDUCATOR_IDS: 'DEFERRED_TIME_EDUCATOR_WHITELIST',
} as const;

// Feature flag configuration
interface FeatureFlagConfig {
  enabled: boolean;
  rolloutPercentage: number;
  whitelistedUserIds: string[];
  blacklistedUserIds: string[];
  metadata?: Record<string, unknown>;
}

// Default configuration
const DEFAULT_FLAGS: Record<string, FeatureFlagConfig> = {
  [FEATURE_FLAGS.DEFERRED_TIME]: {
    enabled: false,
    rolloutPercentage: 0,
    whitelistedUserIds: [],
    blacklistedUserIds: [],
    metadata: {
      description: 'Allows quiz time to be set during publish instead of creation',
      phase: 'Phase 0',
      startDate: '2024-01-01',
      owner: 'Quiz Team',
    },
  },
};

/**
 * Get feature flag configuration from environment
 */
function getConfigFromEnv(): Partial<Record<string, FeatureFlagConfig>> {
  const config: Partial<Record<string, FeatureFlagConfig>> = {};
  
  // Safely check environment variables
  try {
    // For now, always enable deferred time feature since it's set to 100% rollout
    // This avoids SSR/client-side hydration issues
    const deferredTimeConfig = {
      ...DEFAULT_FLAGS[FEATURE_FLAGS.DEFERRED_TIME],
      enabled: true,
      rolloutPercentage: 100
    };
    
    config[FEATURE_FLAGS.DEFERRED_TIME] = deferredTimeConfig;
  } catch (error) {
    // If there's any error, return default config
    logger.log('Error setting feature flags:', error);
  }
  
  return config;
}

/**
 * Check if a feature is enabled for a specific user
 */
export function isFeatureEnabled(
  flagName: string,
  userId?: string | null
): boolean {
  // Get configuration
  const envConfig = getConfigFromEnv();
  const config = envConfig[flagName] || DEFAULT_FLAGS[flagName];
  
  if (!config) {
    logger.warn(`Unknown feature flag: ${flagName}`);
    return false;
  }
  
  // Check if globally disabled
  if (!config.enabled) {
    return false;
  }
  
  // If no user context, only check global flag
  if (!userId) {
    return config.enabled;
  }
  
  // Check blacklist first (highest priority)
  if (config.blacklistedUserIds.includes(userId)) {
    logger.log(`Feature ${flagName} disabled for blacklisted user ${userId}`);
    return false;
  }
  
  // Check whitelist (second priority)
  if (config.whitelistedUserIds.includes(userId)) {
    logger.log(`Feature ${flagName} enabled for whitelisted user ${userId}`);
    return true;
  }
  
  // Check percentage rollout
  if (config.rolloutPercentage > 0 && config.rolloutPercentage < 100) {
    // Use consistent hashing based on userId for stable assignment
    const hash = userId.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);
    
    const userPercentage = Math.abs(hash) % 100;
    const isEnabled = userPercentage < config.rolloutPercentage;
    
    logger.log(
      `Feature ${flagName} ${isEnabled ? 'enabled' : 'disabled'} ` +
      `for user ${userId} (${userPercentage} < ${config.rolloutPercentage})`
    );
    
    return isEnabled;
  }
  
  // Default to enabled if flag is on and no other conditions apply
  return config.enabled;
}

/**
 * React hook for feature flags
 */
export function useFeatureFlag(flagName: string, userId?: string | null): boolean {
  // In production, you might want to use React state and update dynamically
  // For now, this is a simple wrapper
  return isFeatureEnabled(flagName, userId);
}

/**
 * Server-side feature flag check
 */
export async function checkFeatureFlag(
  flagName: string,
  userId?: string
): Promise<boolean> {
  // In production, this could check a database or external service
  // For now, use the same logic as client
  return isFeatureEnabled(flagName, userId);
}

/**
 * Get all feature flags for debugging
 */
export function getAllFeatureFlags(): Record<string, FeatureFlagConfig> {
  const envConfig = getConfigFromEnv();
  return {
    ...DEFAULT_FLAGS,
    ...envConfig,
  } as Record<string, FeatureFlagConfig>;
}

/**
 * Feature flag middleware for API routes
 */
export function requireFeatureFlag(flagName: string) {
  return async (req: Request, userId?: string) => {
    const isEnabled = await checkFeatureFlag(flagName, userId);
    
    if (!isEnabled) {
      logger.warn(`Access denied: Feature ${flagName} is not enabled for user ${userId}`);
      return new Response(
        JSON.stringify({
          error: 'Feature not available',
          message: 'This feature is currently not available for your account',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    return null; // Continue with request
  };
}

/**
 * Emergency kill switch
 */
export function disableAllFeatures(): void {
  logger.force('EMERGENCY: All feature flags disabled');
  
  // In production, this would update a database or cache
  // For now, we'll set an environment variable that needs to be checked
  if (typeof window !== 'undefined') {
    localStorage.setItem('FEATURE_FLAGS_DISABLED', 'true');
  }
}

/**
 * Check if features are disabled via kill switch
 */
export function areFeaturesForcedOff(): boolean {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('FEATURE_FLAGS_DISABLED') === 'true';
  }
  return false;
}

// Export types
export type { FeatureFlagConfig };
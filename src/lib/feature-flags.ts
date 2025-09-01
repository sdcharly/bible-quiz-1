/**
 * Feature Flags System
 * Enables safe rollout of optimizations with kill switches
 * Environment variables override default values
 */

export const FEATURES = {
  // Database optimizations
  OPTIMIZED_DB_POOL: false,
  DB_CONNECTION_MONITORING: false,
  
  // Quiz flow optimizations  
  PROGRESSIVE_AUTOSAVE: false,
  SUBMISSION_QUEUE: false,
  QUIZ_PREWARMING: false,
  DEFERRED_TIME: true,
  
  // Caching optimizations
  CLASSROOM_CACHE: false,
  REDIS_CACHING: false,
  BROWSER_CACHE_OPTIMIZATION: false,
  
  // Real-time features
  TEACHER_DASHBOARD: false,
  WEBSOCKET_UPDATES: false,
  LIVE_PROGRESS_TRACKING: false,
  
  // Performance features
  MEMORY_OPTIMIZATION: false,
  BUNDLE_OPTIMIZATION: false,
  COMPONENT_LAZY_LOADING: false,
  
  // Offline/resilience features
  OFFLINE_SUPPORT: false,
  SERVICE_WORKER: false,
  RETRY_MECHANISMS: false,
  
  // Monitoring and observability
  PERFORMANCE_MONITORING: false,
  ERROR_TRACKING: false,
  USER_ANALYTICS: false,
  
  // Testing and development
  MOCK_DATA_GENERATION: false,
  LOAD_TESTING_ENDPOINTS: false,
  DEBUG_PERFORMANCE: false
} as const;

export type FeatureFlag = keyof typeof FEATURES;

/**
 * Check if a feature is enabled
 * Priority: Environment Variable > Default Value
 */
export function isFeatureEnabled(feature: FeatureFlag): boolean {
  // Check for environment variable override
  const envKey = `NEXT_PUBLIC_FF_${feature}`;
  const envOverride = process.env[envKey];
  
  if (envOverride !== undefined && envOverride !== '') {
    const normalized = envOverride.trim().toLowerCase();
    
    // Handle common boolean representations
    if (normalized === 'true' || normalized === '1') {
      return true;
    }
    if (normalized === 'false' || normalized === '0') {
      return false;
    }
    
    // Invalid value - log warning and fall through to default behavior
    console.warn(`Invalid feature flag value for ${envKey}: "${envOverride}". Expected 'true', 'false', '1', or '0'. Using default.`);
  }
  
  // Check for runtime override (for testing)
  if (typeof window !== 'undefined' && window.__featureFlags) {
    const runtimeOverride = window.__featureFlags[feature];
    if (runtimeOverride !== undefined) {
      return runtimeOverride;
    }
  }
  
  // Fall back to default value
  return FEATURES[feature];
}

/**
 * Get all enabled features
 */
export function getEnabledFeatures(): FeatureFlag[] {
  return Object.keys(FEATURES).filter(feature => 
    isFeatureEnabled(feature as FeatureFlag)
  ) as FeatureFlag[];
}

/**
 * Get feature flags status for debugging
 */
export function getFeatureFlagsStatus(): Record<FeatureFlag, boolean> {
  const status = {} as Record<FeatureFlag, boolean>;
  
  Object.keys(FEATURES).forEach(feature => {
    status[feature as FeatureFlag] = isFeatureEnabled(feature as FeatureFlag);
  });
  
  return status;
}

/**
 * Conditional execution based on feature flag
 */
export function withFeatureFlag<T>(
  feature: FeatureFlag, 
  enabledCode: () => T, 
  fallbackCode: () => T
): T {
  if (isFeatureEnabled(feature)) {
    try {
      return enabledCode();
    } catch (error) {
      console.error(`Feature ${feature} failed, falling back:`, error);
      return fallbackCode();
    }
  }
  
  return fallbackCode();
}

/**
 * Async conditional execution with automatic fallback
 */
export async function withFeatureFlagAsync<T>(
  feature: FeatureFlag,
  enabledCode: () => Promise<T>,
  fallbackCode: () => Promise<T>
): Promise<T> {
  if (isFeatureEnabled(feature)) {
    try {
      return await enabledCode();
    } catch (error) {
      console.error(`Async feature ${feature} failed, falling back:`, error);
      return await fallbackCode();
    }
  }
  
  return await fallbackCode();
}

// Global type declarations for TypeScript
declare global {
  interface Window {
    __featureFlags?: Partial<Record<FeatureFlag, boolean>>;
  }
}

// Development helper: Log enabled features on startup
if (process.env.NODE_ENV === 'development') {
  const enabled = getEnabledFeatures();
  if (enabled.length > 0) {
    console.log('[FeatureFlags] Enabled features:', enabled);
  }
}
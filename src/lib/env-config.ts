/**
 * Environment Configuration
 * Centralized environment detection and configuration
 * 
 * IMPORTANT: Next.js automatically sets NODE_ENV:
 * - 'development' when running `next dev`
 * - 'production' when running `next build` and `next start`
 * - 'test' when running tests
 * 
 * For custom environment flags, use NEXT_PUBLIC_* prefix for client-side access
 */

// Server-side environment detection
export const isServer = typeof window === 'undefined';

// Environment detection (works on both client and server)
export const ENV = {
  // Core environment - automatically set by Next.js
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  
  // Custom flags for fine-grained control
  isDebugMode: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true',
  isMaintenanceMode: process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true',
  
  // Deployment environment (for staging vs production)
  deploymentEnv: process.env.NEXT_PUBLIC_DEPLOYMENT_ENV || 'production',
  isStaging: process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === 'staging',
  
  // Feature flags
  enableDebugEndpoints: process.env.NEXT_PUBLIC_ENABLE_DEBUG_ENDPOINTS === 'true',
  enableWebhookLogging: process.env.NEXT_PUBLIC_ENABLE_WEBHOOK_LOGGING === 'true',
  
  // Performance flags
  enableLogging: process.env.NEXT_PUBLIC_ENABLE_LOGGING === 'true' || process.env.NODE_ENV === 'development',
  logLevel: process.env.NEXT_PUBLIC_LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'error'),
};

// Helper to check if we should log
export function shouldLog(level: 'debug' | 'info' | 'warn' | 'error' = 'info'): boolean {
  // In development, always log
  if (ENV.isDevelopment) return true;
  
  // In production, check if logging is explicitly enabled
  if (!ENV.enableLogging) return false;
  
  // Check log level hierarchy
  const levels = { debug: 0, info: 1, warn: 2, error: 3 };
  const currentLevel = levels[ENV.logLevel as keyof typeof levels] || 3;
  const requestedLevel = levels[level] || 1;
  
  return requestedLevel >= currentLevel;
}

// Helper to check if debug features should be available
export function isDebugEnabled(): boolean {
  return ENV.isDevelopment || ENV.isDebugMode || ENV.enableDebugEndpoints;
}

// Helper to get environment name for display
export function getEnvironmentName(): string {
  if (ENV.isDevelopment) return 'Development';
  if (ENV.isStaging) return 'Staging';
  if (ENV.isProduction) return 'Production';
  if (ENV.isTest) return 'Test';
  return 'Unknown';
}

// Validate critical environment variables on server startup
if (isServer && ENV.isProduction) {
  const required = [
    'POSTGRES_URL',
    'BETTER_AUTH_SECRET',
    'NEXT_PUBLIC_APP_URL',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    // [REMOVED: Console statement for performance]}`);
    // Don't throw in production, just warn
    if (ENV.isDevelopment) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }
}

// Export a summary for debugging
export const envSummary = {
  node_env: process.env.NODE_ENV,
  deployment: ENV.deploymentEnv,
  debug: ENV.isDebugMode,
  logging: ENV.enableLogging,
  logLevel: ENV.logLevel,
  environment: getEnvironmentName(),
};
/**
 * Environment-aware logger that only outputs in development mode
 * This prevents console spam in production while maintaining debugging capability
 */

import { shouldLog } from './env-config';

export const logger = {
  log: (...args: unknown[]) => {
    if (shouldLog('info')) {
      // [REMOVED: Console statement for performance]
    }
  },
  
  error: (...args: unknown[]) => {
    if (shouldLog('error')) {
      // [REMOVED: Console statement for performance]
    }
  },
  
  warn: (...args: unknown[]) => {
    if (shouldLog('warn')) {
      // [REMOVED: Console statement for performance]
    }
  },
  
  info: (...args: unknown[]) => {
    if (shouldLog('info')) {
      // [REMOVED: Console statement for performance]
    }
  },
  
  debug: (...args: unknown[]) => {
    if (shouldLog('debug')) {
      // [REMOVED: Console statement for performance]
    }
  },
  
  trace: (...args: unknown[]) => {
    if (shouldLog('debug')) {
      // [REMOVED: Console statement for performance]
    }
  },
  
  // Force log regardless of environment (for critical errors)
  force: (...args: unknown[]) => {
    // [REMOVED: Console statement for performance]
  }
};
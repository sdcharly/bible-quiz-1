/**
 * Environment-aware logger that only outputs in development mode
 * This prevents console spam in production while maintaining debugging capability
 */

import { shouldLog } from './env-config';

export const logger = {
  log: (...args: unknown[]) => {
    if (shouldLog('info')) {
      console.log(...args);
    }
  },
  
  error: (...args: unknown[]) => {
    if (shouldLog('error')) {
      console.error(...args);
    }
  },
  
  warn: (...args: unknown[]) => {
    if (shouldLog('warn')) {
      console.warn(...args);
    }
  },
  
  info: (...args: unknown[]) => {
    if (shouldLog('info')) {
      console.info(...args);
    }
  },
  
  debug: (...args: unknown[]) => {
    if (shouldLog('debug')) {
      console.debug(...args);
    }
  },
  
  trace: (...args: unknown[]) => {
    if (shouldLog('debug')) {
      console.trace(...args);
    }
  },
  
  // Force log regardless of environment (for critical errors)
  force: (...args: unknown[]) => {
    console.error('[CRITICAL]', ...args);
  }
};
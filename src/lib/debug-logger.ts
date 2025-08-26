/**
 * Debug logger that stores logs in memory for debugging webhook issues
 * This helps debug issues in production where console.logs are hard to access
 * OPTIMIZED: Only stores in memory when needed, uses environment-aware logging
 */

import { logger } from './logger';
import { ENV, isDebugEnabled } from './env-config';


interface LogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'warn' | 'debug';
  message: string;
  data?: unknown;
}

class DebugLogger {
  private logs: LogEntry[] = [];
  private maxLogs = ENV.isDebugMode ? 100 : 20; // Reduce memory usage in production
  private enabled = isDebugEnabled(); // Only enable when needed

  log(level: LogEntry['level'], message: string, data?: unknown) {
    // Skip entirely if not enabled
    if (!this.enabled) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };

    // Only store in memory if debug mode is explicitly enabled
    if (ENV.isDebugMode) {
      this.logs.push(entry);
      
      // Keep only last maxLogs entries
      if (this.logs.length > this.maxLogs) {
        this.logs.shift();
      }
    }

    // Use environment-aware logger instead of console.log
    if (ENV.isDevelopment) {
      logger[level](`[WEBHOOK] ${message}`, data || '');
    }
  }

  info(message: string, data?: unknown) {
    this.log('info', message, data);
  }

  error(message: string, data?: unknown) {
    this.log('error', message, data);
  }

  warn(message: string, data?: unknown) {
    this.log('warn', message, data);
  }

  debug(message: string, data?: unknown) {
    this.log('debug', message, data);
  }

  getLogs(limit = 50): LogEntry[] {
    return this.logs.slice(-limit);
  }

  clearLogs() {
    this.logs = [];
  }
}

// Singleton instance
export const debugLogger = new DebugLogger();
/**
 * Debug logger that stores logs in memory for debugging webhook issues
 * This helps debug issues in production where console.logs are hard to access
 */

interface LogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'warn' | 'debug';
  message: string;
  data?: unknown;
}

class DebugLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 100; // Keep last 100 logs in memory

  log(level: LogEntry['level'], message: string, data?: unknown) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };

    this.logs.push(entry);
    
    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Also log to console for local development
    console.log(`[${level.toUpperCase()}] ${message}`, data || '');
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
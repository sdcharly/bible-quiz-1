/**
 * Optimized Database Connection Pool
 * Implements classroom-aware connection pooling for burst traffic scenarios
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { isFeatureEnabled } from './feature-flags';
import { logger } from './logger';

// Import the existing db for fallback
import { db as originalDb } from './db';

interface PoolConfig {
  max: number;
  idle_timeout: number;
  connect_timeout: number;
  max_lifetime: number;
  queue_target: number;
  queue_size: number;
}

/**
 * Get pool configuration based on feature flag and environment
 */
function getPoolConfig(): PoolConfig {
  if (!isFeatureEnabled('OPTIMIZED_DB_POOL')) {
    // Return default minimal config for legacy mode
    return {
      max: 10,
      idle_timeout: 60,
      connect_timeout: 30,
      max_lifetime: 3600,
      queue_target: 5000,
      queue_size: 50
    };
  }

  // Classroom-optimized settings
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    max: isProduction ? 50 : 25,           // Support 100+ concurrent students in prod
    idle_timeout: 20,                      // Faster connection recycling for burst traffic
    connect_timeout: 10,                   // Fail fast on connection issues
    max_lifetime: 60 * 30,                 // 30 min connection lifetime
    queue_target: 2000,                    // Queue timeout (ms)
    queue_size: isProduction ? 100 : 50,   // Max queued requests
  };
}

/**
 * Create optimized database connection with monitoring
 */
function createOptimizedConnection() {
  const config = getPoolConfig();
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL or POSTGRES_URL environment variable is required');
  }

  logger.log('Creating optimized database pool with config:', {
    max: config.max,
    idle_timeout: config.idle_timeout,
    optimized: isFeatureEnabled('OPTIMIZED_DB_POOL')
  });

  // Create postgres connection with optimized settings
  const sql = postgres(databaseUrl, {
    max: config.max,
    idle_timeout: config.idle_timeout,
    connect_timeout: config.connect_timeout,
    max_lifetime: config.max_lifetime,
    
    // Connection pool events for monitoring
    onnotice: (notice) => {
      if (isFeatureEnabled('DB_CONNECTION_MONITORING')) {
        logger.debug('DB Notice:', notice);
      }
    },
    
    onparameter: (key, value) => {
      if (isFeatureEnabled('DB_CONNECTION_MONITORING')) {
        logger.debug(`DB Parameter ${key}:`, value);
      }
    },

    // Transform for better error handling
    transform: {
      column: (column) => {
        // Convert snake_case to camelCase automatically
        return column.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      },
      value: (value) => {
        // Handle common data transformations
        return value;
      }
    }
  });

  // Monitor connection pool health
  if (isFeatureEnabled('DB_CONNECTION_MONITORING')) {
    setInterval(() => {
      // Connection pool monitoring - disabled due to postgres.js API limitations
      logger.debug('DB Pool Health Check:', {
        maxConnections: config.max,
        timestamp: new Date().toISOString()
      });
    }, 30000); // Every 30 seconds
  }

  return drizzle(sql);
}

// Create the optimized database instance
let optimizedDb: ReturnType<typeof createOptimizedConnection> | null = null;

/**
 * Get database instance with feature flag fallback
 */
export function getDb() {
  if (isFeatureEnabled('OPTIMIZED_DB_POOL')) {
    if (!optimizedDb) {
      try {
        optimizedDb = createOptimizedConnection();
        logger.log('Optimized database pool initialized');
      } catch (error) {
        logger.error('Failed to create optimized DB pool, falling back to original:', error);
        return originalDb;
      }
    }
    return optimizedDb;
  }
  
  // Use original database for legacy mode
  return originalDb;
}

/**
 * Connection pool health check
 */
export async function checkDbHealth() {
  try {
    const db = getDb();
    const start = Date.now();
    
    // Simple health check query
    await db.execute('SELECT 1 as health');
    
    const duration = Date.now() - start;
    
    return {
      healthy: true,
      responseTime: duration,
      poolType: isFeatureEnabled('OPTIMIZED_DB_POOL') ? 'optimized' : 'legacy',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('DB Health check failed:', error);
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      poolType: isFeatureEnabled('OPTIMIZED_DB_POOL') ? 'optimized' : 'legacy',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Force connection pool refresh (for emergencies)
 */
export async function refreshConnectionPool() {
  if (isFeatureEnabled('OPTIMIZED_DB_POOL') && optimizedDb) {
    logger.warn('Refreshing database connection pool');
    
    try {
      // End current connections gracefully
      await (optimizedDb as any).destroy?.();
      optimizedDb = null;
      
      // Recreate pool
      optimizedDb = createOptimizedConnection();
      
      logger.log('Database connection pool refreshed successfully');
      return { success: true, message: 'Pool refreshed' };
    } catch (error) {
      logger.error('Failed to refresh connection pool:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  
  return { success: false, message: 'Pool refresh not available in legacy mode' };
}

/**
 * Get connection pool statistics
 */
export function getPoolStats() {
  if (!isFeatureEnabled('OPTIMIZED_DB_POOL') || !optimizedDb) {
    return {
      type: 'legacy',
      available: false,
      message: 'Pool statistics not available in legacy mode'
    };
  }

  try {
    // Pool stats disabled due to postgres.js API limitations
    return {
      type: 'optimized',
      available: true,
      stats: {
        maxConnections: isFeatureEnabled('OPTIMIZED_DB_POOL') ? 50 : 10,
        activeConnections: 0, // Not available via postgres.js API
        idleConnections: 0,   // Not available via postgres.js API  
        queueSize: 0,         // Not available via postgres.js API
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Failed to get pool stats:', error);
    return {
      type: 'optimized',
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Export the database instance
export const db = getDb();

// Export for backward compatibility
export default db;
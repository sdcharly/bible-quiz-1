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
 * Memoized snake_case to camelCase converter
 * Caches transformations to avoid repeated regex operations on hot path
 */
const columnNameCache = new Map<string, string>();

function snakeToCamelCase(column: string): string {
  // Check cache first
  const cached = columnNameCache.get(column);
  if (cached !== undefined) {
    return cached;
  }
  
  // Compute transformation
  const transformed = column.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  
  // Store in cache for future use
  columnNameCache.set(column, transformed);
  
  return transformed;
}

// Pre-populate cache with common column names from our schema
// This avoids computation even on first access for known columns
const commonColumns = [
  'id', 'created_at', 'updated_at', 'deleted_at',
  'user_id', 'educator_id', 'student_id', 'quiz_id', 
  'group_id', 'attempt_id', 'document_id', 'enrollment_id',
  'display_name', 'file_path', 'file_type', 'file_size',
  'upload_date', 'processed_data', 'lightrag_document_id',
  'start_time', 'end_time', 'submit_time', 'time_limit',
  'share_code', 'short_code', 'share_url', 'short_url',
  'is_active', 'is_published', 'is_archived', 'is_verified',
  'passing_score', 'total_questions', 'completed_count',
  'track_id', 'processing_status', 'error_message'
];

// Initialize cache with common columns
for (const column of commonColumns) {
  snakeToCamelCase(column);
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
  
  // Read max connections from environment variable with fallback
  const configuredMaxConnections = Number(process.env.DB_MAX_CONNECTIONS) || 0;
  const defaultMaxConnections = isProduction ? 50 : 25;
  const maxConnections = configuredMaxConnections > 0 ? configuredMaxConnections : defaultMaxConnections;
  
  return {
    max: maxConnections,                    // Support 100+ concurrent students in prod
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
        // Use memoized converter for performance on hot path
        return snakeToCamelCase(column);
      },
      value: (value) => {
        // Handle common data transformations
        return value;
      }
    }
  });

  // Monitor connection pool health
  if (isFeatureEnabled('DB_CONNECTION_MONITORING')) {
    // Store interval ID for proper cleanup on shutdown
    poolMonitorInterval = setInterval(() => {
      // Log basic pool configuration (actual stats not available via postgres.js API)
      logger.debug('DB Pool Health Check:', {
        maxConnections: config.max,
        timestamp: new Date().toISOString()
      });
    }, 30000); // Every 30 seconds
  }

  // Store the sql client for proper cleanup
  sqlClient = sql;
  return drizzle(sql);
}

// Store both the drizzle instance and the underlying sql client
let optimizedDb: ReturnType<typeof createOptimizedConnection> | null = null;
let sqlClient: ReturnType<typeof postgres> | null = null;
let poolMonitorInterval: NodeJS.Timeout | null = null;

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
      // End current connections gracefully using postgres.js end() method
      if (sqlClient) {
        await sqlClient.end();
        sqlClient = null;
      }
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
    // Get the actual configured max connections
    const config = getPoolConfig();
    
    // Pool stats disabled due to postgres.js API limitations
    return {
      type: 'optimized',
      available: true,
      stats: {
        maxConnections: config.max,
        activeConnections: null, // Not available via postgres.js API
        idleConnections: null,   // Not available via postgres.js API  
        queueSize: null,         // Not available via postgres.js API
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

/**
 * Gracefully close database connections
 * Use this for application shutdown
 */
export async function closeDatabase() {
  try {
    // Clear monitoring interval if it exists
    if (poolMonitorInterval) {
      clearInterval(poolMonitorInterval);
      poolMonitorInterval = null;
      logger.debug('Stopped database pool monitoring');
    }
    
    if (sqlClient) {
      logger.log('Closing database connection pool...');
      await sqlClient.end();
      sqlClient = null;
      optimizedDb = null;
      logger.log('Database connection pool closed successfully');
    }
  } catch (error) {
    logger.error('Error closing database connections:', error);
    throw error;
  }
}

// Export the database instance
export const db = getDb();

// Register cleanup on process shutdown
if (typeof process !== 'undefined') {
  // Handle graceful shutdown
  const handleShutdown = async (signal: string) => {
    logger.log(`Received ${signal}, closing database connections...`);
    try {
      await closeDatabase();
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  // Register shutdown handlers for common signals
  process.once('SIGINT', () => handleShutdown('SIGINT'));
  process.once('SIGTERM', () => handleShutdown('SIGTERM'));
  
  // Handle uncaught errors
  process.on('beforeExit', async () => {
    await closeDatabase();
  });
}

// Export for backward compatibility
export default db;
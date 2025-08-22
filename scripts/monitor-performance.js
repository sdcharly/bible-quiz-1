#!/usr/bin/env node

/**
 * Performance monitoring script for the Bible Quiz application
 * Monitors database connections, cache performance, and system metrics
 * 
 * Usage: node scripts/monitor-performance.js
 */

// Use the already configured database connection
const path = require('path');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const postgres = require('postgres');

const connectionString = process.env.POSTGRES_URL;
const redisUrl = process.env.REDIS_URL || process.env.KV_URL;
const redisToken = process.env.REDIS_TOKEN || process.env.KV_REST_API_TOKEN;

async function monitorPerformance() {
  console.log('🔍 Bible Quiz Performance Monitor\n');
  console.log('==================================\n');
  
  // Database monitoring
  if (connectionString) {
    const sql = postgres(connectionString);
    
    try {
      console.log('📊 DATABASE PERFORMANCE\n');
      
      // Connection stats
      const connectionStats = await sql`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections,
          count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
          max(EXTRACT(EPOCH FROM (now() - query_start))) as longest_query_seconds
        FROM pg_stat_activity
        WHERE datname = current_database();
      `;
      
      console.log('Connection Pool Status:');
      console.table(connectionStats);
      
      // Slow queries
      const slowQueries = await sql`
        SELECT 
          query,
          calls,
          mean_exec_time,
          total_exec_time,
          rows
        FROM pg_stat_statements
        WHERE mean_exec_time > 100
        ORDER BY mean_exec_time DESC
        LIMIT 5;
      `.catch(() => []);
      
      if (slowQueries.length > 0) {
        console.log('\n⚠️  Slow Queries (>100ms):');
        slowQueries.forEach((q, i) => {
          console.log(`\n${i + 1}. Mean time: ${Math.round(q.mean_exec_time)}ms | Calls: ${q.calls}`);
          console.log(`   Query: ${q.query.substring(0, 100)}...`);
        });
      }
      
      // Index usage
      const indexUsage = await sql`
        SELECT 
          schemaname,
          tablename,
          100 * idx_scan / NULLIF(seq_scan + idx_scan, 0) as index_usage_percent,
          n_live_tup as rows_in_table
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY n_live_tup DESC;
      `;
      
      console.log('\n📈 Index Usage by Table:');
      console.table(indexUsage.map(row => ({
        table: row.tablename,
        index_usage: `${Math.round(row.index_usage_percent || 0)}%`,
        total_rows: row.rows_in_table
      })));
      
      // Table sizes
      const tableSizes = await sql`
        SELECT 
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          n_live_tup as live_rows,
          n_dead_tup as dead_rows
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 10;
      `;
      
      console.log('\n💾 Largest Tables:');
      console.table(tableSizes);
      
      await sql.end();
    } catch (error) {
      console.error('❌ Database monitoring error:', error.message);
    }
  } else {
    console.log('⚠️  No database connection configured\n');
  }
  
  // Redis cache monitoring
  if (redisUrl && redisToken) {
    try {
      console.log('\n📦 CACHE PERFORMANCE\n');
      
      // Dynamically require Redis client
      const { createClient } = require('@upstash/redis');
      const redis = createClient({
        url: redisUrl,
        token: redisToken,
      });
      
      // Get cache statistics
      const info = await redis.info().catch(() => null);
      
      if (info) {
        console.log('Redis Cache Info:');
        const lines = info.split('\n');
        const stats = {};
        lines.forEach(line => {
          if (line.includes(':')) {
            const [key, value] = line.split(':');
            if (['used_memory_human', 'connected_clients', 'total_commands_processed', 'keyspace_hits', 'keyspace_misses'].includes(key)) {
              stats[key] = value.trim();
            }
          }
        });
        console.table(stats);
      }
      
      // Sample cache keys
      const keys = await redis.keys('*').catch(() => []);
      const keyPatterns = {};
      
      keys.forEach(key => {
        const pattern = key.split(':')[0];
        keyPatterns[pattern] = (keyPatterns[pattern] || 0) + 1;
      });
      
      if (Object.keys(keyPatterns).length > 0) {
        console.log('\nCache Key Distribution:');
        console.table(keyPatterns);
      }
      
    } catch (error) {
      console.log('⚠️  Redis not available, using in-memory cache\n');
    }
  } else {
    console.log('⚠️  Redis not configured, using in-memory cache\n');
  }
  
  // Application metrics suggestions
  console.log('\n💡 OPTIMIZATION RECOMMENDATIONS\n');
  console.log('================================\n');
  
  const recommendations = [
    {
      metric: 'Database Connections',
      target: '< 80% of max_connections',
      action: 'Increase connection pool size or optimize queries'
    },
    {
      metric: 'Cache Hit Rate',
      target: '> 80%',
      action: 'Increase cache TTL for frequently accessed data'
    },
    {
      metric: 'Query Response Time',
      target: '< 100ms for 95% of queries',
      action: 'Add indexes or optimize slow queries'
    },
    {
      metric: 'WebSocket Connections',
      target: '< 2 per user',
      action: 'Implement connection limiting and cleanup'
    },
    {
      metric: 'Memory Usage',
      target: '< 80% of available RAM',
      action: 'Optimize caching strategy or increase server memory'
    }
  ];
  
  console.table(recommendations);
  
  console.log('\n✅ Performance monitoring complete!\n');
}

// Run the monitor
if (require.main === module) {
  monitorPerformance().catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}
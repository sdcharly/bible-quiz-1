#!/usr/bin/env node

/**
 * Simple performance monitoring script for the Bible Quiz application
 * Usage: node scripts/monitor-performance-simple.js
 */

const { join } = require('path');

// Load environment variables
require('dotenv').config({ path: join(__dirname, '..', '.env') });

const postgres = require('postgres');

async function monitorPerformance() {
  console.log('🔍 Bible Quiz Performance Monitor\n');
  console.log('==================================\n');
  
  const connectionString = process.env.POSTGRES_URL;
  
  if (!connectionString) {
    console.log('⚠️  No database connection configured');
    console.log('Set POSTGRES_URL in your .env file\n');
    return;
  }
  
  // Create connection with timeout
  const sql = postgres(connectionString, {
    idle_timeout: 5,
    connect_timeout: 5,
    max: 1
  });
  
  try {
    console.log('📊 DATABASE PERFORMANCE\n');
    
    // Test connection
    await sql`SELECT 1`;
    console.log('✅ Database connected successfully\n');
    
    // Connection stats
    console.log('📈 Connection Statistics:');
    const connectionStats = await sql`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active,
        count(*) FILTER (WHERE state = 'idle') as idle
      FROM pg_stat_activity
      WHERE datname = current_database()
    `.catch(err => {
      console.log('Could not fetch connection stats:', err.message);
      return [];
    });
    
    if (connectionStats.length > 0) {
      console.log(`  Total: ${connectionStats[0].total_connections}`);
      console.log(`  Active: ${connectionStats[0].active}`);
      console.log(`  Idle: ${connectionStats[0].idle}\n`);
    }
    
    // Table sizes - try different column names based on database version
    console.log('💾 Table Sizes:');
    const tableSizes = await sql`
      SELECT 
        relname as tablename,
        pg_size_pretty(pg_total_relation_size(oid)) as size
      FROM pg_class
      WHERE relkind = 'r'
        AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      ORDER BY pg_total_relation_size(oid) DESC
      LIMIT 5
    `.catch(err => {
      console.log('Could not fetch table sizes');
      return [];
    });
    
    if (tableSizes.length > 0) {
      tableSizes.forEach(t => {
        console.log(`  ${t.tablename}: ${t.size}`);
      });
    }
    
    // Index usage - simplified query
    console.log('\n📈 Database Indexes:');
    const indexes = await sql`
      SELECT 
        tablename,
        indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      LIMIT 10
    `.catch(err => {
      console.log('Could not fetch indexes');
      return [];
    });
    
    if (indexes.length > 0) {
      indexes.forEach(idx => {
        console.log(`  ${idx.tablename}: ${idx.indexname}`);
      });
    } else {
      console.log('  No indexes found - run "npm run perf:indexes" to create them');
    }
    
  } catch (error) {
    console.error('❌ Database monitoring error:', error.message);
  } finally {
    await sql.end();
  }
  
  // Check cache configuration
  console.log('\n📦 CACHE CONFIGURATION\n');
  if (process.env.REDIS_URL || process.env.KV_URL) {
    console.log('✅ Redis cache configured');
  } else {
    console.log('⚠️  Using in-memory cache (Redis not configured)');
  }
  
  // Show recommendations
  console.log('\n💡 OPTIMIZATION RECOMMENDATIONS\n');
  console.log('================================\n');
  console.log('1. Run "npm run perf:indexes" to apply database indexes');
  console.log('2. Monitor active connections (should be < 20 for 100 users)');
  console.log('3. Ensure index usage is > 50% for frequently queried tables');
  console.log('4. Consider Redis for production caching');
  console.log('5. Set up monitoring with New Relic or DataDog for production\n');
  
  console.log('✅ Performance check complete!\n');
}

// Run the monitor with timeout
if (require.main === module) {
  // Set a timeout for the entire script
  const timeout = setTimeout(() => {
    console.error('\n⚠️  Script timeout - exiting');
    process.exit(1);
  }, 10000); // 10 second timeout
  
  monitorPerformance()
    .then(() => {
      clearTimeout(timeout);
      process.exit(0);
    })
    .catch(error => {
      clearTimeout(timeout);
      console.error('Error:', error.message);
      process.exit(1);
    });
}
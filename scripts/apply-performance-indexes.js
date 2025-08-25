#!/usr/bin/env node

/**
 * Script to apply performance optimization indexes to the database
 * Run this script after deployment to optimize database performance
 * 
 * Usage: node scripts/apply-performance-indexes.js
 */

const { join } = require('path');
const { readFileSync } = require('fs');

// Load environment variables from .env file
require('dotenv').config({ path: join(__dirname, '..', '.env') });

const postgres = require('postgres');

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('❌ POSTGRES_URL environment variable is not set');
  process.exit(1);
}

async function applyIndexes() {
  const sql = postgres(connectionString);
  
  try {
    console.log('📚 Applying performance optimization indexes...\n');
    
    // Read the SQL files - now including concurrent quiz indexes
    const baseIndexesSQL = readFileSync(
      join(__dirname, '..', 'migrations', '0011_add_performance_indexes.sql'),
      'utf-8'
    );
    
    // Check if concurrent indexes file exists
    let concurrentIndexesSQL = '';
    try {
      concurrentIndexesSQL = readFileSync(
        join(__dirname, '..', 'migrations', '0012_add_concurrent_quiz_indexes.sql'),
        'utf-8'
      );
      console.log('📚 Including concurrent quiz optimization indexes...\n');
    } catch (e) {
      console.log('ℹ️  No concurrent quiz indexes file found\n');
    }
    
    const indexesSQL = baseIndexesSQL + '\n' + concurrentIndexesSQL;
    
    // Split SQL into individual statements
    // Handle multi-line CREATE INDEX statements properly
    const statements = [];
    let currentStatement = '';
    
    indexesSQL.split('\n').forEach(line => {
      // Skip comment-only lines
      if (line.trim().startsWith('--') && !currentStatement) {
        return;
      }
      
      currentStatement += line + '\n';
      
      // If line ends with semicolon, we have a complete statement
      if (line.trim().endsWith(';')) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    });
    
    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }
    
    console.log(`Found ${statements.filter(s => s.includes('CREATE INDEX')).length} indexes to create\n`);
    
    for (const statement of statements) {
      if (statement.includes('CREATE INDEX')) {
        const indexName = statement.match(/CREATE INDEX IF NOT EXISTS (\w+)/)?.[1];
        console.log(`  Creating index: ${indexName}`);
        try {
          await sql.unsafe(statement);
          console.log(`  ✅ ${indexName} created successfully`);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`  ⏭️  ${indexName} already exists`);
          } else {
            console.error(`  ❌ Failed to create ${indexName}:`, error.message);
          }
        }
      } else if (statement.includes('ANALYZE')) {
        // Extract table name, handling quoted identifiers
        const tableName = statement.match(/ANALYZE\s+["']?(\w+)["']?/)?.[1] || 
                         statement.match(/ANALYZE\s+"([^"]+)"/)?.[1];
        console.log(`\n  Analyzing table: ${tableName}`);
        try {
          await sql.unsafe(statement);
          console.log(`  ✅ ${tableName} analyzed`);
        } catch (analyzeErr) {
          console.log(`  ⚠️  Could not analyze ${tableName}: ${analyzeErr.message}`);
        }
      }
    }
    
    console.log('\n✨ Performance indexes applied successfully!\n');
    
    // Show index statistics - simplified query for compatibility
    console.log('📊 Database Index Statistics:\n');
    
    try {
      const indexStats = await sql`
        SELECT 
          tablename,
          indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname;
      `;
      
      if (indexStats.length > 0) {
        console.log('Indexes created:');
        indexStats.forEach(idx => {
          console.log(`  ✅ ${idx.tablename}: ${idx.indexname}`);
        });
      }
    } catch (err) {
      console.log('Could not fetch index statistics');
    }
    
    // Show table statistics - simplified query for compatibility
    console.log('\n📊 Table Statistics:\n');
    
    try {
      const tableStats = await sql`
        SELECT 
          relname as tablename,
          n_live_tup as live_rows,
          pg_size_pretty(pg_total_relation_size(oid)) as total_size
        FROM pg_stat_user_tables
        JOIN pg_class ON pg_class.relname = pg_stat_user_tables.tablename
        WHERE pg_stat_user_tables.schemaname = 'public'
          AND pg_class.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        ORDER BY n_live_tup DESC
        LIMIT 10;
      `;
      
      if (tableStats.length > 0) {
        console.log('Table sizes:');
        tableStats.forEach(t => {
          console.log(`  ${t.tablename}: ${t.live_rows} rows, ${t.total_size}`);
        });
      }
    } catch (err) {
      // Try even simpler query
      try {
        const simpleTables = await sql`
          SELECT 
            relname as tablename,
            pg_size_pretty(pg_total_relation_size(oid)) as size
          FROM pg_class
          WHERE relkind = 'r'
            AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
          ORDER BY pg_total_relation_size(oid) DESC
          LIMIT 10;
        `;
        
        if (simpleTables.length > 0) {
          console.log('Table sizes:');
          simpleTables.forEach(t => {
            console.log(`  ${t.tablename}: ${t.size}`);
          });
        }
      } catch (err2) {
        console.log('Could not fetch table statistics');
      }
    }
    
  } catch (error) {
    console.error('❌ Error applying indexes:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the script
if (require.main === module) {
  applyIndexes().catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}
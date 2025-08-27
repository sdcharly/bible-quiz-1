#!/usr/bin/env node

/**
 * Script to cleanup stuck quiz attempts
 * Run this as a cron job every hour or manually when needed
 * 
 * Usage: node scripts/cleanup-stuck-quiz-attempts.js [--dry-run]
 */

require('dotenv').config();
const { Pool } = require('pg');

const isDryRun = process.argv.includes('--dry-run');
const POSTGRES_URL = process.env.POSTGRES_URL;

if (!POSTGRES_URL) {
  console.error('❌ POSTGRES_URL not found in environment variables');
  process.exit(1);
}

const pool = new Pool({ connectionString: POSTGRES_URL });

async function cleanupStuckAttempts() {
  console.log('🧹 Starting cleanup of stuck quiz attempts...');
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
  }

  try {
    const now = new Date();
    
    // First, get statistics
    console.log('\n📊 Current Statistics:');
    const statsResult = await pool.query(`
      SELECT 
        status, 
        COUNT(*) as count,
        MIN(created_at) as oldest,
        MAX(created_at) as newest
      FROM quiz_attempts
      GROUP BY status
      ORDER BY count DESC
    `);
    
    console.table(statsResult.rows.map(row => ({
      Status: row.status,
      Count: row.count,
      Oldest: new Date(row.oldest).toLocaleString(),
      Newest: new Date(row.newest).toLocaleString()
    })));

    // Find stuck attempts (in_progress for too long)
    console.log('\n🔍 Finding stuck attempts...');
    
    const stuckAttemptsQuery = `
      SELECT 
        qa.id,
        qa.quiz_id,
        qa.student_id,
        qa.status,
        qa.created_at,
        qa.start_time,
        q.duration,
        q.time_configuration,
        u.email as student_email,
        EXTRACT(EPOCH FROM (NOW() - COALESCE(qa.start_time, qa.created_at)))/60 as minutes_elapsed
      FROM quiz_attempts qa
      LEFT JOIN quizzes q ON qa.quiz_id = q.id
      LEFT JOIN "user" u ON qa.student_id = u.id
      WHERE qa.status = 'in_progress'
      ORDER BY qa.created_at ASC
    `;
    
    const stuckResult = await pool.query(stuckAttemptsQuery);
    console.log(`Found ${stuckResult.rows.length} in-progress attempts`);

    let timedOut = 0;
    let abandoned = 0;
    let stillValid = 0;

    for (const attempt of stuckResult.rows) {
      // Determine quiz duration
      let quizDuration = attempt.duration || 30; // Default 30 minutes
      
      if (attempt.time_configuration) {
        try {
          const timeConfig = JSON.parse(attempt.time_configuration);
          if (timeConfig.timeLimit) {
            quizDuration = Math.ceil(timeConfig.timeLimit / 60);
          }
        } catch (e) {
          // Use default if parsing fails
        }
      }

      const minutesElapsed = parseFloat(attempt.minutes_elapsed);
      const maxAllowedTime = quizDuration * 2; // 2x the quiz duration

      if (minutesElapsed > maxAllowedTime) {
        console.log(`\n⏰ TIMEOUT: Attempt ${attempt.id}`);
        console.log(`  Student: ${attempt.student_email || 'Unknown'}`);
        console.log(`  Elapsed: ${Math.round(minutesElapsed)} minutes (max allowed: ${maxAllowedTime})`);
        
        if (!isDryRun) {
          await pool.query(
            `UPDATE quiz_attempts 
             SET status = 'timeout', 
                 end_time = NOW(), 
                 updated_at = NOW() 
             WHERE id = $1`,
            [attempt.id]
          );
        }
        timedOut++;
        
      } else if (minutesElapsed > quizDuration * 1.5 && !attempt.start_time) {
        console.log(`\n🚪 ABANDONED: Attempt ${attempt.id}`);
        console.log(`  Student: ${attempt.student_email || 'Unknown'}`);
        console.log(`  Created ${Math.round(minutesElapsed)} minutes ago but never started`);
        
        if (!isDryRun) {
          await pool.query(
            `UPDATE quiz_attempts 
             SET status = 'abandoned', 
                 updated_at = NOW() 
             WHERE id = $1`,
            [attempt.id]
          );
        }
        abandoned++;
        
      } else {
        stillValid++;
      }
    }

    // Clean up old auto-save data (set to empty array instead of NULL since column is NOT NULL)
    console.log('\n🗑️  Cleaning up old auto-save data...');
    let cleaned = 0;
    if (!isDryRun) {
      const cleanupResult = await pool.query(`
        UPDATE quiz_attempts
        SET answers = '[]'::jsonb
        WHERE status IN ('timeout', 'abandoned', 'completed')
          AND updated_at < NOW() - INTERVAL '7 days'
          AND answers != '[]'::jsonb
        RETURNING id
      `);
      cleaned = cleanupResult.rows.length;
    }

    // Summary
    console.log('\n✅ Cleanup Summary:');
    console.log('────────────────────');
    console.log(`📊 Total in-progress attempts: ${stuckResult.rows.length}`);
    console.log(`⏰ Timed out: ${timedOut}`);
    console.log(`🚪 Abandoned: ${abandoned}`);
    console.log(`✓ Still valid: ${stillValid}`);
    console.log(`🗑️  Old data cleaned: ${cleaned}`);
    
    if (isDryRun) {
      console.log('\n💡 This was a dry run. Run without --dry-run to apply changes.');
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the cleanup
cleanupStuckAttempts().then(() => {
  console.log('\n✨ Cleanup completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
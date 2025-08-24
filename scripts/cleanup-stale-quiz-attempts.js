#!/usr/bin/env node

/**
 * Stale Quiz Attempts Cleanup Script
 * Marks old 'in_progress' quiz attempts as 'abandoned' to clean up the system
 */

const postgres = require('postgres');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL or POSTGRES_URL not found in environment variables');
  process.exit(1);
}

async function cleanupStaleQuizAttempts() {
  console.log('');
  console.log('🎯 QUIZ ATTEMPTS CLEANUP UTILITY');
  console.log('══════════════════════════════════════');
  console.log('');
  
  const sql = postgres(DATABASE_URL);
  
  try {
    // Check for stale quiz attempts (in_progress for more than 4 hours)
    console.log('📊 Analyzing quiz attempts...');
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    
    const staleAttempts = await sql`
      SELECT 
        qa.id,
        qa.student_id,
        qa.quiz_id,
        qa.start_time,
        qa.status,
        u.email as user_email,
        q.title as quiz_title
      FROM quiz_attempts qa
      LEFT JOIN "user" u ON qa.student_id = u.id
      LEFT JOIN quizzes q ON qa.quiz_id = q.id
      WHERE qa.status = 'in_progress'
        AND qa.start_time < ${fourHoursAgo}
      ORDER BY qa.start_time DESC
    `;
    
    console.log(`   Found ${staleAttempts.length} stale quiz attempts (older than 4 hours)`);
    console.log('');
    
    if (staleAttempts.length === 0) {
      console.log('✅ No stale quiz attempts found!');
      await sql.end();
      return;
    }
    
    // Show details
    console.log('📋 Stale Attempts Details:');
    staleAttempts.slice(0, 10).forEach(attempt => {
      const hoursAgo = Math.floor((Date.now() - new Date(attempt.start_time).getTime()) / (1000 * 60 * 60));
      console.log(`   • ${attempt.user_email || 'Unknown'} - "${attempt.quiz_title || 'Unknown Quiz'}" - Started ${hoursAgo} hours ago`);
    });
    
    if (staleAttempts.length > 10) {
      console.log(`   ... and ${staleAttempts.length - 10} more`);
    }
    console.log('');
    
    // Mark as abandoned
    console.log('🔄 Marking stale attempts as abandoned...');
    const updateResult = await sql`
      UPDATE quiz_attempts
      SET 
        status = 'abandoned',
        end_time = NOW(),
        score = 0
      WHERE status = 'in_progress'
        AND start_time < ${fourHoursAgo}
      RETURNING id
    `;
    
    console.log(`   ✅ Marked ${updateResult.length} attempts as abandoned`);
    console.log('');
    
    // Also check for very recent attempts that might be affected by session cleanup
    const recentAttempts = await sql`
      SELECT COUNT(*) as count
      FROM quiz_attempts
      WHERE status = 'in_progress'
        AND start_time >= ${fourHoursAgo}
    `;
    
    if (recentAttempts[0].count > 0) {
      console.log(`ℹ️  Note: ${recentAttempts[0].count} quiz attempts are still in progress (less than 4 hours old)`);
      console.log('   These are considered valid and were not touched.');
    }
    
    console.log('');
    console.log('✅ Quiz attempts cleanup completed!');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run cleanup
cleanupStaleQuizAttempts().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
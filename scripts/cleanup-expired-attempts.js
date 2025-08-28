#!/usr/bin/env node

/**
 * Clean up expired quiz attempts that are stuck in "in_progress" status
 * This prevents expired quizzes from showing as available
 */

require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

async function cleanupExpiredAttempts() {
  const client = await pool.connect();
  
  try {
    console.log('=== Cleaning Up Expired Quiz Attempts ===\n');
    
    // Find in_progress attempts for quizzes that have ended
    const expiredAttempts = await client.query(`
      SELECT 
        qa.id, 
        qa.quiz_id, 
        qa.student_id, 
        qa.start_time,
        q.title,
        q.start_time as quiz_start,
        q.duration,
        u.email,
        e.is_reassignment
      FROM quiz_attempts qa
      JOIN quizzes q ON q.id = qa.quiz_id
      JOIN "user" u ON u.id = qa.student_id
      JOIN enrollments e ON e.id = qa.enrollment_id
      WHERE qa.status = 'in_progress'
        AND q.start_time IS NOT NULL
        AND NOW() > (q.start_time + INTERVAL '1 minute' * q.duration)
        AND e.is_reassignment = false  -- Don't touch reassignments
    `);
    
    console.log(`Found ${expiredAttempts.rows.length} expired attempts to clean up\n`);
    
    if (expiredAttempts.rows.length === 0) {
      console.log('✅ No expired attempts found. Database is clean!');
      return;
    }
    
    // Show details
    console.log('Expired Attempts:');
    console.log('=================');
    expiredAttempts.rows.forEach((attempt, i) => {
      const endTime = new Date(attempt.quiz_start.getTime() + attempt.duration * 60 * 1000);
      console.log(`${i+1}. ${attempt.email} - ${attempt.title}`);
      console.log(`   Quiz ended: ${endTime.toLocaleString()}`);
      console.log(`   Attempt ID: ${attempt.id}`);
      console.log('');
    });
    
    // Confirm
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      readline.question('Mark these attempts as "abandoned"? (yes/no): ', resolve);
    });
    readline.close();
    
    if (answer.toLowerCase() !== 'yes') {
      console.log('Cancelled.');
      return;
    }
    
    // Start transaction
    await client.query('BEGIN');
    
    // Mark expired attempts as abandoned
    const attemptIds = expiredAttempts.rows.map(r => r.id);
    await client.query(`
      UPDATE quiz_attempts 
      SET status = 'abandoned',
          end_time = NOW()
      WHERE id::text = ANY($1::text[])
    `, [attemptIds]);
    
    console.log(`✅ Marked ${attemptIds.length} expired attempts as abandoned`);
    
    // Update enrollment statuses for non-reassignments
    const enrollmentUpdates = await client.query(`
      UPDATE enrollments e
      SET status = 'enrolled'
      FROM quiz_attempts qa
      WHERE qa.enrollment_id = e.id
        AND qa.id::text = ANY($1::text[])
        AND e.is_reassignment = false
        AND e.status = 'in_progress'
      RETURNING e.id
    `, [attemptIds]);
    
    console.log(`✅ Reset ${enrollmentUpdates.rows.length} enrollment statuses to 'enrolled'`);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('\n🎉 Cleanup completed successfully!');
    console.log('Expired quizzes will no longer appear as available.');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run cleanup
cleanupExpiredAttempts();
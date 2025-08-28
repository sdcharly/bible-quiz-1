#!/usr/bin/env node

/**
 * Script to fix quiz attempt issues:
 * 1. Clean up duplicate attempts
 * 2. Fix enrollment status for completed quizzes
 * 3. Fix false completions without answers
 */

require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

async function fixQuizAttemptIssues() {
  const client = await pool.connect();
  
  try {
    console.log('=== Fixing Quiz Attempt Issues ===\n');
    
    // Start transaction
    await client.query('BEGIN');
    
    // 1. Find enrollments with completed attempts but wrong enrollment status
    console.log('1. Finding mismatched enrollment statuses...');
    const mismatchedEnrollments = await client.query(`
      SELECT DISTINCT e.id, e.quiz_id, e.student_id, e.status as enrollment_status,
             qa.id as completed_attempt_id, qa.status as attempt_status
      FROM enrollments e
      JOIN quiz_attempts qa ON qa.enrollment_id = e.id
      WHERE qa.status = 'completed' 
        AND e.status != 'completed'
    `);
    
    console.log(`   Found ${mismatchedEnrollments.rows.length} enrollments to fix\n`);
    
    // 2. Fix false completions (completed without real answers)
    console.log('2. Finding false completions (no real answers)...');
    const falseCompletions = await client.query(`
      SELECT id, quiz_id, student_id, enrollment_id, answers, score
      FROM quiz_attempts
      WHERE status = 'completed'
        AND (
          score IS NULL 
          OR answers IS NULL 
          OR answers::text = '[]'
          OR answers::text LIKE '%_autosave_metadata%'
        )
    `);
    
    console.log(`   Found ${falseCompletions.rows.length} false completions\n`);
    
    // 3. Find duplicate in-progress attempts for same enrollment
    console.log('3. Finding duplicate in-progress attempts...');
    const duplicateAttempts = await client.query(`
      SELECT enrollment_id, COUNT(*) as count, array_agg(id) as attempt_ids
      FROM quiz_attempts
      WHERE status = 'in_progress'
      GROUP BY enrollment_id
      HAVING COUNT(*) > 1
    `);
    
    console.log(`   Found ${duplicateAttempts.rows.length} enrollments with duplicate attempts\n`);
    
    // Ask for confirmation
    console.log('Issues Found:');
    console.log(`- ${mismatchedEnrollments.rows.length} enrollments need status update`);
    console.log(`- ${falseCompletions.rows.length} false completions to revert`);
    console.log(`- ${duplicateAttempts.rows.length} sets of duplicate attempts to clean\n`);
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      readline.question('Do you want to fix these issues? (yes/no): ', resolve);
    });
    readline.close();
    
    if (answer.toLowerCase() !== 'yes') {
      console.log('Cancelled. Rolling back...');
      await client.query('ROLLBACK');
      return;
    }
    
    // Apply fixes
    console.log('\nApplying fixes...\n');
    
    // Fix 1: Revert false completions to abandoned
    if (falseCompletions.rows.length > 0) {
      console.log('Reverting false completions to abandoned status...');
      const falseIds = falseCompletions.rows.map(r => r.id);
      await client.query(`
        UPDATE quiz_attempts 
        SET status = 'abandoned',
            updated_at = NOW()
        WHERE id::text = ANY($1::text[])
      `, [falseIds]);
      console.log(`   Reverted ${falseIds.length} false completions\n`);
    }
    
    // Fix 2: Clean up duplicate in-progress attempts (keep only the latest)
    if (duplicateAttempts.rows.length > 0) {
      console.log('Cleaning duplicate attempts...');
      let abandonedCount = 0;
      
      for (const dup of duplicateAttempts.rows) {
        // Get all attempts ordered by created_at
        const attempts = await client.query(`
          SELECT id, created_at 
          FROM quiz_attempts 
          WHERE id::text = ANY($1::text[])
          ORDER BY created_at DESC
        `, [dup.attempt_ids]);
        
        // Keep the first (latest), abandon the rest
        if (attempts.rows.length > 1) {
          const toAbandon = attempts.rows.slice(1).map(a => a.id);
          await client.query(`
            UPDATE quiz_attempts 
            SET status = 'abandoned',
                updated_at = NOW()
            WHERE id::text = ANY($1::text[])
          `, [toAbandon]);
          abandonedCount += toAbandon.length;
        }
      }
      console.log(`   Abandoned ${abandonedCount} duplicate attempts\n`);
    }
    
    // Fix 3: Update enrollment status for truly completed quizzes
    console.log('Updating enrollment statuses...');
    
    // First, check which enrollments have valid completions
    const validCompletions = await client.query(`
      SELECT DISTINCT e.id
      FROM enrollments e
      JOIN quiz_attempts qa ON qa.enrollment_id = e.id
      WHERE qa.status = 'completed'
        AND qa.score IS NOT NULL
        AND qa.answers IS NOT NULL
        AND qa.answers::text != '[]'
        AND qa.answers::text NOT LIKE '%_autosave_metadata%'
        AND e.status != 'completed'
    `);
    
    if (validCompletions.rows.length > 0) {
      const enrollmentIds = validCompletions.rows.map(r => r.id);
      await client.query(`
        UPDATE enrollments
        SET status = 'completed',
            completed_at = NOW()
        WHERE id::text = ANY($1::text[])
      `, [enrollmentIds]);
      console.log(`   Updated ${enrollmentIds.length} enrollment statuses to completed\n`);
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('✅ All fixes applied successfully!\n');
    
    // Show summary
    console.log('Summary of changes:');
    console.log('- False completions reverted to abandoned');
    console.log('- Duplicate attempts cleaned up');
    console.log('- Enrollment statuses synchronized');
    console.log('\nStudents can now retake quizzes that were incorrectly marked as completed.');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    console.error('Rolled back all changes.');
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the fix
fixQuizAttemptIssues();
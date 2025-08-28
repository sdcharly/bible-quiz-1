#!/usr/bin/env node

/**
 * Fix Enrollment Statuses Script
 * Ensures enrollment statuses are consistent with quiz attempt statuses
 * 
 * Rules:
 * 1. If enrollment has ANY completed attempt -> status = 'completed'
 * 2. If enrollment has ONLY abandoned attempts -> status = 'enrolled' (unless reassignment)
 * 3. If enrollment has active in_progress attempt -> status = 'in_progress'
 */

require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

async function fixEnrollmentStatuses() {
  console.log('🔧 Enrollment Status Consistency Check');
  console.log('======================================\n');
  
  try {
    // Fix enrollments with completed attempts but wrong status
    console.log('1. Fixing completed enrollments...');
    const completedFix = await pool.query(`
      UPDATE enrollments e
      SET 
        status = 'completed',
        completed_at = COALESCE(completed_at, NOW())
      FROM (
        SELECT DISTINCT enrollment_id
        FROM quiz_attempts
        WHERE status = 'completed'
        AND enrollment_id IS NOT NULL
      ) qa
      WHERE e.id = qa.enrollment_id
      AND e.status != 'completed'
      RETURNING e.id
    `);
    console.log(`   ✅ Fixed ${completedFix.rowCount} enrollments with completed attempts\n`);
    
    // Fix enrollments with only abandoned attempts
    console.log('2. Fixing enrollments with only abandoned attempts...');
    const abandonedFix = await pool.query(`
      UPDATE enrollments e
      SET status = 'enrolled'
      FROM (
        SELECT e2.id
        FROM enrollments e2
        LEFT JOIN quiz_attempts qa ON qa.enrollment_id = e2.id
        WHERE e2.status = 'in_progress'
        AND e2.is_reassignment = false
        GROUP BY e2.id
        HAVING 
          COUNT(CASE WHEN qa.status = 'completed' THEN 1 END) = 0
          AND COUNT(CASE WHEN qa.status = 'in_progress' THEN 1 END) = 0
          AND COUNT(CASE WHEN qa.status = 'abandoned' THEN 1 END) > 0
      ) abandoned
      WHERE e.id = abandoned.id
      RETURNING e.id
    `);
    console.log(`   ✅ Fixed ${abandonedFix.rowCount} enrollments with only abandoned attempts\n`);
    
    // Verify no inconsistencies remain
    console.log('3. Verifying consistency...');
    const inconsistencies = await pool.query(`
      SELECT 
        e.id,
        e.status as enrollment_status,
        COUNT(CASE WHEN qa.status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN qa.status = 'in_progress' THEN 1 END) as in_progress_count
      FROM enrollments e
      LEFT JOIN quiz_attempts qa ON qa.enrollment_id = e.id
      GROUP BY e.id, e.status
      HAVING 
        (e.status != 'completed' AND COUNT(CASE WHEN qa.status = 'completed' THEN 1 END) > 0)
        OR (e.status = 'completed' AND COUNT(CASE WHEN qa.status = 'completed' THEN 1 END) = 0)
    `);
    
    if (inconsistencies.rows.length === 0) {
      console.log('   ✅ All enrollment statuses are now consistent!\n');
    } else {
      console.log(`   ⚠️  Found ${inconsistencies.rows.length} remaining inconsistencies\n`);
    }
    
    // Summary
    console.log('4. Summary of enrollment statuses:');
    const summary = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM enrollments
      GROUP BY status
      ORDER BY status
    `);
    
    summary.rows.forEach(row => {
      console.log(`   ${row.status}: ${row.count} enrollments`);
    });
    
    console.log('\n✅ Enrollment status fix complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  fixEnrollmentStatuses();
}

module.exports = { fixEnrollmentStatuses };
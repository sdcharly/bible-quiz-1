require('dotenv').config();
const { Pool } = require('pg');

const DATABASE_URL = process.env.POSTGRES_URL;
const pool = new Pool({ connectionString: DATABASE_URL });

async function checkAvailableQuizzes() {
  try {
    // First, get the user ID for sunil@kolinfotech.com
    const userResult = await pool.query(
      'SELECT id, name, email FROM "user" WHERE email = $1',
      ['sunil@kolinfotech.com']
    );
    
    if (userResult.rows.length === 0) {
      console.log('User not found');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('\n=== CHECKING AVAILABLE QUIZZES FOR ===');
    console.log('User:', user.name, '(' + user.email + ')');
    
    // Get all enrollments with quiz details
    const enrollmentsResult = await pool.query(`
      SELECT 
        e.id as enrollment_id,
        e.quiz_id,
        q.title as quiz_title,
        q.status as quiz_status,
        e.is_reassignment,
        e.reassignment_reason,
        q.start_time,
        q.scheduling_status,
        e.enrolled_at,
        e.status as enrollment_status
      FROM enrollments e
      LEFT JOIN quizzes q ON e.quiz_id = q.id
      WHERE e.student_id = $1
      ORDER BY e.enrolled_at DESC
    `, [user.id]);
    
    // Get all attempts
    const attemptsResult = await pool.query(`
      SELECT 
        quiz_id,
        status as attempt_status,
        score,
        start_time
      FROM quiz_attempts
      WHERE student_id = $1
    `, [user.id]);
    
    // Create a map of quiz_id to attempts
    const attemptsByQuizId = {};
    attemptsResult.rows.forEach(attempt => {
      if (!attemptsByQuizId[attempt.quiz_id]) {
        attemptsByQuizId[attempt.quiz_id] = [];
      }
      attemptsByQuizId[attempt.quiz_id].push(attempt);
    });
    
    console.log('\n=== ENROLLMENT ANALYSIS ===');
    console.log('Total enrollments:', enrollmentsResult.rows.length);
    
    const now = new Date();
    let availableCount = 0;
    let expiredCount = 0;
    let attemptedCount = 0;
    let archivedCount = 0;
    
    console.log('\n=== DETAILED QUIZ STATUS ===');
    enrollmentsResult.rows.forEach((enrollment, index) => {
      console.log(`\n${index + 1}. ${enrollment.quiz_title || 'Unknown Quiz'} (ID: ${enrollment.quiz_id})`);
      console.log(`   Quiz Status: ${enrollment.quiz_status}`);
      console.log(`   Is Reassignment: ${enrollment.is_reassignment ? 'Yes' : 'No'}`);
      
      // Check if archived
      const isArchived = enrollment.quiz_status === 'archived';
      if (isArchived) {
        console.log(`   → ARCHIVED (not shown in quizzes page unless reassigned)`);
        archivedCount++;
      }
      
      // Check attempts
      const attempts = attemptsByQuizId[enrollment.quiz_id] || [];
      const hasCompletedAttempt = attempts.some(a => a.attempt_status === 'completed');
      const hasAnyAttempt = attempts.length > 0;
      
      console.log(`   Attempts: ${attempts.length} (Completed: ${hasCompletedAttempt ? 'Yes' : 'No'})`);
      
      if (hasAnyAttempt) {
        attemptedCount++;
        console.log(`   → ATTEMPTED (not counted as available)`);
      }
      
      // Check if expired (only for non-reassignments)
      let isExpired = false;
      if (!enrollment.is_reassignment && enrollment.start_time) {
        const startTime = new Date(enrollment.start_time);
        const endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000); // 24 hours later
        isExpired = now > endTime;
        
        if (isExpired) {
          console.log(`   → EXPIRED (started ${enrollment.start_time})`);
          expiredCount++;
        }
      }
      
      // Determine if this quiz is "available"
      // Available means: not attempted, not expired (or is reassignment), and published
      const isAvailable = !hasAnyAttempt && 
                         (!isExpired || enrollment.is_reassignment) && 
                         enrollment.quiz_status === 'published';
      
      if (isAvailable) {
        availableCount++;
        console.log(`   → AVAILABLE TO TAKE`);
      } else {
        console.log(`   → NOT AVAILABLE`);
        if (!hasAnyAttempt) {
          console.log(`      Reason: ${isArchived ? 'Archived' : isExpired ? 'Expired' : 'Unknown'}`);
        }
      }
    });
    
    console.log('\n=== SUMMARY ===');
    console.log('Total Enrollments:', enrollmentsResult.rows.length);
    console.log('Attempted (any status):', attemptedCount);
    console.log('Expired (non-reassigned):', expiredCount);
    console.log('Archived:', archivedCount);
    console.log('AVAILABLE TO TAKE:', availableCount);
    
    // Show what the dashboard logic would calculate
    const publishedEnrollments = enrollmentsResult.rows.filter(e => e.quiz_status === 'published');
    console.log('\n=== DASHBOARD LOGIC ===');
    console.log('Published quizzes enrolled:', publishedEnrollments.length);
    
    // Simulate the dashboard filter
    const dashboardAvailable = publishedEnrollments.filter(enrollment => {
      const attempts = attemptsByQuizId[enrollment.quiz_id] || [];
      const hasAnyAttempt = attempts.length > 0;
      
      // Check if expired
      let isExpired = false;
      if (!enrollment.is_reassignment && enrollment.start_time) {
        const startTime = new Date(enrollment.start_time);
        const endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000);
        isExpired = now > endTime;
      }
      
      // Available = not expired (or reassignment) AND not attempted
      return (!isExpired || enrollment.is_reassignment) && !hasAnyAttempt;
    });
    
    console.log('Dashboard would show as available:', dashboardAvailable.length);
    if (dashboardAvailable.length > 0) {
      console.log('Available quizzes:');
      dashboardAvailable.forEach(e => {
        console.log(`  - ${e.quiz_title} (${e.is_reassignment ? 'Reassigned' : 'Regular'})`);
      });
    }
    
  } catch (error) {
    console.error('Error checking available quizzes:', error);
  } finally {
    await pool.end();
  }
}

checkAvailableQuizzes();
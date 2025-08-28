require('dotenv').config();
const { Pool } = require('pg');

const DATABASE_URL = process.env.POSTGRES_URL;
const pool = new Pool({ connectionString: DATABASE_URL });

async function checkUserQuizzes() {
  try {
    // First, get the user ID for sunil@kolinfotech.com
    const userResult = await pool.query(
      'SELECT id, name, email, role FROM "user" WHERE email = $1',
      ['sunil@kolinfotech.com']
    );
    
    if (userResult.rows.length === 0) {
      console.log('User not found');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('\n=== USER INFO ===');
    console.log('User:', user.name, '(' + user.email + ')');
    console.log('User ID:', user.id);
    console.log('Role:', user.role);
    
    // Check completed quiz attempts
    const attemptsResult = await pool.query(`
      SELECT 
        qa.id as attempt_id,
        qa.quiz_id,
        q.title as quiz_title,
        qa.status,
        qa.score,
        qa.start_time,
        qa.end_time,
        qa.total_questions
      FROM quiz_attempts qa
      LEFT JOIN quizzes q ON qa.quiz_id = q.id
      WHERE qa.student_id = $1
      ORDER BY qa.start_time DESC
    `, [user.id]);
    
    console.log('\n=== QUIZ ATTEMPTS ===');
    console.log('Total attempts found:', attemptsResult.rows.length);
    
    const completedAttempts = attemptsResult.rows.filter(a => a.status === 'completed');
    console.log('Completed attempts:', completedAttempts.length);
    console.log('In-progress/abandoned attempts:', attemptsResult.rows.length - completedAttempts.length);
    
    if (attemptsResult.rows.length > 0) {
      console.log('\nAttempt Details:');
      attemptsResult.rows.forEach((attempt, index) => {
        console.log(`${index + 1}. ${attempt.quiz_title || 'Unknown Quiz'}`);
        console.log(`   - Status: ${attempt.status}`);
        console.log(`   - Score: ${attempt.score || 'N/A'}`);
        console.log(`   - Started: ${attempt.start_time}`);
      });
    }
    
    // Check enrollments
    const enrollmentsResult = await pool.query(`
      SELECT 
        e.id,
        e.quiz_id,
        q.title as quiz_title,
        e.status as enrollment_status,
        e.is_reassignment,
        e.enrolled_at,
        q.status as quiz_status,
        q.start_time as quiz_start_time,
        q.scheduling_status
      FROM enrollments e
      LEFT JOIN quizzes q ON e.quiz_id = q.id
      WHERE e.student_id = $1
      ORDER BY e.enrolled_at DESC
    `, [user.id]);
    
    console.log('\n=== ENROLLMENTS ===');
    console.log('Total enrollments:', enrollmentsResult.rows.length);
    
    if (enrollmentsResult.rows.length > 0) {
      console.log('\nEnrollment Details:');
      enrollmentsResult.rows.forEach((enrollment, index) => {
        console.log(`${index + 1}. ${enrollment.quiz_title || 'Unknown Quiz'}`);
        console.log(`   - Quiz Status: ${enrollment.quiz_status}`);
        console.log(`   - Enrollment Status: ${enrollment.enrollment_status}`);
        console.log(`   - Reassignment: ${enrollment.is_reassignment ? 'Yes' : 'No'}`);
        console.log(`   - Enrolled: ${enrollment.enrolled_at}`);
        
        // Check if this enrollment has an attempt
        const hasAttempt = attemptsResult.rows.some(a => a.quiz_id === enrollment.quiz_id);
        console.log(`   - Has Attempt: ${hasAttempt ? 'Yes' : 'No'}`);
      });
    }
    
    // Check which quizzes are visible vs expired
    const now = new Date();
    const visibleEnrollments = enrollmentsResult.rows.filter(e => {
      if (e.is_reassignment) return true; // Reassignments always visible
      if (!e.quiz_start_time) return true; // No start time = always visible
      
      const startTime = new Date(e.quiz_start_time);
      const endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000); // 24 hours later
      
      return now < endTime; // Not expired
    });
    
    console.log('\n=== VISIBILITY ANALYSIS ===');
    console.log('Total enrollments:', enrollmentsResult.rows.length);
    console.log('Visible enrollments (not expired or reassigned):', visibleEnrollments.length);
    console.log('Completed attempts:', completedAttempts.length);
    
    // This is what the dashboard shows
    console.log('\n=== DASHBOARD VIEW (Quizzes Taken) ===');
    console.log('Shows completed attempts only:', completedAttempts.length, 'quizzes');
    
    // This is what the quizzes page shows
    console.log('\n=== QUIZZES PAGE VIEW ===');
    const quizzesPageCount = visibleEnrollments.filter(e => {
      const hasCompletedAttempt = attemptsResult.rows.some(
        a => a.quiz_id === e.quiz_id && a.status === 'completed'
      );
      return hasCompletedAttempt || !e.quiz_start_time || e.is_reassignment || 
             (e.quiz_start_time && now < new Date(new Date(e.quiz_start_time).getTime() + 24 * 60 * 60 * 1000));
    }).length;
    console.log('Shows enrolled quizzes (not expired + completed + reassigned):', quizzesPageCount, 'quizzes');
    
    // Find the discrepancy
    if (completedAttempts.length !== visibleEnrollments.length) {
      console.log('\n=== DISCREPANCY FOUND ===');
      console.log('Dashboard shows:', completedAttempts.length, 'quizzes taken');
      console.log('Quizzes page shows:', visibleEnrollments.length, 'quizzes');
      
      // Find which quizzes are causing the difference
      const completedQuizIds = completedAttempts.map(a => a.quiz_id);
      const enrolledQuizIds = enrollmentsResult.rows.map(e => e.quiz_id);
      
      const completedButNotVisible = completedQuizIds.filter(id => 
        !visibleEnrollments.some(e => e.quiz_id === id)
      );
      
      if (completedButNotVisible.length > 0) {
        console.log('\nCompleted quizzes that might be hidden:');
        completedButNotVisible.forEach(quizId => {
          const attempt = attemptsResult.rows.find(a => a.quiz_id === quizId);
          console.log(`- ${attempt.quiz_title} (completed with score ${attempt.score})`);
        });
      }
    }
    
  } catch (error) {
    console.error('Error checking user quizzes:', error);
  } finally {
    await pool.end();
  }
}

checkUserQuizzes();
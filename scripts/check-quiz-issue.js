require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

async function checkQuizIssue() {
  try {
    console.log('\n=== Checking Quiz Issue for sunil@kolinfotech.com ===\n');
    
    // Get user info
    const userResult = await pool.query(
      `SELECT id, email, role FROM "user" WHERE email = 'sunil@kolinfotech.com'`
    );
    
    if (userResult.rows.length === 0) {
      console.log('User not found!');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('User found:', user);
    
    // Find the Psalms 121 quiz
    const quizResult = await pool.query(
      `SELECT id, title, status, educator_id, start_time, scheduling_status, duration
       FROM quizzes 
       WHERE title LIKE '%Psalms 121%' 
       LIMIT 1`
    );
    
    if (quizResult.rows.length === 0) {
      console.log('\nQuiz not found!');
      return;
    }
    
    const quiz = quizResult.rows[0];
    console.log('\nQuiz found:', {
      id: quiz.id,
      title: quiz.title,
      status: quiz.status,
      startTime: quiz.start_time,
      schedulingStatus: quiz.scheduling_status,
      duration: quiz.duration
    });
    
    // Check if quiz has started
    const now = new Date();
    if (quiz.start_time) {
      const startTime = new Date(quiz.start_time);
      console.log('\nTime comparison:');
      console.log('  Current time:', now.toISOString());
      console.log('  Quiz start time:', startTime.toISOString());
      console.log('  Has quiz started?', now >= startTime);
      
      const endTime = new Date(startTime.getTime() + quiz.duration * 60 * 1000);
      console.log('  Quiz end time:', endTime.toISOString());
      console.log('  Has quiz ended?', now > endTime);
    } else {
      console.log('\nQuiz has no start time set (deferred scheduling)');
    }
    
    // Check enrollments
    const enrollmentResult = await pool.query(
      `SELECT * FROM enrollments 
       WHERE quiz_id = $1 AND student_id = $2
       ORDER BY enrolled_at DESC`,
      [quiz.id, user.id]
    );
    
    if (enrollmentResult.rows.length > 0) {
      console.log('\nEnrollments found:');
      enrollmentResult.rows.forEach((enrollment, index) => {
        console.log(`  Enrollment ${index + 1}:`, {
          id: enrollment.id,
          status: enrollment.status,
          isReassignment: enrollment.is_reassignment,
          enrolledAt: enrollment.enrolled_at,
          completedAt: enrollment.completed_at
        });
      });
    } else {
      console.log('\nNo enrollments found - User needs to enroll first');
    }
    
    // Check educator-student relationship
    const educatorRelation = await pool.query(
      `SELECT * FROM educator_students 
       WHERE student_id = $1 AND educator_id = $2`,
      [user.id, quiz.educator_id]
    );
    
    if (educatorRelation.rows.length > 0) {
      console.log('\nEducator-student relationship exists:', educatorRelation.rows[0].status);
    } else {
      console.log('\nNo educator-student relationship - Will be created on enrollment');
    }
    
    // Check quiz attempts
    const attemptResult = await pool.query(
      `SELECT id, status, start_time, end_time, enrollment_id
       FROM quiz_attempts 
       WHERE quiz_id = $1 AND student_id = $2
       ORDER BY start_time DESC`,
      [quiz.id, user.id]
    );
    
    if (attemptResult.rows.length > 0) {
      console.log('\nQuiz attempts found:');
      attemptResult.rows.forEach((attempt, index) => {
        console.log(`  Attempt ${index + 1}:`, {
          id: attempt.id,
          status: attempt.status,
          startTime: attempt.start_time,
          endTime: attempt.end_time,
          enrollmentId: attempt.enrollment_id
        });
      });
    } else {
      console.log('\nNo quiz attempts found');
    }
    
    // Check share links
    const shareLinksResult = await pool.query(
      `SELECT * FROM quiz_share_links 
       WHERE quiz_id = $1`,
      [quiz.id]
    );
    
    if (shareLinksResult.rows.length > 0) {
      console.log('\nShare links found:');
      shareLinksResult.rows.forEach(link => {
        console.log(`  Share code: ${link.share_code}, Active: ${link.is_active}, Expires: ${link.expires_at || 'Never'}`);
      });
    }
    
    console.log('\n=== Diagnosis ===');
    if (!quiz.start_time) {
      console.log('❌ Quiz has deferred scheduling but no start time set yet');
      console.log('   Solution: Educator needs to set the start time');
    } else if (now < new Date(quiz.start_time)) {
      console.log('❌ Quiz has not started yet');
      console.log('   Solution: Wait until', new Date(quiz.start_time).toLocaleString());
    } else if (now > new Date(new Date(quiz.start_time).getTime() + quiz.duration * 60 * 1000)) {
      console.log('❌ Quiz has already ended');
      console.log('   Solution: Contact educator for reassignment');
    } else if (enrollmentResult.rows.length === 0) {
      console.log('❓ User is not enrolled');
      console.log('   Solution: Will auto-enroll when clicking Start Quiz');
    } else if (attemptResult.rows.some(a => a.status === 'completed')) {
      console.log('❌ User has already completed the quiz');
      console.log('   Solution: Cannot retake unless reassigned');
    } else if (attemptResult.rows.some(a => a.status === 'in_progress')) {
      console.log('⚠️ User has an in-progress attempt');
      console.log('   Solution: Should resume the existing attempt');
    } else {
      console.log('✅ User should be able to start the quiz');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkQuizIssue();
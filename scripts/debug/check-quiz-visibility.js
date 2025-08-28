require('dotenv').config();
const { Pool } = require('pg');

async function checkQuizVisibility() {
  const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
  
  try {
    const quizId = '25243611-e016-410b-bdb0-42e808d410f9';
    
    // 1. Check quiz details
    console.log('=== QUIZ DETAILS ===');
    const quizResult = await pool.query(`
      SELECT 
        id, 
        title, 
        status, 
        start_time,
        timezone,
        duration,
        scheduling_status,
        time_configuration
      FROM quizzes 
      WHERE id = $1
    `, [quizId]);
    
    if (quizResult.rows.length > 0) {
      const quiz = quizResult.rows[0];
      console.log('Title:', quiz.title);
      console.log('Status:', quiz.status);
      console.log('Start Time:', quiz.start_time);
      console.log('Timezone:', quiz.timezone);
      console.log('Duration:', quiz.duration, 'minutes');
      console.log('Scheduling Status:', quiz.scheduling_status);
      console.log('Time Configuration:', JSON.stringify(quiz.time_configuration));
      
      // Calculate if quiz has ended
      if (quiz.start_time) {
        const now = new Date();
        const startTime = new Date(quiz.start_time);
        const endTime = new Date(startTime.getTime() + quiz.duration * 60 * 1000);
        
        console.log('\n=== TIME ANALYSIS ===');
        console.log('Now:', now.toISOString());
        console.log('Start:', startTime.toISOString());
        console.log('End:', endTime.toISOString());
        console.log('Quiz has started?', now >= startTime);
        console.log('Quiz has ended?', now > endTime);
        
        if (now > endTime) {
          console.log('\n❌ PROBLEM: Quiz has EXPIRED! This is why it\'s not showing.');
          console.log('The quiz ended', Math.floor((now - endTime) / (1000 * 60 * 60)), 'hours ago');
        }
      } else {
        console.log('\n⚠️ Quiz has no start_time set (deferred scheduling?)');
      }
    }
    
    // 2. Check enrollments for this quiz
    console.log('\n=== ENROLLMENTS ===');
    const enrollmentsResult = await pool.query(`
      SELECT 
        e.id,
        e.is_reassignment,
        e.status,
        e.enrolled_at,
        u.email
      FROM enrollments e
      JOIN "user" u ON e.student_id = u.id
      WHERE e.quiz_id = $1
        AND u.email = 'sunil@kolinfotech.com'
      ORDER BY e.enrolled_at DESC
    `, [quizId]);
    
    for (const enrollment of enrollmentsResult.rows) {
      console.log('\nEnrollment:', enrollment.id);
      console.log('Is Reassignment:', enrollment.is_reassignment);
      console.log('Status:', enrollment.status);
      console.log('Enrolled At:', enrollment.enrolled_at);
    }
    
    // 3. Check attempts
    console.log('\n=== QUIZ ATTEMPTS ===');
    const attemptsResult = await pool.query(`
      SELECT 
        qa.id,
        qa.status,
        qa.start_time,
        qa.end_time
      FROM quiz_attempts qa
      JOIN "user" u ON qa.student_id = u.id
      WHERE qa.quiz_id = $1
        AND u.email = 'sunil@kolinfotech.com'
      ORDER BY qa.start_time DESC
    `, [quizId]);
    
    console.log('Total attempts:', attemptsResult.rows.length);
    for (const attempt of attemptsResult.rows) {
      console.log('\nAttempt:', attempt.id);
      console.log('Status:', attempt.status);
      console.log('Started:', attempt.start_time);
      console.log('Ended:', attempt.end_time);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkQuizVisibility();
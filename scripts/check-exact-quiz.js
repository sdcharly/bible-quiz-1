require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

async function checkExactQuiz() {
  try {
    console.log('\n=== Checking Exact Quiz Time ===\n');
    
    // Get the Psalms 121 Quiz
    const quizResult = await pool.query(
      `SELECT id, title, status, start_time AT TIME ZONE 'UTC' as start_time_utc, 
              start_time, duration, scheduling_status
       FROM quizzes 
       WHERE title = 'Psalms 121 Quiz'
       LIMIT 1`
    );
    
    if (quizResult.rows.length === 0) {
      console.log('Quiz not found!');
      return;
    }
    
    const quiz = quizResult.rows[0];
    const nowUTC = new Date();
    
    console.log('Current UTC time:', nowUTC.toISOString());
    console.log('\nQuiz details:');
    console.log('  ID:', quiz.id);
    console.log('  Title:', quiz.title);
    console.log('  Status:', quiz.status);
    console.log('  Start time (raw):', quiz.start_time);
    console.log('  Start time (UTC):', quiz.start_time_utc);
    console.log('  Duration:', quiz.duration, 'minutes');
    
    if (quiz.start_time) {
      const startTime = new Date(quiz.start_time);
      const endTime = new Date(startTime.getTime() + quiz.duration * 60 * 1000);
      
      console.log('\nParsed times:');
      console.log('  Start:', startTime.toISOString());
      console.log('  End:', endTime.toISOString());
      console.log('  Now:', nowUTC.toISOString());
      
      const isLive = nowUTC >= startTime && nowUTC <= endTime;
      const hasEnded = nowUTC > endTime;
      const notStarted = nowUTC < startTime;
      
      console.log('\nStatus:');
      if (notStarted) {
        const minutesUntil = Math.floor((startTime - nowUTC) / 60000);
        console.log('  ⏰ Not started yet. Starts in', minutesUntil, 'minutes');
      } else if (isLive) {
        const minutesRemaining = Math.floor((endTime - nowUTC) / 60000);
        console.log('  ✅ QUIZ IS LIVE! Ends in', minutesRemaining, 'minutes');
      } else if (hasEnded) {
        console.log('  ❌ Quiz has ended');
      }
    }
    
    // Check user enrollment
    const userResult = await pool.query(
      `SELECT id FROM "user" WHERE email = 'sunil@kolinfotech.com'`
    );
    
    if (userResult.rows.length > 0) {
      const userId = userResult.rows[0].id;
      
      // Check enrollment
      const enrollmentResult = await pool.query(
        `SELECT id, status, is_reassignment FROM enrollments 
         WHERE quiz_id = $1 AND student_id = $2`,
        [quiz.id, userId]
      );
      
      console.log('\nEnrollment status:');
      if (enrollmentResult.rows.length > 0) {
        enrollmentResult.rows.forEach(e => {
          console.log('  - Status:', e.status, 'Reassignment:', e.is_reassignment || false);
        });
      } else {
        console.log('  Not enrolled');
      }
      
      // Check attempts
      const attemptResult = await pool.query(
        `SELECT id, status FROM quiz_attempts 
         WHERE quiz_id = $1 AND student_id = $2`,
        [quiz.id, userId]
      );
      
      console.log('\nAttempt status:');
      if (attemptResult.rows.length > 0) {
        attemptResult.rows.forEach(a => {
          console.log('  - Attempt:', a.id, 'Status:', a.status);
        });
      } else {
        console.log('  No attempts');
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkExactQuiz();
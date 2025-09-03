require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

async function checkLiveQuiz() {
  try {
    console.log('\n=== Checking Live Quiz Issue ===\n');
    
    const nowUTC = new Date();
    const nowIST = new Date(nowUTC.getTime() + (5.5 * 60 * 60 * 1000));
    
    console.log('Current time:');
    console.log('  UTC:', nowUTC.toISOString());
    console.log('  IST:', nowIST.toISOString().replace('Z', '+05:30'));
    
    // Find quizzes that should be live now (3rd Sept 2025, 8:46 AM IST = 3:16 AM UTC)
    const targetStartUTC = new Date('2025-09-03T03:16:00Z');
    const targetEndUTC = new Date('2025-09-03T03:31:00Z'); // 15 minutes later
    
    console.log('\nLooking for quiz with:');
    console.log('  Start time (UTC):', targetStartUTC.toISOString());
    console.log('  End time (UTC):', targetEndUTC.toISOString());
    
    // Find the quiz
    const quizResult = await pool.query(
      `SELECT id, title, status, educator_id, start_time, scheduling_status, duration
       FROM quizzes 
       WHERE start_time >= $1 AND start_time <= $2
       ORDER BY start_time DESC`,
      [new Date('2025-09-03T03:00:00Z'), new Date('2025-09-03T04:00:00Z')]
    );
    
    if (quizResult.rows.length === 0) {
      console.log('\nNo quizzes found in this time range!');
      
      // Let's check all Psalms quizzes
      const psalmsResult = await pool.query(
        `SELECT id, title, status, start_time, scheduling_status, duration
         FROM quizzes 
         WHERE title LIKE '%Psalms%'
         ORDER BY start_time DESC NULLS LAST
         LIMIT 5`
      );
      
      console.log('\nAll Psalms quizzes:');
      psalmsResult.rows.forEach(quiz => {
        console.log(`  - ${quiz.title}: status=${quiz.status}, start=${quiz.start_time}, scheduling=${quiz.scheduling_status}`);
      });
      
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
    
    // Check user and enrollment
    const userResult = await pool.query(
      `SELECT id, email, role FROM "user" WHERE email = 'sunil@kolinfotech.com'`
    );
    
    if (userResult.rows.length === 0) {
      console.log('\nUser not found!');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('\nUser:', user.email, '(id:', user.id, ')');
    
    // Check enrollments
    const enrollmentResult = await pool.query(
      `SELECT * FROM enrollments 
       WHERE quiz_id = $1 AND student_id = $2
       ORDER BY enrolled_at DESC`,
      [quiz.id, user.id]
    );
    
    console.log('\nEnrollments:', enrollmentResult.rows.length > 0 ? enrollmentResult.rows : 'None');
    
    // Check attempts
    const attemptResult = await pool.query(
      `SELECT id, status, start_time, end_time
       FROM quiz_attempts 
       WHERE quiz_id = $1 AND student_id = $2
       ORDER BY start_time DESC`,
      [quiz.id, user.id]
    );
    
    console.log('\nAttempts:', attemptResult.rows.length > 0 ? attemptResult.rows : 'None');
    
    // Check share links
    const shareLinksResult = await pool.query(
      `SELECT share_code, is_active FROM quiz_share_links 
       WHERE quiz_id = $1`,
      [quiz.id]
    );
    
    console.log('\nShare links:', shareLinksResult.rows.length > 0 ? shareLinksResult.rows : 'None');
    
    console.log('\n=== Time Analysis ===');
    if (quiz.start_time) {
      const quizStart = new Date(quiz.start_time);
      const quizEnd = new Date(quizStart.getTime() + quiz.duration * 60 * 1000);
      
      console.log('Quiz window:');
      console.log('  Start:', quizStart.toISOString());
      console.log('  End:', quizEnd.toISOString());
      console.log('  Now:', nowUTC.toISOString());
      console.log('  Is live?', nowUTC >= quizStart && nowUTC <= quizEnd);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

checkLiveQuiz();
#!/usr/bin/env node

require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

async function checkQuizNow() {
  console.log('\n=== CHECKING IF SUNIL CAN TAKE QUIZ NOW ===\n');
  
  try {
    // Current time
    const nowUTC = new Date();
    const nowIST = new Date(nowUTC.getTime() + 5.5 * 60 * 60 * 1000);
    
    console.log('Your Current Time:');
    console.log('  IST: ' + nowIST.toISOString().replace('Z', '') + ' IST');
    console.log('  UTC: ' + nowUTC.toISOString());
    
    // Get quiz
    const quizResult = await pool.query(`
      SELECT id, title, start_time, duration, status
      FROM quizzes 
      WHERE title = 'Psalms 121 Quiz'
    `);
    
    if (quizResult.rows.length === 0) {
      console.log('\n❌ Quiz not found');
      return;
    }
    
    const quiz = quizResult.rows[0];
    const quizStart = new Date(quiz.start_time);
    const quizEnd = new Date(quizStart.getTime() + quiz.duration * 60 * 1000);
    
    console.log('\nQuiz Times:');
    console.log('  Start (UTC): ' + quizStart.toISOString());
    console.log('  End (UTC): ' + quizEnd.toISOString());
    console.log('  Duration: ' + quiz.duration + ' minutes');
    
    // Convert to IST for display
    const quizStartIST = new Date(quizStart.getTime() + 5.5 * 60 * 60 * 1000);
    const quizEndIST = new Date(quizEnd.getTime() + 5.5 * 60 * 60 * 1000);
    console.log('\nIn Your Timezone (IST):');
    console.log('  Start: ' + quizStartIST.toISOString().replace('Z', '') + ' IST');
    console.log('  End: ' + quizEndIST.toISOString().replace('Z', '') + ' IST');
    
    // Check availability
    console.log('\n=== AVAILABILITY CHECK ===');
    
    if (nowUTC < quizStart) {
      const minutesUntil = Math.floor((quizStart - nowUTC) / 60000);
      console.log('\n❌ QUIZ NOT STARTED YET');
      console.log('   Starts in ' + minutesUntil + ' minutes');
      console.log('   You will see: "Quiz has not started yet"');
      await pool.end();
      return;
    }
    
    if (nowUTC > quizEnd) {
      const minutesSince = Math.floor((nowUTC - quizEnd) / 60000);
      console.log('\n❌ QUIZ HAS ENDED');
      console.log('   Ended ' + minutesSince + ' minutes ago');
      console.log('   You will see: "Quiz has ended"');
      await pool.end();
      return;
    }
    
    const minutesRemaining = Math.floor((quizEnd - nowUTC) / 60000);
    console.log('\n✅ QUIZ IS ACTIVE!');
    console.log('   Time remaining: ' + minutesRemaining + ' minutes');
    
    // Check your enrollment and attempts
    const userResult = await pool.query(
      `SELECT id FROM "user" WHERE email = 'sunil@kolinfotech.com'`
    );
    
    if (userResult.rows.length === 0) {
      console.log('\n❌ User not found');
      await pool.end();
      return;
    }
    
    const userId = userResult.rows[0].id;
    
    // Check enrollment
    const enrollmentResult = await pool.query(`
      SELECT status FROM enrollments 
      WHERE quiz_id = $1 AND student_id = $2
    `, [quiz.id, userId]);
    
    if (enrollmentResult.rows.length > 0) {
      console.log('\n✅ You are enrolled');
      console.log('   Status: ' + enrollmentResult.rows[0].status);
    } else {
      console.log('\n⚠️ Not enrolled yet (will auto-enroll)');
    }
    
    // Check attempts
    const attemptResult = await pool.query(`
      SELECT id, status, score FROM quiz_attempts 
      WHERE quiz_id = $1 AND student_id = $2
      ORDER BY start_time DESC
    `, [quiz.id, userId]);
    
    if (attemptResult.rows.length > 0) {
      console.log('\nPrevious Attempts:');
      attemptResult.rows.forEach(attempt => {
        console.log('  - Status: ' + attempt.status);
        if (attempt.status === 'completed') {
          console.log('    Score: ' + attempt.score + '%');
          console.log('\n❌ YOU HAVE ALREADY COMPLETED THIS QUIZ');
          console.log('   You will see: "Quiz already completed"');
          console.log('   You CANNOT retake it');
        } else if (attempt.status === 'in_progress') {
          console.log('\n⚠️ YOU HAVE AN IN-PROGRESS ATTEMPT');
          console.log('   You will RESUME where you left off');
        }
      });
    } else {
      console.log('\n✅ No previous attempts');
      console.log('   You can START the quiz');
    }
    
    // Final answer
    console.log('\n' + '='.repeat(50));
    console.log('FINAL ANSWER:');
    
    const hasCompleted = attemptResult.rows.some(a => a.status === 'completed');
    const hasInProgress = attemptResult.rows.some(a => a.status === 'in_progress');
    
    if (hasCompleted) {
      console.log('❌ NO - You have already completed this quiz');
    } else if (hasInProgress) {
      console.log('✅ YES - You can RESUME your in-progress attempt');
      console.log('   Time remaining: ' + minutesRemaining + ' minutes');
    } else {
      console.log('✅ YES - You can START the quiz now!');
      console.log('   Time available: ' + minutesRemaining + ' minutes');
    }
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkQuizNow();
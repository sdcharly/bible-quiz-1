require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

async function updateQuizTime() {
  try {
    console.log('\n=== Updating Quiz Time for Testing ===\n');
    
    const nowUTC = new Date();
    // Set quiz to start now and run for 30 minutes
    const newStartTime = new Date(nowUTC.getTime() - 60000); // 1 minute ago to ensure it's started
    const newDuration = 30; // 30 minutes duration
    
    console.log('Setting new quiz time:');
    console.log('  Start time (UTC):', newStartTime.toISOString());
    console.log('  Duration:', newDuration, 'minutes');
    console.log('  Will end at:', new Date(newStartTime.getTime() + newDuration * 60000).toISOString());
    
    // Update the Psalms 121 Quiz
    const result = await pool.query(
      `UPDATE quizzes 
       SET start_time = $1, duration = $2
       WHERE title = 'Psalms 121 Quiz'
       RETURNING id, title, start_time, duration`,
      [newStartTime, newDuration]
    );
    
    if (result.rows.length > 0) {
      console.log('\n✅ Quiz updated successfully!');
      console.log('Updated quiz:', result.rows[0]);
      
      // Verify the quiz is now live
      const quiz = result.rows[0];
      const endTime = new Date(new Date(quiz.start_time).getTime() + quiz.duration * 60000);
      const isLive = nowUTC >= new Date(quiz.start_time) && nowUTC <= endTime;
      
      console.log('\nVerification:');
      console.log('  Quiz is now live:', isLive);
      console.log('  Minutes remaining:', Math.floor((endTime - nowUTC) / 60000));
    } else {
      console.log('❌ Quiz not found or update failed');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

updateQuizTime();
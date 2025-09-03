require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

async function checkQuizHistory() {
  try {
    console.log('\n=== Checking Quiz History ===\n');
    
    // Get all versions of Psalms 121 quiz
    const result = await pool.query(
      `SELECT id, title, start_time, created_at, updated_at, scheduling_status, timezone
       FROM quizzes 
       WHERE title LIKE '%Psalms 121%'
       ORDER BY created_at DESC`
    );
    
    console.log('Found', result.rows.length, 'Psalms 121 quizzes:\n');
    
    result.rows.forEach((quiz, index) => {
      console.log(`Quiz ${index + 1}:`);
      console.log('  ID:', quiz.id);
      console.log('  Title:', quiz.title);
      console.log('  Start Time (UTC):', quiz.start_time);
      console.log('  Timezone:', quiz.timezone || 'Not set');
      console.log('  Created:', quiz.created_at);
      console.log('  Updated:', quiz.updated_at);
      console.log('  Scheduling:', quiz.scheduling_status);
      
      if (quiz.start_time) {
        const startUTC = new Date(quiz.start_time);
        // Convert to IST for display
        const istOffset = 5.5 * 60 * 60 * 1000;
        const startIST = new Date(startUTC.getTime() + istOffset);
        console.log('  Start Time (IST):', startIST.toISOString().replace('Z', '+05:30'));
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkQuizHistory();
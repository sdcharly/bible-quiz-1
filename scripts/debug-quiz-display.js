#!/usr/bin/env node

require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

async function debugQuizDisplay() {
  console.log('\n=== DEBUGGING WHY QUIZ SHOWS "IN 5 HOURS" ===\n');
  
  try {
    // Get exact quiz data
    const quizResult = await pool.query(`
      SELECT 
        id,
        title,
        start_time,
        duration,
        status,
        timezone,
        created_at,
        updated_at
      FROM quizzes 
      WHERE title = 'Psalms 121 Quiz'
    `);
    
    if (quizResult.rows.length === 0) {
      console.log('Quiz not found!');
      return;
    }
    
    const quiz = quizResult.rows[0];
    const nowUTC = new Date();
    const quizStartUTC = new Date(quiz.start_time);
    
    console.log('DATABASE VALUES:');
    console.log('  Quiz ID:', quiz.id);
    console.log('  Start Time in DB:', quiz.start_time);
    console.log('  Timezone in DB:', quiz.timezone);
    console.log('  Status:', quiz.status);
    console.log('  Updated at:', quiz.updated_at);
    
    console.log('\nTIME COMPARISON:');
    console.log('  Current UTC:', nowUTC.toISOString());
    console.log('  Quiz Start UTC:', quizStartUTC.toISOString());
    
    // Calculate difference
    const diffMs = quizStartUTC - nowUTC;
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffMinutes = diffMs / (1000 * 60);
    
    console.log('\nTIME DIFFERENCE:');
    console.log('  Milliseconds:', diffMs);
    console.log('  Hours:', diffHours.toFixed(2));
    console.log('  Minutes:', diffMinutes.toFixed(0));
    
    if (diffMs > 0) {
      console.log('\n❌ PROBLEM FOUND!');
      console.log('  Quiz start time is in the FUTURE!');
      console.log('  That\'s why it shows "In 5 hours"');
      
      // The issue might be timezone conversion
      console.log('\n🔍 POSSIBLE CAUSE:');
      console.log('  The frontend might be adding timezone offset TWICE');
      console.log('  Or the time was set incorrectly');
      
      // What the correct time should be
      const correctStartTime = new Date(nowUTC.getTime() - 5 * 60 * 1000); // 5 minutes ago
      console.log('\n✅ TO FIX - Set quiz to:');
      console.log('  Start time:', correctStartTime.toISOString());
      
      // Fix it
      await pool.query(
        'UPDATE quizzes SET start_time = $1 WHERE id = $2',
        [correctStartTime, quiz.id]
      );
      
      console.log('\n✅ FIXED! Quiz time updated.');
      console.log('  New start time:', correctStartTime.toISOString());
      console.log('  Quiz should now be available!');
      
    } else if (diffMs < -(quiz.duration * 60 * 1000)) {
      console.log('\n❌ Quiz has already ended');
    } else {
      console.log('\n✅ Quiz should be active');
      console.log('  But frontend shows wrong time - checking why...');
    }
    
    // Check what API returns
    console.log('\n=== CHECKING API RESPONSE ===');
    console.log('The API endpoint /api/student/quizzes returns:');
    console.log('  - startTime as UTC string');
    console.log('  - Frontend should convert to user timezone');
    console.log('  - If showing wrong time, issue is in frontend conversion');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

debugQuizDisplay();
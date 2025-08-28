require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

(async () => {
  try {
    const studentId = 'UeqiVFam4rO2P9KbbnwqofioJxZoQdvf';
    
    console.log('🔍 Checking Available Quizzes Count Issue');
    console.log('============================================\n');
    
    // Get the quizzes that the API would return
    const query = `
      SELECT 
        q.id, 
        q.title, 
        q.status as quiz_status,
        e.status as enrollment_status,
        e.is_reassignment,
        CASE 
          WHEN qa.status = 'completed' THEN true 
          ELSE false 
        END as has_completed_attempt,
        qa.score,
        q.start_time,
        q.duration,
        CASE 
          WHEN NOW() > (q.start_time + INTERVAL '1 minute' * q.duration) THEN true
          ELSE false
        END as is_expired
      FROM quizzes q 
      JOIN enrollments e ON e.quiz_id = q.id 
      LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id 
        AND qa.enrollment_id = e.id 
        AND qa.status = 'completed'
      WHERE e.student_id = $1
        AND q.status = 'published'
    `;
    
    const result = await pool.query(query, [studentId]);
    
    console.log('Published Quizzes Enrolled:', result.rows.length);
    console.log('');
    
    // Filter as the API does
    const filtered = result.rows.filter(quiz => {
      const shouldShow = !quiz.is_expired || quiz.has_completed_attempt || quiz.is_reassignment;
      return shouldShow;
    });
    
    console.log('After Filtering (shown on dashboard):', filtered.length);
    console.log('');
    
    // Now check which ones are counted as "available"
    const available = filtered.filter(quiz => !quiz.has_completed_attempt);
    
    console.log('❌ PROBLEM FOUND: Quizzes counted as "available" (not attempted):', available.length);
    console.log('');
    
    console.log('These quizzes are being counted as available:');
    available.forEach(quiz => {
      console.log(`  • "${quiz.title}"`);
      console.log(`    - Is Reassignment: ${quiz.is_reassignment}`);
      console.log(`    - Enrollment Status: ${quiz.enrollment_status}`);
      console.log(`    - Has Completed Attempt: ${quiz.has_completed_attempt}`);
      console.log('');
    });
    
    // Check for duplicate enrollments
    console.log('\n🔍 Checking for duplicate enrollments:');
    const dupCheck = await pool.query(
      `SELECT quiz_id, COUNT(*) as count FROM enrollments WHERE student_id = $1 GROUP BY quiz_id HAVING COUNT(*) > 1`,
      [studentId]
    );
    
    if (dupCheck.rows.length > 0) {
      console.log('⚠️  Found quizzes with multiple enrollments:');
      for (const dup of dupCheck.rows) {
        const quizInfo = await pool.query(
          'SELECT title FROM quizzes WHERE id = $1',
          [dup.quiz_id]
        );
        console.log(`  • "${quizInfo.rows[0].title}" - ${dup.count} enrollments`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
})();
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

async function checkDashboardCount() {
  try {
    const studentId = 'UeqiVFam4rO2P9KbbnwqofioJxZoQdvf';
    
    console.log('🎯 Simulating Dashboard Available Quiz Count');
    console.log('============================================\n');
    
    // Get all published quizzes with enrollments
    const query = `
      SELECT DISTINCT ON (q.id, e.id)
        q.id,
        q.title,
        q.start_time,
        q.duration,
        q.status as quiz_status,
        e.id as enrollment_id,
        e.status as enrollment_status,
        e.is_reassignment,
        EXISTS(
          SELECT 1 FROM quiz_attempts qa 
          WHERE qa.enrollment_id = e.id 
          AND qa.status = 'completed'
        ) as has_completed_attempt
      FROM quizzes q
      JOIN enrollments e ON e.quiz_id = q.id
      WHERE e.student_id = $1
        AND q.status = 'published'
      ORDER BY q.id, e.id, e.is_reassignment DESC
    `;
    
    const result = await pool.query(query, [studentId]);
    
    console.log('Total Published Quizzes with Enrollments:', result.rows.length);
    console.log('');
    
    // Simulate API filtering
    const now = new Date();
    const activeQuizzes = [];
    
    result.rows.forEach(quiz => {
      const startTime = new Date(quiz.start_time);
      const endTime = new Date(startTime.getTime() + (quiz.duration || 30) * 60 * 1000);
      const isExpired = now > endTime;
      
      // Apply API filter logic
      const shouldInclude = !isExpired || quiz.has_completed_attempt || quiz.is_reassignment;
      
      if (shouldInclude) {
        activeQuizzes.push({
          title: quiz.title,
          isExpired,
          isReassignment: quiz.is_reassignment,
          attempted: quiz.has_completed_attempt,
          enrollmentStatus: quiz.enrollment_status
        });
      }
    });
    
    console.log('Active Quizzes (shown on dashboard):', activeQuizzes.length);
    console.log('');
    
    // Calculate available (not attempted)
    const available = activeQuizzes.filter(q => !q.attempted);
    
    console.log('🔢 AVAILABLE QUIZZES COUNT:', available.length);
    console.log('');
    console.log('Available quizzes details:');
    available.forEach((q, i) => {
      console.log(`${i + 1}. "${q.title}"`);
      console.log(`   - Reassignment: ${q.isReassignment}`);
      console.log(`   - Expired: ${q.isExpired}`);
      console.log(`   - Enrollment: ${q.enrollmentStatus}`);
      console.log('');
    });
    
    // Also check for upcoming quizzes
    const upcoming = activeQuizzes.filter(q => {
      if (q.attempted) return false;
      const quiz = result.rows.find(r => r.title === q.title);
      const startTime = new Date(quiz.start_time);
      return now < startTime && !q.isReassignment;
    });
    
    console.log('Upcoming quizzes:', upcoming.length);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDashboardCount();
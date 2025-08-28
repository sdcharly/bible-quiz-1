require('dotenv').config();
const { Pool } = require('pg');

async function checkMultipleEnrollments() {
  const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
  
  try {
    // Check for the specific quiz that's having issues
    const quizId = '25243611-e016-410b-bdb0-42e808d410f9';
    
    // Get ALL enrollments for this quiz and student
    const result = await pool.query(`
      SELECT 
        e.*,
        u.email,
        u.name
      FROM enrollments e
      JOIN "user" u ON e.student_id = u.id
      WHERE e.quiz_id = $1
        AND u.email = 'sunil@kolinfotech.com'
      ORDER BY e.enrolled_at DESC
    `, [quizId]);
    
    console.log('=== ALL ENROLLMENTS FOR THIS QUIZ ===');
    console.log('Total enrollments:', result.rows.length);
    
    for (const enrollment of result.rows) {
      console.log('\n---');
      console.log('Enrollment ID:', enrollment.id);
      console.log('Is Reassignment:', enrollment.is_reassignment);
      console.log('Parent Enrollment:', enrollment.parent_enrollment_id);
      console.log('Status:', enrollment.status);
      console.log('Enrolled At:', enrollment.enrolled_at);
      console.log('Started At:', enrollment.started_at);
      console.log('Completed At:', enrollment.completed_at);
    }
    
    // Check how the enrollmentMap would handle multiple enrollments
    console.log('\n=== ENROLLMENT MAP ISSUE ===');
    console.log('The enrollmentMap uses .map(e => [e.quizId, e])');
    console.log('This means if there are multiple enrollments for the same quiz,');
    console.log('only the LAST one in the array will be kept in the Map!');
    console.log('Current enrollments order (what Map would see):');
    
    for (let i = result.rows.length - 1; i >= 0; i--) {
      const enrollment = result.rows[i];
      console.log(`  ${i+1}. ${enrollment.is_reassignment ? 'REASSIGNMENT' : 'ORIGINAL'} - Status: ${enrollment.status}`);
    }
    
    console.log('\nThe Map would keep enrollment:', result.rows[result.rows.length - 1]?.id);
    console.log('Is this the reassignment?', result.rows[result.rows.length - 1]?.is_reassignment);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkMultipleEnrollments();
require('dotenv').config();
const { Pool } = require('pg');

async function checkReassignment() {
  const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
  
  try {
    // Check enrollments for Sunil on the reassigned quiz
    const enrollmentResult = await pool.query(`
      SELECT e.*, u.email, u.name 
      FROM enrollments e
      JOIN "user" u ON e.student_id = u.id
      WHERE u.email = 'sunil@kolinfotech.com'
        AND e.quiz_id = '25243611-e016-410b-bdb0-42e808d410f9'
      ORDER BY e.enrolled_at DESC
    `);
    
    console.log('=== ENROLLMENTS FOR REASSIGNED QUIZ ===');
    console.log('Total enrollments:', enrollmentResult.rows.length);
    
    for (const enrollment of enrollmentResult.rows) {
      console.log('\nEnrollment:', {
        id: enrollment.id,
        status: enrollment.status,
        isReassignment: enrollment.is_reassignment,
        parentEnrollmentId: enrollment.parent_enrollment_id,
        enrolledAt: enrollment.enrolled_at,
        completedAt: enrollment.completed_at
      });
    }
    
    // Check the quiz details
    const quizResult = await pool.query(`
      SELECT q.*, e.name as educator_name, e.email as educator_email
      FROM quizzes q
      JOIN "user" e ON q.educator_id = e.id
      WHERE q.id = '25243611-e016-410b-bdb0-42e808d410f9'
    `);
    
    console.log('\n=== QUIZ DETAILS ===');
    if (quizResult.rows.length > 0) {
      const quiz = quizResult.rows[0];
      console.log('Title:', quiz.title);
      console.log('Status:', quiz.status);
      console.log('Educator:', quiz.educator_name, `(${quiz.educator_email})`);
      console.log('Educator ID:', quiz.educator_id);
    }
    
    // Check educator-student relationship
    const relationResult = await pool.query(`
      SELECT es.*, u.email 
      FROM educator_students es
      JOIN "user" u ON es.student_id = u.id
      WHERE u.email = 'sunil@kolinfotech.com'
    `);
    
    console.log('\n=== EDUCATOR-STUDENT RELATIONSHIPS ===');
    console.log('Total relationships:', relationResult.rows.length);
    for (const rel of relationResult.rows) {
      console.log('Educator ID:', rel.educator_id, 'Status:', rel.status);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkReassignment();
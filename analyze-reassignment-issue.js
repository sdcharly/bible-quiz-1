require('dotenv').config();
const { Pool } = require('pg');

async function analyzeReassignmentIssue() {
  const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
  
  try {
    // 1. Check ALL enrollments for this student
    console.log('=== ALL ENROLLMENTS FOR sunil@kolinfotech.com ===');
    const allEnrollments = await pool.query(`
      SELECT 
        e.*,
        q.title as quiz_title,
        q.status as quiz_status,
        u_educator.email as educator_email
      FROM enrollments e
      JOIN quizzes q ON e.quiz_id = q.id
      JOIN "user" u_student ON e.student_id = u_student.id
      JOIN "user" u_educator ON q.educator_id = u_educator.id
      WHERE u_student.email = 'sunil@kolinfotech.com'
      ORDER BY e.enrolled_at DESC
    `);
    
    for (const enrollment of allEnrollments.rows) {
      console.log('\n---');
      console.log('Quiz:', enrollment.quiz_title);
      console.log('Educator:', enrollment.educator_email);
      console.log('Enrollment ID:', enrollment.id);
      console.log('Is Reassignment:', enrollment.is_reassignment);
      console.log('Parent Enrollment ID:', enrollment.parent_enrollment_id);
      console.log('Status:', enrollment.status);
      console.log('Enrolled At:', enrollment.enrolled_at);
    }
    
    // 2. Check if parent enrollment exists
    console.log('\n=== CHECKING PARENT ENROLLMENT ===');
    const parentId = 'ab0409ba-62a3-43ad-8408-9003cb9fb309'; // From previous check
    const parentCheck = await pool.query(
      'SELECT * FROM enrollments WHERE id = $1',
      [parentId]
    );
    
    if (parentCheck.rows.length > 0) {
      console.log('Parent enrollment exists:', parentCheck.rows[0].id);
      console.log('Parent is reassignment?:', parentCheck.rows[0].is_reassignment);
      console.log('Parent status:', parentCheck.rows[0].status);
    } else {
      console.log('PROBLEM: Parent enrollment does not exist!');
    }
    
    // 3. Check who reassigned this quiz
    console.log('\n=== REASSIGNMENT DETAILS ===');
    const reassignmentDetails = await pool.query(`
      SELECT 
        e.reassigned_by,
        e.reassigned_at,
        e.reassignment_reason,
        u.email as reassigner_email,
        u.name as reassigner_name
      FROM enrollments e
      LEFT JOIN "user" u ON e.reassigned_by = u.id
      WHERE e.id = '3d1d697f-90fc-4009-8ed8-d11b1901d144'
    `);
    
    if (reassignmentDetails.rows.length > 0) {
      const details = reassignmentDetails.rows[0];
      console.log('Reassigned by:', details.reassigner_email || 'NULL');
      console.log('Reassigned at:', details.reassigned_at || 'NULL');
      console.log('Reason:', details.reassignment_reason || 'NULL');
    }
    
    // 4. Check if the reassigned quiz is included in the dashboard query
    console.log('\n=== CHECKING DASHBOARD QUERY LOGIC ===');
    
    // Get quizzes this student should see based on educators
    const dashboardQuizzes = await pool.query(`
      SELECT DISTINCT
        q.id,
        q.title,
        q.educator_id,
        e.is_reassignment,
        e.status as enrollment_status
      FROM quizzes q
      INNER JOIN enrollments e ON q.id = e.quiz_id
      WHERE e.student_id = (SELECT id FROM "user" WHERE email = 'sunil@kolinfotech.com')
        AND q.status = 'published'
      ORDER BY q.title
    `);
    
    console.log('Total quizzes student is enrolled in:', dashboardQuizzes.rows.length);
    for (const quiz of dashboardQuizzes.rows) {
      console.log(`- ${quiz.title} (reassignment: ${quiz.is_reassignment}, status: ${quiz.enrollment_status})`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

analyzeReassignmentIssue();
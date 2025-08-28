require('dotenv').config();
const { Pool } = require('pg');

const DATABASE_URL = process.env.POSTGRES_URL;
const pool = new Pool({ connectionString: DATABASE_URL });

async function checkAmosQuiz() {
  try {
    console.log('\n=== INVESTIGATING AMOS QUIZ BLANK PAGE ISSUE ===');
    console.log('Short URL provided: https://biblequiz.textr.in/s/KZG7xe');
    
    // First, find the Amos quiz
    const amosQuizResult = await pool.query(`
      SELECT 
        id,
        title,
        status,
        short_url,
        educator_id,
        start_time,
        scheduling_status,
        time_configuration,
        created_at,
        updated_at
      FROM quizzes 
      WHERE title = 'Amos'
      ORDER BY created_at DESC
      LIMIT 1
    `);
    
    if (amosQuizResult.rows.length === 0) {
      console.log('ERROR: Amos quiz not found!');
      return;
    }
    
    const quiz = amosQuizResult.rows[0];
    console.log('\n=== AMOS QUIZ DETAILS ===');
    console.log('Quiz ID:', quiz.id);
    console.log('Title:', quiz.title);
    console.log('Status:', quiz.status);
    console.log('Short URL:', quiz.short_url);
    console.log('Educator ID:', quiz.educator_id);
    console.log('Start Time:', quiz.start_time);
    console.log('Scheduling Status:', quiz.scheduling_status);
    
    // Check if short URL matches
    if (quiz.short_url !== 'KZG7xe') {
      console.log('\n⚠️  WARNING: Short URL mismatch!');
      console.log('Expected:', 'KZG7xe');
      console.log('Actual:', quiz.short_url);
    }
    
    // Check enrollment for sunil@kolinfotech.com
    const userResult = await pool.query(
      'SELECT id FROM "user" WHERE email = $1',
      ['sunil@kolinfotech.com']
    );
    
    if (userResult.rows.length > 0) {
      const userId = userResult.rows[0].id;
      
      const enrollmentResult = await pool.query(`
        SELECT 
          id,
          status,
          is_reassignment,
          reassignment_reason,
          enrolled_at
        FROM enrollments
        WHERE quiz_id = $1 AND student_id = $2
        ORDER BY enrolled_at DESC
      `, [quiz.id, userId]);
      
      console.log('\n=== ENROLLMENT STATUS ===');
      console.log('Total enrollments:', enrollmentResult.rows.length);
      if (enrollmentResult.rows.length > 0) {
        const enrollment = enrollmentResult.rows[0];
        console.log('Latest enrollment:');
        console.log('  - Status:', enrollment.status);
        console.log('  - Is Reassignment:', enrollment.is_reassignment);
        console.log('  - Reassignment Reason:', enrollment.reassignment_reason);
        console.log('  - Enrolled At:', enrollment.enrolled_at);
      }
      
      // Check attempts
      const attemptResult = await pool.query(`
        SELECT 
          id,
          status,
          start_time,
          end_time
        FROM quiz_attempts
        WHERE quiz_id = $1 AND student_id = $2
        ORDER BY start_time DESC
      `, [quiz.id, userId]);
      
      console.log('\n=== ATTEMPT STATUS ===');
      console.log('Total attempts:', attemptResult.rows.length);
      if (attemptResult.rows.length > 0) {
        console.log('Latest attempt:', attemptResult.rows[0].status);
      }
    }
    
    // Check if there are any other quizzes with the same short URL
    const duplicateResult = await pool.query(`
      SELECT id, title, status, share_code, short_url
      FROM quizzes
      WHERE short_url = $1
    `, ['KZG7xe']);
    
    console.log('\n=== SHORT URL CHECK ===');
    console.log('Quizzes with short URL "KZG7xe":', duplicateResult.rows.length);
    if (duplicateResult.rows.length > 1) {
      console.log('⚠️  WARNING: Multiple quizzes with same short URL!');
      duplicateResult.rows.forEach(q => {
        console.log(`  - ${q.title} (${q.id})`);
      });
    } else if (duplicateResult.rows.length === 0) {
      console.log('⚠️  ERROR: No quiz found with short URL "KZG7xe"!');
    }
    
    // Check URL structure
    console.log('\n=== URL ANALYSIS ===');
    if (quiz.short_url) {
      console.log('Short URL:', quiz.short_url);
      console.log('Short URL link:', `https://biblequiz.textr.in/s/${quiz.short_url}`);
    } else {
      console.log('No short URL set for this quiz');
    }
    
    console.log('\n=== POTENTIAL ISSUES ===');
    let issueCount = 0;
    if (!quiz.short_url) {
      console.log('ERROR: No short URL - short link will not work');
      issueCount++;
    }
    if (quiz.status !== 'published') {
      console.log('ERROR: Quiz status is not "published" - might cause access issues');
      issueCount++;
    }
    if (quiz.short_url && quiz.short_url !== 'KZG7xe') {
      console.log('ERROR: Short URL mismatch - link points to wrong quiz or quiz not found');
      console.log('  Expected: KZG7xe');
      console.log('  Actual:', quiz.short_url);
      issueCount++;
    }
    if (issueCount === 0) {
      console.log('No obvious issues found with quiz configuration');
    }
    
  } catch (error) {
    console.error('Error checking Amos quiz:', error);
  } finally {
    await pool.end();
  }
}

checkAmosQuiz();
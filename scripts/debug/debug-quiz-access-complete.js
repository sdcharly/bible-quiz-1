#!/usr/bin/env node

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

async function debugQuizAccess() {
  console.log('\n========================================');
  console.log('COMPLETE QUIZ ACCESS DEBUGGING');
  console.log('========================================\n');

  try {
    // 1. Get a test student
    const studentQuery = await pool.query(`
      SELECT id, email, name 
      FROM "user" 
      WHERE role = 'student' 
      LIMIT 1
    `);
    
    if (studentQuery.rows.length === 0) {
      console.log('❌ No students found in database');
      return;
    }
    
    const student = studentQuery.rows[0];
    console.log('📚 Test Student:', {
      id: student.id,
      email: student.email,
      name: student.name
    });
    console.log('\n----------------------------------------\n');

    // 2. Check all quizzes in the system
    const allQuizzesQuery = await pool.query(`
      SELECT 
        q.id,
        q.title,
        q.status,
        q.start_time,
        q.educator_id,
        q.configuration,
        u.name as educator_name
      FROM quizzes q
      LEFT JOIN "user" u ON u.id = q.educator_id
      WHERE q.status = 'published'
      ORDER BY q.created_at DESC
      LIMIT 5
    `);
    
    console.log(`📝 Published Quizzes (${allQuizzesQuery.rows.length} shown):`);
    allQuizzesQuery.rows.forEach(quiz => {
      const config = quiz.configuration || {};
      console.log(`\n  Quiz: "${quiz.title}"`);
      console.log(`  - ID: ${quiz.id}`);
      console.log(`  - Status: ${quiz.status}`);
      console.log(`  - Share Code: ${config.shareCode || 'NULL'}`);
      console.log(`  - Short URL: ${config.shortUrl || 'NULL'}`);
      console.log(`  - Educator: ${quiz.educator_name}`);
      console.log(`  - Start: ${quiz.start_time}`);
      console.log(`  - URLs:`);
      if (config.shareCode) {
        console.log(`    Share: http://localhost:3000/quiz/share/${config.shareCode}`);
      }
      if (config.shortUrl) {
        console.log(`    Short: http://localhost:3000/s/${config.shortUrl}`);
      }
    });
    console.log('\n----------------------------------------\n');

    // 3. Check enrollments for the student
    const enrollmentsQuery = await pool.query(`
      SELECT 
        e.id,
        e.student_id,
        e.quiz_id,
        e.enrollment_type,
        e.enrolled_at,
        e.status,
        e.expires_at,
        q.title as quiz_title,
        q.share_code,
        q.short_url,
        q.is_published
      FROM enrollments e
      LEFT JOIN quizzes q ON q.id = e.quiz_id
      WHERE e.student_id = $1
      ORDER BY e.enrolled_at DESC
    `, [student.id]);
    
    console.log(`📚 Student Enrollments (${enrollmentsQuery.rows.length} total):`);
    enrollmentsQuery.rows.forEach(enrollment => {
      console.log(`\n  Quiz: "${enrollment.quiz_title}"`);
      console.log(`  - Enrollment ID: ${enrollment.id}`);
      console.log(`  - Quiz ID: ${enrollment.quiz_id}`);
      console.log(`  - Type: ${enrollment.enrollment_type}`);
      console.log(`  - Status: ${enrollment.status || 'active'}`);
      console.log(`  - Expires: ${enrollment.expires_at || 'Never'}`);
      console.log(`  - Published: ${enrollment.is_published}`);
      console.log(`  - Share Code: ${enrollment.share_code || 'NULL'}`);
      console.log(`  - Short URL: ${enrollment.short_url || 'NULL'}`);
    });
    console.log('\n----------------------------------------\n');

    // 4. Check quiz attempts
    const attemptsQuery = await pool.query(`
      SELECT 
        qa.id,
        qa.quiz_id,
        qa.student_id,
        qa.status,
        qa.started_at,
        qa.submitted_at,
        qa.score,
        q.title as quiz_title,
        q.share_code
      FROM quiz_attempts qa
      LEFT JOIN quizzes q ON q.id = qa.quiz_id
      WHERE qa.student_id = $1
      ORDER BY qa.started_at DESC
      LIMIT 10
    `, [student.id]);
    
    console.log(`📝 Quiz Attempts (${attemptsQuery.rows.length} shown):`);
    attemptsQuery.rows.forEach(attempt => {
      console.log(`\n  Quiz: "${attempt.quiz_title}"`);
      console.log(`  - Attempt ID: ${attempt.id}`);
      console.log(`  - Status: ${attempt.status}`);
      console.log(`  - Started: ${attempt.started_at}`);
      console.log(`  - Score: ${attempt.score || 'N/A'}`);
      console.log(`  - Share Code: ${attempt.share_code || 'NULL'}`);
    });
    console.log('\n----------------------------------------\n');

    // 5. Test API endpoints
    console.log('🔍 Testing API Endpoints (simulation):\n');
    
    // Pick first quiz with share code
    const testQuiz = allQuizzesQuery.rows.find(q => q.share_code) || allQuizzesQuery.rows[0];
    if (testQuiz && testQuiz.share_code) {
      console.log(`Test Quiz: "${testQuiz.title}"`);
      console.log(`Share Code: ${testQuiz.share_code}`);
      console.log('\nExpected API calls:');
      console.log(`1. GET /api/quiz/share/${testQuiz.share_code}`);
      console.log(`   Should return: { quiz: {...}, canAccess: true/false }`);
      console.log(`\n2. GET /api/student/quizzes?shareCode=${testQuiz.share_code}`);
      console.log(`   Should return: quiz data with questions`);
      
      // Check what the database would return
      const dbCheckQuery = await pool.query(`
        SELECT 
          q.*,
          e.id as enrollment_id,
          e.enrollment_type,
          e.status as enrollment_status
        FROM quizzes q
        LEFT JOIN enrollments e ON e.quiz_id = q.id AND e.student_id = $1
        WHERE q.configuration->>'shareCode' = $2
      `, [student.id, shareCode]);
      
      if (dbCheckQuery.rows.length > 0) {
        const result = dbCheckQuery.rows[0];
        console.log('\n✅ Database would return quiz');
        console.log(`   - Has enrollment: ${result.enrollment_id ? 'YES' : 'NO'}`);
        console.log(`   - Enrollment type: ${result.enrollment_type || 'N/A'}`);
        console.log(`   - Can access: ${result.status === 'published' ? 'YES' : 'NO'}`);
      } else {
        console.log('\n❌ Database returns no quiz for this share code!');
      }
    }

    // 6. Check for common issues
    console.log('\n========================================');
    console.log('COMMON ISSUES CHECK:');
    console.log('========================================\n');

    // Check for NULL share codes
    const nullShareCodesQuery = await pool.query(`
      SELECT COUNT(*) as count
      FROM quizzes
      WHERE status = 'published' AND (configuration->>'shareCode') IS NULL
    `);
    console.log(`⚠️  Published quizzes with NULL share_code: ${nullShareCodesQuery.rows[0].count}`);

    // Check for duplicate share codes
    const duplicateShareCodesQuery = await pool.query(`
      SELECT configuration->>'shareCode' as share_code, COUNT(*) as count
      FROM quizzes
      WHERE (configuration->>'shareCode') IS NOT NULL
      GROUP BY configuration->>'shareCode'
      HAVING COUNT(*) > 1
    `);
    if (duplicateShareCodesQuery.rows.length > 0) {
      console.log(`⚠️  Duplicate share codes found: ${duplicateShareCodesQuery.rows.length}`);
    } else {
      console.log(`✅ No duplicate share codes`);
    }

    // Check for expired enrollments
    const expiredEnrollmentsQuery = await pool.query(`
      SELECT COUNT(*) as count
      FROM enrollments
      WHERE expires_at IS NOT NULL AND expires_at < NOW()
    `);
    console.log(`⚠️  Expired enrollments: ${expiredEnrollmentsQuery.rows[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

debugQuizAccess();
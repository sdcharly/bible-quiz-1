#!/usr/bin/env node

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

async function debugQuizzes() {
  console.log('\n========================================');
  console.log('QUIZ DATABASE INVESTIGATION');
  console.log('========================================\n');

  try {
    // 1. Check all published quizzes
    const quizzesQuery = await pool.query(`
      SELECT 
        id,
        title,
        status,
        configuration,
        start_time,
        educator_id
      FROM quizzes
      WHERE status = 'published'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log(`📝 Found ${quizzesQuery.rows.length} published quizzes:\n`);
    
    quizzesQuery.rows.forEach((quiz, idx) => {
      console.log(`${idx + 1}. "${quiz.title}"`);
      console.log(`   ID: ${quiz.id}`);
      console.log(`   Start: ${quiz.start_time}`);
      
      const config = quiz.configuration || {};
      console.log(`   Configuration:`);
      console.log(`   - shareCode: ${config.shareCode || 'NOT SET'}`);
      console.log(`   - shortUrl: ${config.shortUrl || 'NOT SET'}`);
      
      if (config.shareCode) {
        console.log(`   📎 Share URL: http://localhost:3000/quiz/share/${config.shareCode}`);
      }
      if (config.shortUrl) {
        console.log(`   🔗 Short URL: http://localhost:3000/s/${config.shortUrl}`);
      }
      console.log('');
    });
    
    // 2. Check enrollments
    console.log('----------------------------------------');
    console.log('📚 CHECKING ENROLLMENTS:\n');
    
    const enrollmentsQuery = await pool.query(`
      SELECT 
        e.id,
        e.quiz_id,
        e.student_id,
        e.status,
        e.is_reassignment,
        q.title as quiz_title,
        u.email as student_email
      FROM enrollments e
      LEFT JOIN quizzes q ON q.id = e.quiz_id
      LEFT JOIN "user" u ON u.id = e.student_id
      WHERE q.status = 'published'
      ORDER BY e.enrolled_at DESC
      LIMIT 10
    `);
    
    console.log(`Found ${enrollmentsQuery.rows.length} enrollments for published quizzes:\n`);
    
    enrollmentsQuery.rows.forEach(enrollment => {
      console.log(`• "${enrollment.quiz_title}"`);
      console.log(`  Student: ${enrollment.student_email}`);
      console.log(`  Status: ${enrollment.status || 'active'}`);
      console.log(`  Is Reassignment: ${enrollment.is_reassignment || false}`);
      console.log('');
    });
    
    // 3. Check if we have any quiz with shareCode
    console.log('----------------------------------------');
    console.log('🔍 CHECKING SHARE CODES:\n');
    
    const shareCodeQuery = await pool.query(`
      SELECT 
        id,
        title,
        configuration->>'shareCode' as share_code,
        configuration->>'shortUrl' as short_url
      FROM quizzes
      WHERE status = 'published' 
        AND configuration->>'shareCode' IS NOT NULL
      LIMIT 5
    `);
    
    if (shareCodeQuery.rows.length === 0) {
      console.log('❌ NO PUBLISHED QUIZZES HAVE SHARE CODES!');
      console.log('   This is why URLs are not working!\n');
      
      // Check if any quiz has configuration at all
      const configCheckQuery = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(configuration) as with_config,
          COUNT(CASE WHEN configuration IS NOT NULL AND configuration::text != '{}' THEN 1 END) as with_data
        FROM quizzes
        WHERE status = 'published'
      `);
      
      const stats = configCheckQuery.rows[0];
      console.log('📊 Configuration Statistics:');
      console.log(`   Total published quizzes: ${stats.total}`);
      console.log(`   With configuration object: ${stats.with_config}`);
      console.log(`   With actual config data: ${stats.with_data}`);
      
    } else {
      console.log('✅ Found quizzes with share codes:\n');
      shareCodeQuery.rows.forEach(quiz => {
        console.log(`• "${quiz.title}"`);
        console.log(`  Share Code: ${quiz.share_code}`);
        console.log(`  Short URL: ${quiz.short_url || 'none'}`);
        console.log('');
      });
    }
    
    // 4. Test a specific quiz
    const testQuizId = '1c520266-6948-4eee-ac35-abdd6005b8e1'; // The test of time: Amos
    console.log('----------------------------------------');
    console.log(`🔬 DETAILED CHECK FOR QUIZ ID: ${testQuizId}\n`);
    
    const detailQuery = await pool.query(`
      SELECT 
        id,
        title,
        status,
        configuration,
        start_time,
        educator_id
      FROM quizzes
      WHERE id = $1
    `, [testQuizId]);
    
    if (detailQuery.rows.length > 0) {
      const quiz = detailQuery.rows[0];
      console.log(`Title: "${quiz.title}"`);
      console.log(`Status: ${quiz.status}`);
      console.log(`Configuration: ${JSON.stringify(quiz.configuration, null, 2)}`);
      
      // Check enrollments for this quiz
      const quizEnrollments = await pool.query(`
        SELECT COUNT(*) as count
        FROM enrollments
        WHERE quiz_id = $1
      `, [testQuizId]);
      
      console.log(`\nEnrollments for this quiz: ${quizEnrollments.rows[0].count}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Details:', error);
  } finally {
    await pool.end();
  }
}

debugQuizzes();
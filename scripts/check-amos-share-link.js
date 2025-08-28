require('dotenv').config();
const { Pool } = require('pg');

const DATABASE_URL = process.env.POSTGRES_URL;
const pool = new Pool({ connectionString: DATABASE_URL });

async function checkAmosShareLink() {
  try {
    console.log('\n=== INVESTIGATING AMOS QUIZ BLANK PAGE ISSUE ===');
    console.log('Short URL provided: https://biblequiz.textr.in/s/KZG7xe');
    console.log('We need to check: quiz_share_links table');
    
    // First, check if the short URL exists in quiz_share_links
    const shortUrlResult = await pool.query(`
      SELECT 
        qsl.id,
        qsl.quiz_id,
        qsl.share_code,
        qsl.short_url,
        qsl.expires_at,
        qsl.click_count,
        q.title as quiz_title,
        q.status as quiz_status,
        q.educator_id
      FROM quiz_share_links qsl
      LEFT JOIN quizzes q ON qsl.quiz_id = q.id
      WHERE qsl.short_url = $1
    `, ['KZG7xe']);
    
    if (shortUrlResult.rows.length === 0) {
      console.log('\n❌ ERROR: No quiz share link found with short URL "KZG7xe"');
      
      // Check if there's an Amos quiz at all
      const amosResult = await pool.query(`
        SELECT 
          q.id,
          q.title,
          q.status,
          qsl.share_code,
          qsl.short_url
        FROM quizzes q
        LEFT JOIN quiz_share_links qsl ON q.id = qsl.quiz_id
        WHERE q.title = 'Amos'
        ORDER BY q.created_at DESC
      `);
      
      console.log('\n=== AMOS QUIZ SEARCH ===');
      if (amosResult.rows.length > 0) {
        console.log('Found', amosResult.rows.length, 'Amos quiz(es):');
        amosResult.rows.forEach((quiz, index) => {
          console.log(`\n${index + 1}. ${quiz.title}`);
          console.log('   Quiz ID:', quiz.id);
          console.log('   Status:', quiz.status);
          console.log('   Share Code:', quiz.share_code || 'NONE');
          console.log('   Short URL:', quiz.short_url || 'NONE');
        });
      } else {
        console.log('No Amos quiz found in the database');
      }
    } else {
      const link = shortUrlResult.rows[0];
      console.log('\n✅ Found quiz share link with short URL "KZG7xe"');
      console.log('\n=== SHARE LINK DETAILS ===');
      console.log('Quiz Title:', link.quiz_title);
      console.log('Quiz ID:', link.quiz_id);
      console.log('Quiz Status:', link.quiz_status);
      console.log('Share Code:', link.share_code);
      console.log('Short URL:', link.short_url);
      console.log('Click Count:', link.click_count);
      console.log('Expires At:', link.expires_at || 'Never');
      
      // Check if quiz is accessible
      if (link.quiz_status !== 'published') {
        console.log('\n⚠️  WARNING: Quiz is not published (status:', link.quiz_status, ')');
      }
      
      if (link.expires_at && new Date(link.expires_at) < new Date()) {
        console.log('\n⚠️  WARNING: Share link has expired');
      }
    }
    
    // Check the short URL redirect route
    console.log('\n=== SHORT URL REDIRECT ROUTE ===');
    console.log('Route: /s/[shortCode]/route.ts');
    console.log('Expected behavior:');
    console.log('1. Receive short code "KZG7xe"');
    console.log('2. Look up share_code in quiz_share_links table');
    console.log('3. Redirect to /quiz/share/[shareCode]');
    
    // Check all share links for debugging
    const allShareLinks = await pool.query(`
      SELECT 
        qsl.share_code,
        qsl.short_url,
        q.title,
        q.status
      FROM quiz_share_links qsl
      LEFT JOIN quizzes q ON qsl.quiz_id = q.id
      ORDER BY qsl.created_at DESC
      LIMIT 10
    `);
    
    console.log('\n=== RECENT SHARE LINKS (for debugging) ===');
    if (allShareLinks.rows.length > 0) {
      allShareLinks.rows.forEach((link, index) => {
        console.log(`${index + 1}. ${link.title || 'Unknown'} - Short: ${link.short_url || 'NONE'} - Share: ${link.share_code}`);
      });
    }
    
  } catch (error) {
    console.error('Error checking Amos share link:', error);
  } finally {
    await pool.end();
  }
}

checkAmosShareLink();
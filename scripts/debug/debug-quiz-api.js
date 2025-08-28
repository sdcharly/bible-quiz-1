require('dotenv').config();
const { Pool } = require('pg');

async function debugQuizAPI() {
  const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
  
  try {
    const quizId = '25243611-e016-410b-bdb0-42e808d410f9';
    
    // 1. Check quiz exists
    const quizResult = await pool.query(
      "SELECT id, title, duration, total_questions, shuffle_questions FROM quizzes WHERE id = $1",
      [quizId]
    );
    
    console.log('=== QUIZ DATA ===');
    console.log('Quiz found:', quizResult.rows.length > 0);
    if (quizResult.rows.length > 0) {
      console.log('Quiz:', quizResult.rows[0]);
    }
    
    // 2. Get raw questions from database
    const questionsResult = await pool.query(
      "SELECT * FROM questions WHERE quiz_id = $1 LIMIT 3",
      [quizId]
    );
    
    console.log('\n=== RAW QUESTIONS FROM DB ===');
    console.log('Total questions:', questionsResult.rows.length);
    if (questionsResult.rows.length > 0) {
      const q = questionsResult.rows[0];
      console.log('First question column names:', Object.keys(q));
      console.log('\nField values:');
      console.log('- id:', q.id);
      console.log('- question_text:', q.question_text ? 'EXISTS' : 'NULL');
      console.log('- options:', Array.isArray(q.options) ? `Array(${q.options.length})` : 'NOT ARRAY');
      console.log('- correct_answer:', q.correct_answer ? 'EXISTS' : 'NULL');
      console.log('- order_index:', q.order_index);
      console.log('- blooms_level:', q.blooms_level);
      
      console.log('\nFull first question:', JSON.stringify(q, null, 2));
    }
    
    // 3. Check what Drizzle would return
    console.log('\n=== DRIZZLE ORM SIMULATION ===');
    const drizzleQuestions = questionsResult.rows.map(q => {
      // This simulates what our API is doing
      return {
        id: q.id,
        questionText: q.question_text || q.questionText || '',
        options: q.options || [],
        orderIndex: typeof q.order_index === 'number' ? q.order_index : (q.orderIndex || 0),
        book: q.book || null,
        chapter: q.chapter || null,
        topic: q.topic || null,
        bloomsLevel: q.blooms_level || q.bloomsLevel || null,
      };
    });
    
    console.log('Mapped questions:', drizzleQuestions.length);
    if (drizzleQuestions.length > 0) {
      console.log('First mapped question:', JSON.stringify(drizzleQuestions[0], null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

debugQuizAPI();
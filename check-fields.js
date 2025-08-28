require('dotenv').config();
const { Pool } = require('pg');

async function checkFields() {
  const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
  
  try {
    // Get one question directly from database
    const result = await pool.query(
      "SELECT * FROM questions WHERE quiz_id = '25243611-e016-410b-bdb0-42e808d410f9' LIMIT 1"
    );
    
    if (result.rows.length > 0) {
      const question = result.rows[0];
      console.log('Database column names (actual):');
      console.log(Object.keys(question));
      console.log('\nActual field values:');
      console.log('- id:', question.id ? 'EXISTS' : 'NULL');
      console.log('- question_text:', question.question_text ? 'EXISTS' : 'NULL');
      console.log('- correct_answer:', question.correct_answer ? 'EXISTS' : 'NULL');
      console.log('- order_index:', question.order_index !== null ? question.order_index : 'NULL');
      console.log('- blooms_level:', question.blooms_level ? 'EXISTS' : 'NULL');
      console.log('- quiz_id:', question.quiz_id ? 'EXISTS' : 'NULL');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkFields();

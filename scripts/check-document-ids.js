require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

async function checkDocumentIds() {
  try {
    // Check documents with old format IDs
    const result = await pool.query(`
      SELECT 
        id, 
        filename, 
        display_name,
        processed_data->>'lightragDocumentId' as lightrag_id,
        processed_data->>'permanentDocId' as permanent_id,
        processed_data->>'trackId' as track_id,
        status,
        upload_date
      FROM documents 
      WHERE processed_data->>'lightragDocumentId' LIKE 'upload_%'
      ORDER BY upload_date DESC
      LIMIT 10
    `);
    
    if (result.rows.length > 0) {
      console.log('Documents with OLD format lightRAG IDs (need fixing):');
      console.log('================================================');
      result.rows.forEach(doc => {
        console.log(`\nDocument: ${doc.display_name || doc.filename}`);
        console.log(`  DB ID: ${doc.id}`);
        console.log(`  Status: ${doc.status}`);
        console.log(`  Track ID: ${doc.track_id}`);
        console.log(`  LightRAG ID (wrong): ${doc.lightrag_id}`);
        console.log(`  Permanent ID: ${doc.permanent_id || 'NOT SET'}`);
        console.log(`  Uploaded: ${doc.upload_date}`);
      });
      
      console.log('\n\nThese documents need to have their LightRAG document IDs updated.');
      console.log('The track_id should be used to fetch the real document ID from LightRAG.');
    } else {
      console.log('No documents found with old format IDs.');
    }
    
    // Also check for recently processed documents
    const recent = await pool.query(`
      SELECT 
        id, 
        filename, 
        display_name,
        processed_data->>'lightragDocumentId' as lightrag_id,
        processed_data->>'permanentDocId' as permanent_id,
        status,
        upload_date
      FROM documents 
      WHERE status = 'processed'
      ORDER BY upload_date DESC
      LIMIT 5
    `);
    
    if (recent.rows.length > 0) {
      console.log('\n\nRecently processed documents:');
      console.log('============================');
      recent.rows.forEach(doc => {
        const isCorrect = doc.lightrag_id && doc.lightrag_id.startsWith('doc-');
        console.log(`\n${doc.display_name || doc.filename}: ${isCorrect ? '✅ CORRECT' : '❌ NEEDS FIX'}`);
        console.log(`  LightRAG ID: ${doc.lightrag_id}`);
        if (doc.permanent_id) {
          console.log(`  Permanent ID: ${doc.permanent_id}`);
        }
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDocumentIds();

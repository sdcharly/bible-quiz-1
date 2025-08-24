require('dotenv').config();
const { Pool } = require('pg');

const DATABASE_URL = process.env.POSTGRES_URL;
if (!DATABASE_URL) {
  console.error('ERROR: POSTGRES_URL not found in environment');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function updateDocumentStatus() {
  try {
    // First, find the document by filename
    const findQuery = `
      SELECT id, filename, status, processed_data
      FROM documents 
      WHERE filename = 'proverbs_5_commentary.pdf'
      AND educator_id IS NOT NULL
      ORDER BY upload_date DESC
      LIMIT 1
    `;
    
    const result = await pool.query(findQuery);
    
    if (result.rows.length === 0) {
      console.log('Document not found with filename: proverbs_5_commentary.pdf');
      await pool.end();
      return;
    }
    
    const doc = result.rows[0];
    console.log('Found document:');
    console.log('- ID:', doc.id);
    console.log('- Filename:', doc.filename);
    console.log('- Current Status:', doc.status);
    console.log('- Track ID:', doc.processed_data?.trackId);
    
    // Update the document status to processed
    const updateQuery = `
      UPDATE documents 
      SET 
        status = 'processed',
        processing_completed_at = NOW(),
        processed_data = jsonb_set(
          COALESCE(processed_data, '{}')::jsonb,
          '{lightragDocumentId}',
          '"doc-37831c235b4d00befda9161bdb6c26c8"'::jsonb
        ) || jsonb_build_object(
          'permanentDocId', 'doc-37831c235b4d00befda9161bdb6c26c8',
          'processedAt', to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
          'manuallyUpdated', true,
          'updateReason', 'Document confirmed processed in LightRAG UI'
        )
      WHERE id = $1
      RETURNING id, status, processed_data
    `;
    
    const updateResult = await pool.query(updateQuery, [doc.id]);
    
    if (updateResult.rows.length > 0) {
      console.log('\n✅ Document status updated successfully!');
      console.log('- New Status: processed');
      console.log('- LightRAG Document ID: doc-37831c235b4d00befda9161bdb6c26c8');
    } else {
      console.log('❌ Failed to update document status');
    }
    
  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    await pool.end();
  }
}

updateDocumentStatus();
#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!DATABASE_URL) {
  console.error('❌ Database URL not found in environment variables');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function fixProcessedDocuments() {
  try {
    console.log('🔧 Fixing processed documents status and IDs...\n');
    
    // Get all documents that are stuck in "processing" but have valid track IDs
    const result = await pool.query(`
      SELECT 
        id,
        filename,
        display_name,
        status,
        processed_data
      FROM documents
      WHERE status IN ('processing', 'processed')
      ORDER BY upload_date DESC
    `);
    
    console.log(`📚 Found ${result.rowCount} documents to check\n`);
    
    let updatedCount = 0;
    
    for (const doc of result.rows) {
      const processedData = doc.processed_data || {};
      const trackId = processedData.trackId;
      const lightragDocId = processedData.lightragDocumentId;
      
      console.log(`\n📄 Processing: ${doc.filename || doc.display_name}`);
      console.log(`   Status: ${doc.status}`);
      console.log(`   Track ID: ${trackId || 'none'}`);
      console.log(`   LightRAG ID: ${lightragDocId || 'none'}`);
      
      // If document has a track ID but status is processing, fix it
      if (trackId && doc.status === 'processing') {
        console.log(`   ✅ Has track ID - updating status to 'processed'`);
        
        // Update status to processed and ensure IDs are properly set
        await pool.query(`
          UPDATE documents 
          SET 
            status = 'processed',
            processed_data = $2,
            updated_at = NOW()
          WHERE id = $1
        `, [
          doc.id,
          JSON.stringify({
            ...processedData,
            permanentDocId: trackId.startsWith('doc-') ? trackId : `doc-${trackId.split('_').pop()}`,
            lightragDocumentId: trackId,
            trackId: trackId,
            status: 'processed',
            processedAt: new Date().toISOString()
          })
        ]);
        
        updatedCount++;
        console.log(`   ✅ Updated to processed status`);
        
      } else if (doc.status === 'processed' && trackId && !lightragDocId) {
        console.log(`   🔄 Processed but missing lightragDocumentId - fixing`);
        
        // Ensure lightragDocumentId is set
        await pool.query(`
          UPDATE documents 
          SET 
            processed_data = $2,
            updated_at = NOW()
          WHERE id = $1
        `, [
          doc.id,
          JSON.stringify({
            ...processedData,
            permanentDocId: trackId.startsWith('doc-') ? trackId : `doc-${trackId.split('_').pop()}`,
            lightragDocumentId: trackId,
            trackId: trackId
          })
        ]);
        
        updatedCount++;
        console.log(`   ✅ Fixed LightRAG document ID`);
        
      } else {
        console.log(`   ℹ️  Already in correct state`);
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total documents checked: ${result.rowCount}`);
    console.log(`   Documents updated: ${updatedCount}`);
    console.log(`   Documents already correct: ${result.rowCount - updatedCount}`);
    
    if (updatedCount > 0) {
      console.log(`\n✅ Successfully fixed ${updatedCount} documents!`);
      console.log(`   All documents should now show as 'processed' with valid IDs.`);
    } else {
      console.log(`\n✅ All documents were already in the correct state.`);
    }
    
  } catch (error) {
    console.error('❌ Error fixing documents:', error.message);
  } finally {
    await pool.end();
  }
}

// Run with confirmation
console.log('This script will:');
console.log('1. Update documents stuck in "processing" status to "processed"');
console.log('2. Ensure all processed documents have proper LightRAG IDs');
console.log('3. Create permanent document IDs from track IDs');
console.log('');

const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

readline.question('Do you want to continue? (y/N): ', (answer) => {
  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    fixProcessedDocuments();
  } else {
    console.log('Operation cancelled.');
  }
  readline.close();
});
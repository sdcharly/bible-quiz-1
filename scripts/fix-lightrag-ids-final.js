#!/usr/bin/env node

/**
 * Fix LightRAG document IDs in the database
 * This script will update all documents to use the correct permanent document ID
 * instead of the temporary track ID
 */

require('dotenv').config();
const { Pool } = require('pg');
const readline = require('readline');

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function fixDocumentIds() {
  try {
    // First, get all documents that need fixing
    const needsFixing = await pool.query(`
      SELECT 
        id, 
        filename, 
        display_name,
        processed_data,
        status
      FROM documents 
      WHERE (
        -- Has wrong format ID (starts with upload_)
        processed_data->>'lightragDocumentId' LIKE 'upload_%'
        -- Or has a permanent ID that's different from lightragDocumentId
        OR (
          processed_data->>'permanentDocId' IS NOT NULL 
          AND processed_data->>'permanentDocId' != processed_data->>'lightragDocumentId'
        )
      )
      AND status IN ('processed', 'processing')
    `);
    
    if (needsFixing.rows.length === 0) {
      console.log('✅ No documents need fixing. All LightRAG IDs are correct!');
      return;
    }
    
    console.log(`Found ${needsFixing.rows.length} documents that need fixing:`);
    console.log('================================================\n');
    
    let fixedCount = 0;
    let skippedCount = 0;
    
    for (const doc of needsFixing.rows) {
      const processedData = doc.processed_data || {};
      const permanentId = processedData.permanentDocId;
      const trackId = processedData.trackId || processedData.lightragDocumentId;
      
      console.log(`Processing: ${doc.display_name || doc.filename}`);
      console.log(`  Current lightragDocumentId: ${processedData.lightragDocumentId}`);
      
      if (permanentId && permanentId.startsWith('doc-')) {
        // We have a permanent ID, use it
        console.log(`  ✅ Using existing permanent ID: ${permanentId}`);
        
        const updatedData = {
          ...processedData,
          lightragDocumentId: permanentId,
          permanentDocId: permanentId,
          trackId: trackId
        };
        
        await pool.query(
          `UPDATE documents 
           SET processed_data = $1,
               updated_at = NOW()
           WHERE id = $2`,
          [JSON.stringify(updatedData), doc.id]
        );
        
        fixedCount++;
        console.log(`  ✅ Fixed!\n`);
        
      } else if (trackId && trackId.startsWith('upload_')) {
        // We need to extract the doc ID from the track ID
        // Track ID format: upload_YYYYMMDD_HHMMSS_[docId]
        const parts = trackId.split('_');
        if (parts.length >= 4) {
          const docIdPart = parts[parts.length - 1]; // Last part is the doc ID
          const permanentDocId = `doc-${docIdPart}`;
          
          console.log(`  🔧 Converting track ID to permanent ID: ${permanentDocId}`);
          
          const updatedData = {
            ...processedData,
            lightragDocumentId: permanentDocId,
            permanentDocId: permanentDocId,
            trackId: trackId
          };
          
          await pool.query(
            `UPDATE documents 
             SET processed_data = $1,
                 updated_at = NOW()
             WHERE id = $2`,
            [JSON.stringify(updatedData), doc.id]
          );
          
          fixedCount++;
          console.log(`  ✅ Fixed!\n`);
        } else {
          console.log(`  ⚠️ Could not parse track ID: ${trackId}`);
          console.log(`  ⏭️ Skipping this document\n`);
          skippedCount++;
        }
      } else {
        console.log(`  ⚠️ No valid ID found to fix`);
        console.log(`  ⏭️ Skipping this document\n`);
        skippedCount++;
      }
    }
    
    console.log('\n================================================');
    console.log(`✅ Fixed ${fixedCount} documents`);
    if (skippedCount > 0) {
      console.log(`⚠️ Skipped ${skippedCount} documents (no valid ID found)`);
    }
    
    // Verify the fix
    console.log('\n\nVerifying the fix...');
    const stillWrong = await pool.query(`
      SELECT COUNT(*) as count
      FROM documents 
      WHERE processed_data->>'lightragDocumentId' LIKE 'upload_%'
      AND status IN ('processed', 'processing')
    `);
    
    if (stillWrong.rows[0].count === '0') {
      console.log('✅ All documents now have correct LightRAG IDs!');
    } else {
      console.log(`⚠️ ${stillWrong.rows[0].count} documents still have incorrect IDs`);
      console.log('These may need manual intervention or re-uploading.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
    rl.close();
  }
}

// Add confirmation prompt
console.log('🔧 LightRAG Document ID Fixer');
console.log('================================');
console.log('This script will fix all documents with incorrect LightRAG IDs.');
console.log('It will update the lightragDocumentId field to use the permanent document ID format (doc-xxxxx).');
console.log('');

rl.question('Do you want to proceed? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    fixDocumentIds();
  } else {
    console.log('Operation cancelled.');
    pool.end();
    rl.close();
  }
});
#!/usr/bin/env node

const { Pool } = require('pg');

// Load environment variables
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!DATABASE_URL) {
  console.error('❌ Database URL not found in environment variables');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function checkDocuments() {
  try {
    console.log('🔍 Checking documents in database...\n');
    
    // Get all documents
    const result = await pool.query(`
      SELECT 
        id,
        filename,
        display_name,
        status,
        upload_date,
        educator_id,
        processed_data
      FROM documents
      ORDER BY upload_date DESC
    `);
    
    console.log(`📚 Total documents: ${result.rowCount}\n`);
    
    if (result.rowCount === 0) {
      console.log('⚠️  No documents found in the database.');
      console.log('\nTo add documents:');
      console.log('1. Upload documents through the educator interface');
      console.log('2. Or manually connect existing LightRAG documents using the admin interface');
      return;
    }
    
    // Analyze documents
    let processedCount = 0;
    let processingCount = 0;
    let failedCount = 0;
    let deletedCount = 0;
    let hasValidDocId = 0;
    let needsCorrection = 0;
    
    console.log('📋 Document Details:\n');
    console.log('─'.repeat(80));
    
    result.rows.forEach((doc, index) => {
      const processedData = doc.processed_data || {};
      const trackId = processedData.trackId || processedData.track_id;
      const lightragDocId = processedData.lightragDocumentId || processedData.permanentDocId;
      
      console.log(`${index + 1}. ${doc.filename || doc.display_name || 'Unnamed Document'}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Status: ${doc.status}`);
      console.log(`   Uploaded: ${new Date(doc.upload_date).toLocaleString()}`);
      
      if (trackId) {
        console.log(`   Track ID: ${trackId}`);
      }
      
      if (lightragDocId) {
        console.log(`   LightRAG Doc ID: ${lightragDocId}`);
        if (lightragDocId.startsWith('doc-')) {
          console.log(`   ✅ Has valid LightRAG document ID`);
          hasValidDocId++;
        }
      } else if (trackId && trackId.startsWith('upload_')) {
        console.log(`   ⚠️  Has track ID but no permanent doc ID`);
        needsCorrection++;
      } else {
        console.log(`   ❌ No LightRAG IDs found`);
        needsCorrection++;
      }
      
      // Count by status
      switch(doc.status) {
        case 'processed': processedCount++; break;
        case 'processing': processingCount++; break;
        case 'failed': failedCount++; break;
        case 'deleted': deletedCount++; break;
      }
      
      console.log('─'.repeat(80));
    });
    
    // Summary
    console.log('\n📊 Summary:');
    console.log(`   Total Documents: ${result.rowCount}`);
    console.log(`   Processed: ${processedCount}`);
    console.log(`   Processing: ${processingCount}`);
    console.log(`   Failed: ${failedCount}`);
    console.log(`   Deleted: ${deletedCount}`);
    console.log(`   Has Valid Doc ID: ${hasValidDocId}`);
    console.log(`   Needs Correction: ${needsCorrection}`);
    
    if (needsCorrection > 0) {
      console.log('\n⚠️  Some documents need their LightRAG IDs corrected.');
      console.log('   You can:');
      console.log('   1. Go to /admin/documents to manually update IDs');
      console.log('   2. Use the "Run Auto Cleanup" button to automatically fix IDs');
      console.log('   3. Manually provide the correct doc-xxx IDs for each document');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDocuments();
/**
 * Script to fix ALL truncated LightRAG document IDs in the database
 * This fetches the full IDs from the LightRAG API and updates the database
 */

require('dotenv').config();
const { Pool } = require('pg');

const DATABASE_URL = process.env.POSTGRES_URL;
if (!DATABASE_URL) {
  console.error('❌ POSTGRES_URL not found in environment variables');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function fetchTrackStatus(trackId) {
  const apiKey = process.env.LIGHTRAG_API_KEY;
  const baseUrl = process.env.LIGHTRAG_BASE_URL || 'https://lightrag-6bki.onrender.com';
  
  if (!apiKey) {
    throw new Error('LIGHTRAG_API_KEY not found in environment variables');
  }
  
  const response = await fetch(`${baseUrl}/documents/track_status/${trackId}`, {
    method: 'GET',
    headers: {
      'X-API-Key': apiKey,
      'accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      return null; // Track ID not found
    }
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

async function fixAllTruncatedIds() {
  try {
    // Find all documents with truncated IDs (< 20 characters)
    const result = await pool.query(`
      SELECT id, filename, status, processed_data,
             length(processed_data->>'lightragDocumentId') as id_length
      FROM documents 
      WHERE status = 'processed' 
      AND processed_data->>'lightragDocumentId' IS NOT NULL
      AND length(processed_data->>'lightragDocumentId') < 20
      ORDER BY upload_date DESC
    `);
    
    console.log(`Found ${result.rows.length} documents with truncated IDs to fix\n`);
    
    let fixed = 0;
    let failed = 0;
    
    for (const doc of result.rows) {
      const processedData = doc.processed_data || {};
      const currentDocId = processedData.lightragDocumentId;
      const trackId = processedData.trackId;
      
      console.log(`\n=== Processing: ${doc.filename} ===`);
      console.log(`Current ID: ${currentDocId} (${doc.id_length} chars)`);
      console.log(`Track ID: ${trackId}`);
      
      if (!trackId) {
        console.log(`⚠️  No track ID available - skipping`);
        failed++;
        continue;
      }
      
      try {
        // Fetch the actual document ID from LightRAG
        const trackStatus = await fetchTrackStatus(trackId);
        
        if (!trackStatus) {
          console.log(`⚠️  Track ID not found in LightRAG - skipping`);
          failed++;
          continue;
        }
        
        if (trackStatus.documents && trackStatus.documents.length > 0) {
          const fullDocId = trackStatus.documents[0].id;
          console.log(`✅ Found full ID: ${fullDocId} (${fullDocId.length} chars)`);
          
          if (fullDocId !== currentDocId && fullDocId.length > currentDocId.length) {
            // Update the database with the full ID
            await pool.query(`
              UPDATE documents 
              SET processed_data = jsonb_set(
                jsonb_set(
                  processed_data,
                  '{lightragDocumentId}',
                  $1::jsonb
                ),
                '{permanentDocId}',
                $1::jsonb
              )
              WHERE id = $2
            `, [JSON.stringify(fullDocId), doc.id]);
            
            console.log(`✅ Updated document with full ID`);
            fixed++;
          } else {
            console.log(`ℹ️  ID already correct or same length`);
          }
        } else {
          console.log(`⚠️  No documents found in track status response`);
          failed++;
        }
      } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        failed++;
      }
      
      // Add a small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`✅ Fixed ${fixed} documents`);
    if (failed > 0) {
      console.log(`⚠️  Failed to fix ${failed} documents`);
    }
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await pool.end();
  }
}

// Run the fix
console.log('Starting to fix truncated document IDs...\n');
fixAllTruncatedIds().catch(console.error);
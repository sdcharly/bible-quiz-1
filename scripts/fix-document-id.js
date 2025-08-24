/**
 * Script to fix truncated LightRAG document IDs in the database
 * This updates documents that have truncated IDs (like doc-a05366e9) 
 * with their full IDs from the LightRAG API
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
  
  console.log(`Fetching status for track: ${trackId}`);
  
  const response = await fetch(`${baseUrl}/documents/track_status/${trackId}`, {
    method: 'GET',
    headers: {
      'X-API-Key': apiKey,
      'accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

async function fixDocumentIds() {
  try {
    // Find documents with potentially truncated IDs
    const result = await pool.query(`
      SELECT id, filename, status, processed_data 
      FROM documents 
      WHERE status = 'processed' 
      AND processed_data::text LIKE '%"lightragDocumentId":"doc-%'
      ORDER BY upload_date DESC
    `);
    
    console.log(`Found ${result.rows.length} processed documents to check\n`);
    
    for (const doc of result.rows) {
      const processedData = doc.processed_data || {};
      const currentDocId = processedData.lightragDocumentId;
      const trackId = processedData.trackId;
      
      console.log(`\n=== Document: ${doc.filename} ===`);
      console.log(`DB ID: ${doc.id}`);
      console.log(`Current LightRAG ID: ${currentDocId}`);
      console.log(`Track ID: ${trackId}`);
      
      // Check if the ID looks truncated (too short)
      if (currentDocId && currentDocId.length < 20) {
        console.log(`⚠️  ID looks truncated (only ${currentDocId.length} chars)`);
        
        if (trackId) {
          try {
            // Fetch the actual document ID from LightRAG
            const trackStatus = await fetchTrackStatus(trackId);
            
            if (trackStatus.documents && trackStatus.documents.length > 0) {
              const fullDocId = trackStatus.documents[0].id;
              console.log(`✅ Found full ID from API: ${fullDocId}`);
              
              if (fullDocId !== currentDocId) {
                // Update the database with the full ID
                const updateResult = await pool.query(`
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
              } else {
                console.log(`ℹ️  ID already correct`);
              }
            } else {
              console.log(`⚠️  No documents found in track status response`);
            }
          } catch (error) {
            console.error(`❌ Error fetching track status: ${error.message}`);
          }
        } else {
          console.log(`⚠️  No track ID available to fetch full document ID`);
        }
      } else {
        console.log(`✅ ID appears to be full length (${currentDocId ? currentDocId.length : 0} chars)`);
      }
    }
    
    console.log('\n✅ Document ID check complete');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

// Run the fix
fixDocumentIds().catch(console.error);
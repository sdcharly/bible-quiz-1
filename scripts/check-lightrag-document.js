require('dotenv').config();

const LIGHTRAG_BASE_URL = 'https://lightrag-6bki.onrender.com';
const LIGHTRAG_API_KEY = process.env.LIGHTRAG_API_KEY;

if (!LIGHTRAG_API_KEY) {
  console.error('ERROR: LIGHTRAG_API_KEY not found in environment');
  process.exit(1);
}

async function checkDocument() {
  try {
    // The track ID from the database
    const trackId = 'upload_20250824_124707_0e0ba7b0';
    
    console.log(`Checking LightRAG for track ID: ${trackId}`);
    console.log('-------------------------------------------');
    
    // Check track status to get the actual document ID
    const response = await fetch(`${LIGHTRAG_BASE_URL}/documents/track_status/${trackId}`, {
      method: 'GET',
      headers: {
        'X-API-Key': LIGHTRAG_API_KEY,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`Error: HTTP ${response.status} - ${response.statusText}`);
      const text = await response.text();
      console.error('Response:', text);
      return;
    }
    
    const data = await response.json();
    
    console.log('Track Status Response:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.documents && data.documents.length > 0) {
      console.log('\n✅ Document found in LightRAG!');
      console.log('-------------------------------------------');
      const doc = data.documents[0];
      console.log('Document ID:', doc.id || 'Not found');
      console.log('Document Name:', doc.name || doc.title || 'Not found');
      console.log('Status:', doc.status || 'Not found');
      
      if (doc.id) {
        console.log('\n🎯 CONFIRMED DOCUMENT ID:', doc.id);
      }
    } else {
      console.log('\n⚠️ No documents found for this track ID');
      console.log('Total count:', data.total_count || 0);
      console.log('This might mean:');
      console.log('1. Document is still processing');
      console.log('2. Track ID has expired');
      console.log('3. Document was deleted');
    }
    
  } catch (error) {
    console.error('ERROR:', error.message);
  }
}

checkDocument();

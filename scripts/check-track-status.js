require('dotenv').config();

const trackId = process.argv[2] || 'upload_20250824_080356_a05366e9';
const apiKey = process.env.LIGHTRAG_API_KEY;
const baseUrl = process.env.LIGHTRAG_BASE_URL || 'https://lightrag-6bki.onrender.com';

if (!apiKey) {
  console.error('LIGHTRAG_API_KEY not found');
  process.exit(1);
}

async function checkStatus() {
  try {
    const url = `${baseUrl}/documents/track_status/${trackId}`;
    console.log('Fetching:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`Error: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error(text);
      return;
    }
    
    const data = await response.json();
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.documents && data.documents.length > 0) {
      console.log('\n=== Document Details ===');
      data.documents.forEach((doc, i) => {
        console.log(`\nDocument ${i + 1}:`);
        console.log('ID:', doc.id);
        console.log('ID Length:', doc.id ? doc.id.length : 0);
        console.log('Status:', doc.status);
        console.log('Filename:', doc.filename);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkStatus();
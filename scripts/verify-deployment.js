#!/usr/bin/env node

/**
 * Verify deployment and cache clearing
 */

const https = require('https');

function checkDeployment() {
  const testUrl = 'https://biblequiz.textr.in/api/student/quiz/6CE59224/start';
  
  console.log('Checking deployment status...');
  console.log('Testing URL:', testUrl);
  
  https.get(testUrl, (res) => {
    console.log('Status Code:', res.statusCode);
    console.log('Headers:', {
      'cache-control': res.headers['cache-control'],
      'x-vercel-cache': res.headers['x-vercel-cache'],
      'date': res.headers['date']
    });
    
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log('\nResponse:', json);
        
        // Check if our fix is deployed
        if (data.includes('unauthorized') || data.includes('Unauthorized')) {
          console.log('\n✅ API is responding (requires authentication)');
          console.log('The deployment appears to be live.');
        } else if (data.includes('error')) {
          console.log('\n⚠️ API returned an error:', json.error || json.message);
        }
      } catch (e) {
        console.log('\nRaw response:', data.substring(0, 200));
      }
    });
  }).on('error', (err) => {
    console.error('Error checking deployment:', err.message);
  });
}

// Check cache headers for the main page
function checkCacheHeaders() {
  const url = 'https://biblequiz.textr.in/s/9rhEtC';
  
  console.log('\n\nChecking cache headers for:', url);
  
  https.get(url, (res) => {
    console.log('Status:', res.statusCode);
    console.log('Cache Headers:', {
      'cache-control': res.headers['cache-control'],
      'x-vercel-cache': res.headers['x-vercel-cache'],
      'age': res.headers['age'],
      'x-vercel-id': res.headers['x-vercel-id']
    });
    
    if (res.headers['x-vercel-cache'] === 'MISS' || res.headers['x-vercel-cache'] === 'STALE') {
      console.log('\n✅ Cache has been cleared or is stale');
    } else if (res.headers['x-vercel-cache'] === 'HIT') {
      console.log('\n⚠️ Page is still being served from cache');
      console.log('You may need to wait a few minutes for cache to expire');
    }
  }).on('error', (err) => {
    console.error('Error checking cache:', err.message);
  });
}

// Run checks
checkDeployment();
setTimeout(checkCacheHeaders, 1000);
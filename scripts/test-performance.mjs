#!/usr/bin/env node
/**
 * Performance Testing Script for Student Panel Optimizations
 * Run with: node scripts/test-performance.mjs
 */

import fetch from 'node-fetch';
import { performance } from 'perf_hooks';

// Configuration
const BASE_URL = 'http://localhost:3000';
const SESSION_COOKIE = process.env.SESSION_COOKIE || ''; // You'll need to set this

// Test results storage
const results = {
  original: {
    endpoint: '/api/student/quizzes',
    times: [],
    sizes: [],
    errors: []
  },
  optimized: {
    endpoint: '/api/student/quizzes/optimized',
    times: [],
    sizes: [],
    errors: []
  }
};

// Helper function to make authenticated request
async function makeRequest(endpoint, params = '') {
  const url = `${BASE_URL}${endpoint}${params}`;
  const startTime = performance.now();
  
  try {
    const response = await fetch(url, {
      headers: {
        'Cookie': SESSION_COOKIE,
        'Accept': 'application/json'
      }
    });
    
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    const text = await response.text();
    const size = new TextEncoder().encode(text).length;
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = text;
    }
    
    return {
      success: response.ok,
      status: response.status,
      time: responseTime,
      size: size,
      data: data,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      time: performance.now() - startTime
    };
  }
}

// Test 1: Basic endpoint comparison
async function testBasicEndpoints() {
  console.log('\n📊 Test 1: Basic Endpoint Comparison');
  console.log('=====================================');
  
  // Test original endpoint
  console.log('\nTesting original endpoint...');
  const originalResult = await makeRequest('/api/student/quizzes');
  
  if (originalResult.success) {
    results.original.times.push(originalResult.time);
    results.original.sizes.push(originalResult.size);
    console.log(`✅ Original: ${originalResult.time.toFixed(2)}ms, ${(originalResult.size/1024).toFixed(2)}KB`);
    console.log(`   Quizzes returned: ${originalResult.data.quizzes?.length || 0}`);
  } else {
    console.log(`❌ Original failed: ${originalResult.error || originalResult.status}`);
    results.original.errors.push(originalResult.error);
  }
  
  // Test optimized endpoint
  console.log('\nTesting optimized endpoint...');
  const optimizedResult = await makeRequest('/api/student/quizzes/optimized', '?status=all');
  
  if (optimizedResult.success) {
    results.optimized.times.push(optimizedResult.time);
    results.optimized.sizes.push(optimizedResult.size);
    console.log(`✅ Optimized: ${optimizedResult.time.toFixed(2)}ms, ${(optimizedResult.size/1024).toFixed(2)}KB`);
    console.log(`   Quizzes returned: ${optimizedResult.data.quizzes?.length || 0}`);
    console.log(`   Cache header: ${optimizedResult.headers['x-cache'] || 'Not set'}`);
  } else {
    console.log(`❌ Optimized failed: ${optimizedResult.error || optimizedResult.status}`);
    results.optimized.errors.push(optimizedResult.error);
  }
  
  // Calculate improvement
  if (originalResult.success && optimizedResult.success) {
    const timeImprovement = ((originalResult.time - optimizedResult.time) / originalResult.time * 100).toFixed(1);
    const sizeReduction = ((originalResult.size - optimizedResult.size) / originalResult.size * 100).toFixed(1);
    
    console.log('\n📈 Improvement:');
    console.log(`   Time: ${timeImprovement}% faster`);
    console.log(`   Size: ${sizeReduction}% smaller`);
  }
}

// Test 2: Filter parameters
async function testFilterParameters() {
  console.log('\n🔍 Test 2: Filter Parameters');
  console.log('=============================');
  
  const filters = [
    { param: '?status=available', desc: 'Available quizzes' },
    { param: '?status=completed', desc: 'Completed quizzes' },
    { param: '?status=upcoming', desc: 'Upcoming quizzes' },
    { param: '?search=bible', desc: 'Search for "bible"' },
    { param: '?limit=5&offset=0', desc: 'Pagination (5 items)' }
  ];
  
  for (const filter of filters) {
    console.log(`\nTesting: ${filter.desc}`);
    const result = await makeRequest('/api/student/quizzes/optimized', filter.param);
    
    if (result.success) {
      console.log(`✅ Success: ${result.time.toFixed(2)}ms, ${result.data.quizzes?.length || 0} quizzes`);
      results.optimized.times.push(result.time);
    } else {
      console.log(`❌ Failed: ${result.error || result.status}`);
    }
  }
}

// Test 3: Load test
async function testLoad() {
  console.log('\n⚡ Test 3: Load Test (10 concurrent requests)');
  console.log('==============================================');
  
  const runLoadTest = async (endpoint, label) => {
    console.log(`\nTesting ${label}...`);
    const promises = [];
    
    for (let i = 0; i < 10; i++) {
      promises.push(makeRequest(endpoint, endpoint.includes('optimized') ? '?status=all' : ''));
    }
    
    const startTime = performance.now();
    const results = await Promise.all(promises);
    const totalTime = performance.now() - startTime;
    
    const successCount = results.filter(r => r.success).length;
    const avgTime = results.reduce((sum, r) => sum + r.time, 0) / results.length;
    
    console.log(`✅ Completed: ${successCount}/10 successful`);
    console.log(`   Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`   Average per request: ${avgTime.toFixed(2)}ms`);
    
    return { totalTime, avgTime, successCount };
  };
  
  const originalLoad = await runLoadTest('/api/student/quizzes', 'Original');
  const optimizedLoad = await runLoadTest('/api/student/quizzes/optimized', 'Optimized');
  
  const improvement = ((originalLoad.avgTime - optimizedLoad.avgTime) / originalLoad.avgTime * 100).toFixed(1);
  console.log(`\n📈 Load test improvement: ${improvement}% faster`);
}

// Test 4: Cache behavior
async function testCacheBehavior() {
  console.log('\n💾 Test 4: Cache Behavior');
  console.log('==========================');
  
  console.log('\nFirst request (cache miss expected)...');
  const firstRequest = await makeRequest('/api/student/quizzes/optimized', '?status=all&test=cache');
  console.log(`Time: ${firstRequest.time.toFixed(2)}ms`);
  console.log(`Cache: ${firstRequest.headers['x-cache'] || 'Not set'}`);
  
  console.log('\nSecond request (cache hit expected)...');
  const secondRequest = await makeRequest('/api/student/quizzes/optimized', '?status=all&test=cache');
  console.log(`Time: ${secondRequest.time.toFixed(2)}ms`);
  console.log(`Cache: ${secondRequest.headers['x-cache'] || 'Not set'}`);
  
  if (secondRequest.time < firstRequest.time) {
    const improvement = ((firstRequest.time - secondRequest.time) / firstRequest.time * 100).toFixed(1);
    console.log(`✅ Cache working! ${improvement}% faster on cache hit`);
  } else {
    console.log(`⚠️ Cache may not be working as expected`);
  }
  
  // Test ETag
  console.log('\nTesting ETag support...');
  if (firstRequest.headers['etag']) {
    const etagRequest = await fetch(`${BASE_URL}/api/student/quizzes/optimized?status=all`, {
      headers: {
        'Cookie': SESSION_COOKIE,
        'If-None-Match': firstRequest.headers['etag']
      }
    });
    
    if (etagRequest.status === 304) {
      console.log('✅ ETag working! Got 304 Not Modified');
    } else {
      console.log(`⚠️ ETag not working, got status ${etagRequest.status}`);
    }
  } else {
    console.log('⚠️ No ETag header found');
  }
}

// Generate final report
function generateReport() {
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log('               PERFORMANCE TEST REPORT                  ');
  console.log('═══════════════════════════════════════════════════════');
  
  // Calculate statistics
  const calcStats = (times) => {
    if (times.length === 0) return { avg: '0.00', min: '0.00', max: '0.00', p95: '0.00' };
    const sorted = [...times].sort((a, b) => a - b);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const p95Index = Math.floor(times.length * 0.95);
    return {
      avg: avg.toFixed(2),
      min: sorted[0].toFixed(2),
      max: sorted[sorted.length - 1].toFixed(2),
      p95: sorted[p95Index]?.toFixed(2) || sorted[sorted.length - 1].toFixed(2)
    };
  };
  
  const originalStats = calcStats(results.original.times);
  const optimizedStats = calcStats(results.optimized.times);
  
  console.log('\n📊 Response Time Comparison (ms)');
  console.log('┌─────────────┬──────────┬──────────┬──────────────┐');
  console.log('│ Metric      │ Original │ Optimized│ Improvement  │');
  console.log('├─────────────┼──────────┼──────────┼──────────────┤');
  console.log(`│ Average     │ ${originalStats.avg.padStart(8)} │ ${optimizedStats.avg.padStart(8)} │ ${((originalStats.avg - optimizedStats.avg) / originalStats.avg * 100).toFixed(1).padStart(11)}% │`);
  console.log(`│ Min         │ ${originalStats.min.padStart(8)} │ ${optimizedStats.min.padStart(8)} │ ${((originalStats.min - optimizedStats.min) / originalStats.min * 100).toFixed(1).padStart(11)}% │`);
  console.log(`│ Max         │ ${originalStats.max.padStart(8)} │ ${optimizedStats.max.padStart(8)} │ ${((originalStats.max - optimizedStats.max) / originalStats.max * 100).toFixed(1).padStart(11)}% │`);
  console.log(`│ P95         │ ${originalStats.p95.padStart(8)} │ ${optimizedStats.p95.padStart(8)} │ ${((originalStats.p95 - optimizedStats.p95) / originalStats.p95 * 100).toFixed(1).padStart(11)}% │`);
  console.log('└─────────────┴──────────┴──────────┴──────────────┘');
  
  if (results.original.sizes.length > 0 && results.optimized.sizes.length > 0) {
    const avgOriginalSize = results.original.sizes.reduce((a, b) => a + b, 0) / results.original.sizes.length;
    const avgOptimizedSize = results.optimized.sizes.reduce((a, b) => a + b, 0) / results.optimized.sizes.length;
    
    console.log('\n📦 Payload Size Comparison');
    console.log('┌─────────────┬──────────┬──────────┬──────────────┐');
    console.log('│ Metric      │ Original │ Optimized│ Reduction    │');
    console.log('├─────────────┼──────────┼──────────┼──────────────┤');
    console.log(`│ Avg Size    │ ${(avgOriginalSize/1024).toFixed(1).padStart(7)}KB │ ${(avgOptimizedSize/1024).toFixed(1).padStart(7)}KB │ ${((avgOriginalSize - avgOptimizedSize) / avgOriginalSize * 100).toFixed(1).padStart(11)}% │`);
    console.log('└─────────────┴──────────┴──────────┴──────────────┘');
  }
  
  console.log('\n✅ Summary:');
  console.log(`• Total requests tested: ${results.original.times.length + results.optimized.times.length}`);
  console.log(`• Original endpoint errors: ${results.original.errors.length}`);
  console.log(`• Optimized endpoint errors: ${results.optimized.errors.length}`);
  
  if (optimizedStats.avg < originalStats.avg) {
    console.log(`• ✅ Optimized endpoint is ${((originalStats.avg - optimizedStats.avg) / originalStats.avg * 100).toFixed(1)}% faster on average`);
  } else {
    console.log(`• ⚠️ Optimized endpoint is not faster than original`);
  }
}

// Main test runner
async function runAllTests() {
  console.log('🧪 Student Panel Performance Testing');
  console.log('====================================');
  console.log(`Testing against: ${BASE_URL}`);
  
  if (!SESSION_COOKIE) {
    console.log('\n⚠️ Warning: No SESSION_COOKIE provided.');
    console.log('To test authenticated endpoints, run:');
    console.log('SESSION_COOKIE="your-session-cookie" node scripts/test-performance.mjs');
    console.log('\nYou can get your session cookie from the browser DevTools:');
    console.log('1. Login to the app');
    console.log('2. Open DevTools > Application > Cookies');
    console.log('3. Copy the value of "better-auth.session"');
    console.log('\nContinuing with unauthenticated tests...\n');
  }
  
  try {
    // Check if server is running
    const healthCheck = await fetch(`${BASE_URL}/api/health`).catch(() => null);
    if (!healthCheck) {
      console.error('❌ Server is not running at', BASE_URL);
      console.log('Please start the development server with: npm run dev');
      process.exit(1);
    }
    
    await testBasicEndpoints();
    await testFilterParameters();
    await testLoad();
    await testCacheBehavior();
    
    generateReport();
    
    console.log('\n✨ Testing complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
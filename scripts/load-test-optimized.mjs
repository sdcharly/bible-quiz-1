#!/usr/bin/env node
/**
 * Load Test for Optimized API Endpoints
 * Tests the performance improvements with concurrent users
 */

import fetch from 'node-fetch';

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const CONCURRENT_USERS = 100;
const REQUESTS_PER_USER = 5;
const TEST_DURATION_MS = 30000; // 30 seconds

// Test endpoints
const ENDPOINTS = [
  '/api/student/quizzes/optimized?status=all',
  '/api/student/results',
  '/api/student/groups',
  '/api/student/progress/stats'
];

// Metrics storage
const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  responseTimes: [],
  errorTypes: {},
  statusCodes: {}
};

// Color utilities
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

/**
 * Make a single request and record metrics
 */
async function makeRequest(endpoint, userId) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'User-Agent': `LoadTest-User-${userId}`,
        'Accept': 'application/json'
      }
    });
    
    const responseTime = Date.now() - startTime;
    metrics.responseTimes.push(responseTime);
    metrics.totalRequests++;
    
    // Track status codes
    const status = response.status;
    metrics.statusCodes[status] = (metrics.statusCodes[status] || 0) + 1;
    
    if (response.ok) {
      metrics.successfulRequests++;
      
      // Check cache status
      const cacheHeader = response.headers.get('x-cache');
      if (cacheHeader === 'HIT') {
        metrics.cacheHits++;
      } else if (cacheHeader === 'MISS') {
        metrics.cacheMisses++;
      }
      
      // Parse response to ensure it's valid
      await response.json();
    } else {
      metrics.failedRequests++;
      metrics.errorTypes[status] = (metrics.errorTypes[status] || 0) + 1;
    }
    
    return { success: true, responseTime, status };
  } catch (error) {
    metrics.totalRequests++;
    metrics.failedRequests++;
    metrics.errorTypes[error.code || 'NETWORK_ERROR'] = 
      (metrics.errorTypes[error.code || 'NETWORK_ERROR'] || 0) + 1;
    
    return { success: false, error: error.message };
  }
}

/**
 * Simulate a single user making multiple requests
 */
async function simulateUser(userId) {
  const userMetrics = {
    requests: 0,
    totalTime: 0
  };
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < TEST_DURATION_MS) {
    // Pick a random endpoint
    const endpoint = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];
    
    // Make request
    const result = await makeRequest(endpoint, userId);
    userMetrics.requests++;
    
    if (result.responseTime) {
      userMetrics.totalTime += result.responseTime;
    }
    
    // Random delay between requests (100-500ms)
    await new Promise(resolve => 
      setTimeout(resolve, 100 + Math.random() * 400)
    );
  }
  
  return userMetrics;
}

/**
 * Calculate statistics from metrics
 */
function calculateStats() {
  const times = metrics.responseTimes.sort((a, b) => a - b);
  const count = times.length;
  
  if (count === 0) {
    return {
      avg: 0,
      min: 0,
      max: 0,
      p50: 0,
      p95: 0,
      p99: 0
    };
  }
  
  const sum = times.reduce((a, b) => a + b, 0);
  
  return {
    avg: Math.round(sum / count),
    min: times[0],
    max: times[count - 1],
    p50: times[Math.floor(count * 0.5)],
    p95: times[Math.floor(count * 0.95)],
    p99: times[Math.floor(count * 0.99)]
  };
}

/**
 * Print results
 */
function printResults(duration) {
  const stats = calculateStats();
  const successRate = ((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2);
  const cacheHitRate = metrics.cacheHits > 0 
    ? ((metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100).toFixed(2)
    : '0';
  const requestsPerSecond = (metrics.totalRequests / (duration / 1000)).toFixed(2);
  
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.blue}📊 LOAD TEST RESULTS${colors.reset}`);
  console.log('='.repeat(60));
  
  console.log(`\n${colors.green}Test Configuration:${colors.reset}`);
  console.log(`  • Concurrent Users: ${CONCURRENT_USERS}`);
  console.log(`  • Test Duration: ${duration}ms`);
  console.log(`  • Endpoints Tested: ${ENDPOINTS.length}`);
  
  console.log(`\n${colors.green}Overall Metrics:${colors.reset}`);
  console.log(`  • Total Requests: ${metrics.totalRequests}`);
  console.log(`  • Successful: ${colors.green}${metrics.successfulRequests}${colors.reset}`);
  console.log(`  • Failed: ${colors.red}${metrics.failedRequests}${colors.reset}`);
  console.log(`  • Success Rate: ${successRate}%`);
  console.log(`  • Requests/Second: ${requestsPerSecond}`);
  
  console.log(`\n${colors.green}Cache Performance:${colors.reset}`);
  console.log(`  • Cache Hits: ${colors.green}${metrics.cacheHits}${colors.reset}`);
  console.log(`  • Cache Misses: ${colors.yellow}${metrics.cacheMisses}${colors.reset}`);
  console.log(`  • Cache Hit Rate: ${cacheHitRate}%`);
  
  console.log(`\n${colors.green}Response Time Statistics (ms):${colors.reset}`);
  console.log(`  • Average: ${stats.avg}ms`);
  console.log(`  • Minimum: ${stats.min}ms`);
  console.log(`  • Maximum: ${stats.max}ms`);
  console.log(`  • 50th percentile (median): ${stats.p50}ms`);
  console.log(`  • 95th percentile: ${stats.p95}ms`);
  console.log(`  • 99th percentile: ${stats.p99}ms`);
  
  if (Object.keys(metrics.statusCodes).length > 0) {
    console.log(`\n${colors.green}HTTP Status Codes:${colors.reset}`);
    Object.entries(metrics.statusCodes)
      .sort((a, b) => b[1] - a[1])
      .forEach(([code, count]) => {
        const color = code.startsWith('2') ? colors.green : 
                     code.startsWith('4') ? colors.yellow : colors.red;
        console.log(`  • ${color}${code}${colors.reset}: ${count}`);
      });
  }
  
  if (Object.keys(metrics.errorTypes).length > 0) {
    console.log(`\n${colors.red}Error Types:${colors.reset}`);
    Object.entries(metrics.errorTypes)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`  • ${type}: ${count}`);
      });
  }
  
  // Performance rating
  console.log(`\n${colors.blue}Performance Rating:${colors.reset}`);
  if (stats.p95 < 100 && successRate > 99) {
    console.log(`  ${colors.green}⭐⭐⭐⭐⭐ EXCELLENT${colors.reset} - Production ready!`);
  } else if (stats.p95 < 200 && successRate > 95) {
    console.log(`  ${colors.green}⭐⭐⭐⭐ GOOD${colors.reset} - Minor optimizations recommended`);
  } else if (stats.p95 < 500 && successRate > 90) {
    console.log(`  ${colors.yellow}⭐⭐⭐ MODERATE${colors.reset} - Performance improvements needed`);
  } else {
    console.log(`  ${colors.red}⭐⭐ POOR${colors.reset} - Significant optimization required`);
  }
  
  console.log('\n' + '='.repeat(60));
}

/**
 * Main function
 */
async function runLoadTest() {
  console.log(`${colors.blue}🚀 Starting Load Test${colors.reset}`);
  console.log(`Testing ${CONCURRENT_USERS} concurrent users for ${TEST_DURATION_MS}ms...`);
  console.log('Press Ctrl+C to stop early\n');
  
  // Start progress indicator
  const progressInterval = setInterval(() => {
    process.stdout.write(
      `\r${colors.gray}Progress: ${metrics.totalRequests} requests | ` +
      `${metrics.successfulRequests} successful | ` +
      `${metrics.cacheHits} cache hits${colors.reset}`
    );
  }, 1000);
  
  const startTime = Date.now();
  
  try {
    // Launch concurrent users
    const userPromises = [];
    for (let i = 0; i < CONCURRENT_USERS; i++) {
      userPromises.push(simulateUser(i));
    }
    
    // Wait for all users to complete
    await Promise.all(userPromises);
    
  } catch (error) {
    console.error(`\n${colors.red}Error during load test:${colors.reset}`, error);
  } finally {
    clearInterval(progressInterval);
    const duration = Date.now() - startTime;
    printResults(duration);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    if (!response.ok) {
      // Try a different endpoint
      const altResponse = await fetch(`${BASE_URL}/`);
      if (!altResponse.ok) {
        throw new Error('Server not responding');
      }
    }
    return true;
  } catch (error) {
    console.error(`${colors.red}❌ Cannot connect to server at ${BASE_URL}${colors.reset}`);
    console.log('Please make sure the server is running: npm run dev');
    return false;
  }
}

// Run the test
(async () => {
  const serverOk = await checkServer();
  if (serverOk) {
    await runLoadTest();
  }
  process.exit(0);
})();
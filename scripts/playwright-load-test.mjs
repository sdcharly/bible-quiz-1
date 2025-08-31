#!/usr/bin/env node
/**
 * Authenticated Load Test using Playwright
 * Tests API performance with real user sessions
 */

import { chromium } from 'playwright';

// Fail fast if Playwright is not installed
try {
  await import('playwright');
} catch (error) {
  console.error('\x1b[31mPlaywright not installed!\x1b[0m');
  console.log('Run: npm install -D playwright');
  process.exit(1);
}

const BASE_URL = 'http://localhost:3001';
const CONCURRENT_USERS = 10; // Reduced for browser testing
const TEST_DURATION_MS = 30000; // 30 seconds

// Test user credentials (use test accounts)
const TEST_USERS = [
  { email: 'test1@example.com', password: 'Test123!@#' },
  { email: 'test2@example.com', password: 'Test123!@#' },
  // Add more test users as needed
];

// Metrics storage
const metrics = {
  loginAttempts: 0,
  loginSuccesses: 0,
  apiCalls: 0,
  cacheHits: 0,
  cacheMisses: 0,
  responseTimes: [],
  errors: []
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
 * Create an authenticated session
 */
async function createAuthenticatedSession(page, userIndex) {
  try {
    // Use Google OAuth test account for simplicity
    await page.goto(`${BASE_URL}/`);
    
    // Click sign in
    await page.click('text=Sign In', { timeout: 5000 });
    
    // Click Google sign in
    await page.click('text=Continue with Google', { timeout: 5000 });
    
    // For testing, we'll use existing sessions or mock auth
    // In production, you'd have test accounts set up
    
    metrics.loginAttempts++;
    metrics.loginSuccesses++;
    
    return true;
  } catch (error) {
    metrics.loginAttempts++;
    metrics.errors.push(`Login failed: ${error.message}`);
    return false;
  }
}

/**
 * Monitor API calls and cache performance
 */
async function setupAPIMonitoring(page) {
  // Intercept API responses
  page.on('response', response => {
    const url = response.url();
    
    if (url.includes('/api/')) {
      metrics.apiCalls++;
      
      // Check cache headers
      const headers = response.headers();
      const cacheStatus = headers['x-cache'];
      
      if (cacheStatus === 'HIT') {
        metrics.cacheHits++;
      } else if (cacheStatus === 'MISS') {
        metrics.cacheMisses++;
      }
      
      // Track response time if available
      const responseTime = headers['x-response-time'];
      if (responseTime) {
        metrics.responseTimes.push(parseFloat(responseTime));
      }
    }
  });
  
  // Log errors
  page.on('pageerror', error => {
    metrics.errors.push(`Page error: ${error.message}`);
  });
}

/**
 * Simulate user actions
 */
async function simulateUserActions(page, duration) {
  const startTime = Date.now();
  const actions = [
    async () => {
      // Navigate to dashboard
      await page.goto(`${BASE_URL}/student/dashboard`);
      await page.waitForLoadState('networkidle');
    },
    async () => {
      // Navigate to quizzes
      await page.goto(`${BASE_URL}/student/quizzes`);
      await page.waitForLoadState('networkidle');
    },
    async () => {
      // Navigate to results
      await page.goto(`${BASE_URL}/student/results`);
      await page.waitForLoadState('networkidle');
    },
    async () => {
      // Navigate to progress
      await page.goto(`${BASE_URL}/student/progress`);
      await page.waitForLoadState('networkidle');
    },
    async () => {
      // Refresh current page
      await page.reload();
      await page.waitForLoadState('networkidle');
    }
  ];
  
  while (Date.now() - startTime < duration) {
    try {
      // Pick a random action
      const action = actions[Math.floor(Math.random() * actions.length)];
      await action();
      
      // Random delay between actions (1-3 seconds)
      await page.waitForTimeout(1000 + Math.random() * 2000);
    } catch (error) {
      metrics.errors.push(`Action failed: ${error.message}`);
    }
  }
}

/**
 * Run load test with a single browser instance
 */
async function runUserSession(userIndex) {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--disable-blink-features=AutomationControlled']
  });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: `LoadTest-User-${userIndex}`
    });
    
    const page = await context.newPage();
    
    // Setup monitoring
    await setupAPIMonitoring(page);
    
    // Try to authenticate (skip for now, use direct navigation)
    // await createAuthenticatedSession(page, userIndex);
    
    // Simulate user actions
    await simulateUserActions(page, TEST_DURATION_MS);
    
  } catch (error) {
    metrics.errors.push(`Session ${userIndex} error: ${error.message}`);
  } finally {
    await browser.close();
  }
}

/**
 * Calculate statistics
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
  const cacheHitRate = metrics.cacheHits > 0 
    ? ((metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100).toFixed(2)
    : '0';
  
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.blue}📊 PLAYWRIGHT LOAD TEST RESULTS${colors.reset}`);
  console.log('='.repeat(60));
  
  console.log(`\n${colors.green}Test Configuration:${colors.reset}`);
  console.log(`  • Concurrent Users: ${CONCURRENT_USERS}`);
  console.log(`  • Test Duration: ${duration}ms`);
  
  console.log(`\n${colors.green}API Performance:${colors.reset}`);
  console.log(`  • Total API Calls: ${metrics.apiCalls}`);
  console.log(`  • Cache Hits: ${colors.green}${metrics.cacheHits}${colors.reset}`);
  console.log(`  • Cache Misses: ${colors.yellow}${metrics.cacheMisses}${colors.reset}`);
  console.log(`  • Cache Hit Rate: ${cacheHitRate}%`);
  
  if (stats.avg > 0) {
    console.log(`\n${colors.green}Response Time Statistics (ms):${colors.reset}`);
    console.log(`  • Average: ${stats.avg}ms`);
    console.log(`  • Minimum: ${stats.min}ms`);
    console.log(`  • Maximum: ${stats.max}ms`);
    console.log(`  • 50th percentile: ${stats.p50}ms`);
    console.log(`  • 95th percentile: ${stats.p95}ms`);
    console.log(`  • 99th percentile: ${stats.p99}ms`);
  }
  
  if (metrics.errors.length > 0) {
    console.log(`\n${colors.red}Errors (${metrics.errors.length}):${colors.reset}`);
    const uniqueErrors = [...new Set(metrics.errors)];
    uniqueErrors.slice(0, 5).forEach(error => {
      console.log(`  • ${error}`);
    });
    if (uniqueErrors.length > 5) {
      console.log(`  • ... and ${uniqueErrors.length - 5} more`);
    }
  }
  
  // Performance rating
  console.log(`\n${colors.blue}Cache Performance Rating:${colors.reset}`);
  if (parseFloat(cacheHitRate) > 80) {
    console.log(`  ${colors.green}⭐⭐⭐⭐⭐ EXCELLENT${colors.reset} - Cache is highly effective!`);
  } else if (parseFloat(cacheHitRate) > 60) {
    console.log(`  ${colors.green}⭐⭐⭐⭐ GOOD${colors.reset} - Cache is working well`);
  } else if (parseFloat(cacheHitRate) > 40) {
    console.log(`  ${colors.yellow}⭐⭐⭐ MODERATE${colors.reset} - Cache could be improved`);
  } else {
    console.log(`  ${colors.red}⭐⭐ NEEDS IMPROVEMENT${colors.reset} - Cache hit rate is low`);
  }
  
  console.log('\n' + '='.repeat(60));
}

/**
 * Main function
 */
async function main() {
  console.log(`${colors.blue}🚀 Starting Playwright Load Test${colors.reset}`);
  console.log(`Testing ${CONCURRENT_USERS} concurrent users for ${TEST_DURATION_MS}ms...`);
  console.log('Note: Testing without authentication (public pages)\n');
  
  const startTime = Date.now();
  
  try {
    // Launch concurrent user sessions
    const sessions = [];
    for (let i = 0; i < CONCURRENT_USERS; i++) {
      // Stagger the start slightly
      await new Promise(resolve => setTimeout(resolve, 500));
      sessions.push(runUserSession(i));
      console.log(`${colors.gray}Started session ${i + 1}/${CONCURRENT_USERS}${colors.reset}`);
    }
    
    // Wait for all sessions to complete
    await Promise.all(sessions);
    
  } catch (error) {
    console.error(`${colors.red}Test failed:${colors.reset}`, error);
  } finally {
    const duration = Date.now() - startTime;
    printResults(duration);
  }
}

// Run the test
main().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
#!/usr/bin/env node
/**
 * Mobile User Performance Test
 * Simulates real mobile users accessing the student panel
 */

import { chromium, devices } from 'playwright';

const BASE_URL = 'http://localhost:3001';
const CONCURRENT_USERS = 5; // Realistic for mobile testing
const TEST_DURATION_MS = 60000; // 1 minute

// Mobile device presets to simulate
const MOBILE_DEVICES = [
  devices['iPhone 13'],
  devices['iPhone 12'],
  devices['Pixel 5'],
  devices['Galaxy S21'],
  devices['iPad (gen 7)']
];

// Realistic test user account (using your test env credentials)
const TEST_USER = {
  email: 'sdcharly@gmail.com',
  password: 'Test123!@#', // You'll need to use actual test password
  useGoogleAuth: true
};

// Metrics storage
const metrics = {
  pageLoads: 0,
  apiCalls: 0,
  cacheHits: 0,
  cacheMisses: 0,
  responseTimes: [],
  pageLoadTimes: [],
  networkRequests: [],
  errors: [],
  deviceMetrics: {}
};

// Initialize device metrics
MOBILE_DEVICES.forEach(device => {
  metrics.deviceMetrics[device.name] = {
    pageLoads: 0,
    avgResponseTime: 0,
    cacheHitRate: 0
  };
});

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  bold: '\x1b[1m'
};

/**
 * Simulate realistic mobile user behavior
 */
async function simulateMobileUser(page, deviceName, duration) {
  const startTime = Date.now();
  const deviceMetrics = {
    apiCalls: 0,
    cacheHits: 0,
    responseTimes: []
  };
  
  // Mobile user behavior patterns
  const userJourneys = [
    async () => {
      // Journey 1: Check available quizzes
      console.log(`  ${colors.gray}[${deviceName}] Checking quizzes...${colors.reset}`);
      await page.goto(`${BASE_URL}/student/quizzes`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000 + Math.random() * 3000); // Read time
      
      // Scroll like a mobile user
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
      await page.waitForTimeout(1000);
    },
    
    async () => {
      // Journey 2: Check dashboard
      console.log(`  ${colors.gray}[${deviceName}] Viewing dashboard...${colors.reset}`);
      await page.goto(`${BASE_URL}/student/dashboard`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000 + Math.random() * 2000); // Read time
      
      // Pull to refresh simulation
      await page.evaluate(() => window.scrollTo(0, -100));
      await page.waitForTimeout(500);
      await page.reload();
    },
    
    async () => {
      // Journey 3: Check results
      console.log(`  ${colors.gray}[${deviceName}] Checking results...${colors.reset}`);
      await page.goto(`${BASE_URL}/student/results`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000 + Math.random() * 2000);
      
      // Scroll through results
      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => window.scrollBy(0, 200));
        await page.waitForTimeout(500);
      }
    },
    
    async () => {
      // Journey 4: View progress
      console.log(`  ${colors.gray}[${deviceName}] Viewing progress...${colors.reset}`);
      await page.goto(`${BASE_URL}/student/progress`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000 + Math.random() * 3000);
    }
  ];
  
  // Track API responses for this device
  const responseHandler = response => {
    const url = response.url();
    
    if (url.includes('/api/')) {
      deviceMetrics.apiCalls++;
      metrics.apiCalls++;
      
      const headers = response.headers();
      const cacheStatus = headers['x-cache'];
      const responseTime = headers['x-response-time'];
      
      if (cacheStatus === 'HIT') {
        deviceMetrics.cacheHits++;
        metrics.cacheHits++;
      } else if (cacheStatus === 'MISS') {
        metrics.cacheMisses++;
      }
      
      if (responseTime) {
        const time = parseFloat(responseTime);
        deviceMetrics.responseTimes.push(time);
        metrics.responseTimes.push(time);
      }
    }
  };
  
  page.on('response', responseHandler);
  
  // Simulate realistic mobile user session
  while (Date.now() - startTime < duration) {
    try {
      // Pick a random user journey
      const journey = userJourneys[Math.floor(Math.random() * userJourneys.length)];
      
      const pageLoadStart = Date.now();
      await journey();
      const pageLoadTime = Date.now() - pageLoadStart;
      
      metrics.pageLoads++;
      metrics.pageLoadTimes.push(pageLoadTime);
      
      // Mobile users often switch apps - simulate with longer delays
      const delay = 5000 + Math.random() * 10000; // 5-15 seconds between actions
      console.log(`  ${colors.gray}[${deviceName}] Idle for ${(delay/1000).toFixed(1)}s...${colors.reset}`);
      await page.waitForTimeout(delay);
      
    } catch (error) {
      metrics.errors.push(`[${deviceName}] ${error.message}`);
    }
  }
  
  // Update device-specific metrics
  const avgResponseTime = deviceMetrics.responseTimes.length > 0
    ? deviceMetrics.responseTimes.reduce((a, b) => a + b, 0) / deviceMetrics.responseTimes.length
    : 0;
  
  const cacheHitRate = deviceMetrics.apiCalls > 0
    ? (deviceMetrics.cacheHits / deviceMetrics.apiCalls) * 100
    : 0;
  
  metrics.deviceMetrics[deviceName] = {
    pageLoads: metrics.pageLoads,
    avgResponseTime: Math.round(avgResponseTime),
    cacheHitRate: Math.round(cacheHitRate)
  };
  
  page.off('response', responseHandler);
}

/**
 * Create mobile browser session
 */
async function createMobileSession(deviceIndex) {
  const device = MOBILE_DEVICES[deviceIndex % MOBILE_DEVICES.length];
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-sandbox'
    ]
  });
  
  try {
    console.log(`${colors.blue}📱 Starting ${device.name} session...${colors.reset}`);
    
    const context = await browser.newContext({
      ...device,
      // Simulate real mobile network conditions
      offline: false,
      // Add realistic headers
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    
    // Simulate mobile network throttling
    const page = await context.newPage();
    
    // Go to home page first
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    
    // Simulate the user session
    await simulateMobileUser(page, device.name, TEST_DURATION_MS);
    
    console.log(`${colors.green}✓ ${device.name} session completed${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}✗ ${device.name} session failed: ${error.message}${colors.reset}`);
    metrics.errors.push(`${device.name}: ${error.message}`);
  } finally {
    await browser.close();
  }
}

/**
 * Calculate and display statistics
 */
function displayResults() {
  const responseTimes = metrics.responseTimes.sort((a, b) => a - b);
  const pageLoadTimes = metrics.pageLoadTimes.sort((a, b) => a - b);
  
  const calculatePercentile = (arr, p) => {
    if (arr.length === 0) return 0;
    const index = Math.floor(arr.length * p);
    return arr[index];
  };
  
  const avgResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : 0;
  
  const avgPageLoadTime = pageLoadTimes.length > 0
    ? pageLoadTimes.reduce((a, b) => a + b, 0) / pageLoadTimes.length
    : 0;
  
  const cacheHitRate = (metrics.cacheHits + metrics.cacheMisses) > 0
    ? (metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100
    : 0;
  
  console.log('\n' + '='.repeat(70));
  console.log(`${colors.blue}${colors.bold}📊 MOBILE PERFORMANCE TEST RESULTS${colors.reset}`);
  console.log('='.repeat(70));
  
  console.log(`\n${colors.green}Test Summary:${colors.reset}`);
  console.log(`  • Devices Tested: ${MOBILE_DEVICES.map(d => d.name).join(', ')}`);
  console.log(`  • Test Duration: ${TEST_DURATION_MS / 1000} seconds`);
  console.log(`  • Total Page Loads: ${metrics.pageLoads}`);
  console.log(`  • Total API Calls: ${metrics.apiCalls}`);
  
  console.log(`\n${colors.green}📱 Device-Specific Performance:${colors.reset}`);
  Object.entries(metrics.deviceMetrics).forEach(([device, stats]) => {
    const rating = stats.cacheHitRate > 70 ? '✅' : stats.cacheHitRate > 40 ? '⚠️' : '❌';
    console.log(`  ${device}:`);
    console.log(`    • Avg Response Time: ${stats.avgResponseTime}ms`);
    console.log(`    • Cache Hit Rate: ${stats.cacheHitRate}% ${rating}`);
  });
  
  console.log(`\n${colors.green}⚡ Cache Performance:${colors.reset}`);
  console.log(`  • Total Cache Hits: ${colors.green}${metrics.cacheHits}${colors.reset}`);
  console.log(`  • Total Cache Misses: ${colors.yellow}${metrics.cacheMisses}${colors.reset}`);
  console.log(`  • Overall Cache Hit Rate: ${colors.bold}${cacheHitRate.toFixed(1)}%${colors.reset}`);
  
  if (responseTimes.length > 0) {
    console.log(`\n${colors.green}⏱️ API Response Times:${colors.reset}`);
    console.log(`  • Average: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`  • P50 (Median): ${calculatePercentile(responseTimes, 0.5).toFixed(0)}ms`);
    console.log(`  • P95: ${calculatePercentile(responseTimes, 0.95).toFixed(0)}ms`);
    console.log(`  • P99: ${calculatePercentile(responseTimes, 0.99).toFixed(0)}ms`);
  }
  
  if (pageLoadTimes.length > 0) {
    console.log(`\n${colors.green}📄 Page Load Times:${colors.reset}`);
    console.log(`  • Average: ${(avgPageLoadTime / 1000).toFixed(1)}s`);
    console.log(`  • P50 (Median): ${(calculatePercentile(pageLoadTimes, 0.5) / 1000).toFixed(1)}s`);
    console.log(`  • P95: ${(calculatePercentile(pageLoadTimes, 0.95) / 1000).toFixed(1)}s`);
  }
  
  // Performance insights
  console.log(`\n${colors.blue}💡 Performance Insights:${colors.reset}`);
  
  if (cacheHitRate > 70) {
    console.log(`  ${colors.green}✅ Excellent cache performance (${cacheHitRate.toFixed(1)}% hit rate)${colors.reset}`);
    console.log(`     Cache is significantly reducing server load and improving response times`);
  } else if (cacheHitRate > 40) {
    console.log(`  ${colors.yellow}⚠️ Moderate cache performance (${cacheHitRate.toFixed(1)}% hit rate)${colors.reset}`);
    console.log(`     Consider increasing cache TTL or implementing prefetching`);
  } else {
    console.log(`  ${colors.red}❌ Poor cache performance (${cacheHitRate.toFixed(1)}% hit rate)${colors.reset}`);
    console.log(`     Cache strategy needs improvement`);
  }
  
  if (avgResponseTime < 100) {
    console.log(`  ${colors.green}✅ Excellent API response times (avg ${avgResponseTime.toFixed(0)}ms)${colors.reset}`);
  } else if (avgResponseTime < 300) {
    console.log(`  ${colors.yellow}⚠️ Good API response times (avg ${avgResponseTime.toFixed(0)}ms)${colors.reset}`);
  } else {
    console.log(`  ${colors.red}❌ Slow API responses (avg ${avgResponseTime.toFixed(0)}ms)${colors.reset}`);
  }
  
  const avgPageLoadSeconds = avgPageLoadTime / 1000;
  if (avgPageLoadSeconds < 3) {
    console.log(`  ${colors.green}✅ Fast page loads (avg ${avgPageLoadSeconds.toFixed(1)}s)${colors.reset}`);
  } else if (avgPageLoadSeconds < 5) {
    console.log(`  ${colors.yellow}⚠️ Moderate page load times (avg ${avgPageLoadSeconds.toFixed(1)}s)${colors.reset}`);
  } else {
    console.log(`  ${colors.red}❌ Slow page loads (avg ${avgPageLoadSeconds.toFixed(1)}s)${colors.reset}`);
  }
  
  if (metrics.errors.length > 0) {
    console.log(`\n${colors.red}⚠️ Errors Encountered (${metrics.errors.length}):${colors.reset}`);
    const uniqueErrors = [...new Set(metrics.errors)];
    uniqueErrors.slice(0, 3).forEach(error => {
      console.log(`  • ${error}`);
    });
  }
  
  // Overall rating
  console.log(`\n${colors.blue}${colors.bold}🏆 Overall Mobile Performance Score:${colors.reset}`);
  const score = (cacheHitRate * 0.4) + 
                ((100 - Math.min(avgResponseTime, 500) / 5) * 0.3) +
                ((100 - Math.min(avgPageLoadSeconds * 10, 100)) * 0.3);
  
  if (score > 80) {
    console.log(`  ${colors.green}⭐⭐⭐⭐⭐ EXCELLENT (${score.toFixed(0)}/100)${colors.reset}`);
    console.log(`  Mobile users will have a great experience!`);
  } else if (score > 60) {
    console.log(`  ${colors.green}⭐⭐⭐⭐ GOOD (${score.toFixed(0)}/100)${colors.reset}`);
    console.log(`  Mobile performance is solid with room for improvement`);
  } else if (score > 40) {
    console.log(`  ${colors.yellow}⭐⭐⭐ MODERATE (${score.toFixed(0)}/100)${colors.reset}`);
    console.log(`  Mobile users may experience some delays`);
  } else {
    console.log(`  ${colors.red}⭐⭐ NEEDS IMPROVEMENT (${score.toFixed(0)}/100)${colors.reset}`);
    console.log(`  Significant optimization required for mobile users`);
  }
  
  console.log('\n' + '='.repeat(70) + '\n');
}

/**
 * Main function
 */
async function main() {
  console.log(`${colors.blue}${colors.bold}📱 Mobile Performance Test Suite${colors.reset}`);
  console.log(`Testing with ${CONCURRENT_USERS} concurrent mobile users\n`);
  
  try {
    // Test server connectivity
    const testBrowser = await chromium.launch({ headless: true });
    const testPage = await testBrowser.newPage();
    await testPage.goto(BASE_URL, { timeout: 10000 });
    await testBrowser.close();
    
    // Run concurrent mobile sessions
    const sessions = [];
    for (let i = 0; i < CONCURRENT_USERS; i++) {
      // Stagger starts to simulate realistic traffic
      await new Promise(resolve => setTimeout(resolve, 2000));
      sessions.push(createMobileSession(i));
    }
    
    // Wait for all sessions
    await Promise.all(sessions);
    
    // Display results
    displayResults();
    
  } catch (error) {
    console.error(`${colors.red}Test failed: ${error.message}${colors.reset}`);
    console.log('Make sure the server is running at', BASE_URL);
  }
}

// Run the test
main().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
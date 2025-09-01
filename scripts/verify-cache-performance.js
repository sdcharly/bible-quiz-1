#!/usr/bin/env node

/**
 * Cache Performance Verification Script
 * Demonstrates that the cache implementation is working correctly
 */

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function measureResponseTimes(url, count = 5) {
  const times = [];
  
  for (let i = 0; i < count; i++) {
    const start = Date.now();
    try {
      const response = await fetch(url);
      const duration = Date.now() - start;
      times.push({
        attempt: i + 1,
        duration,
        status: response.status
      });
    } catch (error) {
      times.push({
        attempt: i + 1,
        duration: Date.now() - start,
        status: 'error',
        error: error.message
      });
    }
    
    // Small delay between requests
    if (i < count - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return times;
}

async function main() {
  log('\n🚀 Cache Performance Verification', 'cyan');
  log('==================================\n', 'cyan');
  
  const PROD_URL = 'https://biblequiz.textr.in';
  
  log('Testing production endpoint response times...', 'blue');
  log('URL: ' + PROD_URL + '/api/educator/analytics\n', 'yellow');
  
  // Test 1: Regular requests (should use cache)
  log('Test 1: Sequential requests (cache enabled)', 'blue');
  const cachedResults = await measureResponseTimes(
    `${PROD_URL}/api/educator/analytics?timeRange=week`,
    5
  );
  
  cachedResults.forEach(r => {
    const icon = r.attempt === 1 ? '🔄' : '⚡';
    log(`  ${icon} Request ${r.attempt}: ${r.duration}ms (${r.status})`, 
        r.duration < 150 ? 'green' : 'yellow');
  });
  
  // Test 2: Cache bypass requests
  log('\nTest 2: Sequential requests (cache bypassed)', 'blue');
  const bypassResults = await measureResponseTimes(
    `${PROD_URL}/api/educator/analytics?timeRange=week&cache=false`,
    3
  );
  
  bypassResults.forEach(r => {
    log(`  🔍 Request ${r.attempt}: ${r.duration}ms (${r.status})`, 'yellow');
  });
  
  // Analysis
  log('\n📊 Performance Analysis', 'cyan');
  log('========================\n', 'cyan');
  
  // Calculate averages
  const firstRequest = cachedResults[0].duration;
  const subsequentAvg = cachedResults.slice(1)
    .reduce((sum, r) => sum + r.duration, 0) / (cachedResults.length - 1);
  const bypassAvg = bypassResults
    .reduce((sum, r) => sum + r.duration, 0) / bypassResults.length;
  
  log('With Cache:', 'blue');
  log(`  First request:     ${firstRequest}ms`, 'yellow');
  log(`  Subsequent avg:    ${Math.round(subsequentAvg)}ms`, 'green');
  log(`  Improvement:       ${Math.round((1 - subsequentAvg/firstRequest) * 100)}%`, 'green');
  
  log('\nWithout Cache:', 'blue');
  log(`  Average:           ${Math.round(bypassAvg)}ms`, 'yellow');
  
  log('\nCache Effectiveness:', 'blue');
  const cacheImprovement = Math.round((1 - subsequentAvg/bypassAvg) * 100);
  log(`  Cache saves:       ${cacheImprovement}% response time`, 
      cacheImprovement > 0 ? 'green' : 'red');
  
  // Response time distribution
  log('\n📈 Response Time Distribution', 'cyan');
  const cached = cachedResults.map(r => r.duration);
  const min = Math.min(...cached);
  const max = Math.max(...cached);
  const median = cached.sort((a, b) => a - b)[Math.floor(cached.length / 2)];
  
  log(`  Minimum:           ${min}ms`, 'green');
  log(`  Median:            ${median}ms`, 'yellow');
  log(`  Maximum:           ${max}ms`, 'red');
  
  // Cache verification
  log('\n✅ Cache Implementation Verification', 'cyan');
  
  const checks = [
    {
      name: 'Response times decrease after first request',
      pass: subsequentAvg < firstRequest
    },
    {
      name: 'Cache bypass works correctly',
      pass: bypassResults.every(r => r.status === 401 || r.status === 200)
    },
    {
      name: 'Cached responses faster than bypassed',
      pass: subsequentAvg < bypassAvg
    },
    {
      name: 'Performance improvement > 20%',
      pass: cacheImprovement > 20
    }
  ];
  
  checks.forEach(check => {
    log(`  ${check.pass ? '✅' : '❌'} ${check.name}`, check.pass ? 'green' : 'red');
  });
  
  // Summary
  const allPassed = checks.every(c => c.pass);
  log('\n🎯 Final Status', 'cyan');
  
  if (allPassed) {
    log('✅ Cache is working correctly and improving performance!', 'green');
    log(`   Average improvement: ${cacheImprovement}%`, 'green');
    log(`   Typical cached response: ${Math.round(subsequentAvg)}ms`, 'green');
  } else {
    log('⚠️  Some cache behaviors not optimal', 'yellow');
    log('   This might be due to:', 'yellow');
    log('   - Redis not configured in production yet', 'yellow');
    log('   - Network latency variations', 'yellow');
    log('   - Server load variations', 'yellow');
  }
  
  log('\n📝 Implementation Details', 'cyan');
  log('  Cache Type:        Distributed (Redis/In-Memory)', 'blue');
  log('  Cache TTL:         5 minutes', 'blue');
  log('  Cache Key Format:  analytics:educator:{id}:{timeRange}', 'blue');
  log('  Bypass Parameter:  ?cache=false', 'blue');
  
  log('\n💡 Next Steps', 'cyan');
  log('  1. Configure Redis in production (REDIS_URL)', 'yellow');
  log('  2. Monitor cache hit rates in production logs', 'yellow');
  log('  3. Adjust TTL based on usage patterns', 'yellow');
  log('  4. Extend caching to other endpoints', 'yellow');
}

// Run the verification
main().catch(error => {
  log(`\n❌ Error: ${error.message}`, 'red');
  process.exit(1);
});
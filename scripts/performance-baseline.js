/**
 * Performance Baseline Monitoring Script
 * Captures current system performance metrics before optimizations
 * Run this for 24 hours to establish baseline metrics
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Configuration
const METRICS_FILE = path.join(__dirname, '../logs/baseline-metrics.json');
const MONITORING_INTERVAL = 60000; // Check every minute
const MONITORING_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Metrics storage
const metrics = {
  startTime: new Date().toISOString(),
  quizStartTimes: [],
  submissionTimes: [],
  dbQueryTimes: [],
  memoryUsage: [],
  concurrentUsers: [],
  errorRates: [],
  cacheHitRates: [],
  apiResponseTimes: {},
  checkpoints: []
};

// Load existing metrics if available
if (fs.existsSync(METRICS_FILE)) {
  try {
    const existing = JSON.parse(fs.readFileSync(METRICS_FILE, 'utf8'));
    Object.assign(metrics, existing);
    console.log('Resuming from existing metrics file');
  } catch (error) {
    console.log('Starting fresh metrics collection');
  }
}

/**
 * Fetch current metrics from the application
 */
async function captureMetrics() {
  const timestamp = new Date().toISOString();
  const checkpoint = {
    timestamp,
    metrics: {}
  };

  try {
    // Monitor quiz start times
    const quizStartResponse = await fetchWithTimeout('http://localhost:3000/api/metrics/quiz-starts');
    if (quizStartResponse.ok) {
      const data = await quizStartResponse.json();
      checkpoint.metrics.quizStarts = data;
      if (data.recentStarts) {
        metrics.quizStartTimes.push(...data.recentStarts);
      }
    }

    // Monitor submission times
    const submissionResponse = await fetchWithTimeout('http://localhost:3000/api/metrics/submissions');
    if (submissionResponse.ok) {
      const data = await submissionResponse.json();
      checkpoint.metrics.submissions = data;
      if (data.recentSubmissions) {
        metrics.submissionTimes.push(...data.recentSubmissions);
      }
    }

    // Monitor database performance
    const dbResponse = await fetchWithTimeout('http://localhost:3000/api/metrics/database');
    if (dbResponse.ok) {
      const data = await dbResponse.json();
      checkpoint.metrics.database = data;
      metrics.dbQueryTimes.push({
        timestamp,
        avgQueryTime: data.avgQueryTime,
        activeConnections: data.activeConnections,
        poolUtilization: data.poolUtilization
      });
    }

    // Monitor memory usage
    const memoryResponse = await fetchWithTimeout('http://localhost:3000/api/metrics/memory');
    if (memoryResponse.ok) {
      const data = await memoryResponse.json();
      checkpoint.metrics.memory = data;
      metrics.memoryUsage.push({
        timestamp,
        heapUsed: data.heapUsed,
        heapTotal: data.heapTotal,
        rss: data.rss,
        external: data.external
      });
    }

    // Monitor concurrent users
    const usersResponse = await fetchWithTimeout('http://localhost:3000/api/metrics/active-users');
    if (usersResponse.ok) {
      const data = await usersResponse.json();
      checkpoint.metrics.activeUsers = data;
      metrics.concurrentUsers.push({
        timestamp,
        count: data.activeUsers,
        studentCount: data.students,
        educatorCount: data.educators
      });
    }

    // Monitor cache performance
    const cacheResponse = await fetchWithTimeout('http://localhost:3000/api/metrics/cache');
    if (cacheResponse.ok) {
      const data = await cacheResponse.json();
      checkpoint.metrics.cache = data;
      metrics.cacheHitRates.push({
        timestamp,
        hitRate: data.hitRate,
        size: data.size,
        evictions: data.evictions
      });
    }

    // Add checkpoint
    metrics.checkpoints.push(checkpoint);

    // Save metrics to file
    saveMetrics();

    // Log current status
    console.log(`[${timestamp}] Metrics captured:`, {
      activeUsers: checkpoint.metrics.activeUsers?.activeUsers || 0,
      memoryMB: Math.round((checkpoint.metrics.memory?.heapUsed || 0) / 1024 / 1024),
      dbConnections: checkpoint.metrics.database?.activeConnections || 0,
      cacheHitRate: checkpoint.metrics.cache?.hitRate || 0
    });

  } catch (error) {
    console.error(`[${timestamp}] Error capturing metrics:`, error.message);
    metrics.errorRates.push({
      timestamp,
      error: error.message
    });
  }
}

/**
 * Fetch with timeout to prevent hanging
 */
async function fetchWithTimeout(url, timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Save metrics to file
 */
function saveMetrics() {
  try {
    // Keep only last 24 hours of detailed data
    const cutoffTime = Date.now() - MONITORING_DURATION;
    
    // Trim old data
    ['quizStartTimes', 'submissionTimes', 'dbQueryTimes', 'memoryUsage', 'concurrentUsers', 'errorRates', 'cacheHitRates'].forEach(key => {
      if (metrics[key] && Array.isArray(metrics[key])) {
        metrics[key] = metrics[key].filter(item => {
          const itemTime = new Date(item.timestamp || item.time).getTime();
          return itemTime > cutoffTime;
        });
      }
    });

    // Keep only last 1000 checkpoints
    if (metrics.checkpoints.length > 1000) {
      metrics.checkpoints = metrics.checkpoints.slice(-1000);
    }

    // Calculate summary statistics
    metrics.summary = calculateSummary();

    // Write to file
    fs.writeFileSync(METRICS_FILE, JSON.stringify(metrics, null, 2));
  } catch (error) {
    console.error('Error saving metrics:', error);
  }
}

/**
 * Calculate summary statistics
 */
function calculateSummary() {
  const summary = {
    lastUpdated: new Date().toISOString(),
    duration: Date.now() - new Date(metrics.startTime).getTime(),
    totals: {}
  };

  // Quiz start times statistics
  if (metrics.quizStartTimes.length > 0) {
    const times = metrics.quizStartTimes.map(t => t.duration).filter(Boolean);
    summary.quizStartTimes = {
      count: times.length,
      avg: average(times),
      p50: percentile(times, 50),
      p95: percentile(times, 95),
      p99: percentile(times, 99),
      max: Math.max(...times)
    };
  }

  // Submission times statistics
  if (metrics.submissionTimes.length > 0) {
    const times = metrics.submissionTimes.map(t => t.duration).filter(Boolean);
    summary.submissionTimes = {
      count: times.length,
      avg: average(times),
      p50: percentile(times, 50),
      p95: percentile(times, 95),
      p99: percentile(times, 99),
      max: Math.max(...times)
    };
  }

  // Memory usage statistics
  if (metrics.memoryUsage.length > 0) {
    const heapSizes = metrics.memoryUsage.map(m => m.heapUsed);
    summary.memoryUsage = {
      samples: heapSizes.length,
      avgMB: Math.round(average(heapSizes) / 1024 / 1024),
      maxMB: Math.round(Math.max(...heapSizes) / 1024 / 1024),
      minMB: Math.round(Math.min(...heapSizes) / 1024 / 1024)
    };
  }

  // Concurrent users statistics
  if (metrics.concurrentUsers.length > 0) {
    const counts = metrics.concurrentUsers.map(u => u.count);
    summary.concurrentUsers = {
      samples: counts.length,
      avg: Math.round(average(counts)),
      max: Math.max(...counts),
      peak: metrics.concurrentUsers.reduce((max, u) => 
        u.count > max.count ? u : max, metrics.concurrentUsers[0])
    };
  }

  // Cache performance
  if (metrics.cacheHitRates.length > 0) {
    const rates = metrics.cacheHitRates.map(c => c.hitRate);
    summary.cachePerformance = {
      avgHitRate: average(rates),
      minHitRate: Math.min(...rates),
      maxHitRate: Math.max(...rates)
    };
  }

  // Error rate
  summary.errorRate = metrics.errorRates.length / metrics.checkpoints.length;

  return summary;
}

/**
 * Helper functions for statistics
 */
function average(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = arr.slice().sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Graceful shutdown
 */
function shutdown() {
  console.log('\nShutting down performance monitoring...');
  
  // Final save
  saveMetrics();
  
  // Print summary
  console.log('\n=== Performance Baseline Summary ===');
  console.log(JSON.stringify(metrics.summary, null, 2));
  console.log('\nMetrics saved to:', METRICS_FILE);
  
  process.exit(0);
}

// Handle shutdown signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start monitoring
console.log('Starting performance baseline monitoring...');
console.log('Metrics will be saved to:', METRICS_FILE);
console.log('Press Ctrl+C to stop and view summary\n');

// Initial capture
captureMetrics();

// Schedule regular captures
const interval = setInterval(captureMetrics, MONITORING_INTERVAL);

// Auto-stop after 24 hours
setTimeout(() => {
  clearInterval(interval);
  shutdown();
}, MONITORING_DURATION);
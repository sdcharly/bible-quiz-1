import { test, expect } from '@playwright/test';

test.describe('Database Connection Pool Optimization', () => {
  test.beforeEach(async ({ page }) => {
    // Enable database optimization features
    await page.goto('/');
    await page.evaluate(() => {
      window.__featureFlags = {
        OPTIMIZED_DB_POOL: true,
        DB_CONNECTION_MONITORING: true
      };
    });
  });

  test('database pool health check works', async ({ page }) => {
    const response = await page.request.get('/api/db-pool');
    expect(response.ok()).toBe(true);
    
    const data = await response.json();
    expect(data).toHaveProperty('health');
    expect(data).toHaveProperty('stats');
    expect(data).toHaveProperty('features');
    
    // Check health response
    expect(data.health).toHaveProperty('healthy');
    expect(data.health).toHaveProperty('responseTime');
    expect(data.health.poolType).toBeDefined();
    
    // Check features are enabled
    expect(data.features.optimizedPool).toBe(true);
    expect(data.features.monitoring).toBe(true);
    
    console.log('DB Health:', data.health);
    console.log('Pool Stats:', data.stats);
  });

  test('optimized endpoint uses new connection pool', async ({ page }) => {
    const response = await page.request.get('/api/student/quizzes/optimized');
    
    // Should work with optimized pool (may require auth, but should not error on pool)
    expect(response.status()).toBeLessThan(500); // Not a server error
    
    // If unauthorized, should be 401, not 500 (connection error)
    if (!response.ok()) {
      expect(response.status()).toBe(401);
    }
  });

  test('database pool handles concurrent requests', async ({ page, browser }) => {
    // Create multiple contexts to simulate concurrent users
    const contexts = [];
    for (let i = 0; i < 10; i++) {
      contexts.push(await browser.newContext());
    }

    // Get initial pool stats
    const initialStats = await page.request.get('/api/db-pool');
    const initialData = await initialStats.json();
    console.log('Initial pool stats:', initialData.stats);

    // Make concurrent requests to database endpoints
    const concurrentRequests = contexts.map(async (context, i) => {
      const contextPage = await context.newPage();
      const startTime = Date.now();
      
      try {
        const response = await contextPage.request.get('/api/metrics/memory');
        const duration = Date.now() - startTime;
        
        return {
          index: i,
          success: response.ok(),
          status: response.status(),
          duration,
          error: null
        };
      } catch (error) {
        return {
          index: i,
          success: false,
          status: 0,
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      } finally {
        await context.close();
      }
    });

    // Wait for all requests to complete
    const results = await Promise.all(concurrentRequests);
    
    // Analyze results
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`Concurrent requests: ${successful.length}/${results.length} successful`);
    console.log(`Average duration: ${Math.round(results.reduce((sum, r) => sum + r.duration, 0) / results.length)}ms`);
    
    // Check final pool stats
    const finalStats = await page.request.get('/api/db-pool');
    const finalData = await finalStats.json();
    console.log('Final pool stats:', finalData.stats);
    
    // Most requests should succeed (allowing for some potential auth failures)
    expect(successful.length).toBeGreaterThan(results.length * 0.8); // 80% success rate
    
    // No requests should take too long (connection pool exhaustion)
    const slowRequests = results.filter(r => r.duration > 10000); // 10 seconds
    expect(slowRequests.length).toBe(0);
    
    // Check that pool is still healthy
    expect(finalData.health.healthy).toBe(true);
  });

  test('feature flag controls database pool type', async ({ page }) => {
    // Test with optimized pool enabled
    await page.evaluate(() => {
      window.__featureFlags = {
        OPTIMIZED_DB_POOL: true,
        DB_CONNECTION_MONITORING: true
      };
    });

    const optimizedResponse = await page.request.get('/api/db-pool');
    const optimizedData = await optimizedResponse.json();
    
    expect(optimizedData.health.poolType).toBe('optimized');
    expect(optimizedData.features.optimizedPool).toBe(true);
    
    // Test with optimized pool disabled
    await page.evaluate(() => {
      window.__featureFlags = {
        OPTIMIZED_DB_POOL: false,
        DB_CONNECTION_MONITORING: false
      };
    });

    const legacyResponse = await page.request.get('/api/db-pool');
    const legacyData = await legacyResponse.json();
    
    expect(legacyData.health.poolType).toBe('legacy');
    expect(legacyData.features.optimizedPool).toBe(false);
    
    console.log('Pool types verified - optimized vs legacy');
  });

  test('database metrics are collected correctly', async ({ page }) => {
    const endpoints = [
      '/api/metrics/database',
      '/api/metrics/active-users',
      '/api/metrics/memory'
    ];

    for (const endpoint of endpoints) {
      const response = await page.request.get(endpoint);
      expect(response.ok()).toBe(true);
      
      const data = await response.json();
      expect(data).toHaveProperty('timestamp');
      
      // Database metrics should have connection info
      if (endpoint.includes('database')) {
        expect(data).toHaveProperty('activeConnections');
        expect(data).toHaveProperty('totalConnections');
        expect(data).toHaveProperty('poolUtilization');
        
        console.log(`Database metrics: ${data.activeConnections}/${data.totalConnections} connections (${Math.round(data.poolUtilization * 100)}% utilized)`);
      }
    }
  });

  test('pool refresh works in development', async ({ page }) => {
    // This test only works in development mode
    if (process.env.NODE_ENV !== 'development') {
      test.skip();
      return;
    }

    const refreshResponse = await page.request.post('/api/db-pool', {
      data: { action: 'refresh' }
    });
    
    expect(refreshResponse.ok()).toBe(true);
    const refreshData = await refreshResponse.json();
    
    // Should either succeed or indicate it's not available
    expect(refreshData).toHaveProperty('success');
    
    if (refreshData.success) {
      console.log('Pool refresh successful');
    } else {
      console.log('Pool refresh not available:', refreshData.message);
    }
  });
});
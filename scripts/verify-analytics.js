#!/usr/bin/env node

/**
 * Verification script for Vercel Analytics and Speed Insights integration
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Vercel Analytics Integration...\n');

// Check if packages are installed
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
const hasAnalytics = '@vercel/analytics' in packageJson.dependencies;
const hasSpeedInsights = '@vercel/speed-insights' in packageJson.dependencies;

console.log(`✅ @vercel/analytics: ${hasAnalytics ? 'Installed' : '❌ Not installed'}`);
console.log(`✅ @vercel/speed-insights: ${hasSpeedInsights ? 'Installed' : '❌ Not installed'}`);

// Check layout.tsx for component usage
const layoutPath = path.join(__dirname, '../src/app/layout.tsx');
const layoutContent = fs.readFileSync(layoutPath, 'utf8');

const hasAnalyticsImport = layoutContent.includes("import { Analytics } from \"@vercel/analytics/react\"");
const hasSpeedInsightsImport = layoutContent.includes("import { SpeedInsights } from \"@vercel/speed-insights/next\"");
const hasAnalyticsComponent = layoutContent.includes("<Analytics />");
const hasSpeedInsightsComponent = layoutContent.includes("<SpeedInsights />");

console.log(`\n📦 Component Integration:`);
console.log(`  Analytics Import: ${hasAnalyticsImport ? '✅' : '❌'}`);
console.log(`  Analytics Component: ${hasAnalyticsComponent ? '✅' : '❌'}`);
console.log(`  Speed Insights Import: ${hasSpeedInsightsImport ? '✅' : '❌'}`);
console.log(`  Speed Insights Component: ${hasSpeedInsightsComponent ? '✅' : '❌'}`);

// Check for Web Vitals implementation
const webVitalsPath = path.join(__dirname, '../src/lib/web-vitals.ts');
const webVitalsExists = fs.existsSync(webVitalsPath);
let hasWebVitals = false;
let hasINPMonitoring = false;

if (webVitalsExists) {
  const webVitalsContent = fs.readFileSync(webVitalsPath, 'utf8');
  hasWebVitals = webVitalsContent.includes("onCLS") && webVitalsContent.includes("onFCP") && webVitalsContent.includes("onLCP");
  hasINPMonitoring = webVitalsContent.includes("onINP");
}

// Also check if WebVitalsReporter is used in layout
const hasWebVitalsReporter = layoutContent.includes("WebVitalsReporter");

console.log(`\n📊 Web Vitals Monitoring:`);
console.log(`  Web Vitals Library: ${webVitalsExists ? '✅' : '❌'}`);
console.log(`  Core Web Vitals: ${hasWebVitals ? '✅' : '❌'}`);
console.log(`  INP (Interaction to Next Paint): ${hasINPMonitoring ? '✅' : '❌'}`);
console.log(`  WebVitalsReporter Component: ${hasWebVitalsReporter ? '✅' : '❌'}`);

// Check environment variables
const envExample = `
📝 Required Environment Variables for Production:

For Vercel deployment, these are automatically configured.
For self-hosted deployments, add:

# Optional - Only if you want custom analytics endpoint
NEXT_PUBLIC_VERCEL_ANALYTICS_ENDPOINT=your-custom-endpoint

# Redis Configuration (for cache performance)
REDIS_URL=redis://your-redis-url
# OR
UPSTASH_REDIS_REST_URL=https://your-upstash-url
UPSTASH_REDIS_REST_TOKEN=your-token
`;

console.log(envExample);

// Summary
const allChecks = hasAnalytics && hasSpeedInsights && hasAnalyticsImport && 
                  hasSpeedInsightsImport && hasAnalyticsComponent && 
                  hasSpeedInsightsComponent && hasINPMonitoring && hasWebVitals &&
                  hasWebVitalsReporter && webVitalsExists;

console.log(`\n${allChecks ? '🎉 All checks passed!' : '⚠️  Some checks failed'}`);
console.log('\n📚 Documentation:');
console.log('  - Vercel Analytics: https://vercel.com/docs/analytics');
console.log('  - Speed Insights: https://vercel.com/docs/speed-insights');
console.log('  - Redis Cache Setup: /docs/deployment/REDIS_CACHE_SETUP.md');

if (allChecks) {
  console.log('\n✨ Your application is fully configured for production performance monitoring!');
  process.exit(0);
} else {
  console.log('\n⚠️  Please address the failed checks above.');
  process.exit(1);
}
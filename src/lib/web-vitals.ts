import { onCLS, onFCP, onLCP, onTTFB, onINP, Metric } from 'web-vitals';

/**
 * Web Vitals reporting utility
 * Sends Core Web Vitals metrics to analytics endpoints
 */

export interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

// Thresholds based on Google's Core Web Vitals recommendations
const thresholds = {
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 },
};

/**
 * Send metric to analytics endpoint
 */
function sendToAnalytics(metric: Metric) {
  const body = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
    timestamp: Date.now(),
  };

  // Send to Vercel Analytics (automatically handled by @vercel/analytics)
  // The Analytics component in layout.tsx handles this automatically
  
  // Optionally, send to custom endpoint
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    // [REMOVED: Console statement for performance]
  }

  // Store in localStorage for performance dashboard
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('webVitals') || '[]';
      const vitals = JSON.parse(stored);
      vitals.push(body);
      // Keep only last 100 entries
      if (vitals.length > 100) {
        vitals.shift();
      }
      localStorage.setItem('webVitals', JSON.stringify(vitals));
    } catch (e) {
      // Ignore localStorage errors
    }
  }
}

/**
 * Initialize Web Vitals reporting
 */
export function reportWebVitals() {
  onCLS(sendToAnalytics);
  onFCP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
  onINP(sendToAnalytics);
}

/**
 * Get stored Web Vitals from localStorage
 */
export function getStoredWebVitals(): WebVitalsMetric[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem('webVitals') || '[]';
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Clear stored Web Vitals
 */
export function clearStoredWebVitals() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('webVitals');
  }
}

/**
 * Calculate percentile from array of values
 */
export function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Get Web Vitals summary
 */
interface VitalSummary {
  p75: number;
  p90: number;
  p99: number;
  count: number;
  good: number;
  needsImprovement: number;
  poor: number;
}

export function getWebVitalsSummary() {
  const vitals = getStoredWebVitals();
  const summary: Record<string, VitalSummary> = {};
  
  ['CLS', 'FCP', 'LCP', 'TTFB', 'INP'].forEach(name => {
    const metrics = vitals.filter(v => v.name === name);
    const values = metrics.map(m => m.value);
    
    if (values.length > 0) {
      summary[name] = {
        p75: calculatePercentile(values, 75),
        p90: calculatePercentile(values, 90),
        p99: calculatePercentile(values, 99),
        count: values.length,
        good: metrics.filter(m => m.rating === 'good').length,
        needsImprovement: metrics.filter(m => m.rating === 'needs-improvement').length,
        poor: metrics.filter(m => m.rating === 'poor').length,
      };
    }
  });
  
  return summary;
}
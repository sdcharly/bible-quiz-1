'use client';

import { useEffect } from 'react';
import { onCLS, onFCP, onLCP, onTTFB, onINP, Metric } from 'web-vitals';
import { track } from '@vercel/analytics';

function sendToAnalytics(metric: Metric) {
  // Send to Vercel Analytics
  const value = Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value);
  
  track('Web Vitals', {
    metric: metric.name,
    value,
    rating: metric.rating,
  });

  // Store locally for performance dashboard
  if (typeof window !== 'undefined') {
    const vitals = JSON.parse(localStorage.getItem('webVitals') || '[]');
    vitals.push({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      timestamp: Date.now(),
    });
    // Keep only last 50 measurements
    if (vitals.length > 50) {
      vitals.shift();
    }
    localStorage.setItem('webVitals', JSON.stringify(vitals));
  }
}

export function WebVitalsReporter() {
  useEffect(() => {
    // Register all web vitals
    onCLS(sendToAnalytics);
    onFCP(sendToAnalytics);
    onLCP(sendToAnalytics);
    onTTFB(sendToAnalytics);
    onINP(sendToAnalytics);
  }, []);

  return null;
}
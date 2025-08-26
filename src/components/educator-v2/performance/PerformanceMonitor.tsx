"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";


interface PerformanceMetrics {
  page: string;
  loadTime?: number;
  renderTime?: number;
  apiCallCount?: number;
  apiTotalTime?: number;
}

export function usePerformanceMonitor(pageName: string) {
  useEffect(() => {
    const startTime = performance.now();
    
    // Monitor page load performance
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'measure' || entry.entryType === 'navigation') {
          logger.debug(`[Performance] ${pageName}:`, {
            type: entry.entryType,
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime
          });
        }
      });
    });
    
    // Only observe in development for debugging
    if (process.env.NODE_ENV === 'development') {
      observer.observe({ entryTypes: ['measure', 'navigation'] });
    }
    
    return () => {
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Log performance metrics
      if (totalTime > 2000) { // Log slow pages (>2 seconds)
        logger.warn(`[Performance] ${pageName} took ${totalTime.toFixed(2)}ms to render`);
      } else {
        logger.debug(`[Performance] ${pageName} rendered in ${totalTime.toFixed(2)}ms`);
      }
      
      observer.disconnect();
    };
  }, [pageName]);
}

/**
 * HOC to wrap API calls with performance monitoring
 */
export async function withPerformanceTracking<T>(
  apiCall: () => Promise<T>,
  apiName: string
): Promise<T> {
  const startTime = performance.now();
  
  try {
    const result = await apiCall();
    const duration = performance.now() - startTime;
    
    if (duration > 1000) { // Log slow API calls (>1 second)
      logger.warn(`[API Performance] ${apiName} took ${duration.toFixed(2)}ms`);
    } else {
      logger.debug(`[API Performance] ${apiName} completed in ${duration.toFixed(2)}ms`);
    }
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    logger.error(`[API Performance] ${apiName} failed after ${duration.toFixed(2)}ms`, error);
    throw error;
  }
}
"use client";

import { useEffect } from "react";
import { onCLS, onFCP, onLCP, onTTFB, onINP, Metric } from "web-vitals";
import { track } from "@vercel/analytics";


const vitalsUrl = "/api/analytics/vitals";

function sendToAnalytics(metric: Metric) {
  // Send to Vercel Analytics
  const value = Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value);
  
  track("Web Vitals", {
    metric: metric.name,
    value,
    rating: metric.rating,
  });

  // Also send to our own endpoint for storage
  const body = JSON.stringify({
    id: metric.id,
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    navigationType: metric.navigationType,
  });

  // Use sendBeacon if available, fallback to fetch
  if (navigator.sendBeacon) {
    navigator.sendBeacon(vitalsUrl, body);
  } else {
    fetch(vitalsUrl, {
      body,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    }).catch(console.error);
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
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { Badge } from "@/components/ui/badge";
import CacheMonitor from "@/components/admin/CacheMonitor";
import { 
  Activity, 
  TrendingUp, 
  Clock, 
  Database,
  Zap,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  BarChart3,
  Users,
  FileText,
  Globe,
  Gauge,
  Wifi,
  WifiOff
} from "lucide-react";

interface WebVitalsData {
  metric: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  p75?: number;  // 75th percentile
  samples?: number;  // Number of samples
}

interface DatabaseMetrics {
  activeConnections: number;
  totalConnections: number;
  idleConnections: number;
  largestTables: Array<{ name: string; size: string }>;
  indexCount: number;
  cacheStatus: string;
}

interface ApplicationMetrics {
  totalUsers: number;
  totalQuizzes: number;
  totalAttempts: number;
  activeUsers: number;
  avgResponseTime: number;
  errorRate: number;
}

export default function PerformanceDashboard() {
  const [loading, setLoading] = useState(true);
  const [webVitals, setWebVitals] = useState<WebVitalsData[]>([]);
  const [dbMetrics, setDbMetrics] = useState<DatabaseMetrics | null>(null);
  const [appMetrics, setAppMetrics] = useState<ApplicationMetrics | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [sseConnected, setSseConnected] = useState(false);
  const [indexStatus, setIndexStatus] = useState<{
    totalExpected: number;
    totalExisting: number;
    missingCount: number;
    existingIndexes: string[];
    missingIndexes: string[];
    allApplied: boolean;
  } | null>(null);
  const [applyingIndexes, setApplyingIndexes] = useState(false);
  const [indexResults, setIndexResults] = useState<{
    summary: {
      totalIndexes: number;
      created: number;
      skipped: number;
      failed: number;
      analyzed: number;
    };
    details: Array<{
      type: string;
      name: string;
      status: string;
      message?: string;
    }>;
  } | null>(null);

  const checkIndexStatus = async () => {
    try {
      const response = await fetch('/api/admin/performance/apply-indexes');
      if (response.ok) {
        const data = await response.json();
        setIndexStatus(data);
      }
    } catch (error) {
      console.error('Error checking index status:', error);
    }
  };

  useEffect(() => {
    // Collect Web Vitals on the client side
    if (typeof window !== 'undefined') {
      collectWebVitals();
    }
    
    // Fetch server-side metrics
    fetchMetrics();
    
    // Check index status
    checkIndexStatus();
  }, []);

  // Server-Sent Events for real-time metrics
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    
    const connectSSE = () => {
      try {
        eventSource = new EventSource('/api/admin/performance/sse');
        
        eventSource.onopen = () => {
          setSseConnected(true);
          console.log('SSE connected for performance metrics');
        };
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'db_metrics') {
              setDbMetrics(data.metrics);
              setLastUpdated(new Date());
            } else if (data.type === 'app_metrics') {
              setAppMetrics(data.metrics);
              setLastUpdated(new Date());
            } else if (data.type === 'web_vital') {
              updateWebVital(data.vital);
            }
          } catch (error) {
            console.error('Error parsing SSE data:', error);
          }
        };
        
        eventSource.onerror = () => {
          setSseConnected(false);
          eventSource?.close();
          
          // Reconnect after 5 seconds
          reconnectTimeout = setTimeout(connectSSE, 5000);
        };
      } catch (error) {
        console.error('Error connecting to SSE:', error);
        setSseConnected(false);
      }
    };
    
    // Connect on mount if in browser
    if (typeof window !== 'undefined') {
      connectSSE();
    }
    
    // Set up polling as fallback when SSE is not connected
    const interval = setInterval(() => {
      if (!sseConnected) {
        fetchMetrics();
      }
    }, 30000); // Poll every 30 seconds if SSE is disconnected
    
    // Cleanup on unmount
    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      clearInterval(interval);
    };
  }, [sseConnected]);

  const collectWebVitals = () => {
    // Use the Performance Observer API to collect Web Vitals
    if ('PerformanceObserver' in window) {
      try {
        // Observe Largest Contentful Paint (LCP)
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as PerformanceEntry & { renderTime?: number; loadTime?: number };
          const lcpValue = lastEntry.renderTime || lastEntry.loadTime || 0;
          
          updateWebVital({
            metric: 'LCP',
            value: lcpValue,
            rating: getRating('LCP', lcpValue),
            timestamp: Date.now()
          });
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // Observe First Input Delay (FID) - Being replaced by INP
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: PerformanceEntry & { processingStart?: number; startTime: number }) => {
            const fidValue = (entry.processingStart || 0) - entry.startTime;
            updateWebVital({
              metric: 'FID',
              value: fidValue,
              rating: getRating('FID', fidValue),
              timestamp: Date.now()
            });
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });

        // Observe Interaction to Next Paint (INP) - New Core Web Vital
        if ('PerformanceEventTiming' in window) {
          const inpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries() as PerformanceEntry[];
            let maxDuration = 0;
            
            entries.forEach((entry) => {
              const perfEntry = entry as PerformanceEntry & { interactionId?: number };
              if (perfEntry.interactionId && perfEntry.duration > maxDuration) {
                maxDuration = perfEntry.duration;
              }
            });
            
            if (maxDuration > 0) {
              updateWebVital({
                metric: 'INP',
                value: maxDuration,
                rating: getRating('INP', maxDuration),
                timestamp: Date.now()
              });
            }
          });
          
          try {
            inpObserver.observe({ 
              type: 'event',
              buffered: true,
              durationThreshold: 40 
            });
          } catch (e) {
            // Fallback for browsers that don't support event timing
            console.log('INP observation not supported');
          }
        }

        // Observe Cumulative Layout Shift (CLS)
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          list.getEntries().forEach((entry: PerformanceEntry & { hadRecentInput?: boolean; value?: number }) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value || 0;
            }
          });
          
          updateWebVital({
            metric: 'CLS',
            value: clsValue,
            rating: getRating('CLS', clsValue),
            timestamp: Date.now()
          });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });

        // Get Time to First Byte (TTFB)
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          updateWebVital({
            metric: 'TTFB',
            value: navigation.responseStart - navigation.requestStart,
            rating: getRating('TTFB', navigation.responseStart - navigation.requestStart),
            timestamp: Date.now()
          });
        }

        // Get First Contentful Paint (FCP)
        const paintEntries = performance.getEntriesByType('paint');
        const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        if (fcp) {
          updateWebVital({
            metric: 'FCP',
            value: fcp.startTime,
            rating: getRating('FCP', fcp.startTime),
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error('Error collecting Web Vitals:', error);
      }
    }
  };

  const getRating = (metric: string, value: number): 'good' | 'needs-improvement' | 'poor' => {
    const thresholds: Record<string, { good: number; poor: number }> = {
      'LCP': { good: 2500, poor: 4000 },
      'FID': { good: 100, poor: 300 },
      'INP': { good: 200, poor: 500 },  // New INP thresholds
      'CLS': { good: 0.1, poor: 0.25 },
      'FCP': { good: 1800, poor: 3000 },
      'TTFB': { good: 800, poor: 1800 }
    };

    const threshold = thresholds[metric];
    if (!threshold) return 'needs-improvement';
    
    if (value <= threshold.good) return 'good';
    if (value > threshold.poor) return 'poor';
    return 'needs-improvement';
  };

  const updateWebVital = (vital: WebVitalsData) => {
    setWebVitals(prev => {
      const existing = prev.filter(v => v.metric !== vital.metric);
      return [...existing, vital];
    });
  };

  const fetchMetrics = async () => {
    try {
      // Fetch database metrics
      const dbResponse = await fetch('/api/admin/performance/database');
      if (dbResponse.ok) {
        const dbData = await dbResponse.json();
        setDbMetrics(dbData);
      }

      // Fetch application metrics
      const appResponse = await fetch('/api/admin/performance/application');
      if (appResponse.ok) {
        const appData = await appResponse.json();
        setAppMetrics(appData);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    collectWebVitals();
    fetchMetrics();
    checkIndexStatus();
  };

  const applyIndexes = async () => {
    if (!confirm('This will apply performance optimization indexes to your database. Continue?')) {
      return;
    }
    
    setApplyingIndexes(true);
    setIndexResults(null);
    
    try {
      const response = await fetch('/api/admin/performance/apply-indexes', {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        setIndexResults(data);
        // Refresh index status
        await checkIndexStatus();
        // Refresh metrics to see improvements
        await fetchMetrics();
      } else {
        const error = await response.json();
        alert(`Failed to apply indexes: ${error.error}`);
      }
    } catch (error) {
      console.error('Error applying indexes:', error);
      alert('Failed to apply indexes. Check console for details.');
    } finally {
      setApplyingIndexes(false);
    }
  };

  const formatValue = (metric: string, value: number): string => {
    if (metric === 'CLS') return value.toFixed(3);
    if (metric === 'FCP' || metric === 'LCP' || metric === 'TTFB' || metric === 'FID') {
      if (value < 1000) return `${Math.round(value)}ms`;
      return `${(value / 1000).toFixed(2)}s`;
    }
    return value.toString();
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'good': return 'text-green-600 bg-green-50';
      case 'needs-improvement': return 'text-yellow-600 bg-yellow-50';
      case 'poor': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return <Loading variant="page" message="Loading performance metrics..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Performance Dashboard</h1>
              <p className="text-gray-600 mt-2">Monitor application and database performance metrics</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-200">
                {sseConnected ? (
                  <>
                    <Wifi className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Live</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium">Polling</span>
                  </>
                )}
              </div>
              <p className="text-sm text-gray-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
              <Button onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Web Vitals Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Web Vitals (Real User Monitoring)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {webVitals.map((vital) => (
              <Card key={vital.metric} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {vital.metric}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold">
                      {formatValue(vital.metric, vital.value)}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getRatingColor(vital.rating)}`}>
                      {vital.rating}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {vital.metric === 'LCP' && 'Largest Contentful Paint'}
                    {vital.metric === 'FID' && 'First Input Delay'}
                    {vital.metric === 'CLS' && 'Cumulative Layout Shift'}
                    {vital.metric === 'FCP' && 'First Contentful Paint'}
                    {vital.metric === 'TTFB' && 'Time to First Byte'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Cache Performance */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Cache Performance
          </h2>
          <CacheMonitor />
        </div>

        {/* Database Metrics */}
        {dbMetrics && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Performance
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Connections</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Active</span>
                      <span className="font-semibold">{dbMetrics.activeConnections}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Idle</span>
                      <span className="font-semibold">{dbMetrics.idleConnections}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total</span>
                      <span className="font-semibold">{dbMetrics.totalConnections}</span>
                    </div>
                    <div className="pt-2 border-t">
                      {dbMetrics.activeConnections < 20 ? (
                        <div className="flex items-center text-green-600">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          <span className="text-sm">Healthy</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-yellow-600">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          <span className="text-sm">High load</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Storage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {dbMetrics.largestTables.slice(0, 3).map((table) => (
                      <div key={table.name} className="flex justify-between">
                        <span className="text-gray-600 text-sm">{table.name}</span>
                        <span className="font-semibold text-sm">{table.size}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Optimization</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Indexes</span>
                      <span className="font-semibold">{dbMetrics.indexCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cache</span>
                      <span className="font-semibold">{dbMetrics.cacheStatus}</span>
                    </div>
                    <div className="pt-2 border-t">
                      {dbMetrics.indexCount >= 10 ? (
                        <div className="flex items-center text-green-600">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          <span className="text-sm">Optimized</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-yellow-600">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          <span className="text-sm">Add indexes</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Database Indexes Management */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Optimization
          </h2>
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Performance Indexes</span>
                {indexStatus && (
                  <Badge variant={indexStatus.allApplied ? "default" : "secondary"}>
                    {indexStatus.totalExisting}/{indexStatus.totalExpected} Applied
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Apply database indexes to improve query performance and reduce response times
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {indexStatus && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {indexStatus.allApplied ? (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <span className="text-sm font-medium">All performance indexes are applied</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-5 w-5 text-yellow-500" />
                          <span className="text-sm font-medium">
                            {indexStatus.missingCount} indexes missing
                          </span>
                        </>
                      )}
                    </div>
                    <Button
                      onClick={applyIndexes}
                      disabled={applyingIndexes || indexStatus.allApplied}
                      variant={indexStatus.allApplied ? "outline" : "default"}
                    >
                      {applyingIndexes ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Applying...
                        </>
                      ) : indexStatus.allApplied ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          All Applied
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Apply Indexes
                        </>
                      )}
                    </Button>
                  </div>

                  {indexStatus.missingCount > 0 && (
                    <div className="text-sm text-gray-600">
                      <p className="font-medium mb-1">Missing indexes:</p>
                      <ul className="list-disc list-inside text-xs space-y-1">
                        {indexStatus.missingIndexes.map((idx: string) => (
                          <li key={idx}>{idx}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {indexResults && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Index Application Results:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Created: {indexResults.summary.created}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                      <span>Skipped: {indexResults.summary.skipped}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Activity className="h-4 w-4 text-blue-500" />
                      <span>Analyzed: {indexResults.summary.analyzed}</span>
                    </div>
                    {indexResults.summary.failed > 0 && (
                      <div className="flex items-center gap-1">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <span>Failed: {indexResults.summary.failed}</span>
                      </div>
                    )}
                  </div>

                  {indexResults.details && indexResults.details.length > 0 && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs text-gray-600 hover:text-gray-800">
                        View Details ({indexResults.details.length} operations)
                      </summary>
                      <div className="mt-2 max-h-40 overflow-y-auto">
                        {indexResults.details.map((detail, idx) => (
                          <div key={idx} className="text-xs py-1 flex items-center gap-2">
                            {detail.status === 'created' && <span className="text-green-600">✓</span>}
                            {detail.status === 'exists' && <span className="text-yellow-600">○</span>}
                            {detail.status === 'failed' && <span className="text-red-600">✗</span>}
                            {detail.status === 'analyzed' && <span className="text-blue-600">◆</span>}
                            <span>{detail.name}: {detail.message}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}

              <div className="text-xs text-gray-500 mt-4">
                <p>💡 Performance indexes help:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Speed up quiz loading and student lookups</li>
                  <li>Improve analytics query performance</li>
                  <li>Reduce database CPU usage</li>
                  <li>Enable faster concurrent user access</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Application Metrics */}
        {appMetrics && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Application Metrics
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between space-x-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <div className="text-right">
                      <p className="text-2xl font-bold">{appMetrics.totalUsers}</p>
                      <p className="text-xs text-gray-500">Total Users</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between space-x-2">
                    <Activity className="h-4 w-4 text-green-600" />
                    <div className="text-right">
                      <p className="text-2xl font-bold">{appMetrics.activeUsers}</p>
                      <p className="text-xs text-gray-500">Active Now</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between space-x-2">
                    <FileText className="h-4 w-4 text-purple-600" />
                    <div className="text-right">
                      <p className="text-2xl font-bold">{appMetrics.totalQuizzes}</p>
                      <p className="text-xs text-gray-500">Quizzes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between space-x-2">
                    <Zap className="h-4 w-4 text-yellow-600" />
                    <div className="text-right">
                      <p className="text-2xl font-bold">{appMetrics.totalAttempts}</p>
                      <p className="text-xs text-gray-500">Attempts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between space-x-2">
                    <Clock className="h-4 w-4 text-indigo-600" />
                    <div className="text-right">
                      <p className="text-2xl font-bold">{appMetrics.avgResponseTime}ms</p>
                      <p className="text-xs text-gray-500">Avg Response</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <div className="text-right">
                      <p className="text-2xl font-bold">{appMetrics.errorRate}%</p>
                      <p className="text-xs text-gray-500">Error Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {webVitals.filter(v => v.rating !== 'good').map(vital => (
                <div key={vital.metric} className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Improve {vital.metric}</p>
                    <p className="text-xs text-gray-600">
                      Current: {formatValue(vital.metric, vital.value)} ({vital.rating})
                      {vital.metric === 'LCP' && ' - Optimize images and lazy load content'}
                      {vital.metric === 'FID' && ' - Reduce JavaScript execution time'}
                      {vital.metric === 'CLS' && ' - Add size attributes to images and embeds'}
                      {vital.metric === 'FCP' && ' - Reduce server response time'}
                      {vital.metric === 'TTFB' && ' - Use CDN and optimize server'}
                    </p>
                  </div>
                </div>
              ))}
              
              {dbMetrics && dbMetrics.activeConnections > 20 && (
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">High Database Connections</p>
                    <p className="text-xs text-gray-600">
                      Consider optimizing queries or increasing connection pool size
                    </p>
                  </div>
                </div>
              )}

              {dbMetrics && dbMetrics.cacheStatus === 'In-Memory' && (
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Configure Redis Cache</p>
                    <p className="text-xs text-gray-600">
                      Add Redis for better caching performance in production
                    </p>
                  </div>
                </div>
              )}

              {webVitals.filter(v => v.rating === 'good').length === webVitals.length && (
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Excellent Performance!</p>
                    <p className="text-xs text-gray-600">
                      All Web Vitals are in the good range. Keep up the great work!
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Vercel Speed Insights Note */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <Globe className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">Vercel Speed Insights Active</h3>
              <p className="text-sm text-blue-700 mt-1">
                Speed Insights is now collecting performance data from real users. 
                View detailed reports in your Vercel dashboard under the Speed Insights tab.
              </p>
              <a 
                href="https://vercel.com/dashboard" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mt-2 font-medium"
              >
                View in Vercel Dashboard →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
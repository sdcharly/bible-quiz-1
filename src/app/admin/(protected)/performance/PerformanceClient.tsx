"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BiblicalPageLoader } from "@/components/ui/biblical-loader";
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
  WifiOff,
  ArrowLeft,
  BookOpen,
  Sparkles,
  Server,
  HardDrive,
  Cpu,
  MemoryStick,
  X
} from "lucide-react";
import { onCLS, onFCP, onLCP, onTTFB, onINP } from "web-vitals";

interface WebVitalsData {
  metric: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  p75?: number;
  samples?: number;
}

interface IndexStatus {
  totalExpected: number;
  totalExisting: number;
  missingCount: number;
  existingIndexes: string[];
  missingIndexes: string[];
  allApplied: boolean;
}

interface IndexResults {
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
  totalDocuments: number;
  activeEducators: number;
  activeSessions: number;
  activeUsers?: number;
  avgResponseTime: number;
  successRate?: number;
  errorRate?: number;
}

interface PerformanceMetrics {
  database: DatabaseMetrics;
  application: ApplicationMetrics;
  vitals: WebVitalsData[];
}

export default function PerformanceClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSSEConnected, setIsSSEConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [indexStatus, setIndexStatus] = useState<IndexStatus | null>(null);
  const [indexResults, setIndexResults] = useState<IndexResults | null>(null);
  const [applyingIndexes, setApplyingIndexes] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(true);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const [dbResponse, appResponse] = await Promise.all([
        fetch('/api/admin/performance/database'),
        fetch('/api/admin/performance/application')
      ]);

      if (!dbResponse.ok || !appResponse.ok) {
        throw new Error('Failed to fetch metrics');
      }

      const dbData = await dbResponse.json();
      const appData = await appResponse.json();

      setMetrics({
        database: dbData,
        application: appData,
        vitals: metrics?.vitals || []
      });

      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load performance metrics');
    } finally {
      setLoading(false);
    }
  };

  const checkIndexStatus = async () => {
    try {
      const response = await fetch('/api/admin/performance/apply-indexes');
      if (response.ok) {
        const data = await response.json();
        setIndexStatus(data);
      } else if (response.status === 401) {
        // Default state if unauthorized
        setIndexStatus({
          totalExpected: 12,
          totalExisting: 0,
          missingCount: 12,
          existingIndexes: [],
          missingIndexes: [],
          allApplied: false
        });
      }
    } catch (error) {
      console.error('Error checking index status:', error);
    }
  };

  const toggleAutoRefresh = () => {
    if (autoRefresh) {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
      setAutoRefresh(false);
    } else {
      const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds
      setRefreshInterval(interval);
      setAutoRefresh(true);
    }
  };

  const applyIndexes = async () => {
    try {
      setApplyingIndexes(true);
      const response = await fetch('/api/admin/performance/apply-indexes', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to apply indexes');
      }

      const results = await response.json();
      setIndexResults(results);
      
      // Refresh index status
      await checkIndexStatus();
      await fetchMetrics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply indexes');
    } finally {
      setApplyingIndexes(false);
    }
  };

  // Enhanced Web Vitals collection using web-vitals library
  const collectWebVitals = useCallback(() => {
    const vitals: WebVitalsData[] = [];
    
    const getRating = (metric: string, value: number): 'good' | 'needs-improvement' | 'poor' => {
      const thresholds: Record<string, { good: number; poor: number }> = {
        'LCP': { good: 2500, poor: 4000 },
        'FCP': { good: 1800, poor: 3000 },
        'CLS': { good: 0.1, poor: 0.25 },
        'INP': { good: 200, poor: 500 },
        'TTFB': { good: 800, poor: 1800 }
      };
      
      const threshold = thresholds[metric];
      if (!threshold) return 'good';
      
      if (value <= threshold.good) return 'good';
      if (value <= threshold.poor) return 'needs-improvement';
      return 'poor';
    };

    // Collect all Web Vitals
    onCLS((metric) => {
      const vital: WebVitalsData = {
        metric: 'CLS',
        value: metric.value,
        rating: getRating('CLS', metric.value),
        timestamp: Date.now(),
        p75: 0.1
      };
      setMetrics(prev => ({
        ...prev!,
        vitals: [...(prev?.vitals || []).filter(v => v.metric !== 'CLS'), vital]
      }));
    });

    onFCP((metric) => {
      const vital: WebVitalsData = {
        metric: 'FCP',
        value: metric.value,
        rating: getRating('FCP', metric.value),
        timestamp: Date.now(),
        p75: 1800
      };
      setMetrics(prev => ({
        ...prev!,
        vitals: [...(prev?.vitals || []).filter(v => v.metric !== 'FCP'), vital]
      }));
    });

    onLCP((metric) => {
      const vital: WebVitalsData = {
        metric: 'LCP',
        value: metric.value,
        rating: getRating('LCP', metric.value),
        timestamp: Date.now(),
        p75: 2500
      };
      setMetrics(prev => ({
        ...prev!,
        vitals: [...(prev?.vitals || []).filter(v => v.metric !== 'LCP'), vital]
      }));
    });

    onTTFB((metric) => {
      const vital: WebVitalsData = {
        metric: 'TTFB',
        value: metric.value,
        rating: getRating('TTFB', metric.value),
        timestamp: Date.now(),
        p75: 800
      };
      setMetrics(prev => ({
        ...prev!,
        vitals: [...(prev?.vitals || []).filter(v => v.metric !== 'TTFB'), vital]
      }));
    });

    onINP((metric) => {
      const vital: WebVitalsData = {
        metric: 'INP',
        value: metric.value,
        rating: getRating('INP', metric.value),
        timestamp: Date.now(),
        p75: 200
      };
      setMetrics(prev => ({
        ...prev!,
        vitals: [...(prev?.vitals || []).filter(v => v.metric !== 'INP'), vital]
      }));
    });
  }, []);

  // Setup SSE connection for real-time updates
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    
    const connectSSE = () => {
      try {
        eventSource = new EventSource('/api/admin/performance/sse');
        
        eventSource.onopen = () => {
          setIsSSEConnected(true);
        };
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'db_metrics') {
              setMetrics(prev => ({
                ...prev!,
                database: data.metrics
              }));
              setLastUpdate(new Date());
            } else if (data.type === 'app_metrics') {
              setMetrics(prev => ({
                ...prev!,
                application: data.metrics
              }));
              setLastUpdate(new Date());
            }
          } catch (error) {
            console.error('Error parsing SSE data:', error);
          }
        };
        
        eventSource.onerror = () => {
          setIsSSEConnected(false);
          eventSource?.close();
          
          // Reconnect after 5 seconds
          reconnectTimeout = setTimeout(connectSSE, 5000);
        };
      } catch (error) {
        console.error('Error connecting to SSE:', error);
        setIsSSEConnected(false);
      }
    };
    
    // Connect on mount
    if (typeof window !== 'undefined') {
      connectSSE();
    }
    
    // Set up polling as fallback when SSE is not connected
    const interval = setInterval(() => {
      if (!isSSEConnected) {
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
  }, [isSSEConnected]);

  useEffect(() => {
    fetchMetrics();
    collectWebVitals();
    checkIndexStatus();

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [collectWebVitals]);

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'good':
        return 'bg-green-100 text-green-800';
      case 'needs-improvement':
        return 'bg-amber-100 text-amber-800';
      case 'poor':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getVitalDescription = (metric: string) => {
    const descriptions: Record<string, string> = {
      'LCP': 'Largest Contentful Paint',
      'FCP': 'First Contentful Paint',
      'CLS': 'Cumulative Layout Shift',
      'INP': 'Interaction to Next Paint',
      'TTFB': 'Time to First Byte'
    };
    return descriptions[metric] || metric;
  };

  const formatMetricValue = (value: number, metric: string) => {
    if (metric === 'CLS') {
      return value.toFixed(3);
    }
    return `${value.toFixed(0)}ms`;
  };

  if (loading && !metrics) {
    return <BiblicalPageLoader text="Loading performance metrics..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <Button
                variant="ghost"
                onClick={() => router.push('/admin/dashboard')}
                className="mb-4 text-amber-700 hover:text-amber-800"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <h1 className="text-3xl font-bold text-gray-900">Performance Dashboard</h1>
              <p className="text-gray-600 mt-2">Monitor application and database performance metrics</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white shadow-sm">
                {isSSEConnected ? (
                  <>
                    <Wifi className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Live</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium">Polling</span>
                  </>
                )}
              </div>
              <p className="text-sm text-gray-500">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </p>
              <Button
                onClick={toggleAutoRefresh}
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
                className={autoRefresh ? "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700" : ""}
              >
                {autoRefresh ? 'Stop Auto-Refresh' : 'Start Auto-Refresh'}
              </Button>
              <Button onClick={fetchMetrics} size="sm" variant="outline" className="border-amber-300 hover:bg-amber-50">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Web Vitals Section */}
        {metrics?.vitals && metrics.vitals.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Gauge className="h-5 w-5 text-amber-600" />
              Web Vitals (Real User Monitoring)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {metrics.vitals.map((vital) => (
                <Card key={vital.metric} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      {vital.metric}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-bold">
                        {formatMetricValue(vital.value, vital.metric)}
                      </span>
                      <Badge className={getRatingColor(vital.rating)}>
                        {vital.rating}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {getVitalDescription(vital.metric)}
                    </p>
                    {vital.p75 && (
                      <p className="text-xs text-gray-400 mt-1">
                        P75: {formatMetricValue(vital.p75, vital.metric)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Application Metrics */}
        {metrics?.application && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-amber-600" />
              Application Metrics
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between space-x-2">
                    <Users className="h-4 w-4 text-amber-600" />
                    <div className="text-right">
                      <p className="text-2xl font-bold">{metrics.application.totalUsers}</p>
                      <p className="text-xs text-gray-500">Total Users</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {metrics.application.activeUsers !== undefined && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between space-x-2">
                      <Activity className="h-4 w-4 text-green-600" />
                      <div className="text-right">
                        <p className="text-2xl font-bold">{metrics.application.activeUsers}</p>
                        <p className="text-xs text-gray-500">Active Now</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between space-x-2">
                    <FileText className="h-4 w-4 text-purple-600" />
                    <div className="text-right">
                      <p className="text-2xl font-bold">{metrics.application.totalQuizzes}</p>
                      <p className="text-xs text-gray-500">Quizzes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between space-x-2">
                    <BookOpen className="h-4 w-4 text-amber-600" />
                    <div className="text-right">
                      <p className="text-2xl font-bold">{metrics.application.totalAttempts}</p>
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
                      <p className="text-2xl font-bold">{metrics.application.avgResponseTime}ms</p>
                      <p className="text-xs text-gray-500">Avg Response</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {metrics.application.errorRate !== undefined && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between space-x-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <div className="text-right">
                        <p className="text-2xl font-bold">{metrics.application.errorRate}%</p>
                        <p className="text-xs text-gray-500">Error Rate</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Database Metrics */}
        {metrics?.database && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Database className="h-5 w-5 text-amber-600" />
              Database Performance
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Connection Pool</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Active</span>
                      <span className="font-semibold">{metrics.database.activeConnections}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Idle</span>
                      <span className="font-semibold">{metrics.database.idleConnections}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total</span>
                      <span className="font-semibold">{metrics.database.totalConnections}</span>
                    </div>
                    <div className="pt-2 border-t">
                      {metrics.database.activeConnections < 20 ? (
                        <div className="flex items-center text-green-600">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          <span className="text-sm">Healthy</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-amber-600">
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
                    {metrics.database.largestTables.slice(0, 3).map((table) => (
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
                      <span className="text-sm text-gray-600">Indexes</span>
                      <span className="font-semibold">{metrics.database.indexCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Cache</span>
                      <span className="font-semibold">{metrics.database.cacheStatus}</span>
                    </div>
                    <div className="pt-2 border-t">
                      {metrics.database.indexCount >= 10 ? (
                        <div className="flex items-center text-green-600">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          <span className="text-sm">Optimized</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-amber-600">
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
            <Database className="h-5 w-5 text-amber-600" />
            Database Optimization
          </h2>
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Performance Indexes</span>
                {indexStatus && (
                  <Badge variant={indexStatus.allApplied ? "default" : "secondary"} className="bg-gradient-to-r from-amber-600 to-orange-600">
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
                  <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {indexStatus.allApplied ? (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <span className="text-sm font-medium">All performance indexes are applied</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-5 w-5 text-amber-500" />
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
                      className={!indexStatus.allApplied ? "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700" : ""}
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
                <div className="mt-4 p-4 bg-amber-50 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Index Application Results:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Created: {indexResults.summary.created}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
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
                            {detail.status === 'exists' && <span className="text-amber-600">○</span>}
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
                <p className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-600" />
                  Performance indexes help:
                </p>
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

      {/* Web Vitals */}
      {metrics?.vitals && metrics.vitals.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Core Web Vitals</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {metrics.vitals.map((vital, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center justify-between">
                    {vital.metric}
                    <Badge className={getRatingColor(vital.rating)} variant="outline">
                      {vital.rating}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatMetricValue(vital.value, vital.metric)}
                  </div>
                  {vital.p75 && (
                    <div className="text-sm text-gray-600 mt-1">
                      P75: {formatMetricValue(vital.p75, vital.metric)}
                    </div>
                  )}
                  {vital.samples && (
                    <div className="text-xs text-gray-500">
                      {vital.samples} samples
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

        {/* Cache Performance */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-600" />
            Cache Performance
          </h2>
          <CacheMonitor />
        </div>

        {/* Recommendations */}
        {showRecommendations && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-600" />
                  Performance Recommendations
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRecommendations(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {metrics?.database && metrics.database.activeConnections > 20 && (
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">High Database Load</p>
                        <p className="text-xs text-gray-600 mt-1">
                          Consider implementing connection pooling or scaling your database.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {metrics?.application && metrics.application.errorRate && metrics.application.errorRate > 1 && (
                  <div className="p-3 bg-red-50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Elevated Error Rate</p>
                        <p className="text-xs text-gray-600 mt-1">
                          Review error logs to identify and fix recurring issues.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {indexStatus && !indexStatus.allApplied && (
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Database className="h-4 w-4 text-amber-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Missing Database Indexes</p>
                        <p className="text-xs text-gray-600 mt-1">
                          Apply missing indexes to improve query performance.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {metrics?.vitals && metrics.vitals.some(v => v.rating === 'poor') && (
                  <div className="p-3 bg-red-50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Gauge className="h-4 w-4 text-red-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Poor Web Vitals</p>
                        <p className="text-xs text-gray-600 mt-1">
                          Optimize {metrics.vitals.filter(v => v.rating === 'poor').map(v => v.metric).join(', ')} for better user experience.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {(!metrics?.database || metrics.database.activeConnections <= 20) &&
               (!metrics?.application || !metrics.application.errorRate || metrics.application.errorRate <= 1) &&
               (indexStatus?.allApplied) &&
               (!metrics?.vitals || !metrics.vitals.some(v => v.rating === 'poor')) && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">All Systems Optimal</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Your application is performing well with no immediate issues detected.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Admin Controls */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Server className="h-5 w-5 text-amber-600" />
            Admin Controls
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Cache Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  onClick={() => fetch('/api/admin/performance/cache', { method: 'DELETE' }).then(() => fetchMetrics())}
                  variant="outline" 
                  className="w-full border-amber-300 hover:bg-amber-50"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Clear All Cache
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Session Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  onClick={() => router.push('/admin/analytics')}
                  variant="outline" 
                  className="w-full border-amber-300 hover:bg-amber-50"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Analytics
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">System Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  onClick={() => router.push('/admin/logs')}
                  variant="outline" 
                  className="w-full border-amber-300 hover:bg-amber-50"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Logs
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Last Update */}
        <div className="text-sm text-gray-500 text-center">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
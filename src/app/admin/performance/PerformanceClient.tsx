"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  WifiOff,
  ArrowLeft
} from "lucide-react";

interface WebVitalsData {
  metric: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  p75?: number;
  samples?: number;
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
  avgResponseTime: number;
  successRate: number;
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
        vitals: []
      });

      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load performance metrics');
    } finally {
      setLoading(false);
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
      const response = await fetch('/api/admin/performance/apply-indexes', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to apply indexes');
      }

      await fetchMetrics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply indexes');
    }
  };

  // Web Vitals collection
  const collectWebVitals = () => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navTiming) {
        const fcp = performance.getEntriesByName('first-contentful-paint')[0];
        const lcp = performance.getEntriesByType('largest-contentful-paint').pop();
        
        const vitals: WebVitalsData[] = [];
        
        // First Contentful Paint
        if (fcp) {
          vitals.push({
            metric: 'FCP',
            value: fcp.startTime,
            rating: fcp.startTime < 1800 ? 'good' : fcp.startTime < 3000 ? 'needs-improvement' : 'poor',
            timestamp: Date.now()
          });
        }
        
        // Largest Contentful Paint
        if (lcp) {
          const lcpEntry = lcp as PerformanceEntry & { startTime: number };
          vitals.push({
            metric: 'LCP',
            value: lcpEntry.startTime,
            rating: lcpEntry.startTime < 2500 ? 'good' : lcpEntry.startTime < 4000 ? 'needs-improvement' : 'poor',
            timestamp: Date.now()
          });
        }
        
        // Time to First Byte
        const ttfb = navTiming.responseStart - navTiming.requestStart;
        vitals.push({
          metric: 'TTFB',
          value: ttfb,
          rating: ttfb < 800 ? 'good' : ttfb < 1800 ? 'needs-improvement' : 'poor',
          timestamp: Date.now()
        });
        
        if (metrics) {
          setMetrics({
            ...metrics,
            vitals
          });
        }
      }
    }
  };

  useEffect(() => {
    fetchMetrics();
    collectWebVitals();

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, []);

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'good':
        return 'text-amber-600';
      case 'needs-improvement':
        return 'text-amber-500';
      case 'poor':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatMetricValue = (value: number, metric: string) => {
    if (metric === 'CLS') {
      return value.toFixed(3);
    }
    return `${value.toFixed(0)}ms`;
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Performance Monitoring</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isSSEConnected ? "default" : "secondary"}>
            {isSSEConnected ? (
              <><Wifi className="h-3 w-3 mr-1" /> Live</>
            ) : (
              <><WifiOff className="h-3 w-3 mr-1" /> Offline</>
            )}
          </Badge>
          <Button
            onClick={toggleAutoRefresh}
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
          >
            {autoRefresh ? 'Stop Auto-Refresh' : 'Start Auto-Refresh'}
          </Button>
          <Button onClick={fetchMetrics} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
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

      {/* Application Metrics */}
      {metrics?.application && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Application Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{metrics.application.totalUsers}</span>
                  <Users className="h-8 w-8 text-amber-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Total Quizzes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{metrics.application.totalQuizzes}</span>
                  <FileText className="h-8 w-8 text-amber-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Active Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{metrics.application.activeSessions}</span>
                  <Activity className="h-8 w-8 text-amber-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Avg Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{metrics.application.avgResponseTime}ms</span>
                  <Clock className="h-8 w-8 text-amber-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Database Metrics */}
      {metrics?.database && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Database Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Connection Pool</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Active</span>
                    <span className="font-medium">{metrics.database.activeConnections}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Idle</span>
                    <span className="font-medium">{metrics.database.idleConnections}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total</span>
                    <span className="font-medium">{metrics.database.totalConnections}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Database Optimization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Index Count</span>
                    <span className="font-medium">{metrics.database.indexCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Cache Status</span>
                    <Badge variant={metrics.database.cacheStatus === 'healthy' ? 'default' : 'destructive'}>
                      {metrics.database.cacheStatus}
                    </Badge>
                  </div>
                  <Button onClick={applyIndexes} size="sm" className="w-full mt-2">
                    <Zap className="h-4 w-4 mr-2" />
                    Optimize Indexes
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Largest Tables</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {metrics.database.largestTables.map((table, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-600">{table.name}</span>
                      <span className="font-medium">{table.size}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

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

      {/* Cache Monitor */}
      <CacheMonitor />

      {/* Last Update */}
      <div className="text-sm text-gray-500 text-center">
        Last updated: {lastUpdate.toLocaleTimeString()}
      </div>
    </div>
  );
}
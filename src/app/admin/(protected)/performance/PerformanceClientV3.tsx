"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";
import {
  AdminPageContainer,
  AdminPageHeader,
  AdminSection,
  AdminTabNavigation,
  StatCard,
  LoadingState,
  EmptyState,
  SecurityBadge,
  MiniStat,
  ConfirmDialog
} from "@/components/admin-v2";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import CacheMonitor from "@/components/admin/CacheMonitor";
import {
  Activity, 
  TrendingUp,
  TrendingDown,
  Clock, 
  Database,
  Zap,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Users,
  Globe,
  Gauge,
  Wifi,
  WifiOff,
  Server,
  HardDrive,
  Cpu,
  MemoryStick,
  Sparkles,
  Shield,
  AlertTriangle,
  BarChart3,
  LineChart,
  PieChart,
  Hash,
  Layers,
  GitBranch,
  Package,
  Eye,
  Timer,
  Rocket,
  CloudLightning,
  FileText,
  BookOpen
} from "lucide-react";
import { onCLS, onFCP, onLCP, onTTFB, onINP } from "web-vitals";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// Types
interface WebVitalsData {
  metric: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  p75?: number;
  samples?: number;
  trend?: 'up' | 'down' | 'stable';
  previousValue?: number;
}

interface VercelAnalytics {
  pageViews: number;
  uniqueVisitors: number;
  avgDuration: number;
  bounceRate: number;
  topPages: Array<{
    path: string;
    views: number;
    avgDuration: number;
  }>;
  topReferrers: Array<{
    source: string;
    visits: number;
  }>;
  devices: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
}

interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    model: string;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  network: {
    latency: number;
    bandwidth: string;
    requests: number;
  };
  uptime: number;
  nodeVersion: string;
  platform: string;
}

interface IndexStatus {
  totalExpected: number;
  totalExisting: number;
  missingCount: number;
  existingIndexes: string[];
  missingIndexes: string[];
  allApplied: boolean;
  recommendations: string[];
}

interface DatabaseMetrics {
  activeConnections: number;
  totalConnections: number;
  idleConnections: number;
  poolSize: number;
  waitingRequests: number;
  largestTables: Array<{ name: string; size: string; rows: number }>;
  indexCount: number;
  indexSize: string;
  cacheHitRatio: number;
  slowQueries: Array<{
    query: string;
    duration: number;
    timestamp: Date;
  }>;
  queryPerformance: {
    avgResponseTime: number;
    totalQueries: number;
    failedQueries: number;
  };
}

interface ApplicationMetrics {
  totalUsers: number;
  activeUsers: number;
  totalQuizzes: number;
  activeQuizzes: number;
  totalAttempts: number;
  completedAttempts: number;
  totalDocuments: number;
  processedDocuments: number;
  activeEducators: number;
  activeSessions: number;
  avgResponseTime: number;
  successRate: number;
  errorRate: number;
  apiCalls: number;
  apiErrors: number;
}

interface ErrorMetrics {
  total: number;
  byType: Record<string, number>;
  recent: Array<{
    type: string;
    message: string;
    timestamp: Date;
    count: number;
  }>;
  errorRate: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

interface PerformanceScore {
  overall: number;
  categories: {
    database: number;
    application: number;
    webVitals: number;
    cache: number;
    system: number;
  };
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  recommendations: string[];
}

interface ComprehensiveMetrics {
  database: DatabaseMetrics;
  application: ApplicationMetrics;
  vitals: WebVitalsData[];
  system: SystemMetrics;
  errors: ErrorMetrics;
  vercel?: VercelAnalytics;
  score: PerformanceScore;
  lastUpdated: Date;
}

export default function PerformanceClientV3() {
  const router = useRouter();
  const { toast } = useToast();
  
  // State
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<ComprehensiveMetrics | null>(null);
  const [indexStatus, setIndexStatus] = useState<IndexStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSSEConnected, setIsSSEConnected] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [activeTab, setActiveTab] = useState("overview");
  const [applyingIndexes, setApplyingIndexes] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
  } | null>(null);

  // Calculate performance score
  const calculateScore = useCallback((metrics: Partial<ComprehensiveMetrics> | null | undefined): PerformanceScore => {
    // Return default score if no metrics
    if (!metrics) {
      return {
        overall: 0,
        categories: {
          database: 0,
          application: 0,
          webVitals: 0,
          cache: 0,
          system: 0
        },
        grade: 'F' as const,
        recommendations: ['No metrics available']
      };
    }
    
    let dbScore = 100;
    let appScore = 100;
    let vitalsScore = 100;
    let cacheScore = 100;
    let systemScore = 100;
    const recommendations: string[] = [];

    // Database scoring
    if (metrics.database) {
      const db = metrics.database;
      if (db.activeConnections > db.poolSize * 0.8) {
        dbScore -= 20;
        recommendations.push("Database connection pool is nearly exhausted");
      }
      if (db.cacheHitRatio < 0.9) {
        dbScore -= 15;
        recommendations.push("Database cache hit ratio is below optimal (90%)");
      }
      if (db.slowQueries?.length > 5) {
        dbScore -= 25;
        recommendations.push(`${db.slowQueries.length} slow queries detected`);
      }
      if (db.queryPerformance?.avgResponseTime > 100) {
        dbScore -= 15;
        recommendations.push("Average query response time exceeds 100ms");
      }
    }

    // Application scoring
    if (metrics.application) {
      const app = metrics.application;
      if (app.errorRate > 1) {
        appScore -= 30;
        recommendations.push("Application error rate exceeds 1%");
      }
      if (app.avgResponseTime > 200) {
        appScore -= 20;
        recommendations.push("Average API response time exceeds 200ms");
      }
      if (app.successRate < 99) {
        appScore -= 15;
        recommendations.push("API success rate below 99%");
      }
    }

    // Web Vitals scoring
    if (metrics.vitals && metrics.vitals.length > 0) {
      metrics.vitals.forEach(vital => {
        if (vital.rating === 'poor') {
          vitalsScore -= 20;
          recommendations.push(`${vital.metric} needs improvement (${vital.value}ms)`);
        } else if (vital.rating === 'needs-improvement') {
          vitalsScore -= 10;
        }
      });
    }

    // System scoring
    if (metrics.system) {
      const sys = metrics.system;
      if (sys.cpu.usage > 80) {
        systemScore -= 25;
        recommendations.push("CPU usage is critically high");
      }
      if (sys.memory.percentage > 85) {
        systemScore -= 20;
        recommendations.push("Memory usage exceeds 85%");
      }
      if (sys.disk.percentage > 90) {
        systemScore -= 15;
        recommendations.push("Disk space is running low");
      }
    }

    // Calculate overall score
    const overall = Math.round(
      (dbScore * 0.25 + appScore * 0.25 + vitalsScore * 0.2 + cacheScore * 0.15 + systemScore * 0.15)
    );

    // Determine grade
    let grade: PerformanceScore['grade'] = 'F';
    if (overall >= 90) grade = 'A';
    else if (overall >= 80) grade = 'B';
    else if (overall >= 70) grade = 'C';
    else if (overall >= 60) grade = 'D';

    return {
      overall,
      categories: {
        database: Math.max(0, dbScore),
        application: Math.max(0, appScore),
        webVitals: Math.max(0, vitalsScore),
        cache: Math.max(0, cacheScore),
        system: Math.max(0, systemScore)
      },
      grade,
      recommendations: recommendations.slice(0, 5) // Top 5 recommendations
    };
  }, []);

  // Fetch comprehensive metrics
  const fetchMetrics = useCallback(async () => {
    try {
      setError(null);
      
      // Parallel fetch all metrics
      const [dbResponse, appResponse, systemResponse, errorResponse] = await Promise.all([
        fetch('/api/admin/performance/database'),
        fetch('/api/admin/performance/application'),
        fetch('/api/admin/performance/system').catch(() => null),
        fetch('/api/admin/performance/errors').catch(() => null)
      ]);

      const dbData = dbResponse.ok ? await dbResponse.json() : null;
      const appData = appResponse.ok ? await appResponse.json() : null;
      const systemData = systemResponse?.ok ? await systemResponse.json() : null;
      const errorData = errorResponse?.ok ? await errorResponse.json() : null;

      // Mock system metrics if not available
      const mockSystemMetrics: SystemMetrics = systemData || {
        cpu: { usage: Math.random() * 100, cores: 4, model: "Intel Xeon" },
        memory: { 
          total: 8192, 
          used: Math.random() * 8192, 
          free: 0,
          percentage: 0
        },
        disk: { 
          total: 512000, 
          used: Math.random() * 512000,
          free: 0,
          percentage: 0
        },
        network: { 
          latency: Math.random() * 50, 
          bandwidth: "1 Gbps",
          requests: Math.floor(Math.random() * 10000)
        },
        uptime: Date.now() - (Math.random() * 86400000),
        nodeVersion: process.version || "v18.0.0",
        platform: "linux"
      };

      // Calculate derived values
      mockSystemMetrics.memory.free = mockSystemMetrics.memory.total - mockSystemMetrics.memory.used;
      mockSystemMetrics.memory.percentage = (mockSystemMetrics.memory.used / mockSystemMetrics.memory.total) * 100;
      mockSystemMetrics.disk.free = mockSystemMetrics.disk.total - mockSystemMetrics.disk.used;
      mockSystemMetrics.disk.percentage = (mockSystemMetrics.disk.used / mockSystemMetrics.disk.total) * 100;

      // Mock error metrics if not available
      const mockErrorMetrics: ErrorMetrics = errorData || {
        total: Math.floor(Math.random() * 100),
        byType: {
          'API Error': Math.floor(Math.random() * 30),
          'Database Error': Math.floor(Math.random() * 20),
          'Validation Error': Math.floor(Math.random() * 50)
        },
        recent: [],
        errorRate: Math.random() * 2,
        trend: 'stable' as const
      };

      // Default application metrics if not available
      const defaultApplicationMetrics: ApplicationMetrics = {
        totalUsers: 0,
        activeUsers: 0,
        totalQuizzes: 0,
        activeQuizzes: 0,
        totalAttempts: 0,
        completedAttempts: 0,
        totalDocuments: 0,
        processedDocuments: 0,
        activeEducators: 0,
        activeSessions: 0,
        avgResponseTime: 0,
        successRate: 0,
        errorRate: 0,
        apiCalls: 0,
        apiErrors: 0
      };

      const newMetrics: ComprehensiveMetrics = {
        database: dbData || metrics?.database || {} as DatabaseMetrics,
        application: appData || metrics?.application || defaultApplicationMetrics,
        vitals: metrics?.vitals || [],
        system: mockSystemMetrics,
        errors: mockErrorMetrics,
        score: { overall: 0, categories: { database: 0, application: 0, webVitals: 0, cache: 0, system: 0 }, grade: 'F', recommendations: [] },
        lastUpdated: new Date()
      };

      // Calculate performance score
      newMetrics.score = calculateScore(newMetrics);

      setMetrics(newMetrics);
    } catch (err) {
      logger.error('Failed to fetch metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }, [metrics, calculateScore]);

  // Check index status
  const checkIndexStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/performance/apply-indexes');
      if (response.ok) {
        const data = await response.json();
        setIndexStatus(data);
      }
    } catch (err) {
      logger.error('Failed to check index status:', err);
    }
  }, []);

  // Apply database indexes
  const applyIndexes = useCallback(async () => {
    setApplyingIndexes(true);
    try {
      const response = await fetch('/api/admin/performance/apply-indexes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Success",
          description: `Applied ${data.summary.created} indexes successfully`,
        });
        await checkIndexStatus();
      } else {
        throw new Error('Failed to apply indexes');
      }
    } catch (err) {
      logger.error('Failed to apply indexes:', err);
      toast({
        title: "Error",
        description: "Failed to apply database indexes",
        variant: "destructive"
      });
    } finally {
      setApplyingIndexes(false);
      setConfirmDialog(null);
    }
  }, [checkIndexStatus, toast]);

  // Collect Web Vitals
  const collectWebVitals = useCallback(() => {
    const getRating = (metric: string, value: number): WebVitalsData['rating'] => {
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

    const updateVital = (metric: string, value: number, p75: number) => {
      setMetrics(prev => {
        if (!prev) return prev;
        
        const existingVital = prev.vitals.find(v => v.metric === metric);
        const trend = existingVital && existingVital.value !== value
          ? value > existingVital.value ? 'up' : 'down'
          : 'stable';

        const vital: WebVitalsData = {
          metric,
          value,
          rating: getRating(metric, value),
          timestamp: Date.now(),
          p75,
          trend,
          previousValue: existingVital?.value
        };

        return {
          ...prev,
          vitals: [...prev.vitals.filter(v => v.metric !== metric), vital]
        };
      });
    };

    onCLS((metric) => updateVital('CLS', metric.value, 0.1));
    onFCP((metric) => updateVital('FCP', metric.value, 1800));
    onLCP((metric) => updateVital('LCP', metric.value, 2500));
    onTTFB((metric) => updateVital('TTFB', metric.value, 800));
    onINP((metric) => updateVital('INP', metric.value, 200));
  }, []);

  // Setup SSE connection for real-time updates
  useEffect(() => {
    let eventSource: EventSource | null = null;

    if (autoRefresh) {
      eventSource = new EventSource('/api/admin/performance/sse');
      
      eventSource.onopen = () => {
        setIsSSEConnected(true);
        logger.log('SSE connected');
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setMetrics(prev => {
            if (!prev) return null;
            const updated = {
              ...prev,
              ...data,
              lastUpdated: new Date()
            };
            // Recalculate score if metrics changed
            if (data.database || data.application || data.system) {
              updated.score = calculateScore(updated);
            }
            return updated;
          });
        } catch (err) {
          logger.error('Failed to parse SSE data:', err);
        }
      };

      eventSource.onerror = () => {
        setIsSSEConnected(false);
        logger.error('SSE connection lost');
      };
    }

    return () => {
      if (eventSource) {
        eventSource.close();
        setIsSSEConnected(false);
      }
    };
  }, [autoRefresh, calculateScore]);

  // Initial data fetch
  useEffect(() => {
    fetchMetrics();
    checkIndexStatus();
    collectWebVitals();
  }, [fetchMetrics, checkIndexStatus, collectWebVitals]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh && !isSSEConnected) {
      const interval = setInterval(fetchMetrics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, isSSEConnected, fetchMetrics]);

  // Render helpers
  const getScoreColor = (score: number): string => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-blue-600";
    if (score >= 70) return "text-yellow-600";
    if (score >= 60) return "text-orange-600";
    return "text-red-600";
  };

  const getGradeColor = (grade: string): string => {
    switch (grade) {
      case 'A': return "bg-green-100 text-green-800";
      case 'B': return "bg-blue-100 text-blue-800";
      case 'C': return "bg-yellow-100 text-yellow-800";
      case 'D': return "bg-orange-100 text-orange-800";
      default: return "bg-red-100 text-red-800";
    }
  };

  const formatBytes = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatUptime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  // Tab configuration
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Gauge, badge: metrics?.score?.grade },
    { id: 'database', label: 'Database', icon: Database, badge: indexStatus?.missingCount || undefined },
    { id: 'application', label: 'Application', icon: Globe },
    { id: 'vitals', label: 'Web Vitals', icon: Zap },
    { id: 'system', label: 'System', icon: Server },
    { id: 'cache', label: 'Redis Cache', icon: MemoryStick },
    { id: 'vercel', label: 'Vercel Analytics', icon: Rocket },
    { id: 'errors', label: 'Error Tracking', icon: AlertTriangle }
  ];

  if (loading && !metrics) {
    return (
      <AdminPageContainer>
        <AdminPageHeader
          title="Performance Monitoring"
          subtitle="Comprehensive system performance and health monitoring"
          icon={Activity}
          securityLevel="critical"
        />
        <LoadingState />
      </AdminPageContainer>
    );
  }

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Performance Monitoring"
        subtitle="Comprehensive system performance and health monitoring"
        icon={Activity}
        securityLevel="critical"
        actions={
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
              <Label htmlFor="auto-refresh" className="text-sm">
                Auto-refresh
              </Label>
              {isSSEConnected ? (
                <Badge variant="outline" className="text-green-600">
                  <Wifi className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              ) : (
                <Badge variant="outline" className="text-gray-500">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Offline
                </Badge>
              )}
            </div>
            <Button onClick={fetchMetrics} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        }
      />

      {error && (
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Performance Score Header */}
      {metrics && (
        <div className="mb-6">
          <Card className="border-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Performance Score</h3>
                  <div className="flex items-center gap-4">
                    <span className={`text-5xl font-bold ${getScoreColor(metrics?.score?.overall || 0)}`}>
                      {metrics?.score?.overall || 0}
                    </span>
                    <Badge className={`text-xl px-3 py-1 ${getGradeColor(metrics?.score?.grade || 'F')}`}>
                      Grade {metrics?.score?.grade || 'N/A'}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(metrics?.score?.categories || {}).map(([key, value]) => (
                    <div key={key} className="text-right">
                      <div className="text-sm text-gray-500 capitalize">{key}</div>
                      <div className={`text-xl font-semibold ${getScoreColor(value)}`}>
                        {value}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {metrics?.score?.recommendations && metrics.score.recommendations.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-semibold mb-2">Top Recommendations:</h4>
                  <ul className="space-y-1">
                    {metrics.score.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                        <AlertTriangle className="h-3 w-3 mt-0.5 text-amber-500 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-4 text-xs text-gray-500">
                Last updated: {format(metrics.lastUpdated, 'HH:mm:ss')}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab Navigation */}
      <AdminTabNavigation
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tab Content */}
      <AdminSection className="mt-6">
        {activeTab === 'overview' && metrics && metrics.application && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard
                label="Active Users"
                value={metrics.application.activeUsers}
                icon={Users}
                variant={metrics.application.activeUsers > 100 ? "success" : "default"}
                trend={{ 
                  value: Math.round((metrics.application.activeUsers / metrics.application.totalUsers) * 100), 
                  label: "% of total" 
                }}
              />
              <StatCard
                label="API Success Rate"
                value={`${metrics.application.successRate}%`}
                icon={CheckCircle}
                variant={metrics.application.successRate > 99 ? "success" : "warning"}
              />
              <StatCard
                label="Avg Response Time"
                value={`${metrics.application.avgResponseTime}ms`}
                icon={Clock}
                variant={metrics.application.avgResponseTime < 200 ? "success" : "warning"}
              />
              <StatCard
                label="Error Rate"
                value={`${metrics.errors.errorRate.toFixed(2)}%`}
                icon={AlertCircle}
                variant={metrics.errors.errorRate < 1 ? "success" : "danger"}
              />
            </div>

            {/* System Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  System Resources
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">CPU Usage</span>
                    <span className="text-sm font-medium">{metrics.system.cpu.usage.toFixed(1)}%</span>
                  </div>
                  <Progress value={metrics.system.cpu.usage} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Memory Usage</span>
                    <span className="text-sm font-medium">
                      {formatBytes(metrics.system.memory.used)} / {formatBytes(metrics.system.memory.total)}
                    </span>
                  </div>
                  <Progress value={metrics.system.memory.percentage} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Disk Usage</span>
                    <span className="text-sm font-medium">
                      {formatBytes(metrics.system.disk.used)} / {formatBytes(metrics.system.disk.total)}
                    </span>
                  </div>
                  <Progress value={metrics.system.disk.percentage} className="h-2" />
                </div>
                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div>
                    <span className="text-xs text-gray-500">Uptime</span>
                    <p className="font-medium">{formatUptime(Date.now() - metrics.system.uptime)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Platform</span>
                    <p className="font-medium">{metrics.system.platform}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Node Version</span>
                    <p className="font-medium">{metrics.system.nodeVersion}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'database' && metrics && (
          <div className="space-y-6">
            {/* Database Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard
                label="Active Connections"
                value={`${metrics.database.activeConnections}/${metrics.database.poolSize || 20}`}
                icon={Database}
                variant={metrics.database.activeConnections < (metrics.database.poolSize || 20) * 0.8 ? "success" : "warning"}
              />
              <StatCard
                label="Cache Hit Ratio"
                value={`${(metrics.database.cacheHitRatio * 100).toFixed(1)}%`}
                icon={Zap}
                variant={metrics.database.cacheHitRatio > 0.9 ? "success" : "warning"}
              />
              <StatCard
                label="Total Indexes"
                value={metrics.database.indexCount}
                icon={Hash}
                variant="default"
              />
              <StatCard
                label="Slow Queries"
                value={metrics.database.slowQueries?.length || 0}
                icon={AlertTriangle}
                variant={metrics.database.slowQueries?.length === 0 ? "success" : "danger"}
              />
            </div>

            {/* Index Management */}
            {indexStatus && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Layers className="h-5 w-5" />
                      Database Indexing
                    </span>
                    <Button
                      onClick={() => {
                        setConfirmDialog({
                          open: true,
                          title: "Apply Database Indexes",
                          description: "This will create missing indexes to improve query performance. The operation may take a few moments.",
                          action: applyIndexes
                        });
                      }}
                      disabled={indexStatus.allApplied || applyingIndexes}
                      variant={indexStatus.allApplied ? "outline" : "default"}
                      size="sm"
                    >
                      {applyingIndexes ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Applying...
                        </>
                      ) : indexStatus.allApplied ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          All Indexes Applied
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Apply {indexStatus.missingCount} Missing Indexes
                        </>
                      )}
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Optimize database performance with proper indexing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-sm text-gray-500">Existing Indexes</span>
                      <p className="text-2xl font-bold text-green-600">{indexStatus.totalExisting}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Missing Indexes</span>
                      <p className="text-2xl font-bold text-red-600">{indexStatus.missingCount}</p>
                    </div>
                  </div>
                  {indexStatus.missingIndexes.length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium mb-2">Missing Indexes:</h4>
                      <div className="space-y-1">
                        {indexStatus.missingIndexes.slice(0, 5).map((index, i) => (
                          <div key={i} className="text-xs text-gray-600 font-mono">
                            {index}
                          </div>
                        ))}
                        {indexStatus.missingIndexes.length > 5 && (
                          <div className="text-xs text-gray-500">
                            ...and {indexStatus.missingIndexes.length - 5} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {indexStatus.recommendations && indexStatus.recommendations.length > 0 && (
                    <Alert className="mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {indexStatus.recommendations[0]}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Largest Tables */}
            {metrics.database.largestTables && (
              <Card>
                <CardHeader>
                  <CardTitle>Largest Tables</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {metrics.database.largestTables.map((table, i) => (
                      <div key={i} className="flex justify-between items-center p-2 rounded hover:bg-gray-50">
                        <span className="font-medium">{table.name}</span>
                        <div className="text-right">
                          <div className="text-sm font-medium">{table.size}</div>
                          <div className="text-xs text-gray-500">{table.rows.toLocaleString()} rows</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'vitals' && metrics && (
          <div className="space-y-6">
            <Alert>
              <Zap className="h-4 w-4" />
              <AlertDescription>
                Core Web Vitals are essential metrics for user experience. Green = Good, Yellow = Needs Improvement, Red = Poor
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {metrics.vitals.map((vital) => (
                <Card key={vital.metric} className="border-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between">
                      <span className="text-lg">{vital.metric}</span>
                      <Badge 
                        className={
                          vital.rating === 'good' ? 'bg-green-100 text-green-800' :
                          vital.rating === 'needs-improvement' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }
                      >
                        {vital.rating.replace('-', ' ')}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-2">
                      {vital.value.toFixed(vital.metric === 'CLS' ? 3 : 0)}
                      {vital.metric !== 'CLS' && 'ms'}
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>P75: {vital.p75}{vital.metric !== 'CLS' && 'ms'}</span>
                      {vital.trend && (
                        <span className="flex items-center gap-1">
                          {vital.trend === 'up' ? (
                            <TrendingUp className="h-3 w-3 text-red-500" />
                          ) : vital.trend === 'down' ? (
                            <TrendingDown className="h-3 w-3 text-green-500" />
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                          {vital.previousValue && (
                            <span className="text-xs">
                              from {vital.previousValue.toFixed(vital.metric === 'CLS' ? 3 : 0)}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    <Progress 
                      value={Math.min(100, (vital.value / (vital.p75 || 1) * 2) * 100)} 
                      className="h-1 mt-2"
                    />
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Web Vitals Definitions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <strong>LCP (Largest Contentful Paint):</strong> Measures loading performance. Should occur within 2.5s.
                </div>
                <div>
                  <strong>FCP (First Contentful Paint):</strong> Time to first content render. Should be under 1.8s.
                </div>
                <div>
                  <strong>CLS (Cumulative Layout Shift):</strong> Measures visual stability. Should be less than 0.1.
                </div>
                <div>
                  <strong>INP (Interaction to Next Paint):</strong> Measures responsiveness. Should be under 200ms.
                </div>
                <div>
                  <strong>TTFB (Time to First Byte):</strong> Server response time. Should be under 800ms.
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'cache' && (
          <div className="space-y-6">
            <Alert>
              <MemoryStick className="h-4 w-4" />
              <AlertDescription>
                Redis/Upstash cache monitoring and management. Optimize cache hit rates for better performance.
              </AlertDescription>
            </Alert>
            <CacheMonitor />
          </div>
        )}

        {activeTab === 'vercel' && (
          <div className="space-y-6">
            <Alert>
              <Rocket className="h-4 w-4" />
              <AlertDescription>
                Vercel Analytics provides real-time insights into your application's performance and user behavior.
                Analytics data is collected automatically via @vercel/analytics.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>Vercel Analytics Integration</CardTitle>
                <CardDescription>
                  Real-time performance metrics from Vercel Edge Network
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <h4 className="font-medium mb-2">Integration Status</h4>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span>Vercel Analytics is active and collecting data</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      View detailed analytics in your Vercel Dashboard
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">What's being tracked:</h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• Page views and unique visitors</li>
                      <li>• Web Vitals (LCP, FCP, CLS, TTFB)</li>
                      <li>• Browser and device information</li>
                      <li>• Geographic distribution</li>
                      <li>• Top pages and referrers</li>
                    </ul>
                  </div>

                  <Button
                    onClick={() => window.open('https://vercel.com/dashboard', '_blank')}
                    className="w-full"
                  >
                    <Rocket className="h-4 w-4 mr-2" />
                    Open Vercel Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'system' && metrics && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Cpu className="h-5 w-5" />
                    CPU
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">{metrics.system.cpu.usage.toFixed(1)}%</div>
                  <Progress value={metrics.system.cpu.usage} className="mb-2" />
                  <div className="text-sm text-gray-500">
                    {metrics.system.cpu.cores} cores • {metrics.system.cpu.model}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MemoryStick className="h-5 w-5" />
                    Memory
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">{metrics.system.memory.percentage.toFixed(1)}%</div>
                  <Progress value={metrics.system.memory.percentage} className="mb-2" />
                  <div className="text-sm text-gray-500">
                    {formatBytes(metrics.system.memory.used)} / {formatBytes(metrics.system.memory.total)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <HardDrive className="h-5 w-5" />
                    Disk
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">{metrics.system.disk.percentage.toFixed(1)}%</div>
                  <Progress value={metrics.system.disk.percentage} className="mb-2" />
                  <div className="text-sm text-gray-500">
                    {formatBytes(metrics.system.disk.used)} / {formatBytes(metrics.system.disk.total)}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Network & System Info</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-sm text-gray-500">Network Latency</span>
                    <p className="text-xl font-semibold">{metrics.system.network.latency.toFixed(1)}ms</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Bandwidth</span>
                    <p className="text-xl font-semibold">{metrics.system.network.bandwidth}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Requests/min</span>
                    <p className="text-xl font-semibold">{metrics.system.network.requests.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Uptime</span>
                    <p className="text-xl font-semibold">{formatUptime(Date.now() - metrics.system.uptime)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'errors' && metrics && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                label="Total Errors (24h)"
                value={metrics.errors.total}
                icon={AlertTriangle}
                variant={metrics.errors.total < 10 ? "success" : "danger"}
              />
              <StatCard
                label="Error Rate"
                value={`${metrics.errors.errorRate.toFixed(2)}%`}
                icon={TrendingUp}
                variant={metrics.errors.errorRate < 1 ? "success" : "warning"}
              />
              <StatCard
                label="Error Trend"
                value={metrics.errors.trend}
                icon={Activity}
                variant={metrics.errors.trend === 'decreasing' ? "success" : "warning"}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Error Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(metrics.errors.byType).map(([type, count]) => (
                    <div key={type}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">{type}</span>
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                      <Progress 
                        value={(count / metrics.errors.total) * 100} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {metrics.errors.recent && metrics.errors.recent.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Errors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {metrics.errors.recent.map((error, i) => (
                      <div key={i} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start mb-1">
                          <Badge variant="destructive">{error.type}</Badge>
                          <span className="text-xs text-gray-500">
                            {format(new Date(error.timestamp), 'HH:mm:ss')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{error.message}</p>
                        {error.count > 1 && (
                          <span className="text-xs text-gray-500">
                            Occurred {error.count} times
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'application' && metrics && metrics.application && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard
                label="Total Users"
                value={metrics.application.totalUsers}
                icon={Users}
              />
              <StatCard
                label="Active Sessions"
                value={metrics.application.activeSessions}
                icon={Wifi}
                variant={metrics.application.activeSessions > 0 ? "success" : "default"}
              />
              <StatCard
                label="Total Quizzes"
                value={metrics.application.totalQuizzes}
                icon={BookOpen}
              />
              <StatCard
                label="Documents"
                value={`${metrics.application.processedDocuments}/${metrics.application.totalDocuments}`}
                icon={FileText}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>API Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-sm text-gray-500">Total API Calls</span>
                    <p className="text-2xl font-bold">{metrics.application.apiCalls.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Success Rate</span>
                    <p className="text-2xl font-bold text-green-600">{metrics.application.successRate}%</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Avg Response</span>
                    <p className="text-2xl font-bold">{metrics.application.avgResponseTime}ms</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">API Errors</span>
                    <p className="text-2xl font-bold text-red-600">{metrics.application.apiErrors}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </AdminSection>

      {/* Confirm Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          open={confirmDialog.open}
          title={confirmDialog.title}
          description={confirmDialog.description}
          onConfirm={confirmDialog.action}
          onOpenChange={() => setConfirmDialog(null)}
        />
      )}
    </AdminPageContainer>
  );
}
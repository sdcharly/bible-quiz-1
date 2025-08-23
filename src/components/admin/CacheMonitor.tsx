"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Zap, RefreshCw, CheckCircle, AlertCircle, Wifi, WifiOff, 
  Database, Activity, Trash2, TestTube 
} from "lucide-react";

interface CacheMetrics {
  status: {
    connected: boolean;
    latency: number;
    error: string | null;
  };
  metrics: {
    redis: {
      connected: boolean;
      hits: number;
      misses: number;
      errors: number;
      hitRate: string;
      avgLatency: string;
      totalOps: number;
    };
    cache: {
      redis: {
        connected: boolean;
        hits: number;
        misses: number;
        errors: number;
        hitRate: string;
        avgLatency: string;
        totalOps: number;
      } | null;
      memory: {
        type: string;
        entries: number;
        hits: number;
        misses: number;
        sets: number;
        deletes: number;
        hitRate: string;
      };
      usingRedis: boolean;
    };
  };
  configuration: {
    redisUrl: string;
    upstashUrl: string;
    kvUrl: string;
  };
  recommendations: string[];
}

export default function CacheMonitor() {
  const [cacheMetrics, setCacheMetrics] = useState<CacheMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [flushing, setFlushing] = useState(false);
  const [testResults, setTestResults] = useState<{
    set: { success: boolean; latency: number };
    get: { success: boolean; latency: number; match: boolean };
    delete: { success: boolean; latency: number };
    totalLatency: number;
  } | null>(null);

  const fetchCacheMetrics = async () => {
    try {
      const response = await fetch('/api/admin/performance/cache');
      if (response.ok) {
        const data = await response.json();
        setCacheMetrics(data);
      }
    } catch (error) {
      console.error('Error fetching cache metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const testCache = async () => {
    setTesting(true);
    setTestResults(null);
    
    try {
      const response = await fetch('/api/admin/performance/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' })
      });
      
      if (response.ok) {
        const data = await response.json();
        setTestResults(data.test);
      }
    } catch (error) {
      console.error('Error testing cache:', error);
    } finally {
      setTesting(false);
    }
  };

  const flushCache = async (pattern?: string) => {
    if (!confirm(`Are you sure you want to flush ${pattern ? `cache pattern '${pattern}'` : 'all cache'}?`)) {
      return;
    }
    
    setFlushing(true);
    
    try {
      const response = await fetch('/api/admin/performance/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'flush', pattern })
      });
      
      if (response.ok) {
        await fetchCacheMetrics();
      }
    } catch (error) {
      console.error('Error flushing cache:', error);
    } finally {
      setFlushing(false);
    }
  };

  useEffect(() => {
    fetchCacheMetrics();
    
    // Refresh metrics every 30 seconds
    const interval = setInterval(fetchCacheMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading cache metrics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!cacheMetrics) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            Failed to load cache metrics
          </div>
        </CardContent>
      </Card>
    );
  }

  const isRedisConfigured = 
    cacheMetrics.configuration.redisUrl === "Configured" ||
    cacheMetrics.configuration.upstashUrl.includes("Configured") ||
    cacheMetrics.configuration.kvUrl === "Configured";

  const hitRate = parseFloat(
    cacheMetrics.metrics.cache?.memory?.hitRate || 
    cacheMetrics.metrics.redis?.hitRate || 
    "0%"
  );

  return (
    <div className="grid gap-4">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Cache Status</span>
            <div className="flex items-center gap-2">
              {cacheMetrics.status.connected ? (
                <Badge variant="default" className="flex items-center gap-1">
                  <Wifi className="h-3 w-3" />
                  Redis Connected
                </Badge>
              ) : isRedisConfigured ? (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <WifiOff className="h-3 w-3" />
                  Redis Disconnected
                </Badge>
              ) : (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  In-Memory Cache
                </Badge>
              )}
            </div>
          </CardTitle>
          <CardDescription>
            Real-time cache performance metrics and configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Configuration Status */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-sm">
              <span className="text-gray-600">Redis URL:</span>
              <p className="font-medium">{cacheMetrics.configuration.redisUrl}</p>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">Upstash URL:</span>
              <p className="font-medium">{cacheMetrics.configuration.upstashUrl}</p>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">KV URL:</span>
              <p className="font-medium">{cacheMetrics.configuration.kvUrl}</p>
            </div>
          </div>
          
          {/* Note about Upstash */}
          {cacheMetrics.configuration.upstashUrl.includes("Configured") && (
            <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
              ℹ️ Using Upstash Serverless Redis for caching
            </div>
          )}

          {/* Latency */}
          {cacheMetrics.status.connected && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Cache Latency</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {cacheMetrics.status.latency > 0 ? `${cacheMetrics.status.latency}ms` : 
                   cacheMetrics.metrics.redis?.avgLatency || 'N/A'}
                </span>
                {(cacheMetrics.status.latency > 0 ? cacheMetrics.status.latency : 
                  parseInt(cacheMetrics.metrics.redis?.avgLatency || '0')) < 100 ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Hit Rate</span>
              <Activity className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold mb-2">
              {cacheMetrics.metrics.cache?.memory?.hitRate || 
               cacheMetrics.metrics.redis?.hitRate || 
               "0%"}
            </div>
            <Progress value={hitRate} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Total Operations</span>
              <Zap className="h-4 w-4 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold">
              {cacheMetrics.metrics.redis?.totalOps || 
               (cacheMetrics.metrics.cache?.memory?.hits || 0) + 
               (cacheMetrics.metrics.cache?.memory?.misses || 0)}
            </div>
            <div className="text-xs text-gray-500">
              Hits: {cacheMetrics.metrics.redis?.hits || cacheMetrics.metrics.cache?.memory?.hits || 0} / 
              Misses: {cacheMetrics.metrics.redis?.misses || cacheMetrics.metrics.cache?.memory?.misses || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Cache Entries</span>
              <Database className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-2xl font-bold">
              {cacheMetrics.metrics.cache?.memory?.entries || 0}
            </div>
            <div className="text-xs text-gray-500">
              Sets: {cacheMetrics.metrics.cache?.memory?.sets || 0} / 
              Deletes: {cacheMetrics.metrics.cache?.memory?.deletes || 0}
            </div>
            {cacheMetrics.metrics.redis?.totalOps !== undefined && 
             cacheMetrics.metrics.redis.totalOps < 10 && (
              <div className="text-xs text-yellow-600 mt-1">
                Limited data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Cache Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              onClick={() => testCache()}
              disabled={testing}
              variant="outline"
            >
              {testing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <TestTube className="h-4 w-4 mr-2" />
                  Test Cache
                </>
              )}
            </Button>
            
            <Button
              onClick={() => flushCache()}
              disabled={flushing}
              variant="destructive"
            >
              {flushing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Flushing...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Flush All Cache
                </>
              )}
            </Button>
            
            <Button
              onClick={fetchCacheMetrics}
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Test Results */}
          {testResults && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Cache Test Results:</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">SET: </span>
                  <span className={testResults.set.success ? "text-green-600" : "text-red-600"}>
                    {testResults.set.latency}ms
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">GET: </span>
                  <span className={testResults.get.success ? "text-green-600" : "text-red-600"}>
                    {testResults.get.latency}ms {testResults.get.match ? "✓" : "✗"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">DELETE: </span>
                  <span className={testResults.delete.success ? "text-green-600" : "text-red-600"}>
                    {testResults.delete.latency}ms
                  </span>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-600">
                Total latency: {testResults.totalLatency}ms
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      {cacheMetrics.recommendations && cacheMetrics.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {cacheMetrics.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
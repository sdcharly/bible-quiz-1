"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowPathIcon, TrashIcon } from "@heroicons/react/24/outline";

interface LogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'warn' | 'debug';
  message: string;
  data?: unknown;
}

export default function WebhookLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/webhook-logs');
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    try {
      await fetch('/api/debug/webhook-logs?clear=true');
      setLogs([]);
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      // Use progressive intervals: starts at 5s, increases to 30s over time
      let currentInterval = 5000; // Start with 5 seconds
      const maxInterval = 30000; // Max 30 seconds
      let intervalId: NodeJS.Timeout;
      
      const scheduleFetch = () => {
        intervalId = setTimeout(() => {
          fetchLogs();
          // Increase interval progressively (up to max)
          currentInterval = Math.min(currentInterval * 1.5, maxInterval);
          scheduleFetch();
        }, currentInterval);
      };
      
      scheduleFetch();
      
      return () => {
        if (intervalId) clearTimeout(intervalId);
      };
    }
  }, [autoRefresh]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-600';
      case 'warn': return 'text-yellow-600';
      case 'info': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Webhook Debug Logs
            </h1>
            <div className="flex gap-2">
              <Button
                onClick={() => setAutoRefresh(!autoRefresh)}
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
              >
                {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
              </Button>
              <Button
                onClick={fetchLogs}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                onClick={clearLogs}
                variant="outline"
                size="sm"
                className="text-red-600"
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {logs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No logs available</p>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  className="border border-gray-200 dark:border-gray-700 rounded p-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold ${getLevelColor(log.level)}`}>
                          [{log.level.toUpperCase()}]
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {log.message}
                      </p>
                      {log.data ? (
                        <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
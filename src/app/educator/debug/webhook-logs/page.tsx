"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Trash2, Activity, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  PageHeader, 
  PageContainer, 
  Section,
  LoadingState,
  EmptyState
} from "@/components/educator-v2";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

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
      logger.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    try {
      await fetch('/api/debug/webhook-logs?clear=true');
      setLogs([]);
    } catch (error) {
      logger.error('Failed to clear logs:', error);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      let currentInterval = 5000;
      const maxInterval = 30000;
      let intervalId: NodeJS.Timeout;
      
      const scheduleFetch = () => {
        intervalId = setTimeout(() => {
          fetchLogs();
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
      case 'error': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400';
      case 'warn': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
      case 'info': return 'bg-amber-50 text-amber-600 dark:bg-amber-900/10 dark:text-amber-500';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return 'destructive';
      case 'warn': return 'secondary';
      case 'info': return 'default';
      default: return 'outline';
    }
  };

  return (
    <>
      <PageHeader
        title="Webhook Debug Logs"
        subtitle="Monitor and debug webhook activity"
        icon={Activity}
        breadcrumbs={[
          { label: 'Educator', href: '/educator/dashboard' },
          { label: 'Debug' },
          { label: 'Webhook Logs' }
        ]}
        actions={
          <div className="flex gap-2">
            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              className={autoRefresh ? "bg-amber-600 hover:bg-amber-700" : ""}
            >
              {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
            </Button>
            <Button
              onClick={fetchLogs}
              disabled={loading}
              variant="outline"
              size="sm"
              className="border-amber-200 hover:bg-amber-50"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            <Button
              onClick={clearLogs}
              variant="outline"
              size="sm"
              className="border-orange-200 hover:bg-orange-50 text-orange-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <PageContainer>
        <Section
          title="Log Entries"
          description={`Showing ${logs.length} log entries`}
          transparent
        >
          {loading && logs.length === 0 ? (
            <LoadingState text="Loading webhook logs..." />
          ) : logs.length === 0 ? (
            <EmptyState
              icon={AlertCircle}
              title="No logs available"
              description="Webhook logs will appear here when webhooks are triggered"
              action={{
                label: "Refresh",
                onClick: fetchLogs
              }}
            />
          ) : (
            <div className="space-y-2">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 border border-amber-100 dark:border-gray-700 rounded-lg p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge 
                          variant={getLevelIcon(log.level) as any}
                          className={getLevelColor(log.level)}
                        >
                          {log.level.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {log.message}
                      </p>
                      {log.data ? (
                        <pre className="mt-3 text-xs bg-amber-50 dark:bg-gray-900 p-3 rounded-md overflow-x-auto border border-amber-100 dark:border-gray-700">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </PageContainer>
    </>
  );
}
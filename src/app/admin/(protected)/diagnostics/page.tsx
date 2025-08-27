"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Monitor, 
  Smartphone, 
  Tablet,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCcw,
  Download,
  TrendingUp,
  TrendingDown,
  Clock,
  WifiOff,
  Code,
  Eye,
  MousePointer,
  Chrome,
  Globe,
} from "lucide-react";
import { logger } from "@/lib/logger";

interface DiagnosticRecord {
  id: string;
  attempt_id: string;
  reason: string;
  browser: string;
  device: string;
  screen_size: string;
  page_loaded: boolean;
  quiz_loaded: boolean;
  questions_visible: boolean;
  can_select_answer: boolean;
  js_errors: number;
  network_errors: number;
  timeouts: number;
  tab_switches: number;
  load_time: number;
  first_interaction_time: number;
  created_at: string;
  student_email?: string;
  quiz_title?: string;
}

interface DiagnosticsStats {
  total_count: number;
  unique_attempts: number;
  unique_browsers: number;
  unique_devices: number;
  avg_js_errors: number;
  avg_network_errors: number;
  avg_tab_switches: number;
  timeouts: number;
  errors: number;
  abandoned: number;
  never_saw_questions: number;
  could_not_interact: number;
}

export default function DiagnosticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState("7d");
  const [browserFilter, setBrowserFilter] = useState("");
  const [deviceFilter, setDeviceFilter] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");
  
  const [diagnostics, setDiagnostics] = useState<DiagnosticRecord[]>([]);
  const [stats, setStats] = useState<DiagnosticsStats | null>(null);
  const [browserStats, setBrowserStats] = useState<any[]>([]);
  const [deviceStats, setDeviceStats] = useState<any[]>([]);
  const [recentIssues, setRecentIssues] = useState<DiagnosticRecord[]>([]);

  useEffect(() => {
    fetchDiagnostics();
  }, [timeRange, browserFilter, deviceFilter, reasonFilter]);

  const fetchDiagnostics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("timeRange", timeRange);
      if (browserFilter) params.append("browser", browserFilter);
      if (deviceFilter) params.append("device", deviceFilter);
      if (reasonFilter) params.append("reason", reasonFilter);

      const response = await fetch(`/api/admin/diagnostics?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        setDiagnostics(data.diagnostics || []);
        setStats(data.stats || null);
        setBrowserStats(data.browserStats || []);
        setDeviceStats(data.deviceStats || []);
        setRecentIssues(data.recentIssues || []);
      }
    } catch (error) {
      logger.error("Failed to fetch diagnostics:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDiagnostics();
  };

  const exportData = () => {
    const csv = [
      ["Date", "Browser", "Device", "Reason", "JS Errors", "Network Errors", "Tab Switches", "Quiz", "Student"],
      ...diagnostics.map(d => [
        new Date(d.created_at).toLocaleString(),
        d.browser,
        d.device,
        d.reason,
        d.js_errors,
        d.network_errors,
        d.tab_switches,
        d.quiz_title || "Unknown",
        d.student_email || "Anonymous",
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quiz-diagnostics-${Date.now()}.csv`;
    a.click();
  };

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case "mobile": return <Smartphone className="h-4 w-4" />;
      case "tablet": return <Tablet className="h-4 w-4" />;
      case "desktop": return <Monitor className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const getBrowserIcon = (browser: string) => {
    if (browser === "Chrome") return <Chrome className="h-4 w-4" />;
    return <Globe className="h-4 w-4" />;
  };

  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      case "timeout":
        return <Badge variant="secondary">Timeout</Badge>;
      case "abandoned":
        return <Badge variant="outline">Abandoned</Badge>;
      default:
        return <Badge>{reason}</Badge>;
    }
  };

  const getCheckpointStatus = (record: DiagnosticRecord) => {
    const checkpoints = [
      { name: "Page Loaded", value: record.page_loaded },
      { name: "Quiz Loaded", value: record.quiz_loaded },
      { name: "Questions Visible", value: record.questions_visible },
      { name: "Can Interact", value: record.can_select_answer },
    ];

    return (
      <div className="flex gap-1">
        {checkpoints.map((cp, idx) => (
          <div key={idx} className="relative group">
            <div
              className={`w-2 h-2 rounded-full ${
                cp.value ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
              {cp.name}: {cp.value ? "✓" : "✗"}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading && !refreshing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading diagnostics...</p>
        </div>
      </div>
    );
  }

  const failureRate = stats && stats.total_count > 0 
    ? ((stats.errors + stats.timeouts + stats.abandoned) / stats.total_count * 100).toFixed(1)
    : "0";

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Quiz Diagnostics Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor quiz failures and browser compatibility issues</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
            <RefreshCcw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger>
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>

            <Select value={browserFilter} onValueChange={setBrowserFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Browsers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Browsers</SelectItem>
                <SelectItem value="Chrome">Chrome</SelectItem>
                <SelectItem value="Safari">Safari</SelectItem>
                <SelectItem value="Firefox">Firefox</SelectItem>
                <SelectItem value="Edge">Edge</SelectItem>
                <SelectItem value="Samsung">Samsung Browser</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select value={deviceFilter} onValueChange={setDeviceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Devices" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Devices</SelectItem>
                <SelectItem value="mobile">Mobile</SelectItem>
                <SelectItem value="tablet">Tablet</SelectItem>
                <SelectItem value="desktop">Desktop</SelectItem>
              </SelectContent>
            </Select>

            <Select value={reasonFilter} onValueChange={setReasonFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Reasons" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Reasons</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="timeout">Timeout</SelectItem>
                <SelectItem value="abandoned">Abandoned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_count}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.unique_attempts} unique attempts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Failure Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold text-red-600">{failureRate}%</div>
                {parseFloat(failureRate) > 20 ? (
                  <TrendingUp className="h-4 w-4 text-red-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-green-600" />
                )}
              </div>
              <Progress 
                value={parseFloat(failureRate)} 
                className="mt-2 h-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Never saw questions:</span>
                  <span className="font-semibold text-red-600">{stats.never_saw_questions}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Couldn't interact:</span>
                  <span className="font-semibold text-orange-600">{stats.could_not_interact}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Error Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <Code className="h-3 w-3" /> JS Errors:
                  </span>
                  <span>{Math.round(stats.avg_js_errors * 10) / 10} avg</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <WifiOff className="h-3 w-3" /> Network:
                  </span>
                  <span>{Math.round(stats.avg_network_errors * 10) / 10} avg</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="browsers">Browsers</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="recent">Recent Issues</TabsTrigger>
          <TabsTrigger value="details">All Records</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Failure Reasons */}
            <Card>
              <CardHeader>
                <CardTitle>Failure Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Timeouts
                    </span>
                    <span className="font-semibold">{stats?.timeouts || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" /> Errors
                    </span>
                    <span className="font-semibold">{stats?.errors || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <XCircle className="h-4 w-4" /> Abandoned
                    </span>
                    <span className="font-semibold">{stats?.abandoned || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Checkpoint Success Rate */}
            <Card>
              <CardHeader>
                <CardTitle>Loading Checkpoints</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats && stats.total_count > 0 && (
                    <>
                      <div className="flex items-center justify-between">
                        <span>Page Loaded</span>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={((stats.total_count - stats.never_saw_questions) / stats.total_count) * 100} 
                            className="w-20 h-2"
                          />
                          <span className="text-sm">
                            {Math.round(((stats.total_count - stats.never_saw_questions) / stats.total_count) * 100)}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Questions Visible</span>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={((stats.total_count - stats.never_saw_questions) / stats.total_count) * 100} 
                            className="w-20 h-2"
                          />
                          <span className="text-sm">
                            {Math.round(((stats.total_count - stats.never_saw_questions) / stats.total_count) * 100)}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Can Interact</span>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={((stats.total_count - stats.could_not_interact) / stats.total_count) * 100} 
                            className="w-20 h-2"
                          />
                          <span className="text-sm">
                            {Math.round(((stats.total_count - stats.could_not_interact) / stats.total_count) * 100)}%
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="browsers">
          <Card>
            <CardHeader>
              <CardTitle>Browser Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Browser</TableHead>
                    <TableHead>Count</TableHead>
                    <TableHead>Avg JS Errors</TableHead>
                    <TableHead>Error Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {browserStats.map((stat, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="flex items-center gap-2">
                        {getBrowserIcon(stat.browser)}
                        {stat.browser}
                      </TableCell>
                      <TableCell>{stat.count}</TableCell>
                      <TableCell>
                        <span className={stat.avg_errors > 0 ? "text-red-600 font-semibold" : ""}>
                          {Math.round(stat.avg_errors * 10) / 10}
                        </span>
                      </TableCell>
                      <TableCell>
                        {stat.error_count > 0 && (
                          <Badge variant="destructive">{stat.error_count}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices">
          <Card>
            <CardHeader>
              <CardTitle>Device Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device</TableHead>
                    <TableHead>Count</TableHead>
                    <TableHead>Avg Tab Switches</TableHead>
                    <TableHead>Timeouts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deviceStats.map((stat, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="flex items-center gap-2">
                        {getDeviceIcon(stat.device)}
                        {stat.device}
                      </TableCell>
                      <TableCell>{stat.count}</TableCell>
                      <TableCell>
                        <span className={stat.avg_tab_switches > 2 ? "text-orange-600 font-semibold" : ""}>
                          {Math.round(stat.avg_tab_switches * 10) / 10}
                        </span>
                      </TableCell>
                      <TableCell>
                        {stat.timeout_count > 0 && (
                          <Badge variant="secondary">{stat.timeout_count}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>Recent Critical Issues</CardTitle>
              <CardDescription>
                Showing diagnostics with JavaScript or network errors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentIssues.map((issue) => (
                  <Alert key={issue.id} variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>
                      {issue.quiz_title || "Unknown Quiz"} - {new Date(issue.created_at).toLocaleString()}
                    </AlertTitle>
                    <AlertDescription>
                      <div className="mt-2 space-y-1 text-sm">
                        <div>Student: {issue.student_email || "Anonymous"}</div>
                        <div className="flex items-center gap-4">
                          <span>{issue.browser} on {issue.device}</span>
                          <span>{issue.screen_size}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          {issue.js_errors > 0 && (
                            <Badge variant="destructive">JS Errors: {issue.js_errors}</Badge>
                          )}
                          {issue.network_errors > 0 && (
                            <Badge variant="outline">Network Errors: {issue.network_errors}</Badge>
                          )}
                          {issue.tab_switches > 0 && (
                            <Badge variant="secondary">Tab Switches: {issue.tab_switches}</Badge>
                          )}
                        </div>
                        <div className="mt-2">
                          Checkpoints: {getCheckpointStatus(issue)}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>All Diagnostic Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Quiz</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Browser</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Checkpoints</TableHead>
                      <TableHead>Errors</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {diagnostics.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="text-xs">
                          {new Date(record.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs">
                          {record.quiz_title || "Unknown"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {record.student_email || "Anonymous"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getBrowserIcon(record.browser)}
                            <span className="text-xs">{record.browser}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getDeviceIcon(record.device)}
                            <span className="text-xs">{record.device}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getReasonBadge(record.reason)}</TableCell>
                        <TableCell>{getCheckpointStatus(record)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {record.js_errors > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                JS: {record.js_errors}
                              </Badge>
                            )}
                            {record.network_errors > 0 && (
                              <Badge variant="outline" className="text-xs">
                                Net: {record.network_errors}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
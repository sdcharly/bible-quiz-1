"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  AlertTriangle, 
  Activity,
  Wifi,
  WifiOff,
  Clock,
  ChevronDown,
  ChevronRight,
  Search,
  RefreshCcw,
  Download,
  Filter
} from "lucide-react";
import { logger } from "@/lib/logger";

interface TelemetryEvent {
  id: string;
  event_id: string;
  event_type: string;
  session_id: string;
  user_id?: string;
  quiz_id?: string;
  attempt_id?: string;
  timestamp: number;
  
  // Device info
  browser_name?: string;
  browser_version?: string;
  os?: string;
  os_version?: string;
  device_type?: string;
  device_vendor?: string;
  device_model?: string;
  
  // Screen info
  screen_width?: number;
  screen_height?: number;
  viewport_width?: number;
  viewport_height?: number;
  
  // Network
  connection_type?: string;
  effective_type?: string;
  online_status?: boolean;
  
  // Metadata
  metadata?: any;
  error_info?: any;
  created_at: string;
}

interface SessionSummary {
  sessionId: string;
  userId?: string;
  deviceType: string;
  browser: string;
  os: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  eventCount: number;
  hasErrors: boolean;
  quizCompleted: boolean;
}

export default function TelemetryDashboard() {
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<string | null>(null);
  const [selectedEventType, setSelectedEventType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchTelemetry();
  }, [selectedQuiz, selectedEventType]);

  const fetchTelemetry = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedQuiz && selectedQuiz !== "all") params.append("quizId", selectedQuiz);
      if (selectedEventType && selectedEventType !== "all") params.append("eventType", selectedEventType);
      params.append("limit", "500");

      const response = await fetch(`/api/telemetry/events?${params}`);
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      logger.error("Failed to fetch telemetry:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTelemetry();
  };

  const toggleEventExpanded = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  // Group events by session
  const sessionSummaries: Map<string, SessionSummary> = new Map();
  events.forEach(event => {
    if (!sessionSummaries.has(event.session_id)) {
      sessionSummaries.set(event.session_id, {
        sessionId: event.session_id,
        userId: event.user_id,
        deviceType: event.device_type || "unknown",
        browser: event.browser_name ? `${event.browser_name} ${event.browser_version}` : "unknown",
        os: event.os ? `${event.os} ${event.os_version}` : "unknown",
        startTime: event.timestamp,
        eventCount: 0,
        hasErrors: false,
        quizCompleted: false,
      });
    }
    
    const summary = sessionSummaries.get(event.session_id)!;
    summary.eventCount++;
    summary.endTime = event.timestamp;
    summary.duration = (summary.endTime - summary.startTime) / 1000 / 60; // in minutes
    
    if (event.event_type.startsWith("error_")) {
      summary.hasErrors = true;
    }
    if (event.event_type === "quiz_submit_success") {
      summary.quizCompleted = true;
    }
  });

  // Filter events
  const filteredEvents = events.filter(event => {
    if (selectedSession && event.session_id !== selectedSession) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        event.event_type.toLowerCase().includes(search) ||
        event.browser_name?.toLowerCase().includes(search) ||
        event.device_type?.toLowerCase().includes(search) ||
        JSON.stringify(event.metadata).toLowerCase().includes(search)
      );
    }
    return true;
  });

  // Event type statistics
  const eventTypeStats = new Map<string, number>();
  events.forEach(event => {
    eventTypeStats.set(event.event_type, (eventTypeStats.get(event.event_type) || 0) + 1);
  });

  // Device statistics
  const deviceStats = {
    mobile: events.filter(e => e.device_type === "mobile").length,
    tablet: events.filter(e => e.device_type === "tablet").length,
    desktop: events.filter(e => e.device_type === "desktop").length,
  };

  // Browser statistics
  const browserStats = new Map<string, number>();
  events.forEach(event => {
    if (event.browser_name) {
      browserStats.set(event.browser_name, (browserStats.get(event.browser_name) || 0) + 1);
    }
  });

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case "mobile": return <Smartphone className="h-4 w-4" />;
      case "tablet": return <Tablet className="h-4 w-4" />;
      case "desktop": return <Monitor className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const getEventTypeBadge = (eventType: string) => {
    if (eventType.startsWith("error_")) {
      return <Badge variant="destructive">{eventType}</Badge>;
    }
    if (eventType.startsWith("network_")) {
      return <Badge variant="outline">{eventType}</Badge>;
    }
    if (eventType.startsWith("quiz_")) {
      return <Badge>{eventType}</Badge>;
    }
    if (eventType.startsWith("performance_")) {
      return <Badge variant="secondary">{eventType}</Badge>;
    }
    return <Badge variant="outline">{eventType}</Badge>;
  };

  const exportData = () => {
    const dataStr = JSON.stringify(filteredEvents, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const exportFileDefaultName = `telemetry_${Date.now()}.json`;
    
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Telemetry Dashboard</h1>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} disabled={refreshing}>
            <RefreshCcw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={exportData} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events.length}</div>
            <p className="text-xs text-muted-foreground">
              {sessionSummaries.size} sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Device Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between">
              <div className="flex items-center gap-1">
                <Smartphone className="h-4 w-4" />
                <span className="text-sm">{deviceStats.mobile}</span>
              </div>
              <div className="flex items-center gap-1">
                <Tablet className="h-4 w-4" />
                <span className="text-sm">{deviceStats.tablet}</span>
              </div>
              <div className="flex items-center gap-1">
                <Monitor className="h-4 w-4" />
                <span className="text-sm">{deviceStats.desktop}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {events.filter(e => e.event_type.startsWith("error_")).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {((events.filter(e => e.event_type.startsWith("error_")).length / events.length) * 100).toFixed(1)}% of events
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {Array.from(sessionSummaries.values()).filter(s => s.quizCompleted).length}
            </div>
            <p className="text-xs text-muted-foreground">
              of {sessionSummaries.size} sessions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={selectedEventType} onValueChange={setSelectedEventType}>
              <SelectTrigger>
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="quiz_start">Quiz Start</SelectItem>
                <SelectItem value="quiz_submit_success">Quiz Submit</SelectItem>
                <SelectItem value="error_javascript">JS Errors</SelectItem>
                <SelectItem value="network_offline">Network Issues</SelectItem>
                <SelectItem value="page_visibility_change">Tab Switch</SelectItem>
                <SelectItem value="user_app_switch">App Switch</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedSession || "all"} onValueChange={val => setSelectedSession(val === "all" ? null : val)}>
              <SelectTrigger>
                <SelectValue placeholder="Session" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sessions</SelectItem>
                {Array.from(sessionSummaries.values()).map(session => (
                  <SelectItem key={session.sessionId} value={session.sessionId}>
                    {session.sessionId.slice(0, 10)}... ({session.deviceType})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />

            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedEventType("all");
                setSelectedSession(null);
                setSearchTerm("");
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="events" className="w-full">
        <TabsList>
          <TabsTrigger value="events">Event Log</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Event Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[600px] overflow-auto">
                {filteredEvents.map(event => (
                  <div 
                    key={event.id} 
                    className="border rounded-lg p-3 hover:bg-muted/50 cursor-pointer"
                    onClick={() => toggleEventExpanded(event.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        {expandedEvents.has(event.id) ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                        }
                        {getEventTypeBadge(event.event_type)}
                        {getDeviceIcon(event.device_type || "desktop")}
                        <span className="text-sm text-muted-foreground">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {event.browser_name && (
                          <Badge variant="outline">{event.browser_name}</Badge>
                        )}
                        {event.online_status === false && (
                          <WifiOff className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                    
                    {expandedEvents.has(event.id) && (
                      <div className="mt-3 p-3 bg-muted/30 rounded space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <strong>Session:</strong> {event.session_id.slice(0, 20)}...
                          </div>
                          {event.user_id && (
                            <div>
                              <strong>User:</strong> {event.user_id.slice(0, 20)}...
                            </div>
                          )}
                          {event.quiz_id && (
                            <div>
                              <strong>Quiz:</strong> {event.quiz_id.slice(0, 20)}...
                            </div>
                          )}
                          {event.attempt_id && (
                            <div>
                              <strong>Attempt:</strong> {event.attempt_id.slice(0, 20)}...
                            </div>
                          )}
                        </div>
                        
                        {event.metadata && (
                          <div>
                            <strong>Metadata:</strong>
                            <pre className="mt-1 p-2 bg-background rounded text-xs overflow-auto">
                              {JSON.stringify(event.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                        
                        {event.error_info && (
                          <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Error Details</AlertTitle>
                            <AlertDescription>
                              <pre className="mt-2 text-xs overflow-auto">
                                {JSON.stringify(event.error_info, null, 2)}
                              </pre>
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Session Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from(sessionSummaries.values()).map(session => (
                  <div 
                    key={session.sessionId} 
                    className="border rounded-lg p-4 hover:bg-muted/50"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          {getDeviceIcon(session.deviceType)}
                          <span className="font-medium">{session.browser}</span>
                          <Badge variant="outline">{session.os}</Badge>
                          {session.quizCompleted && (
                            <Badge className="bg-green-500">Completed</Badge>
                          )}
                          {session.hasErrors && (
                            <Badge variant="destructive">Has Errors</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Session: {session.sessionId.slice(0, 30)}...
                        </div>
                        {session.userId && (
                          <div className="text-sm text-muted-foreground">
                            User: {session.userId.slice(0, 30)}...
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{session.eventCount} events</div>
                        <div className="text-xs text-muted-foreground">
                          {session.duration?.toFixed(1)} minutes
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors">
          <Card>
            <CardHeader>
              <CardTitle>Error Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {events
                  .filter(e => e.event_type.startsWith("error_"))
                  .map(event => (
                    <Alert key={event.id} variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>
                        {event.event_type} - {new Date(event.timestamp).toLocaleString()}
                      </AlertTitle>
                      <AlertDescription>
                        <div className="mt-2">
                          <div>Browser: {event.browser_name} {event.browser_version}</div>
                          <div>Device: {event.device_type} - {event.device_vendor} {event.device_model}</div>
                          {event.error_info && (
                            <pre className="mt-2 text-xs overflow-auto">
                              {JSON.stringify(event.error_info, null, 2)}
                            </pre>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {events
                  .filter(e => 
                    e.event_type.startsWith("performance_") || 
                    e.event_type === "network_slow"
                  )
                  .map(event => (
                    <div key={event.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <Badge variant="secondary">{event.event_type}</Badge>
                          <div className="mt-2 text-sm">
                            {event.metadata && (
                              <pre className="text-xs overflow-auto">
                                {JSON.stringify(event.metadata, null, 2)}
                              </pre>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";
import {
  AdminPageContainer,
  AdminPageHeader,
  AdminSection,
  AdminTabNavigation,
  StatCard,
  EmptyState,
  SecurityBadge,
  MiniStat
} from "@/components/admin-v2";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity, Search, Calendar, Globe, Download,
  CheckCircle, XCircle, AlertTriangle, LogIn, LogOut,
  UserPlus, Edit, Trash, Shield, Filter, Clock,
  Eye, RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ActivityLog {
  id: string;
  userId: string | null;
  actionType: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  userName: string | null;
  userEmail: string | null;
}

interface ActivityLogsViewProps {
  logs: ActivityLog[];
}

export default function ActivityLogsViewV2({ logs }: ActivityLogsViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterEntity, setFilterEntity] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");
  const [timeRange, setTimeRange] = useState("all");

  // Get unique action types and entity types
  const actionTypes = useMemo(() => 
    [...new Set(logs.map(log => log.actionType))].sort(),
    [logs]
  );
  
  const entityTypes = useMemo(() => 
    [...new Set(logs.map(log => log.entityType))].sort(),
    [logs]
  );

  // Filter logs based on search and filters
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch = 
        !searchTerm ||
        log.actionType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entityType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entityId?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAction = 
        filterAction === "all" || log.actionType === filterAction;
      
      const matchesEntity = 
        filterEntity === "all" || log.entityType === filterEntity;

      // Tab filtering
      const matchesTab = 
        activeTab === "all" ||
        (activeTab === "security" && (
          log.actionType.includes("login") ||
          log.actionType.includes("logout") ||
          log.actionType.includes("approve") ||
          log.actionType.includes("reject") ||
          log.actionType.includes("suspend")
        )) ||
        (activeTab === "crud" && (
          log.actionType.includes("create") ||
          log.actionType.includes("update") ||
          log.actionType.includes("delete")
        )) ||
        (activeTab === "users" && log.entityType === "user");

      // Time range filtering
      const now = new Date();
      const logDate = new Date(log.createdAt);
      const matchesTime = 
        timeRange === "all" ||
        (timeRange === "24h" && (now.getTime() - logDate.getTime()) < 24 * 60 * 60 * 1000) ||
        (timeRange === "7d" && (now.getTime() - logDate.getTime()) < 7 * 24 * 60 * 60 * 1000) ||
        (timeRange === "30d" && (now.getTime() - logDate.getTime()) < 30 * 24 * 60 * 60 * 1000);
      
      return matchesSearch && matchesAction && matchesEntity && matchesTab && matchesTime;
    });
  }, [logs, searchTerm, filterAction, filterEntity, activeTab, timeRange]);

  const getActionIcon = (actionType: string) => {
    if (actionType.includes("login")) return <LogIn className="h-4 w-4" />;
    if (actionType.includes("logout")) return <LogOut className="h-4 w-4" />;
    if (actionType.includes("approve")) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (actionType.includes("reject")) return <XCircle className="h-4 w-4 text-red-500" />;
    if (actionType.includes("suspend")) return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    if (actionType.includes("create") || actionType.includes("add")) return <UserPlus className="h-4 w-4 text-blue-500" />;
    if (actionType.includes("delete") || actionType.includes("remove")) return <Trash className="h-4 w-4 text-red-500" />;
    if (actionType.includes("edit") || actionType.includes("update")) return <Edit className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  const getActionSecurityLevel = (actionType: string): 'low' | 'medium' | 'high' | 'critical' => {
    if (actionType.includes("delete") || actionType.includes("remove")) return 'critical';
    if (actionType.includes("approve") || actionType.includes("reject") || actionType.includes("suspend")) return 'high';
    if (actionType.includes("create") || actionType.includes("update") || actionType.includes("edit")) return 'medium';
    return 'low';
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const exportLogs = () => {
    try {
      const csv = [
        ["Timestamp", "User", "Action", "Entity Type", "Entity ID", "IP Address", "Security Level"],
        ...filteredLogs.map(log => [
          formatDate(log.createdAt),
          log.userEmail || "System",
          log.actionType,
          log.entityType,
          log.entityId || "",
          log.ipAddress || "",
          getActionSecurityLevel(log.actionType)
        ])
      ].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `activity-logs-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful",
        description: `Exported ${filteredLogs.length} activity logs`,
      });
    } catch (error) {
      logger.error("Export failed:", error);
      toast({
        title: "Export Failed",
        description: "Unable to export activity logs",
        variant: "destructive"
      });
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const securityActions = filteredLogs.filter(l => 
      l.actionType.includes("login") || 
      l.actionType.includes("logout") ||
      l.actionType.includes("approve") ||
      l.actionType.includes("reject")
    ).length;

    const criticalActions = filteredLogs.filter(l => 
      l.actionType.includes("delete") || 
      l.actionType.includes("suspend")
    ).length;

    const recentActivity = filteredLogs.filter(l => {
      const logDate = new Date(l.createdAt);
      const now = new Date();
      return (now.getTime() - logDate.getTime()) < 24 * 60 * 60 * 1000;
    }).length;

    return {
      total: filteredLogs.length,
      security: securityActions,
      critical: criticalActions,
      recent: recentActivity
    };
  }, [filteredLogs]);

  const tabs = [
    { id: 'all', label: 'All Activity', icon: Activity },
    { id: 'security', label: 'Security', icon: Shield, badge: stats.security, badgeVariant: 'warning' as const },
    { id: 'crud', label: 'Data Changes', icon: Edit },
    { id: 'users', label: 'User Actions', icon: UserPlus }
  ];

  return (
    <AdminPageContainer>
      {/* Header */}
      <AdminPageHeader
        title="Activity Logs"
        subtitle="System audit trail and user activity monitoring"
        icon={Activity}
        securityLevel="high"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Activity Logs' }
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={exportLogs} 
              variant="outline"
              className="border-red-200 hover:bg-red-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button 
              onClick={() => router.refresh()} 
              variant="outline"
              className="border-red-200 hover:bg-red-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <AdminSection transparent className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Activities"
            value={stats.total.toLocaleString()}
            icon={Activity}
            variant="default"
          />
          <StatCard
            label="Security Events"
            value={stats.security}
            icon={Shield}
            variant="warning"
          />
          <StatCard
            label="Critical Actions"
            value={stats.critical}
            icon={AlertTriangle}
            variant={stats.critical > 0 ? "danger" : "default"}
          />
          <StatCard
            label="Last 24 Hours"
            value={stats.recent}
            icon={Clock}
            variant="success"
          />
        </div>
      </AdminSection>

      {/* Filters */}
      <AdminSection 
        title="Filters" 
        icon={Filter}
        className="mb-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="search">Search</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="action">Action Type</Label>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger id="action" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {actionTypes.map(action => (
                  <SelectItem key={action} value={action}>
                    {action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="entity">Entity Type</Label>
            <Select value={filterEntity} onValueChange={setFilterEntity}>
              <SelectTrigger id="entity" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {entityTypes.map(entity => (
                  <SelectItem key={entity} value={entity}>
                    {entity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </AdminSection>

      {/* Tab Navigation */}
      <AdminTabNavigation
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        className="mb-6"
      />

      {/* Activity Logs List */}
      <AdminSection 
        title="Activity Timeline" 
        description={`Showing ${filteredLogs.length} of ${logs.length} activities`}
        icon={Clock}
        securityLevel="medium"
      >
        {filteredLogs.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No activities found"
            description="No activities match your current filters"
            action={{
              label: "Clear Filters",
              onClick: () => {
                setSearchTerm("");
                setFilterAction("all");
                setFilterEntity("all");
                setActiveTab("all");
                setTimeRange("all");
              }
            }}
          />
        ) : (
          <div className="space-y-3">
            {filteredLogs.slice(0, 100).map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-4 p-4 border border-red-100 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {/* Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getActionIcon(log.actionType)}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {log.actionType}
                    </span>
                    <SecurityBadge 
                      level={getActionSecurityLevel(log.actionType)} 
                      showIcon={false}
                      className="text-xs"
                    />
                    <Badge variant="outline" className="text-xs">
                      {log.entityType}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">
                      {log.userName || log.userEmail || "System"}
                    </span>
                    {log.entityId && (
                      <span className="ml-2">
                        • ID: <code className="text-xs bg-gray-100 px-1 rounded">{log.entityId}</code>
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(log.createdAt)}
                    </span>
                    {log.ipAddress && (
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {log.ipAddress}
                      </span>
                    )}
                  </div>
                  
                  {log.details && Object.keys(log.details).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                        View Details
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
                
                {/* Actions */}
                <div className="flex-shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      logger.log("View log details:", log);
                      // Could open a modal with full details
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            {filteredLogs.length > 100 && (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">
                  Showing first 100 of {filteredLogs.length} activities
                </p>
              </div>
            )}
          </div>
        )}
      </AdminSection>
    </AdminPageContainer>
  );
}
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, Activity, Search, User, Shield, 
  Calendar, Globe, Smartphone, Filter, Download,
  CheckCircle, XCircle, AlertTriangle, LogIn, LogOut,
  UserPlus, UserMinus, Edit, Trash
} from "lucide-react";

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

export default function ActivityLogsView({ logs }: ActivityLogsViewProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterEntity, setFilterEntity] = useState<string>("all");

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.actionType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = 
      filterType === "all" || log.actionType.includes(filterType);
    
    const matchesEntity = 
      filterEntity === "all" || log.entityType === filterEntity;
    
    return matchesSearch && matchesType && matchesEntity;
  });

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

  const getActionBadgeColor = (actionType: string) => {
    if (actionType.includes("approve")) return "bg-green-500";
    if (actionType.includes("reject") || actionType.includes("delete")) return "bg-red-500";
    if (actionType.includes("suspend")) return "bg-orange-500";
    if (actionType.includes("login") || actionType.includes("create")) return "bg-blue-500";
    return "bg-gray-500";
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
    const csv = [
      ["Timestamp", "User", "Action", "Entity Type", "Entity ID", "IP Address"],
      ...filteredLogs.map(log => [
        formatDate(log.createdAt),
        log.userEmail || "System",
        log.actionType,
        log.entityType,
        log.entityId || "",
        log.ipAddress || ""
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  // Get unique action types and entity types for filters
  const actionTypes = [...new Set(logs.map(log => log.actionType))];
  const entityTypes = [...new Set(logs.map(log => log.entityType))];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/admin/dashboard")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <Activity className="h-6 w-6 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Activity Logs
              </h1>
            </div>
            <Button onClick={exportLogs} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">{logs.length}</div>
              <p className="text-sm text-gray-500">Total Activities</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-green-600">
                {logs.filter(l => l.actionType.includes("approve")).length}
              </div>
              <p className="text-sm text-gray-500">Approvals</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-blue-600">
                {logs.filter(l => l.actionType.includes("login")).length}
              </div>
              <p className="text-sm text-gray-500">Logins</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-orange-600">
                {logs.filter(l => l.actionType.includes("suspend") || l.actionType.includes("reject")).length}
              </div>
              <p className="text-sm text-gray-500">Restrictions</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <select
                className="px-3 py-2 border rounded-md"
                value={filterEntity}
                onChange={(e) => setFilterEntity(e.target.value)}
              >
                <option value="all">All Entities</option>
                {entityTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Logs List */}
        <Card>
          <CardHeader>
            <CardTitle>Activity History ({filteredLogs.length})</CardTitle>
            <CardDescription>
              System-wide activity and audit trail
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No activity logs found matching your criteria
                </div>
              ) : (
                filteredLogs.slice(0, 100).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="mt-1">
                      {getActionIcon(log.actionType)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Badge className={`${getActionBadgeColor(log.actionType)} text-white text-xs`}>
                          {log.actionType.replace(/_/g, " ").toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {log.entityType}
                        </Badge>
                        {log.entityId && (
                          <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">
                            {log.entityId.substring(0, 8)}...
                          </code>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">
                          {log.userName || log.userEmail || "System"}
                        </span>
                        {(() => {
                          const details = log.details as Record<string, unknown> | null;
                          if (details && 'educatorEmail' in details && typeof details.educatorEmail === 'string') {
                            return <span> → {details.educatorEmail}</span>;
                          }
                          return null;
                        })()}
                      </div>
                      <div className="mt-1 flex items-center space-x-4 text-xs text-gray-400">
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(log.createdAt)}
                        </span>
                        {log.ipAddress && (
                          <span className="flex items-center">
                            <Globe className="h-3 w-3 mr-1" />
                            {log.ipAddress}
                          </span>
                        )}
                      </div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                            View details
                          </summary>
                          <pre className="mt-1 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))
              )}
              {filteredLogs.length > 100 && (
                <div className="text-center py-4 text-sm text-gray-500">
                  Showing first 100 of {filteredLogs.length} logs
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
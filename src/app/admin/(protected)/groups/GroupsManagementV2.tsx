"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/hooks/use-toast";
import {
  AdminPageContainer,
  AdminPageHeader,
  AdminSection,
  StatCard,
  AdminTabNavigation,
  EmptyState,
  LoadingState
} from "@/components/admin-v2";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users, 
  Eye,
  Search,
  RefreshCw,
  UserCheck,
  Calendar,
  Mail
} from "lucide-react";
import { format } from "date-fns";

interface Group {
  id: string;
  name: string;
  description?: string;
  educatorId: string;
  educatorName?: string;
  educatorEmail?: string;
  createdAt: string;
  _count?: {
    members: number;
  };
}

export default function GroupsManagementV2() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/groups");
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch groups",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error fetching groups",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalMembers = groups.reduce((sum, g) => sum + (g._count?.members || 0), 0);
    const activeEducators = new Set(groups.filter(g => g?.educatorId).map(g => g.educatorId)).size;
    const largeGroups = groups.filter(g => (g._count?.members || 0) > 10).length;
    const emptyGroups = groups.filter(g => (g._count?.members || 0) === 0).length;

    return {
      total: groups.length,
      totalMembers,
      activeEducators,
      largeGroups,
      emptyGroups
    };
  }, [groups]);

  // Filter groups based on tab and search
  const filteredGroups = useMemo(() => {
    let filtered = [...groups];

    // Tab filtering
    switch (activeTab) {
      case "active":
        filtered = filtered.filter(g => (g._count?.members || 0) > 0);
        break;
      case "large":
        filtered = filtered.filter(g => (g._count?.members || 0) > 10);
        break;
      case "empty":
        filtered = filtered.filter(g => (g._count?.members || 0) === 0);
        break;
    }

    // Search filtering
    if (searchTerm) {
      filtered = filtered.filter(group =>
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.educatorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.educatorEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort by creation date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return filtered;
  }, [groups, activeTab, searchTerm]);

  const tabs = [
    { id: "all", label: "All Groups", badge: groups.length },
    { id: "active", label: "Active", badge: stats.total - stats.emptyGroups },
    { id: "large", label: "Large (10+)", badge: stats.largeGroups },
    { id: "empty", label: "Empty", badge: stats.emptyGroups, badgeVariant: "warning" as const }
  ];

  if (loading) {
    return (
      <AdminPageContainer>
        <AdminPageHeader
          title="Groups Management"
          subtitle="View and monitor all student groups"
          icon={Users}
          backButton={{ href: "/admin/dashboard" }}
        />
        <LoadingState />
      </AdminPageContainer>
    );
  }

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Groups Management"
        subtitle="View and monitor all student groups created by educators"
        icon={Users}
        backButton={{ href: "/admin/dashboard" }}
        actions={
          <Button onClick={fetchGroups} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        }
      />

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Groups"
          value={stats.total}
          icon={Users}
          trend={{ value: 0, label: "Total" }}
        />
        <StatCard
          label="Total Members"
          value={stats.totalMembers}
          icon={UserCheck}
          variant="success"
          trend={{ value: Math.round(stats.totalMembers / Math.max(stats.total, 1)), label: "Avg/group" }}
        />
        <StatCard
          label="Active Educators"
          value={stats.activeEducators}
          icon={Users}
          variant="warning"
        />
        <StatCard
          label="Empty Groups"
          value={stats.emptyGroups}
          variant="danger"
          trend={{ value: Math.round((stats.emptyGroups / Math.max(stats.total, 1)) * 100), label: "%" }}
        />
      </div>

      {/* Main Content */}
      <AdminSection>
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search groups, educators, descriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tab Navigation */}
        <AdminTabNavigation
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Groups Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {filteredGroups.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No groups found"
              description={searchTerm ? "Try adjusting your search criteria" : "No groups match the selected filter"}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Group</TableHead>
                  <TableHead>Educator</TableHead>
                  <TableHead className="text-center">Members</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {group.name}
                        </div>
                        {group.description && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                            {group.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {group.educatorName || "Unknown"}
                        </div>
                        {group.educatorEmail && (
                          <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                            <Mail className="h-3 w-3" />
                            {group.educatorEmail}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={(group._count?.members || 0) === 0 ? "secondary" : "default"}
                        className={(group._count?.members || 0) > 10 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : ""}
                      >
                        <Users className="h-3 w-3 mr-1" />
                        {group._count?.members || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(group.createdAt), "MMM d, yyyy")}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/admin/groups/${group.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </AdminSection>
    </AdminPageContainer>
  );
}
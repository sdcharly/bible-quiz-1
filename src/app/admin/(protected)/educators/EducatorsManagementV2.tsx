"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import {
  AdminPageContainer,
  AdminPageHeader,
  AdminSection,
  StatCard,
  AdminTabNavigation,
  SecurityBadge,
  StatusBadge,
  ConfirmDialog,
  EmptyState,
  LoadingState
} from "@/components/admin-v2";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Shield,
  Users,
  BookOpen,
  Mail,
  Phone,
  Calendar,
  UserCheck,
  UserX,
  Ban,
  Unlock,
  Edit,
  ChevronDown,
  ChevronUp,
  Award,
  Search
} from "lucide-react";
import { format } from "date-fns";

interface Educator {
  id: string;
  name: string | null;
  email: string;
  role: string;
  approvalStatus: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  permissions: Record<string, unknown>;
  permissionTemplateId: string | null;
  permissionTemplate?: {
    id: string;
    name: string;
    description: string | null;
  };
  createdAt: Date;
  phoneNumber: string | null;
  emailVerified: boolean | null;
  quizCount: number;
  studentCount: number;
}

interface EducatorsManagementV2Props {
  educators: Educator[];
}

export default function EducatorsManagementV2({ educators }: EducatorsManagementV2Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [expandedEducators, setExpandedEducators] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
  } | null>(null);

  // Stats calculation
  const stats = useMemo(() => ({
    total: educators.length,
    approved: educators.filter(e => e.approvalStatus === "approved").length,
    pending: educators.filter(e => e.approvalStatus === "pending").length,
    suspended: educators.filter(e => e.approvalStatus === "suspended").length
  }), [educators]);

  // Filtered educators based on tab and search
  const filteredEducators = useMemo(() => {
    let filtered = [...educators];

    // Tab filtering
    switch (activeTab) {
      case "approved":
        filtered = filtered.filter(e => e.approvalStatus === "approved");
        break;
      case "pending":
        filtered = filtered.filter(e => e.approvalStatus === "pending");
        break;
      case "suspended":
        filtered = filtered.filter(e => e.approvalStatus === "suspended");
        break;
      case "rejected":
        filtered = filtered.filter(e => e.approvalStatus === "rejected");
        break;
    }

    // Search filtering
    if (searchTerm) {
      filtered = filtered.filter(e =>
        e.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.permissionTemplate?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [educators, activeTab, searchTerm]);

  // Toggle expanded educator
  const toggleExpanded = useCallback((educatorId: string) => {
    setExpandedEducators(prev => {
      const newSet = new Set(prev);
      if (newSet.has(educatorId)) {
        newSet.delete(educatorId);
      } else {
        newSet.add(educatorId);
      }
      return newSet;
    });
  }, []);

  // Handle approve educator
  const handleApprove = useCallback(async (educatorId: string) => {
    setConfirmDialog({
      open: true,
      title: "Approve Educator",
      message: "Are you sure you want to approve this educator? They will gain access to the educator panel.",
      action: async () => {
        try {
          const response = await fetch(`/api/admin/educators/${educatorId}/approve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
          });

          if (response.ok) {
            toast({
              title: "Success",
              description: "Educator approved successfully"
            });
            router.refresh();
          } else {
            throw new Error("Failed to approve educator");
          }
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to approve educator",
            variant: "destructive"
          });
        }
        setConfirmDialog(null);
      }
    });
  }, [router, toast]);

  // Handle reject educator
  const handleReject = useCallback(async (educatorId: string) => {
    const reason = prompt("Please provide a reason for rejection:");
    if (!reason) return;

    setConfirmDialog({
      open: true,
      title: "Reject Educator",
      message: "Are you sure you want to reject this educator application?",
      action: async () => {
        try {
          const response = await fetch(`/api/admin/educators/${educatorId}/reject`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason })
          });

          if (response.ok) {
            toast({
              title: "Success",
              description: "Educator application rejected"
            });
            router.refresh();
          } else {
            throw new Error("Failed to reject educator");
          }
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to reject educator",
            variant: "destructive"
          });
        }
        setConfirmDialog(null);
      }
    });
  }, [router, toast]);

  // Handle suspend educator
  const handleSuspend = useCallback(async (educatorId: string) => {
    setConfirmDialog({
      open: true,
      title: "Suspend Educator",
      message: "Are you sure you want to suspend this educator? They will lose access to the educator panel.",
      action: async () => {
        try {
          const response = await fetch(`/api/admin/educators/${educatorId}/suspend`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
          });

          if (response.ok) {
            toast({
              title: "Success",
              description: "Educator suspended successfully"
            });
            router.refresh();
          } else {
            throw new Error("Failed to suspend educator");
          }
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to suspend educator",
            variant: "destructive"
          });
        }
        setConfirmDialog(null);
      }
    });
  }, [router, toast]);

  // Handle reactivate educator
  const handleReactivate = useCallback(async (educatorId: string) => {
    setConfirmDialog({
      open: true,
      title: "Reactivate Educator",
      message: "Are you sure you want to reactivate this educator?",
      action: async () => {
        try {
          const response = await fetch(`/api/admin/educators/${educatorId}/reactivate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
          });

          if (response.ok) {
            toast({
              title: "Success",
              description: "Educator reactivated successfully"
            });
            router.refresh();
          } else {
            throw new Error("Failed to reactivate educator");
          }
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to reactivate educator",
            variant: "destructive"
          });
        }
        setConfirmDialog(null);
      }
    });
  }, [router, toast]);

  // Render educator permissions
  const renderPermissions = (permissions: Record<string, unknown>) => {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
        {Object.entries(permissions).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            {value === true ? (
              <UserCheck className="h-3 w-3 text-green-600" />
            ) : value === false ? (
              <UserX className="h-3 w-3 text-red-600" />
            ) : (
              <span className="text-amber-600 font-medium">{String(value)}</span>
            )}
            <span className="text-gray-600 dark:text-gray-400">
              {key.replace(/([A-Z])/g, " $1").trim()}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Render educator row
  const renderEducatorRow = (educator: Educator) => {
    const isExpanded = expandedEducators.has(educator.id);

    return (
      <div key={educator.id} className="border-b last:border-b-0">
        <div
          onClick={() => toggleExpanded(educator.id)}
          className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 flex items-center justify-between"
        >
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-full">
                <Users className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{educator.name || "Unnamed"}</span>
                  {educator.approvalStatus && (
                    <StatusBadge status={educator.approvalStatus as "pending" | "approved" | "rejected" | "suspended"} />
                  )}
                  {educator.permissionTemplate && (
                    <SecurityBadge level="low" label={educator.permissionTemplate.name} className="text-xs" />
                  )}
                </div>
                <span className="text-sm text-gray-500">{educator.email}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                {educator.quizCount}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {educator.studentCount}
              </span>
            </div>
            <span className="text-sm text-gray-500">
              {format(new Date(educator.createdAt), "MMM d, yyyy")}
            </span>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="bg-gray-50 dark:bg-gray-800/30 p-6 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Contact Information */}
              <div>
                <h4 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">
                  Contact Information
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{educator.email}</span>
                    {educator.emailVerified && (
                      <SecurityBadge level="low" label="Verified" className="text-xs" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{educator.phoneNumber || "Not provided"}</span>
                  </div>
                </div>
              </div>

              {/* Account Status */}
              <div>
                <h4 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">
                  Account Status
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-gray-400" />
                    {educator.approvalStatus && (
                    <StatusBadge status={educator.approvalStatus as "pending" | "approved" | "rejected" | "suspended"} />
                  )}
                  </div>
                  {educator.approvedAt && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>Approved: {format(new Date(educator.approvedAt), "MMM d, yyyy")}</span>
                    </div>
                  )}
                  {educator.rejectionReason && (
                    <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-red-600 dark:text-red-400">
                      Rejection reason: {educator.rejectionReason}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Permissions */}
            {educator.permissions && Object.keys(educator.permissions).length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">
                  Permissions
                </h4>
                {renderPermissions(educator.permissions)}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-4 border-t">
              {educator.approvalStatus === "pending" && (
                <>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleApprove(educator.id)}
                  >
                    <UserCheck className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReject(educator.id)}
                  >
                    <UserX className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </>
              )}
              {educator.approvalStatus === "approved" && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleSuspend(educator.id)}
                >
                  <Ban className="h-4 w-4 mr-1" />
                  Suspend
                </Button>
              )}
              {educator.approvalStatus === "suspended" && (
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => handleReactivate(educator.id)}
                >
                  <Unlock className="h-4 w-4 mr-1" />
                  Reactivate
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push(`/admin/educators/${educator.id}`)}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit Permissions
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const tabs = [
    { id: "all", label: "All Educators", badge: educators.length },
    { id: "approved", label: "Approved", badge: stats.approved },
    { id: "pending", label: "Pending", badge: stats.pending },
    { id: "suspended", label: "Suspended", badge: stats.suspended },
    { id: "rejected", label: "Rejected", badge: educators.filter(e => e.approvalStatus === "rejected").length }
  ];

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Educator Management"
        subtitle="Manage educator accounts, permissions, and access control"
        icon={Shield}
        backButton={{ href: "/admin/dashboard" }}
      />

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Educators"
          value={stats.total}
          icon={Users}
          trend={{ value: 0, label: "Total" }}
        />
        <StatCard
          label="Approved"
          value={stats.approved}
          icon={UserCheck}
          variant="success"
          trend={{ value: Math.round((stats.approved / stats.total) * 100), label: "%" }}
        />
        <StatCard
          label="Pending Review"
          value={stats.pending}
          icon={Award}
          variant="warning"
          trend={{ value: stats.pending, label: "Awaiting" }}
        />
        <StatCard
          label="Suspended"
          value={stats.suspended}
          icon={Ban}
          variant="danger"
          trend={{ value: stats.suspended, label: "Restricted" }}
        />
      </div>

      {/* Main Content */}
      <AdminSection>
        {/* Search and Filters */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search educators by name, email, or template..."
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

        {/* Educators List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {filteredEducators.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No educators found"
              description={searchTerm ? "Try adjusting your search criteria" : "No educators in this category"}
            />
          ) : (
            <div>
              {filteredEducators.map(renderEducatorRow)}
            </div>
          )}
        </div>
      </AdminSection>

      {/* Confirm Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          open={confirmDialog.open}
          title={confirmDialog.title}
          description={confirmDialog.message}
          onConfirm={confirmDialog.action}
          onOpenChange={() => setConfirmDialog(null)}
        />
      )}
    </AdminPageContainer>
  );
}
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AdminPageContainer,
  AdminPageHeader,
  AdminSection,
  AdminTabNavigation,
  StatCard,
  EmptyState,
  ConfirmDialog,
  StatusBadge,
  SecurityBadge,
  MiniStat
} from "@/components/admin-v2";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield, Users, GraduationCap, BookOpen, Activity, 
  Clock, AlertTriangle, LogOut, UserCheck, UserX, 
  Eye, Settings, BarChart, UserPlus, Link, Gauge, 
  Bell, TrendingUp, Calendar, Mail, Phone, Stethoscope
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface AdminDashboardProps {
  stats: {
    totalEducators: number;
    pendingEducators: number;
    totalStudents: number;
    totalQuizzes: number;
    totalEnrollments: number;
    recentActivities: Array<{
      id: string;
      actionType: string;
      entityType: string;
      createdAt: Date;
    }>;
  };
  pendingEducators: Array<{
    id: string;
    name: string | null;
    email: string;
    createdAt: Date;
    approvalStatus: string | null;
  }>;
  allEducators: Array<{
    id: string;
    name: string | null;
    email: string;
    role: string;
    approvalStatus: string | null;
    createdAt: Date;
  }>;
  allStudents: Array<{
    id: string;
    name: string | null;
    email: string;
    phoneNumber: string | null;
    emailVerified: boolean | null;
    createdAt: Date;
  }>;
  orphanedUsers: Array<{
    id: string;
    name: string | null;
    email: string;
    phoneNumber: string | null;
    emailVerified: boolean | null;
    createdAt: Date;
  }>;
  approvedEducators: Array<{
    id: string;
    name: string | null;
    email: string;
  }>;
  adminEmail: string;
}

export default function AdminDashboardV2({ 
  stats, 
  pendingEducators, 
  allEducators, 
  allStudents, 
  orphanedUsers, 
  approvedEducators, 
  adminEmail 
}: AdminDashboardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [selectedEducators, setSelectedEducators] = useState<Record<string, string>>({});
  const [attachingUsers, setAttachingUsers] = useState<Record<string, boolean>>({});
  
  // Confirmation dialogs
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'approve' | 'reject' | 'logout' | null;
    data?: any;
  }>({ open: false, type: null });

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/admin/auth/login", {
        method: "DELETE",
      });
      router.push("/admin/login");
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive"
      });
    }
    setIsLoggingOut(false);
  };

  const handleApproveEducator = async (educatorId: string) => {
    try {
      const response = await fetch(`/api/admin/educators/${educatorId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Educator approved successfully",
        });
        router.refresh();
      } else {
        const data = await response.json();
        toast({
          title: "Error",
          description: `Failed to approve educator: ${data.error || "Unknown error"}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve educator",
        variant: "destructive"
      });
    }
  };

  const handleRejectEducator = async (educatorId: string, reason: string) => {
    try {
      const response = await fetch(`/api/admin/educators/${educatorId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Educator rejected successfully",
        });
        router.refresh();
      } else {
        const data = await response.json();
        toast({
          title: "Error",
          description: `Failed to reject educator: ${data.error || "Unknown error"}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject educator",
        variant: "destructive"
      });
    }
  };

  const handleAttachToEducator = async (studentId: string) => {
    const educatorId = selectedEducators[studentId];
    if (!educatorId) {
      toast({
        title: "Error",
        description: "Please select an educator first",
        variant: "destructive"
      });
      return;
    }

    setAttachingUsers({ ...attachingUsers, [studentId]: true });
    
    try {
      const response = await fetch(`/api/admin/students/${studentId}/attach-educator`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ educatorId }),
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Student successfully attached to educator",
        });
        router.refresh();
      } else {
        const data = await response.json();
        toast({
          title: "Error",
          description: `Failed to attach student: ${data.error || "Unknown error"}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to attach student",
        variant: "destructive"
      });
    } finally {
      setAttachingUsers({ ...attachingUsers, [studentId]: false });
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart },
    { id: 'pending', label: 'Pending', icon: Clock, 
      badge: stats.pendingEducators, 
      badgeVariant: stats.pendingEducators > 0 ? 'warning' as const : undefined 
    },
    { id: 'educators', label: 'Educators', icon: GraduationCap },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'orphaned', label: 'Orphaned', icon: UserPlus, 
      badge: orphanedUsers.length,
      badgeVariant: orphanedUsers.length > 0 ? 'danger' as const : undefined
    },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <AdminPageContainer>
      {/* Header */}
      <AdminPageHeader
        title="Super Admin Dashboard"
        subtitle={adminEmail}
        icon={Shield}
        securityLevel="high"
        actions={
          <Button
            onClick={() => setConfirmDialog({ open: true, type: 'logout' })}
            disabled={isLoggingOut}
            variant="outline"
            className="border-red-200 hover:bg-red-50 text-red-700"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        }
      />

      {/* Stats Cards */}
      <AdminSection transparent className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <StatCard
            label="Total Educators"
            value={stats.totalEducators}
            icon={Users}
            variant="default"
          />
          <StatCard
            label="Pending Approval"
            value={stats.pendingEducators}
            icon={Clock}
            variant={stats.pendingEducators > 0 ? "warning" : "default"}
          />
          <StatCard
            label="Total Students"
            value={stats.totalStudents}
            icon={GraduationCap}
            variant="success"
          />
          <StatCard
            label="Total Quizzes"
            value={stats.totalQuizzes}
            icon={BookOpen}
            variant="default"
          />
          <StatCard
            label="Total Enrollments"
            value={stats.totalEnrollments}
            icon={Activity}
            variant="default"
          />
          <StatCard
            label="System Health"
            value="Live"
            icon={Gauge}
            variant="success"
            trend={{ value: 100 }}
          />
        </div>
      </AdminSection>

      {/* Alerts */}
      {(stats.pendingEducators > 0 || orphanedUsers.length > 0) && (
        <AdminSection transparent className="mb-6">
          <div className="space-y-4">
            {stats.pendingEducators > 0 && (
              <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                  You have {stats.pendingEducators} educator{stats.pendingEducators > 1 ? 's' : ''} pending approval
                </AlertDescription>
              </Alert>
            )}
            {orphanedUsers.length > 0 && (
              <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
                <UserPlus className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  {orphanedUsers.length} student{orphanedUsers.length > 1 ? 's are' : ' is'} not connected to any educator
                </AlertDescription>
              </Alert>
            )}
          </div>
        </AdminSection>
      )}

      {/* Performance Dashboard Card */}
      <AdminSection
        title="Performance Monitoring Center"
        description="Real-time monitoring of application performance, database metrics, and system health"
        icon={Gauge}
        securityLevel="medium"
        actions={
          <Button 
            onClick={() => router.push("/admin/performance")}
            className="bg-red-700 hover:bg-red-800 text-white shadow-lg"
          >
            <Gauge className="h-4 w-4 mr-2" />
            Open Dashboard
          </Button>
        }
        className="mb-6"
      >
        <div className="flex flex-wrap gap-4">
          <MiniStat label="Web Vitals" value="Active" icon={Activity} />
          <MiniStat label="Database" value="Healthy" icon={Shield} />
          <MiniStat label="Updates" value="Real-time" icon={BarChart} />
        </div>
      </AdminSection>

      {/* Main Content Tabs */}
      <AdminTabNavigation
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        className="mb-6"
      />

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <AdminSection title="System Overview" icon={BarChart}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-3">Quick Actions</h4>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-red-200 hover:bg-red-50"
                  onClick={() => router.push("/admin/educators")}
                >
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Manage Educators
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-red-200 hover:bg-red-50"
                  onClick={() => router.push("/admin/students")}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Manage Students
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-red-200 hover:bg-red-50"
                  onClick={() => router.push("/admin/analytics")}
                >
                  <BarChart className="h-4 w-4 mr-2" />
                  View Analytics
                </Button>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-3">System Status</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Database</span>
                  <StatusBadge status="active" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">API Services</span>
                  <StatusBadge status="active" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Background Jobs</span>
                  <StatusBadge status="active" />
                </div>
              </div>
            </div>
          </div>
        </AdminSection>
      )}

      {activeTab === 'pending' && (
        <AdminSection 
          title="Pending Educator Approvals" 
          description="Review and approve or reject educator registrations"
          icon={Clock}
          securityLevel="high"
        >
          {pendingEducators.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="No pending approvals"
              description="All educator registrations have been processed"
            />
          ) : (
            <div className="space-y-4">
              {pendingEducators.map((educator) => (
                <div
                  key={educator.id}
                  className="flex items-center justify-between p-4 border border-red-100 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {educator.name || "Unnamed Educator"}
                    </p>
                    <p className="text-sm text-gray-500">{educator.email}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Registered: {formatDate(educator.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <SecurityBadge level="high" label="Pending" />
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => setConfirmDialog({ 
                        open: true, 
                        type: 'approve', 
                        data: educator 
                      })}
                    >
                      <UserCheck className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setConfirmDialog({ 
                        open: true, 
                        type: 'reject', 
                        data: educator 
                      })}
                    >
                      <UserX className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/admin/educators/${educator.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminSection>
      )}

      {activeTab === 'educators' && (
        <AdminSection 
          title="All Educators" 
          description="View and manage all educator accounts"
          icon={GraduationCap}
        >
          {allEducators.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No educators found"
              description="No educators have registered yet"
            />
          ) : (
            <div className="space-y-4">
              {allEducators.slice(0, 5).map((educator) => (
                <div
                  key={educator.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {educator.name || "Unnamed"}
                      </p>
                      <StatusBadge status={educator.approvalStatus as any || 'pending'} />
                    </div>
                    <p className="text-sm text-gray-500">{educator.email}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Joined: {formatDate(educator.createdAt)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/admin/educators/${educator.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                </div>
              ))}
              {allEducators.length > 5 && (
                <div className="pt-4 text-center">
                  <Button 
                    variant="link" 
                    onClick={() => router.push("/admin/educators")}
                    className="text-red-700 hover:text-red-800"
                  >
                    View all {allEducators.length} educators →
                  </Button>
                </div>
              )}
            </div>
          )}
        </AdminSection>
      )}

      {activeTab === 'students' && (
        <AdminSection 
          title="All Students" 
          description="View and manage student accounts"
          icon={Users}
        >
          {allStudents.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No students registered"
              description="No students have signed up yet"
            />
          ) : (
            <div className="space-y-4">
              {allStudents.slice(0, 5).map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {student.name || "Unnamed Student"}
                      </p>
                      {student.emailVerified && (
                        <Badge className="bg-green-100 text-green-800">Verified</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{student.email}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                      {student.phoneNumber && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {student.phoneNumber}
                        </span>
                      )}
                      <span>Joined: {formatDate(student.createdAt)}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/admin/students/${student.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                </div>
              ))}
              {allStudents.length > 5 && (
                <div className="pt-4 text-center">
                  <Button 
                    variant="link" 
                    onClick={() => router.push("/admin/students")}
                    className="text-red-700 hover:text-red-800"
                  >
                    View all {allStudents.length} students →
                  </Button>
                </div>
              )}
            </div>
          )}
        </AdminSection>
      )}

      {activeTab === 'orphaned' && (
        <AdminSection 
          title="Orphaned Users" 
          description="Students not connected to any educator"
          icon={UserPlus}
          securityLevel="medium"
        >
          {orphanedUsers.length === 0 ? (
            <EmptyState
              icon={Link}
              title="All students connected"
              description="All students are connected to educators"
            />
          ) : (
            <div className="space-y-4">
              {orphanedUsers.map((student) => (
                <div
                  key={student.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-amber-200 rounded-lg bg-amber-50/50 dark:bg-amber-900/10 gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {student.name || "Unnamed Student"}
                      </p>
                      {student.emailVerified && (
                        <Badge className="bg-green-100 text-green-800">Verified</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{student.email}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                      {student.phoneNumber && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {student.phoneNumber}
                        </span>
                      )}
                      <span>Joined: {formatDate(student.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                    <Select
                      value={selectedEducators[student.id] || ""}
                      onValueChange={(value) => 
                        setSelectedEducators({ ...selectedEducators, [student.id]: value })
                      }
                    >
                      <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Select an educator" />
                      </SelectTrigger>
                      <SelectContent>
                        {approvedEducators.map((educator) => (
                          <SelectItem key={educator.id} value={educator.id}>
                            {educator.name || educator.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={() => handleAttachToEducator(student.id)}
                      disabled={!selectedEducators[student.id] || attachingUsers[student.id]}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      <Link className="h-4 w-4 mr-1" />
                      {attachingUsers[student.id] ? "Attaching..." : "Attach"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminSection>
      )}

      {activeTab === 'activity' && (
        <AdminSection 
          title="Recent Activity" 
          description="System activity and audit logs"
          icon={Activity}
        >
          {stats.recentActivities.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No recent activities"
              description="No activities have been logged yet"
            />
          ) : (
            <div className="space-y-2">
              {stats.recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Activity className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">
                        {activity.actionType}
                      </p>
                      <p className="text-xs text-gray-500">
                        {activity.entityType} • {formatDate(activity.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              <div className="pt-4">
                <Button 
                  variant="outline" 
                  className="w-full border-red-200 hover:bg-red-50"
                  onClick={() => router.push("/admin/activity")}
                >
                  View All Activity Logs
                </Button>
              </div>
            </div>
          )}
        </AdminSection>
      )}

      {activeTab === 'settings' && (
        <AdminSection 
          title="System Settings" 
          description="Configure system-wide settings and permissions"
          icon={Settings}
          securityLevel="critical"
        >
          <div className="grid gap-4">
            <Button 
              variant="outline"
              onClick={() => router.push("/admin/notifications")}
              className="justify-start bg-amber-50 border-amber-200 hover:bg-amber-100"
            >
              <Bell className="h-4 w-4 mr-2 text-amber-600" />
              Admin Notifications
            </Button>
            <Button 
              variant="outline"
              onClick={() => router.push("/admin/settings/permissions")}
              className="justify-start border-red-200 hover:bg-red-50"
            >
              <Shield className="h-4 w-4 mr-2 text-red-600" />
              Permission Templates
            </Button>
            <Button 
              variant="outline"
              onClick={() => router.push("/admin/settings/system")}
              className="justify-start border-red-200 hover:bg-red-50"
            >
              <Settings className="h-4 w-4 mr-2 text-red-600" />
              System Configuration
            </Button>
            <Button 
              variant="outline"
              onClick={() => router.push("/admin/documents")}
              className="justify-start border-red-200 hover:bg-red-50"
            >
              <BookOpen className="h-4 w-4 mr-2 text-red-600" />
              Document Management
            </Button>
            <Button 
              variant="outline"
              onClick={() => router.push("/admin/groups")}
              className="justify-start border-red-200 hover:bg-red-50"
            >
              <Users className="h-4 w-4 mr-2 text-red-600" />
              View All Groups
            </Button>
            <Button 
              variant="outline"
              onClick={() => router.push("/admin/diagnostics")}
              className="justify-start border-red-200 hover:bg-red-50"
            >
              <Stethoscope className="h-4 w-4 mr-2 text-red-600" />
              Quiz Diagnostics
            </Button>
          </div>
        </AdminSection>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={confirmDialog.open && confirmDialog.type === 'logout'}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        title="Logout Confirmation"
        description="Are you sure you want to logout from the admin panel?"
        confirmText="Logout"
        securityLevel="medium"
        onConfirm={handleLogout}
      />

      <ConfirmDialog
        open={confirmDialog.open && confirmDialog.type === 'approve'}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        title="Approve Educator"
        description={`Are you sure you want to approve ${confirmDialog.data?.name || confirmDialog.data?.email}?`}
        confirmText="Approve"
        securityLevel="high"
        showConsequences={[
          "Grant educator access to the system",
          "Allow creation of quizzes and groups",
          "Enable student management capabilities"
        ]}
        onConfirm={() => {
          handleApproveEducator(confirmDialog.data.id);
          setConfirmDialog({ open: false, type: null });
        }}
      />

      <ConfirmDialog
        open={confirmDialog.open && confirmDialog.type === 'reject'}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        title="Reject Educator"
        description={`Are you sure you want to reject ${confirmDialog.data?.name || confirmDialog.data?.email}?`}
        confirmText="Reject"
        securityLevel="high"
        requireTypedConfirmation="REJECT"
        showConsequences={[
          "Deny access to educator features",
          "Notify the user of rejection",
          "Prevent quiz and group creation"
        ]}
        onConfirm={() => {
          handleRejectEducator(confirmDialog.data.id, "Account not verified");
          setConfirmDialog({ open: false, type: null });
        }}
      />
    </AdminPageContainer>
  );
}
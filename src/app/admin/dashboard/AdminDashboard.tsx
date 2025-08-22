"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, Users, GraduationCap, BookOpen, Activity, 
  Clock, AlertTriangle, LogOut,
  UserCheck, UserX, Eye, Settings, BarChart, UserPlus, Link
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export default function AdminDashboard({ stats, pendingEducators, allEducators, allStudents, orphanedUsers, approvedEducators, adminEmail }: AdminDashboardProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [selectedEducators, setSelectedEducators] = useState<Record<string, string>>({});
  const [attachingUsers, setAttachingUsers] = useState<Record<string, boolean>>({});

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/admin/auth/login", {
        method: "DELETE",
      });
      router.push("/admin/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
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
      
      const data = await response.json();
      
      if (response.ok) {
        console.log("Educator approved successfully:", data);
        router.refresh();
        // Force a hard refresh to ensure data is updated
        window.location.reload();
      } else {
        console.error("Failed to approve educator:", data);
        alert(`Failed to approve educator: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error approving educator:", error);
      alert(`Error approving educator: ${error}`);
    }
  };

  const handleRejectEducator = async (educatorId: string, reason: string) => {
    try {
      const response = await fetch(`/api/admin/educators/${educatorId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log("Educator rejected successfully:", data);
        router.refresh();
        // Force a hard refresh to ensure data is updated
        window.location.reload();
      } else {
        console.error("Failed to reject educator:", data);
        alert(`Failed to reject educator: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error rejecting educator:", error);
      alert(`Error rejecting educator: ${error}`);
    }
  };

  const handleAttachToEducator = async (studentId: string) => {
    const educatorId = selectedEducators[studentId];
    if (!educatorId) {
      alert("Please select an educator first");
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
      
      const data = await response.json();
      
      if (response.ok) {
        console.log("Student attached successfully:", data);
        alert(`Student successfully attached to educator`);
        router.refresh();
        window.location.reload();
      } else {
        console.error("Failed to attach student:", data);
        alert(`Failed to attach student: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error attaching student:", error);
      alert(`Error attaching student: ${error}`);
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-red-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Super Admin Dashboard
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">{adminEmail}</p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              disabled={isLoggingOut}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Educators
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.totalEducators}
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Pending Approval
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.pendingEducators}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
              {stats.pendingEducators > 0 && (
                <Badge className="mt-2" variant="destructive">
                  Action Required
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Students
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.totalStudents}
                  </p>
                </div>
                <GraduationCap className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Quizzes
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.totalQuizzes}
                  </p>
                </div>
                <BookOpen className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Enrollments
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.totalEnrollments}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-indigo-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        <div className="space-y-4 mb-6">
          {stats.pendingEducators > 0 && (
            <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                You have {stats.pendingEducators} educator{stats.pendingEducators > 1 ? 's' : ''} pending approval
              </AlertDescription>
            </Alert>
          )}
          {orphanedUsers.length > 0 && (
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
              <UserPlus className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                {orphanedUsers.length} student{orphanedUsers.length > 1 ? 's are' : ' is'} not connected to any educator
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="pending">Pending Educators</TabsTrigger>
            <TabsTrigger value="educators">All Educators</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="orphaned">Orphaned Users</TabsTrigger>
            <TabsTrigger value="activity">Activity Logs</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Pending Educators Tab */}
          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Pending Educator Approvals</CardTitle>
                <CardDescription>
                  Review and approve or reject educator registrations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingEducators.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No pending educator approvals
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingEducators.map((educator) => (
                      <div
                        key={educator.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {educator.name}
                          </p>
                          <p className="text-sm text-gray-500">{educator.email}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Registered: {formatDate(educator.createdAt)}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApproveEducator(educator.id)}
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectEducator(educator.id, "Account not verified")}
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
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Educators Tab */}
          <TabsContent value="educators">
            <Card>
              <CardHeader>
                <CardTitle>All Educators ({allEducators.length})</CardTitle>
                <CardDescription>
                  View and manage all educator accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allEducators.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No educators found
                  </div>
                ) : (
                  <div className="space-y-4">
                    {allEducators.map((educator) => (
                      <div
                        key={educator.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {educator.name || "Unnamed"}
                            </p>
                            {educator.approvalStatus === "approved" && (
                              <Badge className="bg-green-500 text-white">Approved</Badge>
                            )}
                            {educator.approvalStatus === "pending" && (
                              <Badge className="bg-yellow-500 text-white">Pending</Badge>
                            )}
                            {educator.approvalStatus === "rejected" && (
                              <Badge className="bg-red-500 text-white">Rejected</Badge>
                            )}
                            {educator.approvalStatus === "suspended" && (
                              <Badge className="bg-orange-500 text-white">Suspended</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{educator.email}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Joined: {formatDate(educator.createdAt)}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/admin/educators/${educator.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))}
                    {allEducators.length >= 10 && (
                      <div className="pt-4 text-center">
                        <Button 
                          variant="link" 
                          onClick={() => router.push("/admin/educators")}
                          className="text-sm"
                        >
                          View all educators →
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students">
            <Card>
              <CardHeader>
                <CardTitle>All Students ({allStudents.length})</CardTitle>
                <CardDescription>
                  View and manage student accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allStudents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No students registered yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {allStudents.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {student.name || "Unnamed Student"}
                            </p>
                            {student.emailVerified && (
                              <Badge className="bg-blue-500 text-white">Verified</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{student.email}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-400 mt-1">
                            {student.phoneNumber && (
                              <span>📱 {student.phoneNumber}</span>
                            )}
                            <span>Joined: {formatDate(student.createdAt)}</span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/admin/students/${student.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))}
                    {allStudents.length >= 10 && (
                      <div className="pt-4 text-center">
                        <Button 
                          variant="link" 
                          onClick={() => router.push("/admin/students")}
                          className="text-sm"
                        >
                          View all students →
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orphaned Users Tab */}
          <TabsContent value="orphaned">
            <Card>
              <CardHeader>
                <CardTitle>Orphaned Users ({orphanedUsers.length})</CardTitle>
                <CardDescription>
                  Students who signed up but are not connected to any educator. You can manually attach them to an educator.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {orphanedUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    All students are connected to educators
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orphanedUsers.map((student) => (
                      <div
                        key={student.id}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 gap-4"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {student.name || "Unnamed Student"}
                            </p>
                            {student.emailVerified && (
                              <Badge className="bg-blue-500 text-white">Verified</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{student.email}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-400 mt-1">
                            {student.phoneNumber && (
                              <span>📱 {student.phoneNumber}</span>
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
                            variant="default"
                            onClick={() => handleAttachToEducator(student.id)}
                            disabled={!selectedEducators[student.id] || attachingUsers[student.id]}
                            className="w-full sm:w-auto"
                          >
                            <Link className="h-4 w-4 mr-1" />
                            {attachingUsers[student.id] ? "Attaching..." : "Attach"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Logs Tab */}
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  System activity and audit logs
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats.recentActivities.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No recent activities
                  </div>
                ) : (
                  <div className="space-y-2">
                    {stats.recentActivities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
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
                        className="w-full"
                        onClick={() => router.push("/admin/activity")}
                      >
                        View All Activity Logs
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>
                  Configure system-wide settings and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <Button 
                    variant="outline"
                    onClick={() => router.push("/admin/settings/permissions")}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Permission Templates
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => router.push("/admin/settings/system")}
                  >
                    <BarChart className="h-4 w-4 mr-2" />
                    System Configuration
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
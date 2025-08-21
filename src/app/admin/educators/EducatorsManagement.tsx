"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, Search, UserCheck, UserX, Shield, 
  BookOpen, Users, Mail, Phone, Calendar, 
  Edit, Ban, Unlock, ChevronDown, ChevronUp,
  AlertTriangle
} from "lucide-react";

interface Educator {
  id: string;
  name: string | null;
  email: string;
  role: string;
  approvalStatus: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  permissions: any;
  createdAt: Date;
  phoneNumber: string | null;
  emailVerified: boolean | null;
  quizCount: number;
  studentCount: number;
}

interface EducatorsManagementProps {
  educators: Educator[];
}

export default function EducatorsManagement({ educators }: EducatorsManagementProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [expandedEducator, setExpandedEducator] = useState<string | null>(null);

  const filteredEducators = educators.filter((educator) => {
    const matchesSearch = 
      educator.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      educator.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterStatus === "all" ||
      (filterStatus === "pending" && educator.approvalStatus === "pending") ||
      (filterStatus === "approved" && educator.approvalStatus === "approved") ||
      (filterStatus === "rejected" && educator.approvalStatus === "rejected") ||
      (filterStatus === "suspended" && educator.approvalStatus === "suspended");
    
    return matchesSearch && matchesFilter;
  });

  const handleUpdatePermissions = async (educatorId: string, permissions: any) => {
    try {
      const response = await fetch(`/api/admin/educators/${educatorId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions }),
      });

      if (response.ok) {
        window.location.reload();
      } else {
        const data = await response.json();
        alert(`Failed to update permissions: ${data.error}`);
      }
    } catch (error) {
      alert(`Error updating permissions: ${error}`);
    }
  };

  const handleSuspend = async (educatorId: string) => {
    if (!confirm("Are you sure you want to suspend this educator?")) return;

    try {
      const response = await fetch(`/api/admin/educators/${educatorId}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        window.location.reload();
      } else {
        const data = await response.json();
        alert(`Failed to suspend educator: ${data.error}`);
      }
    } catch (error) {
      alert(`Error suspending educator: ${error}`);
    }
  };

  const handleReactivate = async (educatorId: string) => {
    try {
      const response = await fetch(`/api/admin/educators/${educatorId}/reactivate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        window.location.reload();
      } else {
        const data = await response.json();
        alert(`Failed to reactivate educator: ${data.error}`);
      }
    } catch (error) {
      alert(`Error reactivating educator: ${error}`);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500">Approved</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case "rejected":
        return <Badge className="bg-red-500">Rejected</Badge>;
      case "suspended":
        return <Badge className="bg-orange-500">Suspended</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

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
              <Shield className="h-6 w-6 text-red-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Manage Educators
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">{educators.length}</div>
              <p className="text-sm text-gray-500">Total Educators</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-green-600">
                {educators.filter(e => e.approvalStatus === "approved").length}
              </div>
              <p className="text-sm text-gray-500">Approved</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-yellow-600">
                {educators.filter(e => e.approvalStatus === "pending").length}
              </div>
              <p className="text-sm text-gray-500">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-orange-600">
                {educators.filter(e => e.approvalStatus === "suspended").length}
              </div>
              <p className="text-sm text-gray-500">Suspended</p>
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
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterStatus === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("all")}
                >
                  All
                </Button>
                <Button
                  variant={filterStatus === "approved" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("approved")}
                >
                  Approved
                </Button>
                <Button
                  variant={filterStatus === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("pending")}
                >
                  Pending
                </Button>
                <Button
                  variant={filterStatus === "suspended" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("suspended")}
                >
                  Suspended
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Educators List */}
        <Card>
          <CardHeader>
            <CardTitle>Educators ({filteredEducators.length})</CardTitle>
            <CardDescription>
              Click on an educator to view detailed information and manage permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredEducators.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No educators found matching your criteria
                </div>
              ) : (
                filteredEducators.map((educator) => (
                  <div
                    key={educator.id}
                    className="border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    {/* Educator Summary */}
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() => setExpandedEducator(
                        expandedEducator === educator.id ? null : educator.id
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full">
                            <Users className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="font-medium text-gray-900 dark:text-white">
                                {educator.name || "Unnamed"}
                              </p>
                              {getStatusBadge(educator.approvalStatus)}
                            </div>
                            <p className="text-sm text-gray-500">{educator.email}</p>
                            <div className="flex items-center space-x-4 mt-1 text-xs text-gray-400">
                              <span className="flex items-center">
                                <BookOpen className="h-3 w-3 mr-1" />
                                {educator.quizCount} quizzes
                              </span>
                              <span className="flex items-center">
                                <Users className="h-3 w-3 mr-1" />
                                {educator.studentCount} students
                              </span>
                              <span className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                Joined {formatDate(educator.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {expandedEducator === educator.id ? (
                            <ChevronUp className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedEducator === educator.id && (
                      <div className="border-t p-4 bg-gray-50 dark:bg-gray-800/50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <h4 className="font-medium mb-2">Contact Information</h4>
                            <div className="space-y-1 text-sm">
                              <p className="flex items-center">
                                <Mail className="h-4 w-4 mr-2 text-gray-400" />
                                {educator.email}
                              </p>
                              <p className="flex items-center">
                                <Phone className="h-4 w-4 mr-2 text-gray-400" />
                                {educator.phoneNumber || "Not provided"}
                              </p>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Account Status</h4>
                            <div className="space-y-1 text-sm">
                              <p>Status: {getStatusBadge(educator.approvalStatus)}</p>
                              <p>Email Verified: {educator.emailVerified ? "Yes" : "No"}</p>
                              {educator.approvedAt && (
                                <p>Approved: {formatDate(educator.approvedAt)}</p>
                              )}
                              {educator.rejectionReason && (
                                <p className="text-red-600">
                                  Rejection: {educator.rejectionReason}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Permissions */}
                        {educator.permissions && (
                          <div className="mb-4">
                            <h4 className="font-medium mb-2">Permissions</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                              {Object.entries(educator.permissions).map(([key, value]) => (
                                <div key={key} className="flex items-center space-x-1">
                                  {value === true ? (
                                    <UserCheck className="h-3 w-3 text-green-500" />
                                  ) : value === false ? (
                                    <UserX className="h-3 w-3 text-red-500" />
                                  ) : (
                                    <span className="text-blue-500">{String(value)}</span>
                                  )}
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {key.replace(/([A-Z])/g, " $1").trim()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                          {educator.approvalStatus === "pending" && (
                            <>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => router.push(`/api/admin/educators/${educator.id}/approve`)}
                              >
                                <UserCheck className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => router.push(`/api/admin/educators/${educator.id}/reject`)}
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
                              className="bg-blue-600 hover:bg-blue-700"
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
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
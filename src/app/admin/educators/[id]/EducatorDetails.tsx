"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft, Shield, BookOpen, Users, CheckCircle, XCircle,
  Edit, Save, Ban, Unlock, MapPin
} from "lucide-react";
import EducatorApprovalDialog from "@/components/admin/EducatorApprovalDialog";

interface EducatorPermissions {
  canPublishQuiz?: boolean;
  canAddStudents?: boolean;
  canEditQuiz?: boolean;
  canDeleteQuiz?: boolean;
  canViewAnalytics?: boolean;
  canExportData?: boolean;
  maxStudents?: number;
  maxQuizzes?: number;
  maxQuestionsPerQuiz?: number;
  [key: string]: unknown;
}

interface QuizInfo {
  id: string;
  title: string;
  totalQuestions: number;
  createdAt: Date;
  status: string;
}

interface StudentInfo {
  id: string;
  name: string | null;
  email: string;
}

interface EducatorInfo {
  id: string;
  name: string | null;
  email: string;
  role: string;
  approvalStatus: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  permissions: EducatorPermissions;
  createdAt: Date;
  phoneNumber: string | null;
  emailVerified: boolean | null;
  timezone: string;
  quizCount: number;
  studentCount: number;
  recentQuizzes?: QuizInfo[];
  students?: StudentInfo[];
}

interface EducatorDetailsProps {
  educator: EducatorInfo;
}

export default function EducatorDetails({ educator: initialEducator }: EducatorDetailsProps) {
  const router = useRouter();
  const [educator, setEducator] = useState(initialEducator);
  const [isEditing, setIsEditing] = useState(false);
  const [permissions, setPermissions] = useState(initialEducator.permissions || {});
  const [isSaving, setIsSaving] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);

  const handleSavePermissions = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/educators/${educator.id}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions }),
      });

      if (response.ok) {
        const data = await response.json();
        setEducator(prev => ({ ...prev, permissions }));
        setIsEditing(false);
        // Show success message (you could add a toast here)
        alert("Permissions updated successfully");
      } else {
        const data = await response.json();
        alert(`Failed to update permissions: ${data.error}`);
      }
    } catch (error) {
      alert(`Error updating permissions: ${error}`);
    }
    setIsSaving(false);
  };

  const handleStatusChange = async (action: "approve" | "reject" | "suspend" | "reactivate") => {
    // For approve action, show the template selection dialog
    if (action === "approve") {
      setShowApprovalDialog(true);
      return;
    }

    const confirmMessage = {
      reject: "Are you sure you want to reject this educator?",
      suspend: "Are you sure you want to suspend this educator?",
      reactivate: "Are you sure you want to reactivate this educator?",
    };

    if (!confirm(confirmMessage[action as keyof typeof confirmMessage])) return;

    try {
      const response = await fetch(`/api/admin/educators/${educator.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: action === "reject" ? JSON.stringify({ reason: "Administrative decision" }) : undefined,
      });

      if (response.ok) {
        const data = await response.json();
        // Update the educator status based on the action
        const statusMap = {
          reject: "rejected",
          suspend: "suspended", 
          reactivate: "approved"
        };
        setEducator(prev => ({ 
          ...prev, 
          approvalStatus: statusMap[action as keyof typeof statusMap] || prev.approvalStatus 
        }));
        alert(`Educator ${action}ed successfully`);
      } else {
        const data = await response.json();
        alert(`Failed to ${action} educator: ${data.error}`);
      }
    } catch (error) {
      alert(`Error: ${error}`);
    }
  };

  const handleApprovalComplete = (_templateId: string) => {
    // Update the educator status to approved
    setEducator(prev => ({ ...prev, approvalStatus: "approved" }));
    setShowApprovalDialog(false);
    alert("Educator approved successfully");
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500 text-white">Approved</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500 text-white">Pending</Badge>;
      case "rejected":
        return <Badge className="bg-red-500 text-white">Rejected</Badge>;
      case "suspended":
        return <Badge className="bg-orange-500 text-white">Suspended</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Educators
              </Button>
              <Shield className="h-6 w-6 text-red-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Educator Details
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{educator.name || "Unnamed Educator"}</CardTitle>
                    <CardDescription>{educator.email}</CardDescription>
                  </div>
                  {getStatusBadge(educator.approvalStatus)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500">User ID</Label>
                    <p className="font-mono text-sm">{educator.id}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Role</Label>
                    <p className="text-sm capitalize">{educator.role}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Phone</Label>
                    <p className="text-sm">{educator.phoneNumber || "Not provided"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Email Verified</Label>
                    <p className="text-sm">{educator.emailVerified ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Timezone</Label>
                    <p className="text-sm flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {educator.timezone}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Joined</Label>
                    <p className="text-sm">{formatDate(educator.createdAt)}</p>
                  </div>
                </div>

                {educator.approvedAt && (
                  <div className="pt-4 border-t">
                    <Label className="text-xs text-gray-500">Approved</Label>
                    <p className="text-sm">{formatDate(educator.approvedAt)}</p>
                  </div>
                )}

                {educator.rejectionReason && (
                  <div className="pt-4 border-t">
                    <Label className="text-xs text-gray-500">Rejection Reason</Label>
                    <p className="text-sm text-red-600">{educator.rejectionReason}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Permissions */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Permissions</CardTitle>
                  {!isEditing ? (
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  ) : (
                    <div className="space-x-2">
                      <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSavePermissions} disabled={isSaving}>
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {/* Boolean permissions */}
                  {[
                    { key: "canPublishQuiz", label: "Can Publish Quiz" },
                    { key: "canAddStudents", label: "Can Add Students" },
                    { key: "canEditQuiz", label: "Can Edit Quiz" },
                    { key: "canDeleteQuiz", label: "Can Delete Quiz" },
                    { key: "canViewAnalytics", label: "Can View Analytics" },
                    { key: "canExportData", label: "Can Export Data" },
                  ].map((perm) => (
                    <div key={perm.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={perm.key}
                        checked={Boolean(permissions[perm.key])}
                        disabled={!isEditing}
                        onCheckedChange={(checked) => 
                          setPermissions({ ...permissions, [perm.key]: checked })
                        }
                      />
                      <Label htmlFor={perm.key} className="text-sm">
                        {perm.label}
                      </Label>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-4 mt-6">
                  {/* Numeric permissions */}
                  {[
                    { key: "maxStudents", label: "Max Students" },
                    { key: "maxQuizzes", label: "Max Quizzes" },
                    { key: "maxQuestionsPerQuiz", label: "Max Questions/Quiz" },
                  ].map((perm) => (
                    <div key={perm.key}>
                      <Label htmlFor={perm.key} className="text-sm">
                        {perm.label}
                      </Label>
                      <Input
                        id={perm.key}
                        type="number"
                        value={Number(permissions[perm.key]) || 0}
                        disabled={!isEditing}
                        onChange={(e) => 
                          setPermissions({ ...permissions, [perm.key]: parseInt(e.target.value) })
                        }
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {permissions[perm.key] === -1 ? "Unlimited" : `Limited to ${permissions[perm.key] || 0}`}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Quizzes */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Quizzes</CardTitle>
              </CardHeader>
              <CardContent>
                {educator.recentQuizzes?.length === 0 ? (
                  <p className="text-sm text-gray-500">No quizzes created yet</p>
                ) : (
                  <div className="space-y-2">
                    {educator.recentQuizzes?.map((quiz: QuizInfo) => (
                      <div key={quiz.id} className="flex justify-between items-center p-2 border rounded">
                        <div>
                          <p className="font-medium text-sm">{quiz.title}</p>
                          <p className="text-xs text-gray-500">
                            {quiz.totalQuestions} questions • {formatDate(quiz.createdAt)}
                          </p>
                        </div>
                        <Badge variant="outline">{quiz.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Total Quizzes</span>
                  </div>
                  <span className="font-bold">{educator.quizCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Total Students</span>
                  </div>
                  <span className="font-bold">{educator.studentCount}</span>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {educator.approvalStatus === "pending" && (
                  <>
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => handleStatusChange("approve")}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Educator
                    </Button>
                    <Button
                      className="w-full"
                      variant="destructive"
                      onClick={() => handleStatusChange("reject")}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject Educator
                    </Button>
                  </>
                )}
                {educator.approvalStatus === "approved" && (
                  <Button
                    className="w-full"
                    variant="destructive"
                    onClick={() => handleStatusChange("suspend")}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Suspend Educator
                  </Button>
                )}
                {educator.approvalStatus === "suspended" && (
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={() => handleStatusChange("reactivate")}
                  >
                    <Unlock className="h-4 w-4 mr-2" />
                    Reactivate Educator
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Students */}
            <Card>
              <CardHeader>
                <CardTitle>Students ({educator.students?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {educator.students?.length === 0 ? (
                  <p className="text-sm text-gray-500">No students enrolled</p>
                ) : (
                  <div className="space-y-2">
                    {educator.students?.slice(0, 5).map((student: StudentInfo) => (
                      <div key={student.id} className="text-sm">
                        <p className="font-medium">{student.name || "Unnamed"}</p>
                        <p className="text-xs text-gray-500">{student.email}</p>
                      </div>
                    ))}
                    {(educator.students?.length || 0) > 5 && (
                      <p className="text-xs text-gray-500 pt-2">
                        And {(educator.students?.length || 0) - 5} more...
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Approval Dialog */}
      <EducatorApprovalDialog
        isOpen={showApprovalDialog}
        onClose={() => setShowApprovalDialog(false)}
        educatorId={educator.id}
        educatorName={educator.name || "Unnamed Educator"}
        educatorEmail={educator.email}
        onApprove={handleApprovalComplete}
      />
    </div>
  );
}
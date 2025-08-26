"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  AdminPageContainer,
  AdminPageHeader,
  AdminSection,
  AdminTabNavigation,
  StatCard,
  EmptyState,
  StatusBadge,
  SecurityBadge,
  ConfirmDialog
} from "@/components/admin-v2";
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
  GraduationCap, Mail, Phone, Calendar, BookOpen, 
  Award, Users, Globe, Search, Filter, Eye, Trash,
  Edit, UserPlus, Shield, CheckCircle, XCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

interface Student {
  id: string;
  name: string | null;
  email: string;
  phoneNumber: string | null;
  emailVerified: boolean | null;
  createdAt: Date;
  timezone: string;
  enrollmentCount: number;
  attemptCount: number;
  educatorCount: number;
}

interface StudentsManagementProps {
  students: Student[];
}

export default function StudentsManagementV2({ students }: StudentsManagementProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "mostActive">("newest");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'delete' | null;
    data?: any;
  }>({ open: false, type: null });

  // Filter and sort students
  const filteredStudents = useMemo(() => {
    let filtered = students.filter((student) => {
      const matchesSearch = 
        !searchTerm ||
        student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.phoneNumber?.includes(searchTerm);
      
      const matchesFilter = 
        filterStatus === "all" ||
        (filterStatus === "verified" && student.emailVerified) ||
        (filterStatus === "unverified" && !student.emailVerified) ||
        (filterStatus === "orphaned" && student.educatorCount === 0) ||
        (filterStatus === "active" && student.attemptCount > 0);

      const matchesTab = 
        activeTab === "all" ||
        (activeTab === "verified" && student.emailVerified) ||
        (activeTab === "orphaned" && student.educatorCount === 0) ||
        (activeTab === "active" && student.attemptCount > 0);
      
      return matchesSearch && matchesFilter && matchesTab;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "mostActive":
          return b.attemptCount - a.attemptCount;
        case "newest":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return filtered;
  }, [students, searchTerm, filterStatus, activeTab, sortBy]);

  const handleDeleteStudent = async (studentId: string) => {
    try {
      const response = await fetch(`/api/admin/students/${studentId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Student deleted successfully",
        });
        router.refresh();
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete student");
      }
    } catch (error) {
      logger.error("Failed to delete student:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete student",
        variant: "destructive"
      });
    } finally {
      setConfirmDialog({ open: false, type: null });
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Calculate stats
  const stats = useMemo(() => ({
    total: students.length,
    verified: students.filter(s => s.emailVerified).length,
    active: students.filter(s => s.attemptCount > 0).length,
    orphaned: students.filter(s => s.educatorCount === 0).length,
    totalEnrollments: students.reduce((sum, s) => sum + s.enrollmentCount, 0),
    totalAttempts: students.reduce((sum, s) => sum + s.attemptCount, 0)
  }), [students]);

  const tabs = [
    { id: 'all', label: 'All Students', icon: Users, badge: stats.total },
    { id: 'verified', label: 'Verified', icon: CheckCircle, badge: stats.verified },
    { id: 'orphaned', label: 'Orphaned', icon: UserPlus, badge: stats.orphaned, badgeVariant: stats.orphaned > 0 ? 'warning' as const : undefined },
    { id: 'active', label: 'Active', icon: Award, badge: stats.active }
  ];

  return (
    <AdminPageContainer>
      {/* Header */}
      <AdminPageHeader
        title="Student Management"
        subtitle="Manage and monitor student accounts"
        icon={GraduationCap}
        securityLevel="medium"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Students' }
        ]}
        actions={
          <Button
            onClick={() => router.push('/admin/students/add')}
            className="bg-red-700 hover:bg-red-800 text-white"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Student
          </Button>
        }
      />

      {/* Stats Cards */}
      <AdminSection transparent className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <StatCard
            label="Total Students"
            value={stats.total}
            icon={Users}
            variant="default"
          />
          <StatCard
            label="Verified"
            value={stats.verified}
            icon={CheckCircle}
            variant="success"
          />
          <StatCard
            label="Active Students"
            value={stats.active}
            icon={Award}
            variant="success"
          />
          <StatCard
            label="Orphaned"
            value={stats.orphaned}
            icon={UserPlus}
            variant={stats.orphaned > 0 ? "warning" : "default"}
          />
          <StatCard
            label="Total Enrollments"
            value={stats.totalEnrollments}
            icon={BookOpen}
            variant="default"
          />
          <StatCard
            label="Quiz Attempts"
            value={stats.totalAttempts}
            icon={Award}
            variant="default"
          />
        </div>
      </AdminSection>

      {/* Filters */}
      <AdminSection 
        title="Search & Filter"
        icon={Filter}
        className="mb-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="search">Search</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="filter">Filter Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger id="filter" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                <SelectItem value="verified">Verified Only</SelectItem>
                <SelectItem value="unverified">Unverified Only</SelectItem>
                <SelectItem value="orphaned">Orphaned Only</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="sort">Sort By</Label>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger id="sort" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="mostActive">Most Active</SelectItem>
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

      {/* Students List */}
      <AdminSection 
        title={`Students (${filteredStudents.length})`}
        description="Click on a student to view detailed information"
        icon={Users}
      >
        {filteredStudents.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No students found"
            description="No students match your current filters"
            action={{
              label: "Clear Filters",
              onClick: () => {
                setSearchTerm("");
                setFilterStatus("all");
                setActiveTab("all");
              }
            }}
          />
        ) : (
          <div className="space-y-4">
            {filteredStudents.map((student) => (
              <div
                key={student.id}
                className="border border-red-100 rounded-lg hover:shadow-md transition-all"
              >
                {/* Student Summary */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setSelectedStudent(
                    selectedStudent?.id === student.id ? null : student
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                        <GraduationCap className="h-6 w-6 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {student.name || "Unnamed Student"}
                          </p>
                          {student.emailVerified && (
                            <StatusBadge status="active" />
                          )}
                          {student.educatorCount === 0 && (
                            <Badge className="bg-amber-100 text-amber-800">Orphaned</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{student.email}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            {student.enrollmentCount} enrollments
                          </span>
                          <span className="flex items-center gap-1">
                            <Award className="h-3 w-3" />
                            {student.attemptCount} attempts
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {student.educatorCount} educators
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {student.attemptCount > 10 && (
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/admin/students/${student.id}`);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedStudent?.id === student.id && (
                  <div className="border-t border-red-100 p-4 bg-red-50/50 dark:bg-red-900/10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                      <div>
                        <h4 className="font-medium mb-3 text-gray-700 dark:text-gray-300">
                          Contact Information
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span>{student.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span>{student.phoneNumber || "Not provided"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-gray-400" />
                            <span>{student.timezone}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-3 text-gray-700 dark:text-gray-300">
                          Account Details
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>Joined {formatDate(student.createdAt)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {student.emailVerified ? (
                              <>
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span>Email Verified</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 text-red-500" />
                                <span>Email Not Verified</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-gray-400" />
                            <span>ID: <code className="text-xs bg-gray-200 px-1 rounded">{student.id}</code></span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Activity Statistics */}
                    <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <h4 className="font-medium mb-3 text-gray-700 dark:text-gray-300">
                        Activity Statistics
                      </h4>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded">
                          <div className="text-2xl font-bold text-red-600">
                            {student.enrollmentCount}
                          </div>
                          <div className="text-xs text-gray-500">Quiz Enrollments</div>
                        </div>
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded">
                          <div className="text-2xl font-bold text-amber-600">
                            {student.attemptCount}
                          </div>
                          <div className="text-xs text-gray-500">Quiz Attempts</div>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded">
                          <div className="text-2xl font-bold text-green-600">
                            {student.educatorCount}
                          </div>
                          <div className="text-xs text-gray-500">Educators</div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-between items-center">
                      <SecurityBadge level="medium" label="Student Data" />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/admin/students/${student.id}`)}
                          className="border-red-200 hover:bg-red-50"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          View Full Details
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDialog({ 
                              open: true, 
                              type: 'delete', 
                              data: student 
                            });
                          }}
                        >
                          <Trash className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {filteredStudents.length >= 50 && (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 mb-2">
                  Showing first 50 students
                </p>
                <Button variant="outline" className="border-red-200 hover:bg-red-50">
                  Load More
                </Button>
              </div>
            )}
          </div>
        )}
      </AdminSection>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={confirmDialog.open && confirmDialog.type === 'delete'}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        title="Delete Student Account"
        description={`Are you sure you want to delete ${confirmDialog.data?.name || confirmDialog.data?.email}? This action cannot be undone.`}
        confirmText="Delete Student"
        securityLevel="critical"
        requireTypedConfirmation="DELETE"
        showConsequences={[
          "Remove all student data permanently",
          "Delete all quiz attempts and enrollments",
          "Remove from all educator groups",
          "This action cannot be reversed"
        ]}
        onConfirm={() => handleDeleteStudent(confirmDialog.data.id)}
      />
    </AdminPageContainer>
  );
}
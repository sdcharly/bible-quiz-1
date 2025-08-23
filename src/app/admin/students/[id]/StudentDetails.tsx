"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, GraduationCap, BookOpen, Award, MapPin, Trash, AlertTriangle,
  TrendingUp, CheckCircle
} from "lucide-react";

interface QuizAttempt {
  id: string;
  quizTitle: string;
  score: number | null;
  totalQuestions: number | null;
  startTime: Date;
  endTime: Date | null;
  status: string;
}

interface QuizEnrollment {
  id: string;
  quizTitle: string;
  enrolledAt: Date;
  startedAt?: Date | null;
  completedAt?: Date | null;
  status: string;
}

interface ConnectedEducator {
  id: string;
  name: string | null;
  email: string;
  enrolledAt: Date;
}

interface StudentInfo {
  id: string;
  name: string | null;
  email: string;
  phoneNumber: string | null;
  timezone: string;
  createdAt: Date;
  emailVerified: boolean | null;
  role: string;
  enrollmentCount: number;
  attemptCount: number;
  completedCount: number;
  averageScore: number;
  recentAttempts?: QuizAttempt[];
  enrollments?: QuizEnrollment[];
  educators?: ConnectedEducator[];
}

interface StudentDetailsProps {
  student: StudentInfo;
}

export default function StudentDetails({ student }: StudentDetailsProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteStudent = async () => {
    if (!confirm("Are you sure you want to delete this student? This will remove all their quiz attempts and enrollments. This action cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/students/${student.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/admin/students");
        router.refresh();
      } else {
        const data = await response.json();
        alert(`Failed to delete student: ${data.error}`);
      }
    } catch (error) {
      alert(`Error deleting student: ${error}`);
    }
    setIsDeleting(false);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500 text-white">Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-500 text-white">In Progress</Badge>;
      case "enrolled":
        return <Badge className="bg-yellow-500 text-white">Enrolled</Badge>;
      case "abandoned":
        return <Badge className="bg-red-500 text-white">Abandoned</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const completionRate = student.attemptCount > 0 
    ? ((student.completedCount / student.attemptCount) * 100).toFixed(1)
    : 0;

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
                Back to Students
              </Button>
              <GraduationCap className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Student Details
              </h1>
            </div>
            <Button
              variant="destructive"
              onClick={handleDeleteStudent}
              disabled={isDeleting}
            >
              <Trash className="h-4 w-4 mr-2" />
              Delete Student
            </Button>
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
                    <CardTitle className="text-xl">{student.name || "Unnamed Student"}</CardTitle>
                    <CardDescription>{student.email}</CardDescription>
                  </div>
                  {student.emailVerified && (
                    <Badge className="bg-green-500 text-white">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Student ID</p>
                    <p className="font-mono text-sm">{student.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm">{student.phoneNumber || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Timezone</p>
                    <p className="text-sm flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {student.timezone}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Joined</p>
                    <p className="text-sm">{formatDate(student.createdAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <BookOpen className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{student.enrollmentCount}</p>
                    <p className="text-xs text-gray-500">Enrollments</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <Award className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{student.attemptCount}</p>
                    <p className="text-xs text-gray-500">Quiz Attempts</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{student.completedCount}</p>
                    <p className="text-xs text-gray-500">Completed</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <TrendingUp className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{student.averageScore.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500">Avg Score</p>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Completion Rate</span>
                    <span className="font-bold">{completionRate}%</span>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Quiz Attempts */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Quiz Attempts</CardTitle>
              </CardHeader>
              <CardContent>
                {student.recentAttempts?.length === 0 ? (
                  <p className="text-sm text-gray-500">No quiz attempts yet</p>
                ) : (
                  <div className="space-y-2">
                    {student.recentAttempts?.map((attempt: QuizAttempt) => (
                      <div key={attempt.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{attempt.quizTitle}</p>
                          <div className="flex items-center space-x-3 mt-1">
                            <span className="text-xs text-gray-500">
                              Score: {attempt.score?.toFixed(1) || 0}%
                            </span>
                            <span className="text-xs text-gray-500">
                              Questions: {attempt.totalQuestions}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(attempt.startTime)}
                            </span>
                          </div>
                        </div>
                        {getStatusBadge(attempt.status)}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Enrollments */}
            <Card>
              <CardHeader>
                <CardTitle>Quiz Enrollments</CardTitle>
              </CardHeader>
              <CardContent>
                {student.enrollments?.length === 0 ? (
                  <p className="text-sm text-gray-500">No enrollments yet</p>
                ) : (
                  <div className="space-y-2">
                    {student.enrollments?.map((enrollment: QuizEnrollment) => (
                      <div key={enrollment.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{enrollment.quizTitle}</p>
                          <div className="flex items-center space-x-3 mt-1">
                            <span className="text-xs text-gray-500">
                              Enrolled: {formatDate(enrollment.enrolledAt)}
                            </span>
                            {enrollment.completedAt && (
                              <span className="text-xs text-gray-500">
                                Completed: {formatDate(enrollment.completedAt)}
                              </span>
                            )}
                          </div>
                        </div>
                        {getStatusBadge(enrollment.status)}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Status</span>
                  <Badge variant="outline">Active</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Email Verified</span>
                  <span className="text-sm font-medium">
                    {student.emailVerified ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Last Active</span>
                  <span className="text-sm font-medium">
                    {student.recentAttempts?.[0] 
                      ? formatDate(student.recentAttempts[0].startTime).split(",")[0]
                      : "Never"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Educators */}
            <Card>
              <CardHeader>
                <CardTitle>Connected Educators ({student.educators?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {student.educators?.length === 0 ? (
                  <p className="text-sm text-gray-500">No educators connected</p>
                ) : (
                  <div className="space-y-3">
                    {student.educators?.map((educator: ConnectedEducator) => (
                      <div key={educator.id} className="text-sm">
                        <p className="font-medium">{educator.name || "Unnamed"}</p>
                        <p className="text-xs text-gray-500">{educator.email}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Since: {formatDate(educator.enrolledAt).split(",")[0]}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-200 dark:border-red-800">
              <CardHeader>
                <CardTitle className="text-red-600">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Deleting this student will permanently remove all their data including quiz attempts and enrollments.
                </p>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleDeleteStudent}
                  disabled={isDeleting}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Delete Student Account
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
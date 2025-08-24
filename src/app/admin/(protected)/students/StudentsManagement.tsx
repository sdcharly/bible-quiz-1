"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, Search, GraduationCap, Mail, Phone, 
  Calendar, BookOpen, Award, Users, ChevronDown, 
  ChevronUp, Trash, Edit, Globe
} from "lucide-react";

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

export default function StudentsManagement({ students }: StudentsManagementProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  const filteredStudents = students.filter((student) => {
    return (
      student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm("Are you sure you want to delete this student? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/students/${studentId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        alert("Student deleted successfully");
        router.refresh();
      } else {
        const data = await response.json();
        alert(`Failed to delete student: ${data.error}`);
      }
    } catch (error) {
      alert(`Error deleting student: ${error}`);
    }
  };

  const formatDate = (date: Date) => {
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
                onClick={() => router.back()}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <GraduationCap className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Manage Students
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
              <div className="text-2xl font-bold">{students.length}</div>
              <p className="text-sm text-gray-500">Total Students</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-green-600">
                {students.filter(s => s.emailVerified).length}
              </div>
              <p className="text-sm text-gray-500">Verified Emails</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-blue-600">
                {students.reduce((sum, s) => sum + s.enrollmentCount, 0)}
              </div>
              <p className="text-sm text-gray-500">Total Enrollments</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-purple-600">
                {students.reduce((sum, s) => sum + s.attemptCount, 0)}
              </div>
              <p className="text-sm text-gray-500">Quiz Attempts</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
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
          </CardContent>
        </Card>

        {/* Students List */}
        <Card>
          <CardHeader>
            <CardTitle>Students ({filteredStudents.length})</CardTitle>
            <CardDescription>
              Click on a student to view detailed information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No students found matching your criteria
                </div>
              ) : (
                filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className="border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    {/* Student Summary */}
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() => setExpandedStudent(
                        expandedStudent === student.id ? null : student.id
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                            <GraduationCap className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="font-medium text-gray-900 dark:text-white">
                                {student.name || "Unnamed Student"}
                              </p>
                              {student.emailVerified && (
                                <Badge className="bg-green-500 text-white text-xs">
                                  Verified
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{student.email}</p>
                            <div className="flex items-center space-x-4 mt-1 text-xs text-gray-400">
                              <span className="flex items-center">
                                <BookOpen className="h-3 w-3 mr-1" />
                                {student.enrollmentCount} enrollments
                              </span>
                              <span className="flex items-center">
                                <Award className="h-3 w-3 mr-1" />
                                {student.attemptCount} attempts
                              </span>
                              <span className="flex items-center">
                                <Users className="h-3 w-3 mr-1" />
                                {student.educatorCount} educators
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {expandedStudent === student.id ? (
                            <ChevronUp className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedStudent === student.id && (
                      <div className="border-t p-4 bg-gray-50 dark:bg-gray-800/50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <h4 className="font-medium mb-2">Contact Information</h4>
                            <div className="space-y-1 text-sm">
                              <p className="flex items-center">
                                <Mail className="h-4 w-4 mr-2 text-gray-400" />
                                {student.email}
                              </p>
                              <p className="flex items-center">
                                <Phone className="h-4 w-4 mr-2 text-gray-400" />
                                {student.phoneNumber || "Not provided"}
                              </p>
                              <p className="flex items-center">
                                <Globe className="h-4 w-4 mr-2 text-gray-400" />
                                {student.timezone}
                              </p>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Account Details</h4>
                            <div className="space-y-1 text-sm">
                              <p className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                                Joined {formatDate(student.createdAt)}
                              </p>
                              <p>Email Verified: {student.emailVerified ? "Yes" : "No"}</p>
                              <p>Student ID: <code className="text-xs bg-gray-200 px-1 rounded">{student.id}</code></p>
                            </div>
                          </div>
                        </div>

                        {/* Statistics */}
                        <div className="mb-4">
                          <h4 className="font-medium mb-2">Activity Statistics</h4>
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="bg-white dark:bg-gray-700 p-3 rounded">
                              <div className="text-2xl font-bold text-blue-600">
                                {student.enrollmentCount}
                              </div>
                              <div className="text-xs text-gray-500">Quiz Enrollments</div>
                            </div>
                            <div className="bg-white dark:bg-gray-700 p-3 rounded">
                              <div className="text-2xl font-bold text-purple-600">
                                {student.attemptCount}
                              </div>
                              <div className="text-xs text-gray-500">Quiz Attempts</div>
                            </div>
                            <div className="bg-white dark:bg-gray-700 p-3 rounded">
                              <div className="text-2xl font-bold text-green-600">
                                {student.educatorCount}
                              </div>
                              <div className="text-xs text-gray-500">Educators</div>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/admin/students/${student.id}`)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteStudent(student.id)}
                          >
                            <Trash className="h-4 w-4 mr-1" />
                            Delete Student
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
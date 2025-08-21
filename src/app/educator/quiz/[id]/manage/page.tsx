"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateInTimezone } from "@/lib/timezone";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Users,
  UserPlus,
  CheckCircle,
  Clock,
  Search,
  Calendar,
  Eye,
  BookOpen,
  UserCheck,
  UserX,
  CheckSquare,
  Square,
  Loader2,
} from "lucide-react";

interface QuizDetails {
  id: string;
  title: string;
  description: string;
  totalQuestions: number;
  duration: number;
  status: string;
  startTime: string;
  timezone: string;
  createdAt: string;
}

interface EnrolledStudent {
  id: string;
  name: string;
  email: string;
  enrolledAt: string;
  status: "enrolled" | "in_progress" | "completed";
  score?: number;
  completedAt?: string;
}

interface AvailableStudent {
  studentId: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  isEnrolled: boolean;
}

export default function QuizManagePage() {
  const params = useParams();
  const quizId = params.id as string;
  
  const [quiz, setQuiz] = useState<QuizDetails | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [availableStudents, setAvailableStudents] = useState<AvailableStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBulkEnroll, setShowBulkEnroll] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [enrollmentStats, setEnrollmentStats] = useState({ total: 0, enrolled: 0 });

  useEffect(() => {
    fetchQuizDetails();
    fetchEnrolledStudents();
    fetchAvailableStudents();
  }, [quizId]);

  const fetchQuizDetails = async () => {
    try {
      const response = await fetch(`/api/educator/quiz/${quizId}`);
      if (response.ok) {
        const data = await response.json();
        setQuiz(data);
      }
    } catch (error) {
      console.error("Error fetching quiz details:", error);
    }
  };

  const fetchEnrolledStudents = async () => {
    try {
      const response = await fetch(`/api/educator/quiz/${quizId}/enrollments`);
      if (response.ok) {
        const data = await response.json();
        setEnrolledStudents(data.enrollments || []);
      }
    } catch (error) {
      console.error("Error fetching enrolled students:", error);
    }
  };

  const fetchAvailableStudents = async () => {
    try {
      const response = await fetch(`/api/educator/quiz/${quizId}/bulk-enroll`);
      if (response.ok) {
        const data = await response.json();
        setAvailableStudents(data.students || []);
        setEnrollmentStats({ total: data.total, enrolled: data.enrolled });
      }
    } catch (error) {
      console.error("Error fetching available students:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkEnroll = async () => {
    if (selectedStudents.size === 0) {
      alert("Please select at least one student to enroll");
      return;
    }

    setEnrolling(true);
    try {
      const response = await fetch(`/api/educator/quiz/${quizId}/bulk-enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: Array.from(selectedStudents) })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Successfully enrolled ${data.enrolledCount} student(s)!`);
        setSelectedStudents(new Set());
        setShowBulkEnroll(false);
        fetchEnrolledStudents();
        fetchAvailableStudents();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to enroll students");
      }
    } catch (error) {
      console.error("Error enrolling students:", error);
      alert("Error enrolling students");
    } finally {
      setEnrolling(false);
    }
  };

  const handleEnrollAll = async () => {
    if (!confirm("Are you sure you want to enroll ALL your students in this quiz?")) return;

    setEnrolling(true);
    try {
      const response = await fetch(`/api/educator/quiz/${quizId}/bulk-enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollAll: true })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Successfully enrolled ${data.enrolledCount} student(s)!`);
        setShowBulkEnroll(false);
        fetchEnrolledStudents();
        fetchAvailableStudents();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to enroll students");
      }
    } catch (error) {
      console.error("Error enrolling all students:", error);
      alert("Error enrolling students");
    } finally {
      setEnrolling(false);
    }
  };

  const toggleStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const selectAll = () => {
    const notEnrolled = availableStudents
      .filter(s => !s.isEnrolled && s.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .map(s => s.studentId);
    setSelectedStudents(new Set(notEnrolled));
  };

  const deselectAll = () => {
    setSelectedStudents(new Set());
  };

  const filteredStudents = availableStudents.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string, score?: number) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <CheckCircle className="h-3 w-3" />
            Completed {score !== undefined && `(${score}%)`}
          </span>
        );
      case "in_progress":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
            <Clock className="h-3 w-3" />
            In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            <Users className="h-3 w-3" />
            Enrolled
          </span>
        );
    }
  };

  if (loading || !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/educator/dashboard" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Quiz Management
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Manage student enrollments and track progress
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`/educator/quiz/${quizId}/review`}>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  View Quiz
                </Button>
              </Link>
              <Button 
                onClick={() => setShowBulkEnroll(true)}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Users className="h-4 w-4 mr-2" />
                Assign Students
              </Button>
            </div>
          </div>
        </div>

        {/* Quiz Info Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {quiz.title}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {quiz.description}
                </p>
                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    {quiz.totalQuestions} Questions
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {quiz.duration} minutes
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Published {formatDateInTimezone(quiz.createdAt, quiz.timezone || 'Asia/Kolkata', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Published</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Student Enrollment */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stats */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quiz Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Enrolled</span>
                  <span className="font-semibold">{enrolledStudents.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Completed</span>
                  <span className="font-semibold text-green-600">
                    {enrolledStudents.filter(s => s.status === "completed").length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">In Progress</span>
                  <span className="font-semibold text-yellow-600">
                    {enrolledStudents.filter(s => s.status === "in_progress").length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Not Started</span>
                  <span className="font-semibold text-blue-600">
                    {enrolledStudents.filter(s => s.status === "enrolled").length}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enrolled Students */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Enrolled Students</CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowBulkEnroll(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign More
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {enrolledStudents.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No students enrolled yet</p>
                    <Button 
                      className="mt-4" 
                      onClick={() => setShowBulkEnroll(true)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Assign Students
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {enrolledStudents.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {student.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {student.name}
                            </p>
                            <p className="text-sm text-gray-500">{student.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right text-sm">
                            <p className="text-gray-500">
                              Enrolled {formatDateInTimezone(student.enrolledAt, quiz?.timezone || 'Asia/Kolkata', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </p>
                            {student.completedAt && (
                              <p className="text-gray-500">
                                Completed {formatDateInTimezone(student.completedAt, quiz?.timezone || 'Asia/Kolkata', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </p>
                            )}
                          </div>
                          {getStatusBadge(student.status, student.score)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bulk Enroll Students Modal */}
        <Dialog open={showBulkEnroll} onOpenChange={setShowBulkEnroll}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
              <DialogTitle className="text-xl font-semibold">Assign Students to Quiz</DialogTitle>
              <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
                Select students to enroll in &quot;{quiz?.title}&quot;. Already enrolled students are marked and cannot be selected.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Stats Bar */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Total Students: <strong className="text-gray-900 dark:text-white">{enrollmentStats.total}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Already Enrolled: <strong className="text-green-600">{enrollmentStats.enrolled}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserX className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Available: <strong className="text-blue-600">{enrollmentStats.total - enrollmentStats.enrolled}</strong>
                      </span>
                    </div>
                  </div>
                  <Badge 
                    variant={selectedStudents.size > 0 ? "default" : "secondary"}
                    className={selectedStudents.size > 0 ? "bg-orange-500 text-white" : ""}
                  >
                    {selectedStudents.size} selected
                  </Badge>
                </div>
              </div>

              {/* Search and Actions */}
              <div className="px-6 py-4 border-b">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search students by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-10"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={selectAll}
                      disabled={enrollmentStats.total === enrollmentStats.enrolled}
                      className="whitespace-nowrap"
                    >
                      <CheckSquare className="h-4 w-4 mr-2" />
                      Select All Available
                    </Button>
                    <Button
                      variant="outline"
                      onClick={deselectAll}
                      className="whitespace-nowrap"
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Deselect All
                    </Button>
                  </div>
                </div>
              </div>

              {/* Student List */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {filteredStudents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <Users className="h-12 w-12 mb-3 text-gray-300" />
                    <p className="text-base">
                      {searchTerm ? "No students found matching your search" : "No students available"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredStudents.map((student) => (
                      <div
                        key={student.studentId}
                        className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                          student.isEnrolled
                            ? "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 opacity-60 cursor-not-allowed"
                            : selectedStudents.has(student.studentId)
                            ? "bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-600"
                            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer"
                        }`}
                        onClick={() => !student.isEnrolled && toggleStudent(student.studentId)}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedStudents.has(student.studentId) || student.isEnrolled}
                            disabled={student.isEnrolled}
                            onCheckedChange={() => toggleStudent(student.studentId)}
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            className="h-5 w-5"
                          />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {student.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {student.email}
                            </div>
                          </div>
                        </div>
                        {student.isEnrolled && (
                          <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Already Enrolled
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t bg-gray-50 dark:bg-gray-900">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 w-full">
                <Button
                  variant="outline"
                  onClick={handleEnrollAll}
                  disabled={enrolling || enrollmentStats.total === enrollmentStats.enrolled}
                  className="w-full sm:w-auto"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Enroll All Students
                </Button>
                <div className="flex gap-3 w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowBulkEnroll(false)} 
                    disabled={enrolling}
                    className="flex-1 sm:flex-initial"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkEnroll}
                    disabled={enrolling || selectedStudents.size === 0}
                    className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {enrolling ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enrolling...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Enroll {selectedStudents.size} Student{selectedStudents.size !== 1 ? "s" : ""}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
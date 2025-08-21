"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateInTimezone } from "@/lib/timezone";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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

        {/* Minimalistic Bulk Enroll Students Modal */}
        <Dialog open={showBulkEnroll} onOpenChange={setShowBulkEnroll}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Assign Students to Quiz</DialogTitle>
              <DialogDescription>
                Select students to enroll in &quot;{quiz?.title}&quot;. {selectedStudents.size} selected.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 flex flex-col gap-4">
              {/* Simple Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Student List - Clean and Simple */}
              <div className="flex-1 overflow-y-auto min-h-64">
                {filteredStudents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                    <Users className="h-8 w-8 mb-2 text-gray-300" />
                    <p>{searchTerm ? "No students found" : "No students available"}</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredStudents.map((student) => (
                      <div
                        key={student.studentId}
                        className={`flex items-center gap-3 p-3 rounded-md transition-colors ${
                          student.isEnrolled
                            ? "bg-gray-50 opacity-50 cursor-not-allowed"
                            : selectedStudents.has(student.studentId)
                            ? "bg-blue-50 border border-blue-200"
                            : "hover:bg-gray-50 cursor-pointer"
                        }`}
                        onClick={() => !student.isEnrolled && toggleStudent(student.studentId)}
                      >
                        <Checkbox
                          checked={selectedStudents.has(student.studentId) || student.isEnrolled}
                          disabled={student.isEnrolled}
                          onCheckedChange={() => toggleStudent(student.studentId)}
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{student.name}</div>
                          <div className="text-sm text-gray-500">{student.email}</div>
                        </div>
                        {student.isEnrolled && (
                          <span className="text-xs text-green-600 font-medium">Enrolled</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 text-sm">
                <button
                  onClick={selectAll}
                  disabled={enrollmentStats.total === enrollmentStats.enrolled}
                  className="text-blue-600 hover:text-blue-700 disabled:text-gray-400"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={deselectAll}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Clear Selection
                </button>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBulkEnroll(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleBulkEnroll}
                disabled={enrolling || selectedStudents.size === 0}
              >
                {enrolling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enrolling...
                  </>
                ) : (
                  `Enroll ${selectedStudents.size} Student${selectedStudents.size !== 1 ? "s" : ""}`
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
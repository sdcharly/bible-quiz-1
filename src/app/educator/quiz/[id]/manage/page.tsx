"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Users,
  UserPlus,
  CheckCircle,
  Clock,
  Trophy,
  Search,
  Mail,
  Calendar,
  BarChart3,
  Eye,
  BookOpen,
} from "lucide-react";

interface QuizDetails {
  id: string;
  title: string;
  description: string;
  totalQuestions: number;
  duration: number;
  status: string;
  startTime: string;
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

export default function QuizManagePage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;
  
  const [quiz, setQuiz] = useState<QuizDetails | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [studentEmail, setStudentEmail] = useState("");
  const [addingStudent, setAddingStudent] = useState(false);

  useEffect(() => {
    fetchQuizDetails();
    fetchEnrolledStudents();
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
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentEmail.trim()) return;

    setAddingStudent(true);
    try {
      const response = await fetch(`/api/educator/quiz/${quizId}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentEmail: studentEmail.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Student enrolled successfully!`);
        setStudentEmail("");
        setShowAddStudent(false);
        fetchEnrolledStudents(); // Refresh the list
      } else {
        const error = await response.json();
        alert(error.message || "Failed to enroll student");
      }
    } catch (error) {
      console.error("Error enrolling student:", error);
      alert("Error enrolling student");
    } finally {
      setAddingStudent(false);
    }
  };

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
                onClick={() => setShowAddStudent(true)}
                size="sm"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Student
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
                    Published {new Date(quiz.createdAt).toLocaleDateString()}
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
                    onClick={() => setShowAddStudent(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Student
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
                      onClick={() => setShowAddStudent(true)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Enroll First Student
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
                              Enrolled {new Date(student.enrolledAt).toLocaleDateString()}
                            </p>
                            {student.completedAt && (
                              <p className="text-gray-500">
                                Completed {new Date(student.completedAt).toLocaleDateString()}
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

        {/* Add Student Modal */}
        {showAddStudent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">Add Student to Quiz</h3>
              <form onSubmit={handleAddStudent}>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Student Email Address
                  </label>
                  <input
                    type="email"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="student@example.com"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The student will be enrolled automatically if they have an account
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddStudent(false);
                      setStudentEmail("");
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={addingStudent}
                    className="flex-1"
                  >
                    {addingStudent ? "Adding..." : "Add Student"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
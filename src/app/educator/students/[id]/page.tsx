"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  BookOpen,
  Trophy,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Award,
} from "lucide-react";

interface QuizAttempt {
  attemptId: string;
  quizId: string;
  quizTitle: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  completedAt: string;
  timeSpent: number;
  status: string;
}

interface StudentDetail {
  studentId: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  role: string;
  joinedAt: string;
  totalEnrollments: number;
  completedQuizzes: number;
  averageScore: number;
  totalTimeSpent: number;
  recentAttempts: QuizAttempt[];
  performanceByTopic: Record<string, { total: number; correct: number; percentage: number }>;
}

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;
  
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "attempts" | "performance">("overview");

  useEffect(() => {
    fetchStudentDetails();
  }, [studentId]);

  const fetchStudentDetails = async () => {
    try {
      const response = await fetch(`/api/educator/students/${studentId}`);
      if (response.ok) {
        const data = await response.json();
        setStudent(data);
      } else {
        console.error("Failed to fetch student details");
      }
    } catch (error) {
      console.error("Error fetching student details:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getGradeColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-blue-600";
    if (score >= 70) return "text-yellow-600";
    if (score >= 60) return "text-orange-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Student Not Found</h2>
          <Link href="/educator/students">
            <Button>Back to Students</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <Link href="/educator/students">
              <Button variant="ghost" size="sm" className="mr-4">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Student Details
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {student.name}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Student Info Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                </div>
                <p className="font-medium text-gray-900 dark:text-white">{student.name}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                </div>
                <p className="font-medium text-gray-900 dark:text-white">{student.email}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
                </div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {student.phoneNumber || "Not provided"}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Joined</p>
                </div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {new Date(student.joinedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Enrollments</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {student.totalEnrollments}
                  </p>
                </div>
                <BookOpen className="h-8 w-8 text-blue-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {student.completedQuizzes}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg Score</p>
                  <p className={`text-2xl font-bold ${getGradeColor(student.averageScore)}`}>
                    {student.averageScore.toFixed(1)}%
                  </p>
                </div>
                <Trophy className="h-8 w-8 text-yellow-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Time</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatTime(student.totalTimeSpent)}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-purple-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
          <div className="border-b dark:border-gray-700">
            <div className="flex">
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-6 py-3 font-medium ${
                  activeTab === "overview"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab("attempts")}
                className={`px-6 py-3 font-medium ${
                  activeTab === "attempts"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                Recent Attempts
              </button>
              <button
                onClick={() => setActiveTab("performance")}
                className={`px-6 py-3 font-medium ${
                  activeTab === "performance"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                Performance by Topic
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <Card>
            <CardHeader>
              <CardTitle>Performance Overview</CardTitle>
              <CardDescription>
                Overall performance metrics and trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Performance Summary */}
                <div>
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Performance Summary
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</p>
                      <p className="text-xl font-bold mt-1">
                        {student.totalEnrollments > 0
                          ? Math.round((student.completedQuizzes / student.totalEnrollments) * 100)
                          : 0}%
                      </p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Pass Rate</p>
                      <p className="text-xl font-bold mt-1">
                        {student.recentAttempts.length > 0
                          ? Math.round(
                              (student.recentAttempts.filter(a => a.score >= 70).length /
                                student.recentAttempts.length) *
                                100
                            )
                          : 0}%
                      </p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Avg Time/Quiz</p>
                      <p className="text-xl font-bold mt-1">
                        {student.completedQuizzes > 0
                          ? formatTime(Math.round(student.totalTimeSpent / student.completedQuizzes))
                          : "0m"}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Best Score</p>
                      <p className="text-xl font-bold mt-1">
                        {student.recentAttempts.length > 0
                          ? Math.max(...student.recentAttempts.map(a => a.score))
                          : 0}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Grade Distribution */}
                <div>
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Grade Distribution
                  </h3>
                  {(() => {
                    const grades = { A: 0, B: 0, C: 0, D: 0, F: 0 };
                    student.recentAttempts.forEach(attempt => {
                      if (attempt.score >= 90) grades.A++;
                      else if (attempt.score >= 80) grades.B++;
                      else if (attempt.score >= 70) grades.C++;
                      else if (attempt.score >= 60) grades.D++;
                      else grades.F++;
                    });
                    const total = student.recentAttempts.length || 1;
                    
                    return (
                      <div className="flex gap-4">
                        {Object.entries(grades).map(([grade, count]) => (
                          <div key={grade} className="flex-1 text-center">
                            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded relative">
                              <div
                                className={`absolute bottom-0 w-full rounded ${
                                  grade === "A" ? "bg-green-500" :
                                  grade === "B" ? "bg-blue-500" :
                                  grade === "C" ? "bg-yellow-500" :
                                  grade === "D" ? "bg-orange-500" : "bg-red-500"
                                }`}
                                style={{ height: `${(count / total) * 100}%` }}
                              />
                            </div>
                            <p className="mt-2 font-medium">{grade}</p>
                            <p className="text-sm text-gray-600">{count}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "attempts" && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Quiz Attempts</CardTitle>
              <CardDescription>
                Latest quiz completions and scores
              </CardDescription>
            </CardHeader>
            <CardContent>
              {student.recentAttempts.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No quiz attempts yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {student.recentAttempts.map((attempt) => (
                    <div
                      key={attempt.attemptId}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {attempt.quizTitle}
                        </h4>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Trophy className="h-3 w-3" />
                            Score: <span className={`font-medium ${getGradeColor(attempt.score)}`}>
                              {attempt.score}%
                            </span>
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            {attempt.correctAnswers}/{attempt.totalQuestions}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(attempt.timeSpent)}
                          </span>
                          <span>
                            {new Date(attempt.completedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Link href={`/educator/quiz/${attempt.quizId}/attempt/${attempt.attemptId}`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "performance" && (
          <Card>
            <CardHeader>
              <CardTitle>Performance by Topic</CardTitle>
              <CardDescription>
                Breakdown of performance across different topics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(student.performanceByTopic).length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No topic data available yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(student.performanceByTopic).map(([topic, stats]) => (
                    <div key={topic} className="flex items-center justify-between">
                      <span className="font-medium">{topic}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">
                          {stats.correct}/{stats.total} correct
                        </span>
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              stats.percentage >= 80 ? "bg-green-600" :
                              stats.percentage >= 60 ? "bg-yellow-600" : "bg-red-600"
                            }`}
                            style={{ width: `${stats.percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">
                          {stats.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
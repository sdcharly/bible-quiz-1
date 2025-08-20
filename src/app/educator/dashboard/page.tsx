"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { isEducator } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FileText, 
  Plus, 
  BarChart3, 
  Users, 
  Clock,
  BookOpen,
  Upload,
  ChevronRight,
  CheckCircle,
  Eye,
  Settings,
  Edit3,
  Trash2,
  Archive,
  ArchiveRestore,
  TrendingUp,
  Calendar
} from "lucide-react";

interface Quiz {
  id: string;
  title: string;
  description: string;
  status: string;
  totalQuestions: number;
  duration: number;
  enrolledStudents: number;
  createdAt: string;
}

interface PerformanceData {
  averageScore: number;
  passRate: number;
  completionRate: number;
  recentActivity: {
    date: string;
    attempts: number;
    avgScore: number;
  }[];
}

export default function EducatorDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ name?: string; email?: string; role?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    activeQuizzes: 0,
    totalStudents: 0,
    totalDocuments: 0,
  });
  const [performanceData, setPerformanceData] = useState<PerformanceData>({
    averageScore: 0,
    passRate: 0,
    completionRate: 0,
    recentActivity: []
  });

  useEffect(() => {
    const checkAuth = async () => {
      const response = await authClient.getSession();
      if (!response.data?.user) {
        router.push("/auth/signin");
        return;
      }
      
      const userWithRole = response.data.user as { role?: string; name?: string; email?: string };
      if (!isEducator(userWithRole.role)) {
        router.push("/student/dashboard");
        return;
      }
      
      setUser(userWithRole);
      await Promise.all([
        fetchQuizzes(),
        fetchStats(),
        fetchPerformanceData()
      ]);
      setLoading(false);
    };
    
    checkAuth();
  }, [router]);

  const fetchQuizzes = async () => {
    try {
      const response = await fetch('/api/educator/quizzes');
      if (response.ok) {
        const data = await response.json();
        setQuizzes(data.quizzes || []);
        
        const total = data.quizzes?.length || 0;
        const active = data.quizzes?.filter((q: Quiz) => q.status === 'published').length || 0;
        setStats(prev => ({
          ...prev,
          totalQuizzes: total,
          activeQuizzes: active
        }));
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const studentsResponse = await fetch('/api/educator/students');
      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json();
        setStats(prev => ({
          ...prev,
          totalStudents: studentsData.students?.length || 0
        }));
      }

      const docsResponse = await fetch('/api/educator/documents');
      if (docsResponse.ok) {
        const docsData = await docsResponse.json();
        setStats(prev => ({
          ...prev,
          totalDocuments: docsData.documents?.length || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchPerformanceData = async () => {
    try {
      const response = await fetch('/api/educator/analytics?timeRange=week');
      if (response.ok) {
        const data = await response.json();
        setPerformanceData({
          averageScore: data.overall?.averageScore || 0,
          passRate: data.overall?.passRate || 0,
          completionRate: data.overall?.completionRate || 0,
          recentActivity: data.timeline || []
        });
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'published') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
          <CheckCircle className="h-3 w-3" />
          Published
        </span>
      );
    } else if (status === 'archived') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
          <Archive className="h-3 w-3" />
          Archived
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
        <Edit3 className="h-3 w-3" />
        Draft
      </span>
    );
  };

  const handleDeleteQuiz = async (quizId: string, quizTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${quizTitle}"? This action cannot be undone for draft quizzes.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/educator/quiz/${quizId}/delete`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        await fetchQuizzes();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting quiz:', error);
      alert('Failed to delete quiz');
    }
  };

  const handleToggleArchive = async (quizId: string, currentStatus: string) => {
    const action = currentStatus === 'archived' ? 'activate' : 'deactivate';
    const confirmMessage = currentStatus === 'archived' 
      ? 'Are you sure you want to activate this quiz? Students will be able to take it again.'
      : 'Are you sure you want to archive this quiz? Students will no longer be able to access it.';

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(`/api/educator/quiz/${quizId}/delete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        await fetchQuizzes();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error toggling archive status:', error);
      alert('Failed to update quiz status');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Educator Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Welcome back, {user?.name}
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/educator/students">
                <Button variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Students
                </Button>
              </Link>
              <Link href="/educator/quiz/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Quiz
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Performance Indicators with Graphs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Performance Overview Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Performance Overview</CardTitle>
                  <CardDescription>Student performance trends this week</CardDescription>
                </div>
                <Link href="/educator/analytics">
                  <Button variant="ghost" size="sm">
                    View Details
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${getScoreColor(performanceData.averageScore)}`}>
                    {performanceData.averageScore.toFixed(1)}%
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Avg Score</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {performanceData.passRate.toFixed(0)}%
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Pass Rate</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {performanceData.completionRate.toFixed(0)}%
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Completion</p>
                </div>
              </div>
              
              {/* Mini Activity Chart */}
              <div className="h-32 flex items-end gap-1">
                {performanceData.recentActivity && performanceData.recentActivity.length > 0 ? (
                  performanceData.recentActivity.map((day, index) => {
                    const maxAttempts = Math.max(...performanceData.recentActivity.map(d => d.attempts || 0), 1);
                    const height = ((day.attempts || 0) / maxAttempts) * 100;
                    const avgScore = day.avgScore || 0;
                    
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div 
                          className="w-full bg-blue-200 dark:bg-blue-800 rounded-t hover:bg-blue-300 transition-colors relative"
                          style={{ height: `${height}%` }}
                          title={`${day.attempts || 0} attempts, ${avgScore.toFixed(0)}% avg score`}
                        >
                          {avgScore > 0 && (
                            <div 
                              className={`absolute inset-x-0 bottom-0 rounded-t ${
                                avgScore >= 70 ? 'bg-green-500' : 'bg-orange-500'
                              }`}
                              style={{ height: `${avgScore}%` }}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                    No activity data yet
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 text-center mt-2">Daily activity (last 7 days)</p>
            </CardContent>
          </Card>

          {/* Quick Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
              <CardDescription>Your educational content</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-8 w-8 text-blue-600 opacity-60" />
                  <div>
                    <p className="text-2xl font-bold">{stats.totalQuizzes}</p>
                    <p className="text-xs text-gray-600">Total Quizzes</p>
                  </div>
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                  {stats.activeQuizzes} active
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-purple-600 opacity-60" />
                  <div>
                    <p className="text-2xl font-bold">{stats.totalStudents}</p>
                    <p className="text-xs text-gray-600">Students</p>
                  </div>
                </div>
                {stats.totalStudents > 0 && (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-orange-600 opacity-60" />
                  <div>
                    <p className="text-2xl font-bold">{stats.totalDocuments}</p>
                    <p className="text-xs text-gray-600">Documents</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link href="/educator/analytics">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-purple-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <BarChart3 className="h-8 w-8 text-purple-600 mb-2" />
                    <h3 className="font-semibold">Performance Analytics</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      View detailed insights
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/educator/documents/upload">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-blue-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Upload className="h-8 w-8 text-blue-600 mb-2" />
                    <h3 className="font-semibold">Upload Document</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Add study materials
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/educator/students">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-green-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Users className="h-8 w-8 text-green-600 mb-2" />
                    <h3 className="font-semibold">Student Management</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Invite & manage students
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Quizzes */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Recent Quizzes</CardTitle>
                <CardDescription>Manage your biblical study quizzes</CardDescription>
              </div>
              <Link href="/educator/quiz/create">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  New Quiz
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {quizzes.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  No quizzes created yet
                </p>
                <Link href="/educator/quiz/create">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Quiz
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {quizzes.slice(0, 5).map((quiz) => (
                  <div
                    key={quiz.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">
                          {quiz.title}
                        </h3>
                        {getStatusBadge(quiz.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          {quiz.totalQuestions} questions
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {quiz.duration} min
                        </span>
                        {quiz.status === 'published' && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {quiz.enrolledStudents} enrolled
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(quiz.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {quiz.status === 'draft' ? (
                        <>
                          <Link href={`/educator/quiz/${quiz.id}/review`}>
                            <Button variant="outline" size="sm">
                              <Edit3 className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteQuiz(quiz.id, quiz.title)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : quiz.status === 'published' ? (
                        <>
                          <Link href={`/educator/quiz/${quiz.id}/results`}>
                            <Button variant="outline" size="sm">
                              <BarChart3 className="h-4 w-4 mr-1" />
                              Results
                            </Button>
                          </Link>
                          <Link href={`/educator/quiz/${quiz.id}/manage`}>
                            <Button variant="ghost" size="sm">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleToggleArchive(quiz.id, quiz.status)}
                            className="text-orange-600 hover:text-orange-700"
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Link href={`/educator/quiz/${quiz.id}/review`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleToggleArchive(quiz.id, quiz.status)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <ArchiveRestore className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {quizzes.length > 5 && (
                  <div className="text-center pt-4">
                    <Link href="/educator/quizzes">
                      <Button variant="outline" size="sm">
                        View All {quizzes.length} Quizzes
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
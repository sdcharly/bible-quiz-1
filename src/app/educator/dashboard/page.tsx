"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { isEducator } from "@/lib/roles";
import { Button } from "@/components/ui/button";
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
  ArchiveRestore
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

export default function EducatorDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ name?: string; email?: string; role?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [stats] = useState({
    totalQuizzes: 0,
    activeQuizzes: 0,
    totalStudents: 0,
    totalDocuments: 0,
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
      await fetchQuizzes();
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
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
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
        await fetchQuizzes(); // Refresh the quiz list
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
        await fetchQuizzes(); // Refresh the quiz list
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error toggling archive status:', error);
      alert('Failed to update quiz status');
    }
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
              <Link href="/educator/documents/upload">
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
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

      {/* Stats Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Quizzes</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.totalQuizzes}
                </p>
              </div>
              <BookOpen className="h-12 w-12 text-blue-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Quizzes</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.activeQuizzes}
                </p>
              </div>
              <Clock className="h-12 w-12 text-green-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Students</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.totalStudents}
                </p>
              </div>
              <Users className="h-12 w-12 text-purple-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Documents</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.totalDocuments}
                </p>
              </div>
              <FileText className="h-12 w-12 text-orange-600 opacity-20" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Quizzes */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Your Quizzes
                  </h2>
                  <Link href="/educator/quiz/create">
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      New Quiz
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="p-6">
                {quizzes.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                      No quizzes created yet. Create your first quiz to get started.
                    </p>
                    <Link href="/educator/quiz/create">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Quiz
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
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {quiz.description || 'No description'}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>{quiz.totalQuestions} questions</span>
                            <span>{quiz.duration} min</span>
                            {quiz.status === 'published' && (
                              <span>{quiz.enrolledStudents} students enrolled</span>
                            )}
                            <span>Created {new Date(quiz.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {quiz.status === 'draft' ? (
                            <>
                              <Link href={`/educator/quiz/${quiz.id}/review`}>
                                <Button variant="ghost" size="sm">
                                  <Edit3 className="h-4 w-4 mr-1" />
                                  Continue Editing
                                </Button>
                              </Link>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDeleteQuiz(quiz.id, quiz.title)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </>
                          ) : quiz.status === 'published' ? (
                            <>
                              <Link href={`/educator/quiz/${quiz.id}/review`}>
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              </Link>
                              <Link href={`/educator/quiz/${quiz.id}/manage`}>
                                <Button variant="ghost" size="sm">
                                  <Settings className="h-4 w-4 mr-1" />
                                  Manage
                                </Button>
                              </Link>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleToggleArchive(quiz.id, quiz.status)}
                                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              >
                                <Archive className="h-4 w-4 mr-1" />
                                Archive
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
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <ArchiveRestore className="h-4 w-4 mr-1" />
                                Activate
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    {quizzes.length > 5 && (
                      <div className="text-center pt-4">
                        <Button variant="ghost" size="sm">
                          View All {quizzes.length} Quizzes
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Recent Activity
                </h2>
                <Link href="/educator/analytics">
                  <Button variant="ghost" size="sm">
                    View Analytics
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No recent activity. Upload documents and create quizzes to see activity here.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/educator/documents">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer">
              <FileText className="h-8 w-8 text-blue-600 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Manage Documents
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Upload and organize your biblical study materials
              </p>
            </div>
          </Link>

          <Link href="/educator/students">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer">
              <Users className="h-8 w-8 text-green-600 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Student Management
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                View and manage enrolled students
              </p>
            </div>
          </Link>

          <Link href="/educator/analytics">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer">
              <BarChart3 className="h-8 w-8 text-purple-600 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Performance Analytics
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Track student performance and quiz statistics
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
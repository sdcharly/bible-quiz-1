"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { isEducator } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateInTimezone } from "@/lib/timezone";
import {
  DocumentTextIcon,
  ChartBarIcon,
  UserGroupIcon,
  ClockIcon,
  ArrowUpTrayIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  EyeIcon,
  Cog6ToothIcon,
  PencilSquareIcon,
  TrashIcon,
  ArchiveBoxIcon,
  ArchiveBoxArrowDownIcon,
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  SparklesIcon
} from "@heroicons/react/24/outline";
import {
  BookOpenIcon as BookOpenSolid
} from "@heroicons/react/24/solid";

interface Quiz {
  id: string;
  title: string;
  description: string;
  status: string;
  totalQuestions: number;
  duration: number;
  enrolledStudents: number;
  createdAt: string;
  startTime: string;
  timezone: string;
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
    totalGroups: 0,
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

      const groupsResponse = await fetch('/api/educator/groups');
      if (groupsResponse.ok) {
        const groupsData = await groupsResponse.json();
        setStats(prev => ({
          ...prev,
          totalGroups: groupsData.groups?.length || 0
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
          <CheckCircleIcon className="h-3 w-3" />
          Active
        </span>
      );
    } else if (status === 'archived') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
          <ArchiveBoxIcon className="h-3 w-3" />
          Resting
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
        <PencilSquareIcon className="h-3 w-3" />
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
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
              <h1 className="text-3xl font-heading font-semibold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">
                Sacred Guide Dashboard
              </h1>
              <p className="text-sm font-body text-gray-600 dark:text-gray-400 mt-1">
                Welcome back, {user?.name}
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/educator/groups">
                <Button variant="outline">
                  <UserGroupIcon className="h-4 w-4 mr-2" />
                  Manage Groups
                </Button>
              </Link>
              <Link href="/educator/students">
                <Button variant="outline">
                  <UserGroupIcon className="h-4 w-4 mr-2" />
                  Guide Disciples
                </Button>
              </Link>
              <Link href="/educator/quiz/create">
                <Button>
                  <SparklesIcon className="h-4 w-4 mr-2" />
                  Create Quest
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Key Performance Indicators with Graphs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Performance Overview Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg font-heading font-semibold text-amber-800 dark:text-amber-300">Wisdom Journey Overview</CardTitle>
                  <CardDescription className="text-sm font-body text-gray-600 dark:text-gray-400">Disciple enlightenment trends this week</CardDescription>
                </div>
                <Link href="/educator/analytics">
                  <Button variant="ghost" size="sm">
                    View Details
                    <ChevronRightIcon className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className={`text-3xl font-heading font-bold ${getScoreColor(performanceData.averageScore)}`}>
                    {performanceData.averageScore.toFixed(1)}%
                  </div>
                  <p className="text-sm font-body text-gray-600 dark:text-gray-400 mt-1">Avg Score</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-heading font-bold text-green-600">
                    {performanceData.passRate.toFixed(0)}%
                  </div>
                  <p className="text-sm font-body text-gray-600 dark:text-gray-400 mt-1">Enlightenment Rate</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-heading font-bold text-amber-600">
                    {performanceData.completionRate.toFixed(0)}%
                  </div>
                  <p className="text-sm font-body text-gray-600 dark:text-gray-400 mt-1">Quest Completion</p>
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
                          className="w-full bg-amber-200 dark:bg-amber-800 rounded-t hover:bg-amber-300 transition-colors relative"
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
              <p className="text-xs font-body text-gray-500 text-center mt-2">Daily activity (last 7 days)</p>
            </CardContent>
          </Card>

          {/* Quick Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-heading font-semibold text-amber-800 dark:text-amber-300">Sacred Statistics</CardTitle>
              <CardDescription className="text-sm font-body text-gray-600 dark:text-gray-400">Your divine teachings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookOpenSolid className="h-8 w-8 text-amber-600 opacity-60" />
                  <div>
                    <p className="text-2xl font-heading font-bold">{stats.totalQuizzes}</p>
                    <p className="text-xs font-body text-gray-600">Total Quests</p>
                  </div>
                </div>
                <span className="text-xs font-body bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                  {stats.activeQuizzes} active
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserGroupIcon className="h-8 w-8 text-orange-600 opacity-60" />
                  <div>
                    <p className="text-2xl font-heading font-bold">{stats.totalStudents}</p>
                    <p className="text-xs font-body text-gray-600">Disciples</p>
                  </div>
                </div>
                {stats.totalStudents > 0 && (
                  <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DocumentTextIcon className="h-8 w-8 text-amber-700 opacity-60" />
                  <div>
                    <p className="text-2xl font-heading font-bold">{stats.totalDocuments}</p>
                    <p className="text-xs font-body text-gray-600">Sacred Scrolls</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserGroupIcon className="h-8 w-8 text-purple-600 opacity-60" />
                  <div>
                    <p className="text-2xl font-heading font-bold">{stats.totalGroups}</p>
                    <p className="text-xs font-body text-gray-600">Student Groups</p>
                  </div>
                </div>
                {stats.totalGroups > 0 && (
                  <Link href="/educator/groups">
                    <ChevronRightIcon className="h-4 w-4 text-purple-600 hover:text-purple-700" />
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Link href="/educator/groups">
            <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-purple-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <UserGroupIcon className="h-8 w-8 text-purple-600 mb-2" />
                    <h3 className="font-heading font-semibold">Student Groups</h3>
                    <p className="text-sm font-body text-gray-600 dark:text-gray-400 mt-1">
                      Organize disciples
                    </p>
                  </div>
                  <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/educator/analytics">
            <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-amber-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <ChartBarIcon className="h-8 w-8 text-amber-600 mb-2" />
                    <h3 className="font-heading font-semibold">Wisdom Analytics</h3>
                    <p className="text-sm font-body text-gray-600 dark:text-gray-400 mt-1">
                      View insights
                    </p>
                  </div>
                  <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/educator/documents/upload">
            <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-orange-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <ArrowUpTrayIcon className="h-8 w-8 text-orange-600 mb-2" />
                    <h3 className="font-heading font-semibold">Upload Sacred Scroll</h3>
                    <p className="text-sm font-body text-gray-600 dark:text-gray-400 mt-1">
                      Add divine materials
                    </p>
                  </div>
                  <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/educator/students">
            <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-green-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <UserGroupIcon className="h-8 w-8 text-green-600 mb-2" />
                    <h3 className="font-heading font-semibold">Disciple Guidance</h3>
                    <p className="text-sm font-body text-gray-600 dark:text-gray-400 mt-1">
                      Invite & guide disciples
                    </p>
                  </div>
                  <ChevronRightIcon className="h-5 w-5 text-gray-400" />
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
                <CardTitle className="text-lg font-heading font-semibold text-amber-800 dark:text-amber-300">Recent Wisdom Quests</CardTitle>
                <CardDescription className="text-sm font-body text-gray-600 dark:text-gray-400">Manage your sacred learning journeys</CardDescription>
              </div>
              <Link href="/educator/quiz/create">
                <Button size="sm">
                  <SparklesIcon className="h-4 w-4 mr-1" />
                  New Quest
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {quizzes.length === 0 ? (
              <div className="text-center py-12">
                <BookOpenSolid className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-sm font-body text-gray-500 dark:text-gray-400 mb-4">
                  No wisdom quests created yet
                </p>
                <Link href="/educator/quiz/create">
                  <Button>
                    <SparklesIcon className="h-4 w-4 mr-2" />
                    Create Your First Quest
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {quizzes.slice(0, 5).map((quiz) => (
                  <div
                    key={quiz.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 border border-transparent hover:border-amber-200 dark:hover:border-amber-800"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-heading font-medium text-gray-900 dark:text-white truncate">
                          {quiz.title}
                        </h3>
                        {getStatusBadge(quiz.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm font-body text-gray-500">
                        <span className="flex items-center gap-1">
                          <BookOpenSolid className="h-3 w-3" />
                          {quiz.totalQuestions} revelations
                        </span>
                        <span className="flex items-center gap-1">
                          <ClockIcon className="h-3 w-3" />
                          {quiz.duration} min
                        </span>
                        {quiz.status === 'published' && (
                          <span className="flex items-center gap-1">
                            <UserGroupIcon className="h-3 w-3" />
                            {quiz.enrolledStudents} disciples
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <CalendarDaysIcon className="h-3 w-3" />
                          {formatDateInTimezone(quiz.startTime || quiz.createdAt, quiz.timezone || 'Asia/Kolkata', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {quiz.status === 'draft' ? (
                        <>
                          <Link href={`/educator/quiz/${quiz.id}/review`}>
                            <Button variant="outline" size="sm">
                              <PencilSquareIcon className="h-4 w-4 mr-1" />
                              Refine
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteQuiz(quiz.id, quiz.title)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </>
                      ) : quiz.status === 'published' ? (
                        <>
                          <Link href={`/educator/quiz/${quiz.id}/results`}>
                            <Button variant="outline" size="sm">
                              <ChartBarIcon className="h-4 w-4 mr-1" />
                              Insights
                            </Button>
                          </Link>
                          <Link href={`/educator/quiz/${quiz.id}/manage`}>
                            <Button variant="ghost" size="sm">
                              <Cog6ToothIcon className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleToggleArchive(quiz.id, quiz.status)}
                            className="text-orange-600 hover:text-orange-700"
                          >
                            <ArchiveBoxIcon className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Link href={`/educator/quiz/${quiz.id}/review`}>
                            <Button variant="ghost" size="sm">
                              <EyeIcon className="h-4 w-4 mr-1" />
                              Behold
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleToggleArchive(quiz.id, quiz.status)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <ArchiveBoxArrowDownIcon className="h-4 w-4" />
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
                        <span className="font-body">View All {quizzes.length} Quests</span>
                        <ChevronRightIcon className="h-4 w-4 ml-1" />
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
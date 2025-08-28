"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { authClient } from "@/lib/auth-client";
import { isEducator } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateInTimezone } from "@/lib/timezone";
import { logger } from "@/lib/logger";
import {
  PageHeader,
  PageContainer,
  Section,
  LoadingState,
  EmptyState
} from "@/components/educator-v2";
import { StatusBadge, StatusCard } from "@/components/ui/status-badge";
import { getStatusGradient } from "@/lib/status-theme";
import {
  DocumentTextIcon,
  ChartBarIcon,
  UserGroupIcon,
  ClockIcon,
  ArrowUpTrayIcon,
  ChevronRightIcon,
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
      logger.error('Error fetching quizzes:', error);
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
      logger.error('Error fetching stats:', error);
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
      logger.error('Error fetching performance data:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    return <StatusBadge type="quiz" status={status} size="sm" />;
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
      logger.error('Error deleting quiz:', error);
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
      logger.error('Error toggling archive status:', error);
      alert('Failed to update quiz status');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-amber-600";
    if (score >= 60) return "text-yellow-600";
    return "text-orange-600";
  };

  if (loading) {
    return <LoadingState fullPage text="Loading your sacred dashboard..." />;
  }

  const headerActions = (
    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
      <Link href="/educator/groups" className="flex-1 sm:flex-none">
        <Button variant="outline" size="sm" className="w-full sm:w-auto border-amber-200 hover:bg-amber-50">
          <UserGroupIcon className="h-4 w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Manage </span>Groups
        </Button>
      </Link>
      <Link href="/educator/students" className="flex-1 sm:flex-none">
        <Button variant="outline" size="sm" className="w-full sm:w-auto border-amber-200 hover:bg-amber-50">
          <UserGroupIcon className="h-4 w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Guide </span>Disciples
        </Button>
      </Link>
      <Link href="/educator/quiz/create" className="flex-1 sm:flex-none">
        <Button size="sm" className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white">
          <SparklesIcon className="h-4 w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Create </span>Quest
        </Button>
      </Link>
    </div>
  );

  return (
    <PageContainer className="bg-gradient-to-b from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800">
      <PageHeader
        title="Sacred Guide Dashboard"
        subtitle={`Welcome back, ${user?.name}`}
        actions={headerActions}
        className="border-b border-amber-100 dark:border-gray-700"
      />

      <div className="space-y-4 sm:space-y-6">
        {/* Key Performance Indicators with Graphs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Performance Overview Card */}
          <Card className="lg:col-span-2 border-amber-100 shadow-sm hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <CardTitle className="text-base sm:text-lg font-semibold text-amber-800 dark:text-amber-300">Wisdom Journey Overview</CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Disciple enlightenment trends this week</CardDescription>
                </div>
                <Link href="/educator/analytics">
                  <Button variant="ghost" size="sm" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50">
                    <span className="hidden sm:inline">View Details</span>
                    <span className="sm:hidden">Details</span>
                    <ChevronRightIcon className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
                <div className="text-center">
                  <div className={`text-xl sm:text-3xl font-bold ${getScoreColor(performanceData.averageScore)}`}>
                    {performanceData.averageScore.toFixed(1)}%
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">Avg Score</p>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-3xl font-bold text-amber-600">
                    {performanceData.passRate.toFixed(0)}%
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">Enlightenment</p>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-3xl font-bold text-amber-600">
                    {performanceData.completionRate.toFixed(0)}%
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">Completion</p>
                </div>
              </div>
              
              {/* Activity Chart or Getting Started Content */}
              {performanceData.recentActivity && performanceData.recentActivity.length > 0 ? (
                <>
                  <div className="h-24 flex items-end gap-1">
                    {performanceData.recentActivity.filter(day => day && day.attempts != null).map((day, index) => {
                      const maxAttempts = Math.max(...performanceData.recentActivity.filter(d => d && d.attempts != null).map(d => d.attempts || 0), 1);
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
                                  avgScore >= 70 ? 'bg-amber-500' : 'bg-orange-500'
                                }`}
                                style={{ height: `${avgScore}%` }}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 text-center mt-2">Daily activity (last 7 days)</p>
                </>
              ) : (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg p-4 space-y-3">
                  <div className="text-center">
                    <SparklesIcon className="h-7 w-7 text-amber-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                      Begin Your Teaching Journey
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
                      Start by creating quizzes to track student progress
                    </p>
                  </div>
                  
                  <div className="flex gap-2 justify-center">
                    <Link href="/educator/quiz/create">
                      <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-4 py-2 h-7">
                        <PencilSquareIcon className="h-3 w-3 mr-1.5" />
                        Create Quiz
                      </Button>
                    </Link>
                    <Link href="/educator/documents/upload">
                      <Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-100 text-xs px-4 py-2 h-7">
                        <ArrowUpTrayIcon className="h-3 w-3 mr-1.5" />
                        Upload Docs
                      </Button>
                    </Link>
                  </div>

                  {stats.totalQuizzes > 0 && (
                    <div className="border-t border-amber-200 pt-3 mt-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500">Your Quizzes:</span>
                        <span className="font-medium text-amber-700">{stats.totalQuizzes} created</span>
                      </div>
                      {stats.activeQuizzes > 0 && (
                        <div className="flex justify-between items-center text-xs mt-1">
                          <span className="text-gray-500">Active:</span>
                          <span className="font-medium text-green-600">{stats.activeQuizzes} published</span>
                        </div>
                      )}
                      <p className="text-xs text-center text-gray-500 mt-2">
                        Activity insights will show once students begin taking quizzes
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats Card */}
          <Card className="border-amber-100 shadow-sm hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg font-semibold text-amber-800 dark:text-amber-300">Sacred Statistics</CardTitle>
              <CardDescription className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Your divine teachings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookOpenSolid className="h-7 w-7 text-amber-600 opacity-60 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.totalQuizzes}</p>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Total Quests</p>
                  </div>
                </div>
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                  {stats.activeQuizzes} active
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserGroupIcon className="h-7 w-7 text-amber-600 opacity-60 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.totalStudents}</p>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Disciples</p>
                  </div>
                </div>
                {stats.totalStudents > 0 ? (
                  <ArrowTrendingUpIcon className="h-4 w-4 text-amber-500" />
                ) : null}
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DocumentTextIcon className="h-7 w-7 text-amber-600 opacity-60 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.totalDocuments}</p>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Sacred Scrolls</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserGroupIcon className="h-7 w-7 text-amber-600 opacity-60 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.totalGroups}</p>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Student Groups</p>
                  </div>
                </div>
                {stats.totalGroups > 0 ? (
                  <Link href="/educator/groups">
                    <ChevronRightIcon className="h-4 w-4 text-amber-600 hover:text-amber-700" />
                  </Link>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <Link href="/educator/groups" className="block">
            <Card className="h-full hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-amber-500 bg-gradient-to-br from-white to-amber-50 dark:from-gray-800 dark:to-amber-900/20">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <UserGroupIcon className="h-6 sm:h-8 w-6 sm:w-8 text-amber-600 mb-2" />
                    <h3 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-white">Student Groups</h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 hidden sm:block">
                      Organize disciples
                    </p>
                  </div>
                  <ChevronRightIcon className="h-4 sm:h-5 w-4 sm:w-5 text-gray-400 hidden sm:block" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/educator/analytics" className="block">
            <Card className="h-full hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-orange-500 bg-gradient-to-br from-white to-orange-50 dark:from-gray-800 dark:to-orange-900/20">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <ChartBarIcon className="h-6 sm:h-8 w-6 sm:w-8 text-orange-600 mb-2" />
                    <h3 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-white">Wisdom Analytics</h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 hidden sm:block">
                      View insights
                    </p>
                  </div>
                  <ChevronRightIcon className="h-4 sm:h-5 w-4 sm:w-5 text-gray-400 hidden sm:block" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/educator/documents/upload" className="block">
            <Card className="h-full hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-amber-700 bg-gradient-to-br from-white to-amber-50 dark:from-gray-800 dark:to-amber-900/20">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <ArrowUpTrayIcon className="h-6 sm:h-8 w-6 sm:w-8 text-amber-700 mb-2" />
                    <h3 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-white">Upload Scroll</h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 hidden sm:block">
                      Add materials
                    </p>
                  </div>
                  <ChevronRightIcon className="h-4 sm:h-5 w-4 sm:w-5 text-gray-400 hidden sm:block" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/educator/students" className="block">
            <Card className="h-full hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-green-500 bg-gradient-to-br from-white to-green-50 dark:from-gray-800 dark:to-green-900/20">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <UserGroupIcon className="h-6 sm:h-8 w-6 sm:w-8 text-amber-600 mb-2" />
                    <h3 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-white">Disciples</h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 hidden sm:block">
                      Invite & guide
                    </p>
                  </div>
                  <ChevronRightIcon className="h-4 sm:h-5 w-4 sm:w-5 text-gray-400 hidden sm:block" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Quizzes */}
        <Section
          title="Recent Wisdom Quests"
          description="Manage your sacred learning journeys"
          actions={
            <Link href="/educator/quiz/create">
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                <SparklesIcon className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">New Quest</span>
                <span className="sm:hidden">New</span>
              </Button>
            </Link>
          }
        >
          {quizzes.length === 0 ? (
            <EmptyState
              icon={BookOpenSolid}
              title="No wisdom quests created yet"
              action={{
                label: "Create Your First Quest",
                href: "/educator/quiz/create"
              }}
            />
          ) : (
            <div className="space-y-3">
              {quizzes.slice(0, 5).map((quiz) => (
                <StatusCard
                  key={quiz.id}
                  type="quiz"
                  status={quiz.status}
                  interactive={true}
                  className="p-3 sm:p-4"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                  <div className="flex-1 min-w-0 mb-2 sm:mb-0 sm:pr-4">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm sm:text-base text-gray-900 dark:text-white truncate">
                        {quiz.title}
                      </h3>
                      {getStatusBadge(quiz.status)}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <BookOpenSolid className="h-3 w-3" />
                        {quiz.totalQuestions} <span className="hidden sm:inline">revelations</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <ClockIcon className="h-3 w-3" />
                        {quiz.duration}m
                      </span>
                      {quiz.status === 'published' ? (
                        <span className="flex items-center gap-1">
                          <UserGroupIcon className="h-3 w-3" />
                          {quiz.enrolledStudents} <span className="hidden sm:inline">disciples</span>
                        </span>
                      ) : null}
                      <span className="flex items-center gap-1 hidden sm:flex">
                        <CalendarDaysIcon className="h-3 w-3" />
                        {formatDateInTimezone(quiz.startTime || quiz.createdAt, quiz.timezone || 'Asia/Kolkata', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 w-full sm:w-auto">
                    {quiz.status === 'draft' ? (
                      <>
                        <Link href={`/educator/quiz/${quiz.id}/review`} className="flex-1 sm:flex-none">
                          <Button variant="outline" size="sm" className="w-full sm:w-auto border-amber-200 hover:bg-amber-50 text-amber-700">
                            <PencilSquareIcon className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">Refine</span>
                            <span className="sm:hidden">Edit</span>
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteQuiz(quiz.id, quiz.title)}
                          className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </>
                    ) : quiz.status === 'published' ? (
                      <>
                        <Link href={`/educator/quiz/${quiz.id}/results`} className="flex-1 sm:flex-none">
                          <Button variant="outline" size="sm" className="w-full sm:w-auto border-amber-200 hover:bg-amber-50 text-amber-700">
                            <ChartBarIcon className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">Insights</span>
                            <span className="sm:hidden">Stats</span>
                          </Button>
                        </Link>
                        <Link href={`/educator/quiz/${quiz.id}/manage`}>
                          <Button variant="ghost" size="sm" className="hover:bg-amber-50">
                            <Cog6ToothIcon className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleToggleArchive(quiz.id, quiz.status)}
                          className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        >
                          <ArchiveBoxIcon className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Link href={`/educator/quiz/${quiz.id}/review`} className="flex-1 sm:flex-none">
                          <Button variant="ghost" size="sm" className="w-full sm:w-auto hover:bg-amber-50">
                            <EyeIcon className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">Behold</span>
                            <span className="sm:hidden">View</span>
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleToggleArchive(quiz.id, quiz.status)}
                          className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        >
                          <ArchiveBoxArrowDownIcon className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                  </div>
                </StatusCard>
              ))}
              {quizzes.length > 5 ? (
                <div className="text-center pt-4">
                  <Link href="/educator/quizzes">
                    <Button variant="outline" size="sm" className="border-amber-200 hover:bg-amber-50 text-amber-700">
                      <span>View All {quizzes.length} Quests</span>
                      <ChevronRightIcon className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              ) : null}
            </div>
          )}
        </Section>
      </div>
    </PageContainer>
  );
}
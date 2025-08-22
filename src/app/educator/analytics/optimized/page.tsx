"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  BarChart3,
  Trophy,
  Clock,
  CheckCircle,
  Users,
  Target,
  Download,
  RefreshCw,
} from "lucide-react";
import { useWebSocket } from "@/lib/websocket";
import { logger } from "@/lib/logger";

// Lazy load heavy components for code splitting
const AnalyticsStudentList = lazy(() => import("@/components/analytics/AnalyticsStudentList"));
const QuizPerformanceTable = lazy(() => import("@/components/analytics/QuizPerformanceTable"));
const TopicAnalysis = lazy(() => import("@/components/analytics/TopicAnalysis"));
const PerformanceTrend = lazy(() => import("@/components/analytics/PerformanceTrend"));

interface OverallStats {
  totalStudents: number;
  totalQuizzes: number;
  totalAttempts: number;
  averageScore: number;
  passRate: number;
  completionRate: number;
  averageTimePerQuiz: number;
  mostDifficultTopic: string;
  easiestTopic: string;
}

export default function OptimizedAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "quizzes" | "students" | "topics">("overview");
  const [timeRange, setTimeRange] = useState<"week" | "month" | "all">("month");
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>({});
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use WebSocket for real-time updates
  useWebSocket('analytics_update', (message) => {
    logger.debug('Received analytics update:', message);
    if (message.data.educatorId === analyticsData.educatorId) {
      // Merge updates with existing data
      setAnalyticsData(prev => ({
        ...prev,
        ...message.data.updates,
      }));
      setLastUpdated(new Date(message.timestamp));
    }
  }, [analyticsData.educatorId]);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async (forceRefresh = false) => {
    try {
      setIsRefreshing(forceRefresh);
      
      // Use optimized endpoint with caching
      const url = new URL('/api/educator/analytics/optimized', window.location.origin);
      url.searchParams.set('timeRange', timeRange);
      url.searchParams.set('dataType', activeTab === 'overview' ? 'all' : activeTab);
      
      if (forceRefresh) {
        url.searchParams.set('refresh', 'true');
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setOverallStats(data.overall);
        setAnalyticsData(data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      logger.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchAnalytics(true);
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/educator/analytics/export?timeRange=${timeRange}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
      }
    } catch (error) {
      logger.error("Error exporting analytics:", error);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-blue-600";
    if (score >= 70) return "text-yellow-600";
    if (score >= 60) return "text-orange-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Link href="/educator/dashboard">
                <Button variant="ghost" size="sm" className="mr-4">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Performance Analytics
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as "week" | "month" | "all")}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
              >
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="all">All Time</option>
              </select>
              <Button 
                variant="outline" 
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Average Score</p>
                  <p className={`text-3xl font-bold ${getScoreColor(overallStats?.averageScore || 0)}`}>
                    {overallStats?.averageScore.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Across all quizzes
                  </p>
                </div>
                <Trophy className="h-10 w-10 text-yellow-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pass Rate</p>
                  <p className="text-3xl font-bold text-green-600">
                    {overallStats?.passRate.toFixed(0)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    ≥70% score
                  </p>
                </div>
                <CheckCircle className="h-10 w-10 text-green-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {overallStats?.completionRate.toFixed(0)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Quizzes finished
                  </p>
                </div>
                <Target className="h-10 w-10 text-blue-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Attempts</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {overallStats?.totalAttempts || 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    By {overallStats?.totalStudents || 0} students
                  </p>
                </div>
                <Users className="h-10 w-10 text-purple-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
          <div className="border-b dark:border-gray-700">
            <div className="flex">
              {["overview", "quizzes", "students", "topics"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab as any);
                    if (tab !== "overview") {
                      // Fetch specific data when switching tabs
                      fetchAnalytics();
                    }
                  }}
                  className={`px-6 py-3 font-medium capitalize ${
                    activeTab === tab
                      ? "border-b-2 border-blue-500 text-blue-600"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Content with Code Splitting */}
        <Suspense fallback={
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        }>
          {activeTab === "overview" && analyticsData.timeline && (
            <div className="space-y-6">
              <PerformanceTrend data={analyticsData.timeline} />
              {/* Add more overview components */}
            </div>
          )}

          {activeTab === "students" && analyticsData.students && (
            <Card>
              <CardHeader>
                <CardTitle>Student Progress Tracking</CardTitle>
                <CardDescription>
                  Individual student performance and trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AnalyticsStudentList students={analyticsData.students} />
              </CardContent>
            </Card>
          )}

          {activeTab === "quizzes" && analyticsData.quizzes && (
            <QuizPerformanceTable quizzes={analyticsData.quizzes} />
          )}

          {activeTab === "topics" && analyticsData.topics && (
            <TopicAnalysis topics={analyticsData.topics} />
          )}
        </Suspense>
      </div>
    </div>
  );
}
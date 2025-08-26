"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PageHeader,
  PageContainer,
  Section,
  LoadingState
} from "@/components/educator-v2";
import {
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
  const [analyticsData, setAnalyticsData] = useState<Record<string, unknown>>({});
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use WebSocket for real-time updates
  useWebSocket('analytics_update', (message) => {
    logger.debug('Received analytics update:', message);
    const data = message.data as { educatorId?: string; updates?: Record<string, unknown> };
    if (data.educatorId === (analyticsData.educatorId as string)) {
      // Merge updates with existing data
      setAnalyticsData(prev => ({
        ...prev,
        ...(data.updates || {}),
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
    if (score >= 90) return "text-amber-600";
    if (score >= 80) return "text-amber-500";
    if (score >= 70) return "text-yellow-600";
    if (score >= 60) return "text-orange-600";
    return "text-orange-700";
  };

  if (loading) {
    return <LoadingState fullPage text="Loading analytics..." />;
  }

  return (
    <>
      <PageHeader
        title="Performance Analytics"
        subtitle={`Last updated: ${lastUpdated.toLocaleTimeString()}`}
        icon={BarChart3}
        breadcrumbs={[
          { label: 'Educator', href: '/educator/dashboard' },
          { label: 'Analytics' }
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={(value) => setTimeRange(value as "week" | "month" | "all")}>
              <SelectTrigger className="w-[140px] border-amber-200 dark:border-amber-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="border-amber-200 hover:bg-amber-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              onClick={handleExport}
              className="border-amber-200 hover:bg-amber-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        }
      />

      <PageContainer>
        <Section transparent>
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
                  <p className="text-3xl font-bold text-amber-600">
                    {overallStats?.passRate.toFixed(0)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    ≥70% score
                  </p>
                </div>
                <CheckCircle className="h-10 w-10 text-amber-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</p>
                  <p className="text-3xl font-bold text-amber-600">
                    {overallStats?.completionRate.toFixed(0)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Quizzes finished
                  </p>
                </div>
                <Target className="h-10 w-10 text-amber-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Attempts</p>
                  <p className="text-3xl font-bold text-amber-700">
                    {overallStats?.totalAttempts || 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    By {overallStats?.totalStudents || 0} students
                  </p>
                </div>
                <Users className="h-10 w-10 text-amber-700 opacity-20" />
              </div>
            </CardContent>
          </Card>
          </div>

          {/* Tabs */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 border border-amber-100">
          <div className="border-b dark:border-gray-700">
            <div className="flex">
              {["overview", "quizzes", "students", "topics"].map((tab) => (
                <Button
                  key={tab}
                  variant="ghost"
                  onClick={() => {
                    setActiveTab(tab as "overview" | "quizzes" | "students" | "topics");
                    if (tab !== "overview") {
                      // Fetch specific data when switching tabs
                      fetchAnalytics();
                    }
                  }}
                  className={`px-6 py-3 font-medium capitalize rounded-none ${
                    activeTab === tab
                      ? "border-b-2 border-amber-500 text-amber-600 hover:text-amber-700"
                      : "text-gray-600 dark:text-gray-400 hover:text-amber-600 hover:bg-transparent"
                  }`}
                >
                  {tab}
                </Button>
              ))}
            </div>
          </div>
        </div>

          {/* Tab Content with Code Splitting */}
          <Suspense fallback={
            <LoadingState inline size="md" text="Loading..." />
          }>
          <>
            {activeTab === "overview" && analyticsData.timeline && (
              <div className="space-y-6">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <PerformanceTrend data={analyticsData.timeline as any[]} />
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
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <AnalyticsStudentList students={analyticsData.students as any[]} />
                </CardContent>
              </Card>
            )}

            {activeTab === "quizzes" && analyticsData.quizzes && (
              /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
              <QuizPerformanceTable quizzes={analyticsData.quizzes as any[]} />
            )}

            {activeTab === "topics" && analyticsData.topics && (
              /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
              <TopicAnalysis topics={analyticsData.topics as any[]} />
            )}
          </>
          </Suspense>
        </Section>
      </PageContainer>
    </>
  );
}
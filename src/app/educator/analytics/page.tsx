"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { logger } from "@/lib/logger";
import { formatDateInTimezone } from "@/lib/timezone";
import {
  PageHeader,
  PageContainer,
  Section,
  LoadingState,
  TabNavigation,
  EmptyState
} from "@/components/educator-v2";
import {
  BarChart3,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Users,
  Trophy,
  CheckCircle,
  AlertTriangle,
  Target,
  Brain,
  Award,
  Download,
  RefreshCw,
  PlusCircle,
  FileText,
  Calendar
} from "lucide-react";

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

interface QuizPerformance {
  quizId: string;
  quizTitle: string;
  attempts: number;
  averageScore: number;
  passRate: number;
  averageTime: number;
  highestScore: number;
  lowestScore: number;
}

interface StudentPerformance {
  studentId: string;
  studentName: string;
  studentEmail: string;
  quizzesAttempted: number;
  quizzesCompleted: number;
  averageScore: number;
  totalTimeSpent: number;
  lastActivity: string;
  trend: "up" | "down" | "stable";
}

interface TopicPerformance {
  topic: string;
  totalQuestions: number;
  correctAnswers: number;
  averageScore: number;
  attempts: number;
}

interface TimelineData {
  date: string;
  attempts: number;
  averageScore: number;
}

export default function EducatorAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "quizzes" | "students" | "topics">("overview");
  const [timeRange, setTimeRange] = useState<"week" | "month" | "all">("month");
  
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [quizPerformance, setQuizPerformance] = useState<QuizPerformance[]>([]);
  const [studentPerformance, setStudentPerformance] = useState<StudentPerformance[]>([]);
  const [topicPerformance, setTopicPerformance] = useState<TopicPerformance[]>([]);
  const [timelineData, setTimelineData] = useState<TimelineData[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      }
      setError(null);
      
      const response = await fetch(`/api/educator/analytics?timeRange=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setOverallStats(data.overall);
        setQuizPerformance(data.quizzes || []);
        setStudentPerformance(data.students || []);
        setTopicPerformance(data.topics || []);
        setTimelineData(data.timeline || []);
      } else {
        throw new Error(`Failed to fetch analytics: ${response.status}`);
      }
    } catch (error) {
      logger.error("Error fetching analytics:", error);
      setError("Failed to load analytics data. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchAnalytics(true);
  };

  const handleExportReport = async () => {
    try {
      const data = {
        timeRange,
        overallStats,
        quizPerformance,
        studentPerformance,
        topicPerformance,
        generatedAt: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-report-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error("Error exporting report:", error);
      alert("Failed to export report. Please try again.");
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDateInTimezone(dateString, 'short');
    } catch {
      return new Date(dateString).toLocaleDateString();
    }
  };

  const formatRelativeDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffInHours < 1) return "Less than an hour ago";
      if (diffInHours < 24) return `${diffInHours} hours ago`;
      if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} days ago`;
      return formatDate(dateString);
    } catch {
      return "Unknown";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-amber-600";
    if (score >= 80) return "text-amber-500";
    if (score >= 70) return "text-yellow-600";
    if (score >= 60) return "text-orange-600";
    return "text-orange-700";
  };

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    if (trend === "up") return <TrendingUp className="h-4 w-4 text-amber-500" />;
    if (trend === "down") return <TrendingDown className="h-4 w-4 text-orange-600" />;
    return <div className="h-4 w-4 bg-gray-400 rounded-full" />;
  };

  if (loading) {
    return <LoadingState fullPage text="Loading analytics..." />;
  }

  if (error) {
    return (
      <PageContainer>
        <EmptyState
          icon={AlertTriangle}
          title="Unable to Load Analytics"
          description={error}
          action={{
            label: "Try Again",
            onClick: () => fetchAnalytics()
          }}
        />
      </PageContainer>
    );
  }

  return (
    <>
      <PageHeader
        title="Performance Analytics"
        subtitle="Track student progress and quiz performance"
        icon={BarChart3}
        breadcrumbs={[
          { label: 'Educator', href: '/educator/dashboard' },
          { label: 'Analytics' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={(value) => setTimeRange(value as "week" | "month" | "all")}>
              <SelectTrigger className="w-[140px] border-amber-200 dark:border-amber-600 focus:ring-amber-500">
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
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="border-amber-200 hover:bg-amber-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={handleExportReport}
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
          {/* No Data State */}
          {overallStats && overallStats.totalQuizzes === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={BarChart3}
                title="No Analytics Data Yet"
                description="Create your first quiz and invite students to start seeing analytics insights"
                action={{
                  label: "Create Your First Quiz",
                  onClick: () => router.push('/educator/quiz/create')
                }}
              />
            </div>
          ) : (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Average Score</p>
                  <p className={`text-2xl font-bold ${getScoreColor(overallStats?.averageScore || 0)}`}>
                    {overallStats?.averageScore.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Across all quizzes
                  </p>
                </div>
                <Trophy className="h-8 w-8 text-amber-600 opacity-20" />
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Pass Rate</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {overallStats?.passRate.toFixed(0)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    ≥70% score
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-amber-600 opacity-20" />
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Completion Rate</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {overallStats?.completionRate.toFixed(0)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Quizzes finished
                  </p>
                </div>
                <Target className="h-8 w-8 text-amber-600 opacity-20" />
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Total Attempts</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {overallStats?.totalAttempts || 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    By {overallStats?.totalStudents || 0} students
                  </p>
                </div>
                <Users className="h-8 w-8 text-amber-600 opacity-20" />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <TabNavigation
            tabs={[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'quizzes', label: 'Quizzes', icon: BookOpen },
              { id: 'students', label: 'Students', icon: Users },
              { id: 'topics', label: 'Topics', icon: Brain }
            ]}
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab as "overview" | "quizzes" | "students" | "topics")}
          />

          {/* Tab Content */}
          {activeTab === "overview" ? (
            <div className="space-y-6">
              {/* Timeline Chart */}
              <Card className="border-amber-100">
                <CardHeader>
                  <CardTitle>Activity Timeline</CardTitle>
                  <CardDescription>
                    Quiz attempts and scores over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {timelineData.length > 0 ? (
                    <div className="h-64">
                      <div className="flex items-end justify-between gap-3 h-48 mb-4">
                        {timelineData.filter(d => d && d.averageScore != null && d.attempts != null).map((data, index) => {
                          const maxScore = Math.max(...timelineData.filter(d => d && d.averageScore != null).map(d => d.averageScore), 1);
                          const height = Math.max((data.averageScore / maxScore) * 180, 4); // Minimum 4px height
                          const maxAttempts = Math.max(...timelineData.filter(d => d && d.attempts != null).map(d => d.attempts), 1);
                          const attemptsRatio = data.attempts / maxAttempts;
                          
                          return (
                            <div key={index} className="flex-1 flex flex-col items-center group relative">
                              <div 
                                className="w-full bg-gradient-to-t from-amber-300 to-amber-500 rounded-t hover:from-amber-400 hover:to-amber-600 transition-colors cursor-pointer"
                                style={{ height: `${height}px` }}
                                title={`${data.attempts} attempts, ${data.averageScore.toFixed(1)}% avg score`}
                              >
                                {/* Score indicator overlay */}
                                <div 
                                  className="w-full bg-gradient-to-t from-orange-400 to-orange-600 rounded-t opacity-60"
                                  style={{ height: `${Math.min(attemptsRatio * 100, 100)}%` }}
                                />
                              </div>
                              
                              {/* Tooltip on hover */}
                              <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                                <div>{data.attempts} attempts</div>
                                <div>{data.averageScore.toFixed(1)}% avg</div>
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Date labels */}
                      <div className="flex justify-between text-xs text-gray-600">
                        {timelineData.filter(d => d && d.date).map((data, index) => (
                          <span key={index} className="flex-1 text-center">
                            {formatDate(data.date)}
                          </span>
                        ))}
                      </div>
                      
                      {/* Chart legend */}
                      <div className="flex justify-center gap-6 mt-4 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-gradient-to-t from-amber-300 to-amber-500 rounded"></div>
                          <span>Score Trend</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-gradient-to-t from-orange-400 to-orange-600 rounded opacity-60"></div>
                          <span>Activity Volume</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <EmptyState
                      icon={BarChart3}
                      title="No Activity Data"
                      description="Activity insights will appear here once students start taking quizzes"
                      action={{
                        label: "View Quizzes",
                        onClick: () => router.push('/educator/quizzes')
                      }}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Topic Performance */}
              <Card className="border-amber-100">
                <CardHeader>
                  <CardTitle>Topic Insights</CardTitle>
                  <CardDescription>
                    Performance breakdown by biblical topics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Most Difficult Topic</p>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        <span className="font-medium">{overallStats?.mostDifficultTopic || "N/A"}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Easiest Topic</p>
                      <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-amber-500" />
                        <span className="font-medium">{overallStats?.easiestTopic || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {activeTab === "quizzes" ? (
            <Card className="border-amber-100">
              <CardHeader>
                <CardTitle>Quiz Performance</CardTitle>
                <CardDescription>
                  Individual quiz statistics and trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4">Quiz Title</th>
                        <th className="text-center py-2 px-4">Attempts</th>
                        <th className="text-center py-2 px-4">Avg Score</th>
                        <th className="text-center py-2 px-4">Pass Rate</th>
                        <th className="text-center py-2 px-4">Avg Time</th>
                        <th className="text-right py-2 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quizPerformance.map((quiz) => (
                        <tr key={quiz.quizId} className="border-b hover:bg-amber-50">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium">{quiz.quizTitle}</p>
                              <p className="text-xs text-gray-500">
                                High: {quiz.highestScore}% | Low: {quiz.lowestScore}%
                              </p>
                            </div>
                          </td>
                          <td className="text-center py-3 px-4">{quiz.attempts}</td>
                          <td className="text-center py-3 px-4">
                            <span className={getScoreColor(quiz.averageScore)}>
                              {quiz.averageScore.toFixed(1)}%
                            </span>
                          </td>
                          <td className="text-center py-3 px-4">
                            <span className={quiz.passRate >= 70 ? "text-amber-600" : "text-orange-600"}>
                              {quiz.passRate.toFixed(0)}%
                            </span>
                          </td>
                          <td className="text-center py-3 px-4">{formatTime(quiz.averageTime)}</td>
                          <td className="text-right py-3 px-4">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => router.push(`/educator/quiz/${quiz.quizId}/results`)}
                              className="text-amber-600 hover:text-amber-700"
                            >
                              View Details
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {quizPerformance.length === 0 && (
                    <div className="py-12">
                      <EmptyState
                        icon={BookOpen}
                        title="No Quiz Performance Data"
                        description="Create and publish quizzes to see detailed performance analytics here"
                        action={{
                          label: "Create Your First Quiz",
                          onClick: () => router.push('/educator/quiz/create')
                        }}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {activeTab === "students" ? (
            <Card className="border-amber-100">
              <CardHeader>
                <CardTitle>Student Progress</CardTitle>
                <CardDescription>
                  Individual student performance tracking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4">Student</th>
                        <th className="text-center py-2 px-4">Quizzes</th>
                        <th className="text-center py-2 px-4">Avg Score</th>
                        <th className="text-center py-2 px-4">Time Spent</th>
                        <th className="text-center py-2 px-4">Last Activity</th>
                        <th className="text-center py-2 px-4">Trend</th>
                        <th className="text-right py-2 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentPerformance.map((student) => (
                        <tr key={student.studentId} className="border-b hover:bg-amber-50">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium">{student.studentName}</p>
                              <p className="text-xs text-gray-500">{student.studentEmail}</p>
                            </div>
                          </td>
                          <td className="text-center py-3 px-4">
                            {student.quizzesCompleted}/{student.quizzesAttempted}
                          </td>
                          <td className="text-center py-3 px-4">
                            <span className={getScoreColor(student.averageScore)}>
                              {student.averageScore.toFixed(1)}%
                            </span>
                          </td>
                          <td className="text-center py-3 px-4">
                            {formatTime(student.totalTimeSpent)}
                          </td>
                          <td className="text-center py-3 px-4 text-xs text-gray-600">
                            {formatRelativeDate(student.lastActivity)}
                          </td>
                          <td className="text-center py-3 px-4">
                            {getTrendIcon(student.trend)}
                          </td>
                          <td className="text-right py-3 px-4">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => router.push(`/educator/students/${student.studentId}`)}
                              className="text-amber-600 hover:text-amber-700"
                            >
                              View Profile
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {studentPerformance.length === 0 && (
                    <div className="py-12">
                      <EmptyState
                        icon={Users}
                        title="No Student Activity"
                        description="Invite students to your quizzes to track their progress and performance"
                        action={{
                          label: "Manage Students",
                          onClick: () => router.push('/educator/students')
                        }}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {activeTab === "topics" ? (
            <Card className="border-amber-100">
              <CardHeader>
                <CardTitle>Topic Analysis</CardTitle>
                <CardDescription>
                  Performance breakdown by biblical topics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topicPerformance.map((topic) => (
                    <div key={topic.topic} className="border-b pb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium flex items-center gap-2">
                          <Brain className="h-4 w-4 text-amber-600" />
                          {topic.topic}
                        </h4>
                        <span className={`font-bold ${getScoreColor(topic.averageScore)}`}>
                          {topic.averageScore.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{topic.totalQuestions} questions</span>
                        <span>{topic.correctAnswers} correct</span>
                        <span>{topic.attempts} attempts</span>
                      </div>
                      <div className="mt-2 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-amber-500 h-2 rounded-full"
                          style={{ width: `${topic.averageScore}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {topicPerformance.length === 0 && (
                    <div className="py-12">
                      <EmptyState
                        icon={Brain}
                        title="No Topic Analysis Available"
                        description="Topic performance data will appear as students complete quizzes with categorized questions"
                        action={{
                          label: "Review Questions",
                          onClick: () => router.push('/educator/quizzes')
                        }}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}
            </>
          )}
        </Section>
      </PageContainer>
    </>
  );
}
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { logger } from "@/lib/logger";
import { 
  PageHeader,
  PageContainer,
  Section,
  LoadingState,
  TabNavigation
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

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/educator/analytics?timeRange=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setOverallStats(data.overall);
        setQuizPerformance(data.quizzes);
        setStudentPerformance(data.students);
        setTopicPerformance(data.topics);
        setTimelineData(data.timeline);
      }
    } catch (error) {
      logger.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
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
              className="border-amber-200 hover:bg-amber-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        }
      />

      <PageContainer>
        <Section transparent>
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
                    <div className="h-64 flex items-end justify-between gap-2">
                      {timelineData.map((data, index) => (
                        <div key={index} className="flex-1 flex flex-col items-center">
                          <div className="w-full bg-amber-200 rounded-t" 
                               style={{ height: `${(data.averageScore / 100) * 200}px` }}>
                          </div>
                          <p className="text-xs mt-2 text-gray-600">{data.date}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No data available for this time range</p>
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
                  {quizPerformance.length === 0 ? (
                    <p className="text-center py-8 text-gray-500">No quiz data available</p>
                  ) : null}
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
                  {studentPerformance.length === 0 ? (
                    <p className="text-center py-8 text-gray-500">No student data available</p>
                  ) : null}
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
                  {topicPerformance.length === 0 ? (
                    <p className="text-center py-8 text-gray-500">No topic data available</p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </Section>
      </PageContainer>
    </>
  );
}
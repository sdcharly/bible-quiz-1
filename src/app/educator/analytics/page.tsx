"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  BookOpen,
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
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-blue-600";
    if (score >= 70) return "text-yellow-600";
    if (score >= 60) return "text-orange-600";
    return "text-red-600";
  };

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    if (trend === "up") return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <div className="h-4 w-4 bg-gray-400 rounded-full" />;
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
                  Track student progress and quiz performance
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as "week" | "month" | "all")}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="all">All Time</option>
              </select>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Report
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
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-6 py-3 font-medium ${
                  activeTab === "overview"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                <BarChart3 className="h-4 w-4 inline mr-2" />
                Overview
              </button>
              <button
                onClick={() => setActiveTab("quizzes")}
                className={`px-6 py-3 font-medium ${
                  activeTab === "quizzes"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                <BookOpen className="h-4 w-4 inline mr-2" />
                Quiz Performance
              </button>
              <button
                onClick={() => setActiveTab("students")}
                className={`px-6 py-3 font-medium ${
                  activeTab === "students"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                <Users className="h-4 w-4 inline mr-2" />
                Student Progress
              </button>
              <button
                onClick={() => setActiveTab("topics")}
                className={`px-6 py-3 font-medium ${
                  activeTab === "topics"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                <Brain className="h-4 w-4 inline mr-2" />
                Topic Analysis
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Performance Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Trend</CardTitle>
                <CardDescription>
                  Average scores and attempts over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end gap-2">
                  {timelineData.map((data, index) => {
                    const maxAttempts = Math.max(...timelineData.map(d => d.attempts));
                    const heightPercentage = (data.attempts / maxAttempts) * 100;
                    
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-t relative" 
                             style={{ height: `${heightPercentage}%` }}>
                          <div className={`absolute inset-x-0 bottom-0 rounded-t ${
                            data.averageScore >= 70 ? "bg-green-500" : "bg-red-500"
                          }`} 
                               style={{ height: `${data.averageScore}%` }} />
                        </div>
                        <p className="text-xs text-gray-500 mt-2 rotate-45 origin-left">
                          {new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-center gap-8 mt-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded" />
                    <span className="text-sm text-gray-600">Total Attempts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded" />
                    <span className="text-sm text-gray-600">Pass (≥70%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded" />
                    <span className="text-sm text-gray-600">Fail (&lt;70%)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Areas Needing Attention
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Most Difficult Topic</span>
                      <span className="font-medium text-red-600">
                        {overallStats?.mostDifficultTopic || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Students Below 70%</span>
                      <span className="font-medium text-orange-600">
                        {studentPerformance.filter(s => s.averageScore < 70).length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Low Completion Quizzes</span>
                      <span className="font-medium text-yellow-600">
                        {quizPerformance.filter(q => (q.attempts / (overallStats?.totalStudents || 1)) < 0.5).length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-green-500" />
                    Top Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Easiest Topic</span>
                      <span className="font-medium text-green-600">
                        {overallStats?.easiestTopic || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Top Performers</span>
                      <span className="font-medium text-green-600">
                        {studentPerformance.filter(s => s.averageScore >= 90).length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Perfect Scores</span>
                      <span className="font-medium text-green-600">
                        {quizPerformance.reduce((sum, q) => sum + (q.highestScore === 100 ? 1 : 0), 0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "quizzes" && (
          <Card>
            <CardHeader>
              <CardTitle>Quiz Performance Analysis</CardTitle>
              <CardDescription>
                Detailed performance metrics for each quiz
              </CardDescription>
            </CardHeader>
            <CardContent>
              {quizPerformance.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No quiz data available for this period</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Quiz Title
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Attempts
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Avg Score
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Pass Rate
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Avg Time
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Score Range
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-gray-700">
                      {quizPerformance.map((quiz) => (
                        <tr key={quiz.quizId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-4">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {quiz.quizTitle}
                            </p>
                          </td>
                          <td className="px-4 py-4 text-center">
                            {quiz.attempts}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`font-medium ${getScoreColor(quiz.averageScore)}`}>
                              {quiz.averageScore.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`font-medium ${quiz.passRate >= 70 ? "text-green-600" : "text-red-600"}`}>
                              {quiz.passRate.toFixed(0)}%
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            {formatTime(quiz.averageTime)}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="text-sm">
                              {quiz.lowestScore}% - {quiz.highestScore}%
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <Link href={`/educator/quiz/${quiz.quizId}/results`}>
                              <Button variant="ghost" size="sm">
                                View Details
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "students" && (
          <Card>
            <CardHeader>
              <CardTitle>Student Progress Tracking</CardTitle>
              <CardDescription>
                Individual student performance and trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              {studentPerformance.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No student data available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {studentPerformance.map((student) => (
                    <div
                      key={student.studentId}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {student.studentName}
                          </h4>
                          {getTrendIcon(student.trend)}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {student.studentEmail}
                        </p>
                        <div className="flex items-center gap-6 mt-2 text-sm">
                          <span>
                            Completed: {student.quizzesCompleted}/{student.quizzesAttempted}
                          </span>
                          <span className={`font-medium ${getScoreColor(student.averageScore)}`}>
                            Avg: {student.averageScore.toFixed(1)}%
                          </span>
                          <span>
                            Time: {formatTime(student.totalTimeSpent)}
                          </span>
                          <span className="text-gray-500">
                            Last active: {student.lastActivity 
                              ? new Date(student.lastActivity).toLocaleDateString()
                              : "Never"
                            }
                          </span>
                        </div>
                      </div>
                      <Link href={`/educator/students/${student.studentId}`}>
                        <Button variant="outline" size="sm">
                          View Profile
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "topics" && (
          <Card>
            <CardHeader>
              <CardTitle>Topic Performance Breakdown</CardTitle>
              <CardDescription>
                Understanding strengths and weaknesses by topic
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topicPerformance.length === 0 ? (
                <div className="text-center py-8">
                  <Brain className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No topic data available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {topicPerformance
                    .sort((a, b) => b.averageScore - a.averageScore)
                    .map((topic) => (
                      <div key={topic.topic} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{topic.topic}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-600">
                              {topic.correctAnswers}/{topic.totalQuestions} correct
                            </span>
                            <span className={`font-medium ${getScoreColor(topic.averageScore)}`}>
                              {topic.averageScore.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              topic.averageScore >= 80 ? "bg-green-600" :
                              topic.averageScore >= 60 ? "bg-yellow-600" : "bg-red-600"
                            }`}
                            style={{ width: `${topic.averageScore}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500">
                          {topic.attempts} attempts across all students
                        </p>
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
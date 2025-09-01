"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger } from "@/lib/logger";
import { fetchWithOptimizedCache } from "@/lib/api-cache";
import { withErrorBoundary } from "@/components/student/StudentPageWrapper";
import {
  PageContainer,
  PageHeader,
  Section,
  LoadingState
} from "@/components/student-v2";
import ProgressInsights from "@/components/student-v2/ProgressInsights";
import {
  Trophy, 
  BookOpen, 
  Clock, 
  CheckCircle,
  Target,
  Award,
  BarChart3,
  TrendingUp,
  Brain
} from "lucide-react";

interface ProgressStats {
  totalQuizzes: number;
  completedQuizzes: number;
  averageScore: number;
  totalTimeSpent: number;
  bestScore: number;
  recentStreak: number;
}

function StudentProgressPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ProgressStats>({
    totalQuizzes: 0,
    completedQuizzes: 0,
    averageScore: 0,
    totalTimeSpent: 0,
    bestScore: 0,
    recentStreak: 0
  });

  useEffect(() => {
    fetchProgressData();
  }, []);

  const fetchProgressData = async () => {
    try {
      const statsResult = await fetchWithOptimizedCache('/api/student/progress/stats', { ttl: 120 }); // 2 min cache
      
      if (statsResult.data) {
        setStats(statsResult.data);
      }
    } catch (error) {
      logger.error('Error fetching progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const completionRate = useMemo(() => {
    return stats.totalQuizzes > 0 
      ? Math.round((stats.completedQuizzes / stats.totalQuizzes) * 100)
      : 0;
  }, [stats.totalQuizzes, stats.completedQuizzes]);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes}m`;
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingState text="Loading your progress..." fullPage />
      </PageContainer>
    );
  }

  // Calculate unlocked achievements count
  const unlockedCount = [
    stats.completedQuizzes >= 1,
    stats.bestScore >= 100,
    stats.completedQuizzes >= 5,
    stats.recentStreak >= 7,
    stats.averageScore >= 80,
    stats.completedQuizzes >= 10
  ].filter(Boolean).length;

  return (
    <PageContainer>
      <PageHeader
        title="Learning Progress"
        subtitle="Track your biblical knowledge journey with advanced analytics"
        breadcrumbs={[
          { label: "Progress" }
        ]}
        actions={
          <Link href="/student/dashboard">
            <Button variant="outline">
              Back to Dashboard
            </Button>
          </Link>
        }
      />

      {/* Tabbed Content */}
      <Section className="mt-6">
        <Tabs defaultValue="insights" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="insights">
              <Brain className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="summary">
              <BarChart3 className="h-4 w-4 mr-2" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="achievements">
              <Award className="h-4 w-4 mr-2" />
              Achievements
            </TabsTrigger>
          </TabsList>

          {/* Learning Analytics Tab - Main focus with advanced insights */}
          <TabsContent value="insights">
            <ProgressInsights />
          </TabsContent>

          {/* Summary Tab - High-level progress overview */}
          <TabsContent value="summary">
            <div className="space-y-6">
              {/* Progress Summary */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100 dark:border-amber-900/20 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                  Learning Summary
                </h3>
                
                {/* Completion Progress */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Overall Progress
                    </span>
                    <span className="text-sm text-amber-600 dark:text-amber-400 font-semibold">
                      {completionRate}%
                    </span>
                  </div>
                  <Progress value={completionRate} className="h-3 mb-2" />
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {stats.completedQuizzes} of {stats.totalQuizzes} quizzes completed
                  </p>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-amber-50 dark:bg-amber-900/10 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="h-4 w-4 text-amber-600" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">Average</span>
                    </div>
                    <div className="text-xl font-bold text-amber-600">{stats.averageScore}%</div>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/10 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy className="h-4 w-4 text-amber-600" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">Best</span>
                    </div>
                    <div className="text-xl font-bold text-amber-600">{stats.bestScore}%</div>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/10 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-amber-600" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">Time</span>
                    </div>
                    <div className="text-xl font-bold text-amber-600">{formatTime(stats.totalTimeSpent)}</div>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/10 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-amber-600" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">Streak</span>
                    </div>
                    <div className="text-xl font-bold text-amber-600">{stats.recentStreak} days</div>
                  </div>
                </div>

                {/* Performance Insights */}
                <div className="border-t border-amber-100 dark:border-amber-900/20 pt-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Quick Insights
                  </h4>
                  <div className="space-y-2">
                    {stats.averageScore >= 80 && (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-gray-700 dark:text-gray-300">Excellent performance! Keep it up!</span>
                      </div>
                    )}
                    {stats.averageScore >= 60 && stats.averageScore < 80 && (
                      <div className="flex items-center gap-2 text-sm">
                        <Target className="h-4 w-4 text-amber-600" />
                        <span className="text-gray-700 dark:text-gray-300">Good progress! Aim for 80%+ average</span>
                      </div>
                    )}
                    {stats.averageScore < 60 && stats.completedQuizzes > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <BookOpen className="h-4 w-4 text-blue-600" />
                        <span className="text-gray-700 dark:text-gray-300">Keep practicing to improve your scores</span>
                      </div>
                    )}
                    {stats.recentStreak >= 7 && (
                      <div className="flex items-center gap-2 text-sm">
                        <Award className="h-4 w-4 text-amber-600" />
                        <span className="text-gray-700 dark:text-gray-300">Great consistency with {stats.recentStreak}-day streak!</span>
                      </div>
                    )}
                    {stats.recentStreak > 0 && stats.recentStreak < 7 && (
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                        <span className="text-gray-700 dark:text-gray-300">Keep your {stats.recentStreak}-day streak going!</span>
                      </div>
                    )}
                    {stats.completedQuizzes === 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <BookOpen className="h-4 w-4 text-amber-600" />
                        <span className="text-gray-700 dark:text-gray-300">Start your learning journey by taking your first quiz!</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-6">
                  <Button className="flex-1" variant="default" asChild>
                    <Link href="/student/quizzes">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Browse Quizzes
                    </Link>
                  </Button>
                  <Button className="flex-1" variant="outline" asChild>
                    <Link href="/student/results">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      View Results
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100 dark:border-amber-900/20 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Award className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Your Achievements
                  </h3>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {unlockedCount} / 6 Unlocked
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* First Quiz Achievement */}
                <div className={`p-4 rounded-lg border-2 ${
                  stats.completedQuizzes >= 1 
                    ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
                    : 'bg-gray-50 dark:bg-gray-900/10 border-gray-200 dark:border-gray-700'
                }`}>
                  <div className="flex items-center gap-3 mb-2">
                    <BookOpen className={`h-5 w-5 ${
                      stats.completedQuizzes >= 1 ? 'text-amber-600' : 'text-gray-400'
                    }`} />
                    <span className={`font-medium ${
                      stats.completedQuizzes >= 1 ? 'text-amber-700 dark:text-amber-300' : 'text-gray-500'
                    }`}>
                      First Steps
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Complete your first quiz
                  </p>
                  {stats.completedQuizzes >= 1 && (
                    <div className="mt-2 text-xs text-amber-600">✓ Unlocked</div>
                  )}
                </div>

                {/* Perfect Score Achievement */}
                <div className={`p-4 rounded-lg border-2 ${
                  stats.bestScore >= 100 
                    ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
                    : 'bg-gray-50 dark:bg-gray-900/10 border-gray-200 dark:border-gray-700'
                }`}>
                  <div className="flex items-center gap-3 mb-2">
                    <Trophy className={`h-5 w-5 ${
                      stats.bestScore >= 100 ? 'text-amber-600' : 'text-gray-400'
                    }`} />
                    <span className={`font-medium ${
                      stats.bestScore >= 100 ? 'text-amber-700 dark:text-amber-300' : 'text-gray-500'
                    }`}>
                      Perfect Score
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Score 100% on any quiz
                  </p>
                  {stats.bestScore >= 100 && (
                    <div className="mt-2 text-xs text-amber-600">✓ Unlocked</div>
                  )}
                </div>

                {/* Consistent Learner Achievement */}
                <div className={`p-4 rounded-lg border-2 ${
                  stats.completedQuizzes >= 5 
                    ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
                    : 'bg-gray-50 dark:bg-gray-900/10 border-gray-200 dark:border-gray-700'
                }`}>
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className={`h-5 w-5 ${
                      stats.completedQuizzes >= 5 ? 'text-amber-600' : 'text-gray-400'
                    }`} />
                    <span className={`font-medium ${
                      stats.completedQuizzes >= 5 ? 'text-amber-700 dark:text-amber-300' : 'text-gray-500'
                    }`}>
                      Consistent Learner
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Complete 5 quizzes
                  </p>
                  {stats.completedQuizzes >= 5 ? (
                    <div className="mt-2 text-xs text-amber-600">✓ Unlocked</div>
                  ) : (
                    <div className="mt-2 text-xs text-gray-500">{stats.completedQuizzes}/5 completed</div>
                  )}
                </div>

                {/* Weekly Scholar Achievement */}
                <div className={`p-4 rounded-lg border-2 ${
                  stats.recentStreak >= 7 
                    ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
                    : 'bg-gray-50 dark:bg-gray-900/10 border-gray-200 dark:border-gray-700'
                }`}>
                  <div className="flex items-center gap-3 mb-2">
                    <Award className={`h-5 w-5 ${
                      stats.recentStreak >= 7 ? 'text-amber-600' : 'text-gray-400'
                    }`} />
                    <span className={`font-medium ${
                      stats.recentStreak >= 7 ? 'text-amber-700 dark:text-amber-300' : 'text-gray-500'
                    }`}>
                      Weekly Scholar
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    7-day learning streak
                  </p>
                  {stats.recentStreak >= 7 ? (
                    <div className="mt-2 text-xs text-amber-600">✓ Unlocked</div>
                  ) : (
                    <div className="mt-2 text-xs text-gray-500">{stats.recentStreak}/7 days</div>
                  )}
                </div>

                {/* High Achiever */}
                <div className={`p-4 rounded-lg border-2 ${
                  stats.averageScore >= 80 
                    ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
                    : 'bg-gray-50 dark:bg-gray-900/10 border-gray-200 dark:border-gray-700'
                }`}>
                  <div className="flex items-center gap-3 mb-2">
                    <Target className={`h-5 w-5 ${
                      stats.averageScore >= 80 ? 'text-amber-600' : 'text-gray-400'
                    }`} />
                    <span className={`font-medium ${
                      stats.averageScore >= 80 ? 'text-amber-700 dark:text-amber-300' : 'text-gray-500'
                    }`}>
                      High Achiever
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Maintain 80%+ average
                  </p>
                  {stats.averageScore >= 80 ? (
                    <div className="mt-2 text-xs text-amber-600">✓ Unlocked</div>
                  ) : (
                    <div className="mt-2 text-xs text-gray-500">Current: {stats.averageScore}%</div>
                  )}
                </div>

                {/* Bible Marathon */}
                <div className={`p-4 rounded-lg border-2 ${
                  stats.completedQuizzes >= 10 
                    ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
                    : 'bg-gray-50 dark:bg-gray-900/10 border-gray-200 dark:border-gray-700'
                }`}>
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle className={`h-5 w-5 ${
                      stats.completedQuizzes >= 10 ? 'text-amber-600' : 'text-gray-400'
                    }`} />
                    <span className={`font-medium ${
                      stats.completedQuizzes >= 10 ? 'text-amber-700 dark:text-amber-300' : 'text-gray-500'
                    }`}>
                      Bible Marathon
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Complete 10 quizzes
                  </p>
                  {stats.completedQuizzes >= 10 ? (
                    <div className="mt-2 text-xs text-amber-600">✓ Unlocked</div>
                  ) : (
                    <div className="mt-2 text-xs text-gray-500">{stats.completedQuizzes}/10 completed</div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Section>
    </PageContainer>
  );
}

export default withErrorBoundary(StudentProgressPage);
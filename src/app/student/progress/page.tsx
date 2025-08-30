"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { logger } from "@/lib/logger";
import { fetchWithOptimizedCache } from "@/lib/api-cache";
import { withErrorBoundary } from "@/components/student/StudentPageWrapper";
import {
  PageContainer,
  PageHeader,
  Section,
  StatCard,
  ResultCard,
  LoadingState,
  EmptyState
} from "@/components/student-v2";
import {
  Trophy, 
  BookOpen, 
  Clock, 
  CheckCircle,
  Target,
  Award,
  BarChart3,
  TrendingUp
} from "lucide-react";

interface QuizAttempt {
  id: string;
  quizId: string;
  quizTitle: string;
  score: number;
  completedAt: string;
  totalQuestions: number;
  correctAnswers: number;
  status: string;
  duration?: number;
}

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
  const [recentAttempts, setRecentAttempts] = useState<QuizAttempt[]>([]);

  useEffect(() => {
    fetchProgressData();
  }, []);

  const fetchProgressData = async () => {
    try {
      const [statsResult, attemptsResult] = await Promise.all([
        fetchWithOptimizedCache('/api/student/progress/stats', { ttl: 120 }), // 2 min cache
        fetchWithOptimizedCache('/api/student/results?limit=5', { ttl: 60 }) // 1 min cache
      ]);
      
      if (statsResult.data) {
        setStats(statsResult.data);
      }
      
      if (attemptsResult.data) {
        const completedAttempts = (attemptsResult.data.results || [])
          .filter((r: any) => r.status === 'completed')
          .slice(0, 5);
        setRecentAttempts(completedAttempts);
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

  return (
    <PageContainer>
      <PageHeader
        title="Learning Progress"
        subtitle="Track your biblical knowledge journey"
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

      {/* Progress Overview */}
      <Section className="mt-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100 dark:border-amber-900/20 p-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 dark:bg-amber-900/20 rounded-full mb-4">
              <BarChart3 className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Your Learning Journey
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Keep growing in biblical knowledge
            </p>
          </div>

          {/* Completion Rate */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Quiz Completion Rate
              </span>
              <span className="text-sm text-amber-600 dark:text-amber-400 font-semibold">
                {completionRate}%
              </span>
            </div>
            <Progress value={completionRate} className="h-2" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Completed"
              value={stats.completedQuizzes}
              icon={CheckCircle}
              description="Quizzes finished"
            />
            <StatCard
              label="Average Score"
              value={`${stats.averageScore}%`}
              icon={Target}
              description="Overall performance"
              trend={stats.averageScore >= 70 ? { value: stats.averageScore, direction: "up" } : { value: stats.averageScore, direction: "neutral" }}
            />
            <StatCard
              label="Best Score"
              value={`${stats.bestScore}%`}
              icon={Trophy}
              description="Personal best"
            />
            <StatCard
              label="Study Time"
              value={formatTime(stats.totalTimeSpent)}
              icon={Clock}
              description="Total time spent"
            />
          </div>
        </div>
      </Section>

      {/* Recent Activity */}
      <Section className="mt-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100 dark:border-amber-900/20">
          <div className="p-6 border-b border-amber-100 dark:border-amber-900/20">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Recent Activity
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Your latest quiz attempts
                </p>
              </div>
              <Link href="/student/results">
                <Button variant="outline" size="sm">
                  View All Results
                </Button>
              </Link>
            </div>
          </div>

          {recentAttempts.length > 0 ? (
            <div className="p-6 space-y-4">
              {recentAttempts.filter(attempt => attempt && attempt.id && attempt.quizTitle).map((attempt) => (
                <ResultCard
                  key={attempt.id}
                  id={attempt.id}
                  quizTitle={attempt.quizTitle}
                  score={attempt.score}
                  correctAnswers={attempt.correctAnswers}
                  totalQuestions={attempt.totalQuestions}
                  completedAt={attempt.completedAt}
                  duration={attempt.duration}
                />
              ))}
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                icon={BookOpen}
                title="No Recent Activity"
                description="Complete your first quiz to see your progress here"
                action={{
                  label: "Browse Quizzes",
                  onClick: () => window.location.href = "/student/quizzes",
                  variant: "default"
                }}
              />
            </div>
          )}
        </div>
      </Section>

      {/* Achievements Section */}
      <Section className="mt-6 pb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100 dark:border-amber-900/20 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Award className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Achievements
            </h3>
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
            </div>
          </div>
        </div>
      </Section>
    </PageContainer>
  );
}

export default withErrorBoundary(StudentProgressPage);
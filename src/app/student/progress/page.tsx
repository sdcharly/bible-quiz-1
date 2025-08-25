"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BiblicalPageLoader } from "@/components/ui/biblical-loader";
import { 
  Trophy, 
  BookOpen, 
  Clock, 
  CheckCircle,
  Target,
  Award,
  BarChart3,
  ArrowLeft
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
}

interface ProgressStats {
  totalQuizzes: number;
  completedQuizzes: number;
  averageScore: number;
  totalTimeSpent: number;
  bestScore: number;
  recentStreak: number;
}

export default function StudentProgressPage() {
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
      // Fetch quiz results
      const resultsResponse = await fetch('/api/student/results');
      if (resultsResponse.ok) {
        const resultsData = await resultsResponse.json();
        const attempts = resultsData.results || [];
        const completedAttempts = attempts.filter((a: any) => a.status === 'completed');
        
        // Calculate statistics
        const totalScore = completedAttempts.reduce((sum: number, attempt: any) => 
          sum + (parseFloat(attempt.score) || 0), 0
        );
        const avgScore = completedAttempts.length > 0 
          ? Math.round(totalScore / completedAttempts.length) 
          : 0;
        
        const bestScore = completedAttempts.length > 0
          ? Math.max(...completedAttempts.map((a: any) => parseFloat(a.score) || 0))
          : 0;

        // Calculate streak (consecutive quizzes with score >= 70%)
        let streak = 0;
        const sortedAttempts = [...completedAttempts].sort((a: any, b: any) => 
          new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime()
        );
        for (const attempt of sortedAttempts) {
          if (parseFloat(attempt.score) >= 70) {
            streak++;
          } else {
            break;
          }
        }

        setStats({
          totalQuizzes: attempts.length,
          completedQuizzes: completedAttempts.length,
          averageScore: avgScore,
          totalTimeSpent: completedAttempts.length * 15, // Estimate
          bestScore: Math.round(bestScore),
          recentStreak: streak
        });

        // Set recent attempts (last 5)
        setRecentAttempts(sortedAttempts.slice(0, 5));
      }

      // Fetch available quizzes count
      const quizzesResponse = await fetch('/api/student/quizzes');
      if (quizzesResponse.ok) {
        const quizzesData = await quizzesResponse.json();
        setStats(prev => ({
          ...prev,
          totalQuizzes: quizzesData.quizzes?.length || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <BiblicalPageLoader text="Loading your progress..." />;
  }

  const completionRate = stats.totalQuizzes > 0 
    ? Math.round((stats.completedQuizzes / stats.totalQuizzes) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Your Progress
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Track your biblical knowledge journey
              </p>
            </div>
            <Link href="/student/dashboard">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Completion Rate</CardDescription>
              <CardTitle className="text-2xl">{completionRate}%</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={completionRate} className="h-2" />
              <p className="text-xs text-gray-500 mt-2">
                {stats.completedQuizzes} of {stats.totalQuizzes} quizzes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Average Score</CardDescription>
              <CardTitle className="text-2xl">{stats.averageScore}%</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Trophy className="h-8 w-8 text-amber-600 opacity-50" />
                <span className="text-sm text-gray-500">Best: {stats.bestScore}%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Current Streak</CardDescription>
              <CardTitle className="text-2xl">{stats.recentStreak}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Award className="h-8 w-8 text-green-600 opacity-50" />
                <span className="text-xs text-gray-500 ml-2">Quizzes with ≥70%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Study Time</CardDescription>
              <CardTitle className="text-2xl">{stats.totalTimeSpent} min</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-blue-600 opacity-50" />
                <span className="text-xs text-gray-500 ml-2">Total time invested</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Performance */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Recent Performance</CardTitle>
            <CardDescription>Your last quiz attempts</CardDescription>
          </CardHeader>
          <CardContent>
            {recentAttempts.length > 0 ? (
              <div className="space-y-4">
                {recentAttempts.map((attempt) => (
                  <div key={attempt.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{attempt.quizTitle}</h4>
                      <p className="text-sm text-gray-500">
                        {new Date(attempt.completedAt || '').toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold">{attempt.score}%</p>
                        <p className="text-xs text-gray-500">
                          {attempt.correctAnswers}/{attempt.totalQuestions} correct
                        </p>
                      </div>
                      {parseFloat(attempt.score.toString()) >= 70 ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <Target className="h-5 w-5 text-amber-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No quiz attempts yet</p>
                <Link href="/student/quizzes">
                  <Button className="mt-4">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Start Your First Quiz
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Progress Tips */}
        <Card>
          <CardHeader>
            <CardTitle>Tips to Improve</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                <span className="text-sm">Review incorrect answers to learn from mistakes</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                <span className="text-sm">Take notes while studying biblical passages</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                <span className="text-sm">Practice regularly to maintain your streak</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                <span className="text-sm">Join study groups to learn collaboratively</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
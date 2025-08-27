"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { isStudent } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { GroupInfo } from "@/components/student/GroupInfo";
import { useSessionManager } from "@/hooks/useSessionManager";
import { fetchWithCache } from "@/lib/api-cache";
import { logger } from "@/lib/logger";


// Import new student-v2 components
import {
  PageContainer,
  PageHeader,
  Section,
  StatCard,
  LoadingState,
  EmptyState,
} from "@/components/student-v2";
import {
  BookOpen,
  Trophy,
  TrendingUp,
  Calendar,
  ChevronRight,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface Quiz {
  id: string;
  title: string;
  startTime: string;
  totalQuestions: number;
  duration?: number;
  enrolled?: boolean;
  isActive?: boolean;
  isUpcoming?: boolean;
  isExpired?: boolean;
}

interface QuizAttempt {
  id: string;
  quizId: string;
  status: string;
  score: number;
}

export default function StudentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ name?: string; email?: string; role?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    quizzesTaken: 0,
    averageScore: 0,
    quizzesAvailable: 0,
    upcomingQuizzes: 0,
  });
  const [recentQuizzes, setRecentQuizzes] = useState<any[]>([]);
  
  // Session management for student dashboard
  useSessionManager({
    enableWarnings: true,
    enableAutoExtend: true,
    onSessionExpired: () => {
      router.push("/auth/signin");
    }
  });

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        // Check authentication
        const response = await authClient.getSession();
        if (!response.data?.user) {
          router.push("/auth/signin");
          return;
        }
        
        const userWithRole = response.data.user as { role?: string; name?: string; email?: string; id?: string };
        if (!isStudent(userWithRole.role)) {
          router.push("/educator/dashboard");
          return;
        }
        
        setUser(userWithRole);

        // Check and accept any pending invitations
        if (userWithRole.email && userWithRole.id) {
          try {
            const invitationResponse = await fetch("/api/invitations/check-and-accept", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: userWithRole.email,
                userId: userWithRole.id,
              }),
            });
            
            if (invitationResponse.ok) {
              const result = await invitationResponse.json();
              if (result.acceptedCount > 0) {
                logger.log(`Accepted ${result.acceptedCount} pending invitations`);
              }
            }
          } catch (error) {
            logger.error("Error checking invitations:", error);
          }
        }
        
        // Fetch dashboard data with parallel requests
        await fetchDashboardData();
      } catch (error) {
        logger.error("Error initializing dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    
    initializeDashboard();
  }, [router]);
  
  const fetchDashboardData = async () => {
    try {
      // Parallel API calls with caching
      const [quizzesResponse, resultsResponse] = await Promise.all([
        fetchWithCache('/api/student/quizzes', {}, 300), // 5 min cache
        fetchWithCache('/api/student/results', {}, 60)   // 1 min cache
      ]);

      if (quizzesResponse.ok && resultsResponse.ok) {
        const [quizzesData, resultsData] = await Promise.all([
          quizzesResponse.json(),
          resultsResponse.json()
        ]);

        // Process quiz data - only count non-expired quizzes as available
        const quizzes = quizzesData.quizzes || [];
        const activeQuizzes = quizzes.filter((q: Quiz) => !q.isExpired);
        const available = activeQuizzes.length;
        const upcoming = activeQuizzes.filter((q: Quiz) => q.isUpcoming).length;

        // Process results data
        const attempts = resultsData.results || [];
        const completedAttempts = attempts.filter((a: QuizAttempt) => a.status === 'completed');
        const totalScore = completedAttempts.reduce((sum: number, attempt: QuizAttempt) => 
          sum + (attempt.score || 0), 0
        );
        const avgScore = completedAttempts.length > 0 
          ? Math.round(totalScore / completedAttempts.length) 
          : 0;

        // Set stats
        setStats({
          quizzesTaken: completedAttempts.length,
          averageScore: avgScore,
          quizzesAvailable: available,
          upcomingQuizzes: upcoming
        });

        // Set recent quizzes (last 3 non-expired)
        setRecentQuizzes(activeQuizzes.slice(0, 3));
      }
    } catch (error) {
      logger.error('Error fetching dashboard data:', error);
    }
  };

  if (loading) {
    return <LoadingState fullPage text="Preparing your dashboard..." />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Student Dashboard"
        subtitle={`Welcome back, ${user?.name || 'Student'}`}
        icon={BookOpen}
        actions={
          <Link href="/student/quizzes">
            <Button className="bg-amber-600 hover:bg-amber-700">
              <BookOpen className="h-4 w-4 mr-2" />
              Browse Quizzes
            </Button>
          </Link>
        }
      />

      {/* Stats Grid */}
      <Section transparent noPadding>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Quizzes Taken"
            value={stats.quizzesTaken}
            icon={CheckCircle}
            iconColor="text-green-600 dark:text-green-400"
            description={stats.quizzesTaken === 0 ? "Start your first quiz!" : undefined}
          />
          <StatCard
            label="Average Score"
            value={`${stats.averageScore}%`}
            icon={Trophy}
            trend={stats.averageScore >= 70 ? {
              value: stats.averageScore - 70,
              direction: "up"
            } : undefined}
          />
          <StatCard
            label="Available"
            value={stats.quizzesAvailable}
            icon={BookOpen}
            description="Ready to take"
          />
          <StatCard
            label="Upcoming"
            value={stats.upcomingQuizzes}
            icon={Calendar}
            description="Scheduled soon"
          />
        </div>
      </Section>

      {/* Groups Section */}
      <Section transparent noPadding>
        <GroupInfo />
      </Section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Available Quizzes */}
        <Section 
          className="lg:col-span-2"
          title="Available Quizzes"
          actions={
            <Link href="/student/quizzes">
              <Button variant="ghost" size="sm">
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          }
        >
          {recentQuizzes.length > 0 ? (
            <div className="space-y-3">
              {recentQuizzes.filter((quiz: Quiz) => quiz && quiz.id && quiz.title).map((quiz: Quiz) => (
                <Link 
                  key={quiz.id} 
                  href={`/student/quiz/${quiz.id}`}
                  className="block p-4 border border-amber-100 dark:border-amber-900/20 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {quiz.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {quiz.totalQuestions} questions • {quiz.duration} minutes
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No quizzes available"
              description="Check back later or contact your educator"
              icon={BookOpen}
              size="sm"
            />
          )}
        </Section>

        {/* Recent Performance */}
        <Section
          title="Recent Performance"
        >
          {stats.quizzesTaken > 0 ? (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-600">
                  {stats.averageScore}%
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Average Score
                </p>
              </div>
              <Link href="/student/results">
                <Button 
                  variant="outline" 
                  className="w-full border-amber-200 hover:bg-amber-50"
                >
                  View All Results
                </Button>
              </Link>
            </div>
          ) : (
            <EmptyState
              title="No performance data"
              description="Complete quizzes to track your progress"
              icon={Trophy}
              size="sm"
            />
          )}
        </Section>
      </div>

      {/* Quick Actions */}
      <Section title="Quick Actions" transparent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/student/quizzes">
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-amber-100 dark:border-amber-900/20 hover:shadow-md transition-all cursor-pointer">
              <BookOpen className="h-6 w-6 text-amber-600 mb-2" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                Browse Quizzes
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Explore available biblical study quizzes
              </p>
            </div>
          </Link>

          <Link href="/student/results">
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-amber-100 dark:border-amber-900/20 hover:shadow-md transition-all cursor-pointer">
              <Trophy className="h-6 w-6 text-amber-600 mb-2" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                View Results
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Review your quiz scores and feedback
              </p>
            </div>
          </Link>

          <Link href="/student/progress">
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-amber-100 dark:border-amber-900/20 hover:shadow-md transition-all cursor-pointer">
              <TrendingUp className="h-6 w-6 text-green-600 mb-2" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                Track Progress
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Monitor your learning journey
              </p>
            </div>
          </Link>
        </div>
      </Section>

      {/* Study Tips */}
      <Section className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Study Tips
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
              <li>Review the biblical passages before taking quizzes</li>
              <li>Take notes during your study sessions</li>
              <li>Use the review feature to learn from incorrect answers</li>
              <li>Practice regularly to improve retention</li>
            </ul>
          </div>
        </div>
      </Section>
    </PageContainer>
  );
}
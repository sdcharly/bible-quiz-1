"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { isStudent } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { GroupInfo } from "@/components/student/GroupInfo";
import { BiblicalPageLoader } from "@/components/ui/biblical-loader";
import { useSessionManager } from "@/hooks/useSessionManager";
import { 
  BookOpen,
  Trophy,
  TrendingUp,
  Calendar,
  ChevronRight,
  CheckCircle,
  AlertCircle
} from "lucide-react";

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
  
  // Session management for student dashboard
  useSessionManager({
    enableWarnings: true,
    enableAutoExtend: true,
    onSessionExpired: () => {
      router.push("/auth/signin");
    }
  });

  useEffect(() => {
    const checkAuth = async () => {
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
      
      // Check and accept any pending invitations for this user
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
              console.log(`Accepted ${result.acceptedCount} pending invitations`);
              // You could show a notification here if desired
            }
          }
        } catch (error) {
          console.error("Error checking invitations:", error);
        }
      }
      
      setUser(userWithRole);
      
      // Fetch real stats for the student
      await fetchStudentStats();
      
      setLoading(false);
    };
    
    checkAuth();
  }, [router]);
  
  const fetchStudentStats = async () => {
    try {
      // Fetch available quizzes
      const quizzesResponse = await fetch('/api/student/quizzes');
      if (quizzesResponse.ok) {
        const quizzesData = await quizzesResponse.json();
        const available = quizzesData.quizzes?.length || 0;
        const upcoming = quizzesData.quizzes?.filter((q: any) => 
          q.startTime && new Date(q.startTime) > new Date()
        ).length || 0;
        
        setStats(prev => ({
          ...prev,
          quizzesAvailable: available,
          upcomingQuizzes: upcoming
        }));
      }
      
      // Fetch quiz attempts and calculate stats
      const resultsResponse = await fetch('/api/student/results');
      if (resultsResponse.ok) {
        const resultsData = await resultsResponse.json();
        const attempts = resultsData.results || [];
        const completedAttempts = attempts.filter((a: any) => a.status === 'completed');
        
        const totalScore = completedAttempts.reduce((sum: number, attempt: any) => 
          sum + (parseFloat(attempt.score) || 0), 0
        );
        const avgScore = completedAttempts.length > 0 
          ? Math.round(totalScore / completedAttempts.length) 
          : 0;
        
        setStats(prev => ({
          ...prev,
          quizzesTaken: completedAttempts.length,
          averageScore: avgScore
        }));
      }
    } catch (error) {
      console.error('Error fetching student stats:', error);
    }
  };

  if (loading) {
    return (
      <BiblicalPageLoader text="Loading your dashboard..." />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Student Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Welcome back, {user?.name}
              </p>
            </div>
            <Link href="/student/quizzes">
              <Button>
                <BookOpen className="h-4 w-4 mr-2" />
                Browse Quizzes
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 lg:p-6 rounded-lg shadow">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Quizzes Taken</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mt-1 sm:mt-2">
                  {stats.quizzesTaken}
                </p>
              </div>
              <CheckCircle className="hidden sm:block h-8 sm:h-10 lg:h-12 w-8 sm:w-10 lg:w-12 text-green-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 lg:p-6 rounded-lg shadow">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Average Score</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mt-1 sm:mt-2">
                  {stats.averageScore}%
                </p>
              </div>
              <Trophy className="hidden sm:block h-8 sm:h-10 lg:h-12 w-8 sm:w-10 lg:w-12 text-amber-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 lg:p-6 rounded-lg shadow">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Available</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mt-1 sm:mt-2">
                  {stats.quizzesAvailable}
                </p>
              </div>
              <BookOpen className="hidden sm:block h-8 sm:h-10 lg:h-12 w-8 sm:w-10 lg:w-12 text-amber-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 lg:p-6 rounded-lg shadow">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Upcoming</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mt-1 sm:mt-2">
                  {stats.upcomingQuizzes}
                </p>
              </div>
              <Calendar className="hidden sm:block h-8 sm:h-10 lg:h-12 w-8 sm:w-10 lg:w-12 text-amber-600 opacity-20" />
            </div>
          </div>
        </div>

        {/* Groups Section */}
        <div className="mt-8">
          <GroupInfo />
        </div>

        {/* Main Content Grid */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Available Quizzes */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Available Quizzes
                </h2>
                <Link href="/student/quizzes">
                  <Button variant="ghost" size="sm">
                    View All
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No quizzes available yet. Check back later or contact your educator.
                </p>
              </div>
            </div>
          </div>

          {/* Recent Performance */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Performance
              </h2>
            </div>
            <div className="p-6">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Complete quizzes to see your performance history here.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          <Link href="/student/quizzes">
            <div className="bg-white dark:bg-gray-800 p-4 sm:p-5 lg:p-6 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer touch-manipulation">
              <BookOpen className="h-6 sm:h-7 lg:h-8 w-6 sm:w-7 lg:w-8 text-amber-600 mb-2 sm:mb-3" />
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1 sm:mb-2">
                Browse Quizzes
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Explore available biblical study quizzes
              </p>
            </div>
          </Link>

          <Link href="/student/results">
            <div className="bg-white dark:bg-gray-800 p-4 sm:p-5 lg:p-6 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer touch-manipulation">
              <Trophy className="h-6 sm:h-7 lg:h-8 w-6 sm:w-7 lg:w-8 text-amber-600 mb-2 sm:mb-3" />
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1 sm:mb-2">
                View Results
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Review your quiz scores and feedback
              </p>
            </div>
          </Link>

          <Link href="/student/progress">
            <div className="bg-white dark:bg-gray-800 p-4 sm:p-5 lg:p-6 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer touch-manipulation sm:col-span-2 lg:col-span-1">
              <TrendingUp className="h-6 sm:h-7 lg:h-8 w-6 sm:w-7 lg:w-8 text-green-600 mb-2 sm:mb-3" />
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1 sm:mb-2">
                Track Progress
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Monitor your learning journey
              </p>
            </div>
          </Link>
        </div>

        {/* Study Tips */}
        <div className="mt-6 sm:mt-8 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 sm:p-5 lg:p-6">
          <div className="flex items-start">
            <AlertCircle className="h-5 sm:h-6 w-5 sm:w-6 text-amber-600 mt-0.5 sm:mt-1 mr-2 sm:mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Study Tips
              </h3>
              <ul className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                <li>Review the biblical passages before taking quizzes</li>
                <li>Take notes during your study sessions</li>
                <li>Use the review feature to learn from incorrect answers</li>
                <li>Practice regularly to improve retention</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
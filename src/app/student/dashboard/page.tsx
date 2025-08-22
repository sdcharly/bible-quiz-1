"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { isStudent } from "@/lib/roles";
import { Button } from "@/components/ui/button";
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
  const [stats] = useState({
    quizzesTaken: 0,
    averageScore: 0,
    quizzesAvailable: 0,
    upcomingQuizzes: 0,
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
      setLoading(false);
    };
    
    checkAuth();
  }, [router]);

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Quizzes Taken</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.quizzesTaken}
                </p>
              </div>
              <CheckCircle className="h-12 w-12 text-green-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Average Score</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.averageScore}%
                </p>
              </div>
              <Trophy className="h-12 w-12 text-yellow-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Available Quizzes</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.quizzesAvailable}
                </p>
              </div>
              <BookOpen className="h-12 w-12 text-blue-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Upcoming</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.upcomingQuizzes}
                </p>
              </div>
              <Calendar className="h-12 w-12 text-purple-600 opacity-20" />
            </div>
          </div>
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
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/student/quizzes">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer">
              <BookOpen className="h-8 w-8 text-blue-600 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Browse Quizzes
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Explore available biblical study quizzes
              </p>
            </div>
          </Link>

          <Link href="/student/results">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer">
              <Trophy className="h-8 w-8 text-yellow-600 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                View Results
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Review your quiz scores and feedback
              </p>
            </div>
          </Link>

          <Link href="/student/progress">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer">
              <TrendingUp className="h-8 w-8 text-green-600 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Track Progress
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Monitor your learning journey
              </p>
            </div>
          </Link>
        </div>

        {/* Study Tips */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <div className="flex items-start">
            <AlertCircle className="h-6 w-6 text-blue-600 mt-1 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
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
        </div>
      </div>
    </div>
  );
}
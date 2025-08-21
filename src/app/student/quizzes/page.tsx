"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTimezone } from "@/hooks/useTimezone";
import { 
  BookOpen, 
  Clock, 
  Calendar,
  Users,
  PlayCircle,
  Lock,
  CheckCircle,
  AlertCircle,
  Search,
  Filter
} from "lucide-react";

interface Quiz {
  id: string;
  title: string;
  description: string;
  totalQuestions: number;
  duration: number;
  startTime: string;
  timezone: string;
  status: "draft" | "published" | "completed" | "archived";
  enrolled: boolean;
  attempted: boolean;
  attemptId?: string;
  score?: number;
}

export default function StudentQuizzesPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { formatDate, getRelativeTime, isQuizAvailable } = useTimezone();

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const response = await fetch("/api/student/quizzes");
      if (response.ok) {
        const data = await response.json();
        setQuizzes(data.quizzes || []);
      }
    } catch (error) {
      console.error("Error fetching quizzes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (quizId: string) => {
    try {
      const response = await fetch(`/api/student/quizzes/${quizId}/enroll`, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        // Show success message (you can add a toast notification here if available)
        if (data.alreadyEnrolled) {
          console.log("Already enrolled in this quiz");
        } else {
          console.log("Successfully enrolled in quiz");
        }
        // Refresh quizzes list to update enrollment status
        fetchQuizzes();
      } else {
        // Handle error
        console.error("Enrollment failed:", data.error || data.message);
        alert(data.message || "Failed to enroll in quiz. Please try again.");
      }
    } catch (error) {
      console.error("Error enrolling in quiz:", error);
      alert("An error occurred while enrolling. Please try again.");
    }
  };

  const handleStartQuiz = (quizId: string) => {
    router.push(`/student/quiz/${quizId}`);
  };

  const formatQuizTime = (utcDateString: string) => {
    // Format the UTC time from database in user's timezone
    return formatDate(utcDateString, {
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const getQuizStatus = (utcStartTime: string) => {
    const available = isQuizAvailable(utcStartTime);
    const relativeTime = getRelativeTime(utcStartTime);
    return { available, text: relativeTime };
  };

  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          quiz.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || 
                         (filterStatus === "available" && !quiz.attempted) ||
                         (filterStatus === "completed" && quiz.attempted);
    return matchesSearch && matchesFilter;
  });

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
                Available Quizzes
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Browse and take biblical study quizzes
              </p>
            </div>
            <Link href="/student/dashboard">
              <Button variant="outline">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search quizzes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Quizzes</option>
                <option value="available">Available</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quiz Grid */}
        {filteredQuizzes.length === 0 ? (
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No quizzes found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || filterStatus !== "all" 
                ? "Try adjusting your filters"
                : "No quizzes are available at the moment. Check back later!"}
            </p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <BookOpen className="h-8 w-8 text-blue-600" />
                    {quiz.attempted && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Score: {quiz.score}%
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {quiz.title}
                  </h3>
                  
                  {quiz.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {quiz.description}
                    </p>
                  )}
                  
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{quiz.duration} minutes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      <span>{quiz.totalQuestions} questions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <div className="flex flex-col">
                        <span>Starts: {formatQuizTime(quiz.startTime)}</span>
                        <span className="text-xs text-gray-400">
                          {getQuizStatus(quiz.startTime).text}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    {!quiz.enrolled ? (
                      <Button
                        className="w-full"
                        onClick={() => handleEnroll(quiz.id)}
                      >
                        Enroll in Quiz
                      </Button>
                    ) : quiz.attempted ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => router.push(`/student/results/${quiz.attemptId}`)}
                        disabled={!quiz.attemptId}
                      >
                        View Results
                      </Button>
                    ) : isQuizAvailable(quiz.startTime) ? (
                      <Button
                        className="w-full"
                        onClick={() => handleStartQuiz(quiz.id)}
                      >
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Start Quiz
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        Not Yet Available
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
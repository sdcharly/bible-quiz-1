"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTimezone } from "@/hooks/useTimezone";
import { 
  BookOpen, 
  Clock, 
  Calendar,
  Users,
  PlayCircle,
  Lock,
  AlertCircle,
  Search
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
  isExpired?: boolean;
}

export default function QuizzesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { formatDate, getRelativeTime, isQuizAvailable } = useTimezone();

  useEffect(() => {
    // Check for filter in URL params
    const filterParam = searchParams?.get('filter');
    if (filterParam === 'completed') {
      setFilterStatus('completed');
    }
    fetchQuizzes();
  }, [searchParams]);

  const fetchQuizzes = async () => {
    try {
      const response = await fetch("/api/student/quizzes");
      if (response.ok) {
        const data = await response.json();
        // Process quizzes to check if they're expired and sort by startTime descending
        const processedQuizzes = (data.quizzes || []).map((quiz: Quiz) => {
          const now = new Date();
          const quizStartTime = new Date(quiz.startTime);
          const quizEndTime = new Date(quizStartTime.getTime() + quiz.duration * 60000);
          return {
            ...quiz,
            isExpired: now > quizEndTime
          };
        }).sort((a: Quiz, b: Quiz) => {
          // Sort by startTime in descending order (latest first)
          return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
        });
        setQuizzes(processedQuizzes);
      }
    } catch (error) {
      console.error("Error fetching quizzes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (quizId: string, isExpired: boolean) => {
    // Check if quiz is expired before attempting enrollment
    if (isExpired) {
      alert("This quiz has expired and is no longer available for enrollment.");
      return;
    }

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

  const getQuizStatus = (quiz: Quiz) => {
    if (quiz.isExpired) {
      return { available: false, text: "Expired", expired: true };
    }
    const available = isQuizAvailable(quiz.startTime);
    const relativeTime = getRelativeTime(quiz.startTime);
    return { available, text: relativeTime, expired: false };
  };

  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          quiz.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || 
                         (filterStatus === "available" && !quiz.attempted && !quiz.isExpired) ||
                         (filterStatus === "completed" && quiz.attempted);
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
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
                My Quizzes
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Browse and take biblical knowledge quizzes
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 pointer-events-none" />
            <Input
              type="search"
              placeholder="Search quizzes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-4 h-10 sm:h-11"
              autoComplete="off"
              inputMode="search"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            <Button
              variant={filterStatus === "all" ? "default" : "outline"}
              onClick={() => setFilterStatus("all")}
              className="min-w-[80px] h-10 sm:h-11 text-sm sm:text-base"
            >
              All
            </Button>
            <Button
              variant={filterStatus === "available" ? "default" : "outline"}
              onClick={() => setFilterStatus("available")}
              className="min-w-[100px] h-10 sm:h-11 text-sm sm:text-base"
            >
              Available
            </Button>
            <Button
              variant={filterStatus === "completed" ? "default" : "outline"}
              onClick={() => setFilterStatus("completed")}
              className="min-w-[100px] h-10 sm:h-11 text-sm sm:text-base"
            >
              Completed
            </Button>
          </div>
        </div>
      </div>

      {/* Quiz Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredQuizzes.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                {searchTerm || filterStatus !== "all" 
                  ? "No quizzes found matching your criteria"
                  : "No quizzes available yet"}
              </p>
            </div>
          ) : (
            filteredQuizzes.map((quiz) => {
              const quizStatus = getQuizStatus(quiz);
              
              return (
                <div
                  key={quiz.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow touch-manipulation"
                >
                  <div className="p-4 sm:p-6">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                      {quiz.title}
                    </h3>
                    {quiz.description && (
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4 line-clamp-3">
                        {quiz.description}
                      </p>
                    )}

                    <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
                      <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                        <span className="truncate">{quiz.totalQuestions} questions</span>
                      </div>
                      <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                        <span className="truncate">{quiz.duration} minutes</span>
                      </div>
                      <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                        <span className="truncate">{formatQuizTime(quiz.startTime)}</span>
                      </div>
                      <div className="flex items-center text-xs sm:text-sm">
                        <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                        <span className={
                          quizStatus.expired ? "text-red-600 font-medium" : 
                          quizStatus.available ? "text-green-600 font-medium" : "text-amber-600"
                        }>
                          {quizStatus.text}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4">
                      {quiz.attempted ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded">
                            <span className="text-sm text-green-700 dark:text-green-300">
                              Completed
                            </span>
                            {quiz.score !== undefined && (
                              <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                                Score: {quiz.score}%
                              </span>
                            )}
                          </div>
                          {quiz.attemptId && (
                            <Link href={`/student/results/${quiz.attemptId}`}>
                              <Button variant="outline" className="w-full">
                                View Results
                              </Button>
                            </Link>
                          )}
                        </div>
                      ) : quiz.enrolled ? (
                        quizStatus.expired ? (
                          <Button disabled className="w-full h-10 sm:h-11 text-sm sm:text-base">
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Quiz Expired
                          </Button>
                        ) : quizStatus.available ? (
                          <Button 
                            onClick={() => handleStartQuiz(quiz.id)}
                            className="w-full h-10 sm:h-11 text-sm sm:text-base touch-manipulation"
                          >
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Start Quiz
                          </Button>
                        ) : (
                          <Button disabled className="w-full h-10 sm:h-11 text-sm sm:text-base">
                            <Lock className="h-4 w-4 mr-2" />
                            Not Yet Available
                          </Button>
                        )
                      ) : (
                        quiz.isExpired ? (
                          <Button disabled variant="outline" className="w-full h-10 sm:h-11 text-sm sm:text-base">
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Quiz Expired
                          </Button>
                        ) : (
                          <Button 
                            onClick={() => handleEnroll(quiz.id, quiz.isExpired || false)}
                            variant="outline"
                            className="w-full h-10 sm:h-11 text-sm sm:text-base touch-manipulation"
                          >
                            Enroll in Quiz
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
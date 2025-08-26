"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { useTimezone } from "@/hooks/useTimezone";
import { logger } from "@/lib/logger";
import {
  PageContainer, 
  PageHeader, 
  Section,
  FilterBar,
  QuizCard,
  LoadingState,
  EmptyState
} from "@/components/student-v2";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { BookOpen } from "lucide-react";

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

// Cache for quiz data
const quizCache = {
  data: null as Quiz[] | null,
  timestamp: 0,
  TTL: 60000 // 1 minute cache
};

export default function QuizzesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { formatDate, getRelativeTime, isQuizAvailable } = useTimezone();

  // Performance: Memoize quiz time formatter
  const formatQuizTime = useCallback((utcDateString: string) => {
    return formatDate(utcDateString, {
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  }, [formatDate]);

  // Performance: Memoize quiz status calculator
  const getQuizStatus = useCallback((quiz: Quiz) => {
    if (quiz.isExpired) {
      return { available: false, text: "Expired", expired: true, color: "red" as const };
    }
    const available = isQuizAvailable(quiz.startTime);
    const relativeTime = getRelativeTime(quiz.startTime);
    return { 
      available, 
      text: relativeTime, 
      expired: false,
      color: available ? "green" as const : "amber" as const
    };
  }, [isQuizAvailable, getRelativeTime]);

  // Fetch quizzes with caching
  const fetchQuizzes = useCallback(async (force = false) => {
    try {
      // Check cache first
      if (!force && quizCache.data && Date.now() - quizCache.timestamp < quizCache.TTL) {
        setQuizzes(quizCache.data);
        setLoading(false);
        return;
      }

      const response = await fetch("/api/student/quizzes");
      if (response.ok) {
        const data = await response.json();
        // Process quizzes to check if they're expired and sort by startTime descending
        const processedQuizzes = (data.quizzes || []).filter((quiz: Quiz) => quiz && quiz.id && quiz.title).map((quiz: Quiz) => {
          const now = new Date();
          const quizStartTime = quiz.startTime ? new Date(quiz.startTime) : new Date();
          const quizEndTime = new Date(quizStartTime.getTime() + (quiz.duration || 30) * 60000);
          return {
            ...quiz,
            isExpired: now > quizEndTime
          };
        }).sort((a: Quiz, b: Quiz) => {
          const aTime = a.startTime ? new Date(a.startTime).getTime() : 0;
          const bTime = b.startTime ? new Date(b.startTime).getTime() : 0;
          return bTime - aTime;
        });
        
        // Update cache
        quizCache.data = processedQuizzes;
        quizCache.timestamp = Date.now();
        
        setQuizzes(processedQuizzes);
      }
    } catch (error) {
      logger.error("Error fetching quizzes:", error);
      toast({
        title: "Error",
        description: "Failed to load quizzes. Please refresh the page.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // Check for filter in URL params
    const filterParam = searchParams?.get('filter');
    if (filterParam === 'completed') {
      setFilterStatus('completed');
    }
    fetchQuizzes();
  }, [searchParams, fetchQuizzes]);

  // Optimized enrollment handler
  const handleEnroll = useCallback(async (quizId: string, isExpired: boolean) => {
    if (isExpired) {
      toast({
        title: "Quiz Expired",
        description: "This quiz has expired and is no longer available for enrollment.",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`/api/student/quizzes/${quizId}/enroll`, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: data.alreadyEnrolled ? "Already Enrolled" : "Enrollment Successful",
          description: data.alreadyEnrolled 
            ? "You're already enrolled in this quiz" 
            : "You have been successfully enrolled in the quiz",
        });
        // Force refresh to update enrollment status
        fetchQuizzes(true);
      } else {
        logger.error("Enrollment failed:", data.error || data.message);
        toast({
          title: "Enrollment Failed",
          description: data.message || "Failed to enroll in quiz. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      logger.error("Error enrolling in quiz:", error);
      toast({
        title: "Error",
        description: "An error occurred while enrolling. Please try again.",
        variant: "destructive"
      });
    }
  }, [fetchQuizzes, toast]);

  // Start quiz handler
  const handleStartQuiz = useCallback((quizId: string) => {
    router.push(`/student/quiz/${quizId}`);
  }, [router]);

  // Performance: Memoize filtered quizzes
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter(quiz => {
      const matchesSearch = quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           quiz.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterStatus === "all" || 
                           (filterStatus === "available" && !quiz.attempted && !quiz.isExpired) ||
                           (filterStatus === "completed" && quiz.attempted);
      return matchesSearch && matchesFilter;
    });
  }, [quizzes, searchTerm, filterStatus]);

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    return {
      all: quizzes.length,
      available: quizzes.filter(q => !q.attempted && !q.isExpired).length,
      completed: quizzes.filter(q => q.attempted).length
    };
  }, [quizzes]);

  // Filter options with counts
  const filterOptions = useMemo(() => [
    { value: "all", label: "All", count: filterCounts.all },
    { value: "available", label: "Available", count: filterCounts.available },
    { value: "completed", label: "Completed", count: filterCounts.completed }
  ], [filterCounts]);

  if (loading) {
    return (
      <PageContainer>
        <LoadingState text="Loading your quizzes..." fullPage />
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="full">
      <PageHeader
        title="My Quizzes"
        subtitle="Browse and take biblical knowledge quizzes"
        breadcrumbs={[
          { label: "Quizzes" }
        ]}
        actions={
          <Link href="/student/dashboard">
            <Button variant="outline">
              Back to Dashboard
            </Button>
          </Link>
        }
      />

      <Section className="mt-6">
        <FilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          filterValue={filterStatus}
          onFilterChange={setFilterStatus}
          filterOptions={filterOptions}
          searchPlaceholder="Search quizzes by title or description..."
        />
      </Section>

      <Section className="mt-6">
        {filteredQuizzes.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={searchTerm || filterStatus !== "all" 
              ? "No quizzes found"
              : "No quizzes available"}
            description={searchTerm || filterStatus !== "all" 
              ? "Try adjusting your search or filters"
              : "Check back later for new quizzes"}
            action={
              (searchTerm || filterStatus !== "all") ? {
                label: "Clear Filters",
                onClick: () => {
                  setSearchTerm("");
                  setFilterStatus("all");
                },
                variant: "outline" as const
              } : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuizzes.map((quiz) => {
              const quizStatus = getQuizStatus(quiz);
              
              return (
                <QuizCard
                  key={quiz.id}
                  title={quiz.title}
                  description={quiz.description}
                  totalQuestions={quiz.totalQuestions}
                  duration={quiz.duration}
                  startTimeFormatted={formatQuizTime(quiz.startTime)}
                  statusText={quizStatus.text}
                  statusColor={quizStatus.color}
                  attempted={quiz.attempted}
                  enrolled={quiz.enrolled}
                  score={quiz.score}
                  isExpired={quiz.isExpired || false}
                  isAvailable={quizStatus.available}
                  onEnroll={() => handleEnroll(quiz.id, quiz.isExpired || false)}
                  onStart={() => handleStartQuiz(quiz.id)}
                  actionElement={
                    quiz.attempted && quiz.attemptId ? (
                      <Link href={`/student/results/${quiz.attemptId}`}>
                        <Button 
                          variant="outline" 
                          className="w-full border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/20"
                        >
                          View Results
                        </Button>
                      </Link>
                    ) : undefined
                  }
                />
              );
            })}
          </div>
        )}
      </Section>
    </PageContainer>
  );
}
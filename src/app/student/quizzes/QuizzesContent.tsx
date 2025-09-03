"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { logger } from "@/lib/logger";
import { 
  processSafeQuiz, 
  safeArray,
  type SafeQuiz
} from "@/lib/safe-data-utils";
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

// Cache for quiz data
const quizCache = {
  data: null as SafeQuiz[] | null,
  timestamp: 0,
  TTL: 60000 // 1 minute cache
};

export default function QuizzesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [quizzes, setQuizzes] = useState<SafeQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  // Format date for display only - not for calculations
  const formatQuizDate = useCallback((dateString: string | null) => {
    if (!dateString) return "Not scheduled";
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    } catch {
      return "Invalid date";
    }
  }, []);


  // Get quiz display status from backend-calculated data
  const getQuizStatus = useCallback((quiz: SafeQuiz) => {
    // Backend provides the single source of truth for availability
    const statusColorMap = {
      'active': 'green' as const,
      'ended': 'red' as const,
      'upcoming': 'amber' as const,
      'not_scheduled': 'amber' as const
    };

    return {
      available: quiz.availabilityStatus === 'active',
      text: quiz.availabilityMessage || 'Status unknown',
      expired: quiz.availabilityStatus === 'ended',
      color: statusColorMap[quiz.availabilityStatus as keyof typeof statusColorMap] || 'amber' as const
    };
  }, []);

  // Fetch quizzes with caching
  const fetchQuizzes = useCallback(async (force = false) => {
    try {
      // Check cache first
      if (!force && quizCache.data && Date.now() - quizCache.timestamp < quizCache.TTL) {
        setQuizzes(quizCache.data);
        setLoading(false);
        return;
      }

      const response = await fetch("/api/student/quizzes?status=all");
      if (response.ok) {
        const data = await response.json();
        
        // Process quizzes with safe null handling
        const processedQuizzes = safeArray(
          data.quizzes || [],
          processSafeQuiz
        ).sort((a, b) => {
          // Sort by startTime descending (most recent first)
          const aTime = a.startTime ? new Date(a.startTime).getTime() : 0;
          const bTime = b.startTime ? new Date(b.startTime).getTime() : 0;
          return bTime - aTime;
        });
        
        // Update cache
        quizCache.data = processedQuizzes;
        quizCache.timestamp = Date.now();
        
        setQuizzes(processedQuizzes);
      } else {
        logger.error('Failed to fetch quizzes:', response.status);
        setQuizzes([]); // Set empty array on error
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
  const handleEnroll = useCallback(async (quizId: string, isExpired: boolean, isReassignment: boolean = false) => {
    if (isExpired && !isReassignment) {
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
                           (filterStatus === "available" && !quiz.attempted && (!quiz.isExpired || quiz.isReassignment)) ||
                           (filterStatus === "completed" && quiz.attempted);
      return matchesSearch && matchesFilter;
    });
  }, [quizzes, searchTerm, filterStatus]);

  // Calculate filter counts with single pass optimization
  const filterCounts = useMemo(() => {
    return quizzes.reduce((counts, quiz) => {
      counts.all++;
      if (quiz.attempted) {
        counts.completed++;
      } else if (!quiz.isExpired || quiz.isReassignment) {
        counts.available++;
      }
      return counts;
    }, { all: 0, available: 0, completed: 0 });
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
        title="Available Quizzes"
        subtitle="Quizzes from your current educators"
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
                  educatorName={quiz.educatorName}
                  totalQuestions={quiz.totalQuestions}
                  duration={quiz.duration}
                  startTimeFormatted={formatQuizDate(quiz.startTime)}
                  statusText={quizStatus.text}
                  statusColor={quizStatus.color}
                  attempted={quiz.attempted}
                  enrolled={quiz.enrolled}
                  score={quiz.score}
                  isExpired={quiz.isExpired || false}
                  isAvailable={quizStatus.available}
                  isReassignment={quiz.isReassignment}
                  reassignmentReason={quiz.reassignmentReason}
                  onEnroll={() => handleEnroll(quiz.id, quiz.isExpired || false, quiz.isReassignment || false)}
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
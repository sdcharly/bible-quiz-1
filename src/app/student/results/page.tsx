"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { fetchWithOptimizedCache } from "@/lib/api-cache";
import { withErrorBoundary } from "@/components/student/StudentPageWrapper";
import { 
  processSafeQuizResult, 
  safeArray,
  calculateSafeStatistics,
  type SafeQuizResult 
} from "@/lib/safe-data-utils";
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
  TrendingUp,
  Target
} from "lucide-react";

function StudentResultsPage() {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<SafeQuizResult[]>([]);
  const [filter, setFilter] = useState<'all' | 'passed' | 'failed'>('all');
  
  // Use ref to track mounted state
  const isMountedRef = useRef(true);
  
  // Memoized filter handlers to prevent re-renders
  const handleFilterChange = useCallback((newFilter: 'all' | 'passed' | 'failed') => {
    setFilter(newFilter);
  }, []);

  const fetchResults = useCallback(async () => {
    try {
      const result = await fetchWithOptimizedCache('/api/student/results', { ttl: 60 }); // 1 min cache
      
      // Check if component is still mounted before updating state
      if (!isMountedRef.current) return;
      
      if (result.data) {
        const data = result.data;
        
        // Use safe processing to handle null values properly
        const processedResults = safeArray(
          data.results || [], 
          processSafeQuizResult
        )
        .filter(r => r.status === 'completed')
        .sort((a, b) => {
          const dateA = new Date(a.completedAt).getTime();
          const dateB = new Date(b.completedAt).getTime();
          return dateB - dateA; // Most recent first
        });
        
        // Check mounted state before setState
        if (isMountedRef.current) {
          setResults(processedResults);
        }
      } else {
        logger.error('Failed to fetch results');
        // Check mounted state before setState
        if (isMountedRef.current) {
          setResults([]); // Set empty array on error
        }
      }
    } catch (error) {
      logger.error('Error fetching results:', error);
      // Check mounted state before setState
      if (isMountedRef.current) {
        setResults([]); // Set empty array on error
      }
    } finally {
      // Check mounted state before setState
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    // Set mounted to true on mount
    isMountedRef.current = true;
    
    fetchResults();
    
    // Cleanup function to set mounted to false
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchResults]);

  // Memoize filtered results and statistics
  const filteredResults = useMemo(() => {
    return results.filter(result => {
      if (filter === 'all') return true;
      if (filter === 'passed') return result.score >= 70;
      if (filter === 'failed') return result.score < 70;
      return true;
    });
  }, [results, filter]);

  // Use safe statistics calculation
  const stats = useMemo(() => calculateSafeStatistics(results), [results]);

  // Filter options with counts
  const filterOptions = useMemo(() => [
    { value: "all", label: "All", count: stats.total },
    { value: "passed", label: "Passed", count: stats.passed },
    { value: "failed", label: "Failed", count: stats.failed }
  ], [stats]);

  if (loading) {
    return (
      <PageContainer>
        <LoadingState text="Loading your results..." fullPage />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="All Quiz Results"
        subtitle="Your complete quiz history including past educators"
        breadcrumbs={[
          { label: "Results" }
        ]}
        actions={
          <Link href="/student/dashboard">
            <Button variant="outline">
              Back to Dashboard
            </Button>
          </Link>
        }
      />

      {/* Stats Cards */}
      <Section className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Quizzes"
            value={stats.total}
            icon={BookOpen}
            description="Completed quizzes"
          />
          <StatCard
            label="Passed"
            value={stats.passed}
            icon={Target}
            description="Score ≥ 70%"
            trend={stats.passed > stats.failed ? { value: stats.passed, direction: "up" } : undefined}
          />
          <StatCard
            label="Failed"
            value={stats.failed}
            icon={Trophy}
            description="Score < 70%"
          />
          <StatCard
            label="Average Score"
            value={`${stats.averageScore}%`}
            icon={TrendingUp}
            description="Overall performance"
            trend={stats.averageScore >= 70 ? { value: stats.averageScore, direction: "up" } : stats.averageScore >= 50 ? { value: stats.averageScore, direction: "neutral" } : { value: stats.averageScore, direction: "down" }}
          />
        </div>
      </Section>

      {/* Filters */}
      <Section className="mt-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100 dark:border-amber-900/20 p-4">
          <div className="flex gap-2">
            {filterOptions.map((option) => (
              <Button
                key={option.value}
                variant={filter === option.value ? "default" : "outline"}
                onClick={() => handleFilterChange(option.value as 'all' | 'passed' | 'failed')}
                className={filter === option.value
                  ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-600"
                  : "border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/20"
                }
              >
                {option.label} ({option.count})
              </Button>
            ))}
          </div>
        </div>
      </Section>

      {/* Results List */}
      <Section className="mt-6">
        {filteredResults.length > 0 ? (
          <div className="space-y-4">
            {filteredResults.map((result) => (
              <ResultCard
                key={result.id}
                id={result.id}
                quizTitle={result.quizTitle}
                score={result.score}
                correctAnswers={result.correctAnswers}
                totalQuestions={result.totalQuestions}
                completedAt={result.completedAt}
                duration={result.duration}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Trophy}
            title={filter !== 'all' 
              ? `No ${filter} results found`
              : "No Results Yet"
            }
            description={filter !== 'all' 
              ? "Try changing the filter to see more results"
              : "You haven't completed any quizzes yet. Start your first quiz to see results here!"
            }
            action={
              filter === 'all' ? {
                label: "Browse Quizzes",
                onClick: () => window.location.href = "/student/quizzes",
                variant: "default" as const
              } : {
                label: "Show All Results",
                onClick: () => setFilter('all'),
                variant: "outline" as const
              }
            }
          />
        )}
      </Section>
    </PageContainer>
  );
}

export default withErrorBoundary(StudentResultsPage);
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
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

interface QuizResult {
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

export default function StudentResultsPage() {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [filter, setFilter] = useState<'all' | 'passed' | 'failed'>('all');

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const response = await fetch('/api/student/results');
      if (response.ok) {
        const data = await response.json();
        const completedResults = (data.results || [])
          .filter((r: any) => r.status === 'completed')
          .sort((a: any, b: any) => 
            new Date(b.completedAt || b.createdAt).getTime() - 
            new Date(a.completedAt || a.createdAt).getTime()
          );
        setResults(completedResults);
      }
    } catch (error) {
      logger.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  // Memoize filtered results and statistics
  const filteredResults = useMemo(() => {
    return results.filter(result => {
      if (filter === 'all') return true;
      if (filter === 'passed') return result.score >= 70;
      if (filter === 'failed') return result.score < 70;
      return true;
    });
  }, [results, filter]);

  const stats = useMemo(() => ({
    total: results.length,
    passed: results.filter(r => r.score >= 70).length,
    failed: results.filter(r => r.score < 70).length,
    averageScore: results.length > 0 
      ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
      : 0
  }), [results]);

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
        title="Quiz Results"
        subtitle="View your quiz performance history"
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
                onClick={() => setFilter(option.value as 'all' | 'passed' | 'failed')}
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
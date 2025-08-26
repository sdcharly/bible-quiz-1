"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Users,
  Clock,
  Trophy,
  TrendingUp,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
} from "lucide-react";
import { PageHeader } from "@/components/educator-v2/layout/PageHeader";
import { PageContainer } from "@/components/educator-v2/layout/PageContainer";
import { Section } from "@/components/educator-v2/layout/Section";
import { LoadingState } from "@/components/educator-v2/feedback/LoadingState";
import { EmptyState } from "@/components/educator-v2/feedback/EmptyState";
import { logger } from "@/lib/logger";

interface StudentAttempt {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  score: number;
  isPassed: boolean;
  correctAnswers: number;
  totalQuestions: number;
  timeTaken: number;
  completedAt: string;
  status: string;
}

interface QuizStatistics {
  totalAttempts: number;
  averageScore: number;
  passRate: number;
  averageTime: number;
  highestScore: number;
  lowestScore: number;
}

interface QuizResults {
  quizId: string;
  quizTitle: string;
  statistics: QuizStatistics;
  attempts: StudentAttempt[];
}

export default function EducatorQuizResultsPage() {
  const params = useParams();
  const quizId = params.id as string;
  
  const [results, setResults] = useState<QuizResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"all" | "passed" | "failed">("all");

  useEffect(() => {
    fetchResults();
  }, [quizId]);

  const fetchResults = async () => {
    try {
      const response = await fetch(`/api/educator/quiz/${quizId}/results`);
      if (response.ok) {
        const data = await response.json();
        setResults(data);
      } else {
        logger.error("Failed to fetch quiz results");
      }
    } catch (error) {
      logger.error("Error fetching quiz results:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const getFilteredAttempts = () => {
    if (!results) return [];
    
    switch (filterStatus) {
      case "passed":
        return results.attempts.filter(a => a.isPassed);
      case "failed":
        return results.attempts.filter(a => !a.isPassed);
      default:
        return results.attempts;
    }
  };

  if (loading) {
    return <LoadingState fullPage text="Loading quiz results..." />;
  }

  if (!results) {
    return (
      <PageContainer>
        <EmptyState
          icon={AlertCircle}
          title="No Results Yet"
          description="No students have attempted this quiz yet."
          action={{
            label: "Return to Dashboard",
            onClick: () => window.location.href = "/educator/dashboard"
          }}
        />
      </PageContainer>
    );
  }

  const filteredAttempts = getFilteredAttempts();

  return (
    <PageContainer>
      <PageHeader
        title="Quiz Results"
        subtitle={results.quizTitle}
        icon={TrendingUp}
        backButton={{
          href: "/educator/dashboard",
          label: "Dashboard"
        }}
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Total Attempts</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {results.statistics.totalAttempts}
              </p>
            </div>
            <Users className="h-8 w-8 text-amber-600 opacity-20" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Average Score</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {results.statistics.averageScore.toFixed(1)}%
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-amber-600 opacity-20" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Pass Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {results.statistics.passRate.toFixed(1)}%
              </p>
            </div>
            <Trophy className="h-8 w-8 text-amber-600 opacity-20" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Avg. Time</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatTime(results.statistics.averageTime)}
              </p>
            </div>
            <Clock className="h-8 w-8 text-amber-600 opacity-20" />
          </div>
        </div>
      </div>

      {/* Score Distribution */}
      <Section
        title="Score Distribution"
        description="Performance overview across all attempts"
        icon={TrendingUp}
        className="mb-8"
      >
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Highest Score</p>
            <p className="text-2xl font-bold text-amber-600">
              {results.statistics.highestScore}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Average Score</p>
            <p className="text-2xl font-bold text-amber-600">
              {results.statistics.averageScore.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Lowest Score</p>
            <p className="text-2xl font-bold text-orange-600">
              {results.statistics.lowestScore}%
            </p>
          </div>
        </div>
      </Section>

      {/* Student Attempts Table */}
      <Section
        title="Student Attempts"
        description="Detailed view of all quiz attempts"
        icon={Users}
        actions={
          <div className="flex gap-2">
            <Button
              variant={filterStatus === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("all")}
              className={filterStatus === "all" ? "bg-amber-600 hover:bg-amber-700" : "border-amber-200 hover:bg-amber-50"}
            >
              All ({results.attempts.length})
            </Button>
            <Button
              variant={filterStatus === "passed" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("passed")}
              className={filterStatus === "passed" ? "bg-amber-600 hover:bg-amber-700" : "border-amber-200 hover:bg-amber-50"}
            >
              Passed ({results.attempts.filter(a => a.isPassed).length})
            </Button>
            <Button
              variant={filterStatus === "failed" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("failed")}
              className={filterStatus === "failed" ? "bg-amber-600 hover:bg-amber-700" : "border-amber-200 hover:bg-amber-50"}
            >
              Failed ({results.attempts.filter(a => !a.isPassed).length})
            </Button>
          </div>
        }
      >
        {filteredAttempts.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No attempts match the selected filter"
            description="Try changing the filter to view different results."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-amber-50 dark:bg-amber-900/20">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Correct/Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Time Taken
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Completed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {filteredAttempts.map((attempt) => (
                  <tr key={attempt.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {attempt.studentName}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {attempt.studentEmail}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-lg font-bold ${
                        attempt.isPassed ? "text-amber-600" : "text-orange-600"
                      }`}>
                        {attempt.score}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {attempt.isPassed ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Passed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          <XCircle className="h-3 w-3 mr-1" />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {attempt.correctAnswers}/{attempt.totalQuestions}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatTime(attempt.timeTaken)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {attempt.completedAt && attempt.status === "completed" 
                        ? new Date(attempt.completedAt).toLocaleDateString()
                        : attempt.status === "failed" 
                          ? "Failed" 
                          : "Not completed"
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/educator/quiz/${quizId}/attempt/${attempt.id}`}>
                        <Button variant="ghost" size="sm" className="hover:bg-amber-50">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </PageContainer>
  );
}
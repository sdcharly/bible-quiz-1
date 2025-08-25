"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BiblicalPageLoader } from "@/components/ui/biblical-loader";
import { 
  Trophy, 
  BookOpen, 
  Calendar,
  CheckCircle,
  XCircle,
  Eye,
  ArrowLeft,
  Clock
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
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <BiblicalPageLoader text="Loading your results..." />;
  }

  const filteredResults = results.filter(result => {
    if (filter === 'all') return true;
    if (filter === 'passed') return result.score >= 70;
    if (filter === 'failed') return result.score < 70;
    return true;
  });

  const stats = {
    total: results.length,
    passed: results.filter(r => r.score >= 70).length,
    failed: results.filter(r => r.score < 70).length,
    averageScore: results.length > 0 
      ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
      : 0
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Quiz Results
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                View your quiz performance history
              </p>
            </div>
            <Link href="/student/dashboard">
              <Button variant="outline" className="bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Quizzes</CardDescription>
              <CardTitle className="text-2xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Passed</CardDescription>
              <CardTitle className="text-2xl text-green-600">{stats.passed}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Failed</CardDescription>
              <CardTitle className="text-2xl text-red-600">{stats.failed}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Average Score</CardDescription>
              <CardTitle className="text-2xl">{stats.averageScore}%</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            className={filter === 'all' ? 'bg-amber-600 hover:bg-amber-700' : ''}
          >
            All ({stats.total})
          </Button>
          <Button
            variant={filter === 'passed' ? 'default' : 'outline'}
            onClick={() => setFilter('passed')}
            className={filter === 'passed' ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            Passed ({stats.passed})
          </Button>
          <Button
            variant={filter === 'failed' ? 'default' : 'outline'}
            onClick={() => setFilter('failed')}
            className={filter === 'failed' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            Failed ({stats.failed})
          </Button>
        </div>

        {/* Results List */}
        {filteredResults.length > 0 ? (
          <div className="grid gap-4">
            {filteredResults.map((result) => (
              <Card key={result.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{result.quizTitle}</h3>
                        {result.score >= 70 ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Trophy className="h-4 w-4" />
                          Score: {result.score}%
                        </span>
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4" />
                          {result.correctAnswers}/{result.totalQuestions} correct
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(result.completedAt).toLocaleDateString()}
                        </span>
                        {result.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {Math.round(result.duration / 60)} min
                          </span>
                        )}
                      </div>
                    </div>
                    <Link href={`/student/results/${result.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Results Yet</h3>
              <p className="text-gray-500 mb-4">
                {filter !== 'all' 
                  ? `No ${filter} quizzes found. Try changing the filter.`
                  : "You haven't completed any quizzes yet. Start your first quiz to see results here!"
                }
              </p>
              {filter === 'all' && (
                <Link href="/student/quizzes">
                  <Button className="bg-amber-600 hover:bg-amber-700">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Browse Quizzes
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
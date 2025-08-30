"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { safeNumber, safeString } from "@/lib/safe-data-utils";
import {
  PageContainer,
  PageHeader,
  Section,
  LoadingState,
  EmptyState
} from "@/components/student-v2";
import {
  CheckCircle,
  XCircle,
  Clock,
  Trophy,
  BookOpen,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Target,
  TrendingUp
} from "lucide-react";

interface QuestionResult {
  id: string;
  questionText: string;
  options: { id: string; text: string }[];
  correctAnswer: string;
  selectedAnswer: string;
  isCorrect: boolean;
  explanation?: string;
  book?: string;
  chapter?: string;
  topic?: string;
  timeSpent: number;
  markedForReview: boolean;
}

interface QuizResult {
  attemptId: string;
  quizTitle: string;
  score: number;
  grade: string;
  gradePoints: number;
  gradeDescription: string;
  correctAnswers: number;
  totalQuestions: number;
  wrongAnswers: number;
  timeTaken: number;
  questions: QuestionResult[];
}

export default function QuizResultsPage() {
  const params = useParams();
  const attemptId = params.id as string;
  
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [resultsLocked, setResultsLocked] = useState(false);
  const [lockMessage, setLockMessage] = useState("");
  const [availableAt, setAvailableAt] = useState<string | null>(null);

  useEffect(() => {
    fetchResults();
  }, [attemptId]);

  const fetchResults = async () => {
    try {
      // Don't cache locked results
      const response = await fetch(`/api/student/results/${attemptId}`);
      if (response.status === 425) {
        const data = await response.json();
        setResultsLocked(true);
        setLockMessage(data.message);
        setAvailableAt(data.availableAt);
      } else if (response.ok) {
        const data = await response.json();
        // Apply safe processing to result data
        const safeResult: QuizResult = {
          attemptId: safeString(data.attemptId || attemptId),
          quizTitle: safeString(data.quizTitle, "Untitled Quiz"),
          score: safeNumber(data.score, 0),
          grade: safeString(data.grade, "N/A"),
          gradePoints: safeNumber(data.gradePoints, 0),
          gradeDescription: safeString(data.gradeDescription, ""),
          correctAnswers: safeNumber(data.correctAnswers ?? data.totalCorrect, 0),
          totalQuestions: safeNumber(data.totalQuestions, 0),
          wrongAnswers: safeNumber(data.wrongAnswers, 0),
          timeTaken: safeNumber(data.timeTaken ?? data.timeSpent, 0),
          questions: Array.isArray(data.questions) ? data.questions.map((q: any) => ({
            id: safeString(q.id),
            questionText: safeString(q.questionText, "Question text not available"),
            options: Array.isArray(q.options) ? q.options : [],
            correctAnswer: safeString(q.correctAnswer),
            selectedAnswer: safeString(q.selectedAnswer),
            isCorrect: Boolean(q.isCorrect),
            explanation: q.explanation ? safeString(q.explanation) : undefined,
            book: q.book ? safeString(q.book) : undefined,
            chapter: q.chapter ? safeString(q.chapter) : undefined,
            topic: q.topic ? safeString(q.topic) : undefined,
            timeSpent: safeNumber(q.timeSpent, 0),
            markedForReview: Boolean(q.markedForReview)
          })) : []
        };
        setResult(safeResult);
      } else {
        logger.error("Failed to fetch results");
      }
    } catch (error) {
      logger.error("Error fetching results:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestionExpansion = (questionId: string) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId);
    } else {
      newExpanded.add(questionId);
    }
    setExpandedQuestions(newExpanded);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingState text="Loading quiz results..." fullPage />
      </PageContainer>
    );
  }

  if (resultsLocked) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-amber-100 dark:border-amber-900/20">
            <Clock className="h-16 w-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
              Results Not Available Yet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{lockMessage}</p>
            {availableAt && (
              <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
                Results will be available at: {new Date(availableAt).toLocaleString()}
              </p>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
              This security measure ensures fairness for all participants.
            </p>
            <Link href="/student/dashboard">
              <Button className="bg-amber-600 hover:bg-amber-700">Return to Dashboard</Button>
            </Link>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!result) {
    return (
      <PageContainer>
        <EmptyState
          icon={AlertCircle}
          title="Results Not Found"
          description="Unable to load quiz results. Please try again later."
          action={{
            label: "Return to Dashboard",
            onClick: () => window.location.href = "/student/dashboard",
            variant: "default"
          }}
        />
      </PageContainer>
    );
  }

  const isPassed = result.score >= 70;
  
  return (
    <PageContainer>
      <PageHeader
        title="Quiz Results"
        subtitle={result.quizTitle}
        breadcrumbs={[
          { label: "Results", href: "/student/results" },
          { label: "Details" }
        ]}
        actions={
          <Link href="/student/results">
            <Button variant="outline">
              Back to Results
            </Button>
          </Link>
        }
      />

      {/* Score Summary */}
      <Section className="mt-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100 dark:border-amber-900/20 p-6">
          <div className="text-center mb-8">
            {isPassed ? (
              <div>
                <Trophy className="h-16 w-16 text-amber-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                  {result.gradeDescription} Performance!
                </h2>
                <div className="text-4xl font-bold text-amber-600 dark:text-amber-400 mb-2">
                  {result.score}%
                </div>
                <div className="inline-flex items-center px-4 py-2 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full text-sm font-semibold">
                  Grade: {result.grade}
                </div>
              </div>
            ) : (
              <div>
                <Target className="h-16 w-16 text-amber-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mb-2">
                  Keep Practicing!
                </h2>
                <div className="text-4xl font-bold text-amber-600 dark:text-amber-400 mb-2">
                  {result.score}%
                </div>
                <div className="inline-flex items-center px-4 py-2 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-full text-sm font-semibold">
                  Grade: {result.grade}
                </div>
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/10 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {result.correctAnswers}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Correct</div>
            </div>
            <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/10 rounded-lg">
              <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {result.wrongAnswers}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Wrong</div>
            </div>
            <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/10 rounded-lg">
              <BookOpen className="h-8 w-8 text-amber-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {result.totalQuestions}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
            </div>
            <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/10 rounded-lg">
              <Clock className="h-8 w-8 text-amber-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatTime(result.timeTaken)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Time</div>
            </div>
          </div>
        </div>
      </Section>

      {/* Question Breakdown */}
      <Section className="mt-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100 dark:border-amber-900/20">
          <div className="p-6 border-b border-amber-100 dark:border-amber-900/20">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Question Breakdown
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Review your answers and see explanations
            </p>
          </div>
          
          <div className="divide-y divide-amber-100 dark:divide-amber-900/20">
            {result.questions.filter(question => question && question.id && question.options).map((question, index) => {
              const isExpanded = expandedQuestions.has(question.id);
              const correctOption = question.options.find(opt => opt && opt.id === question.correctAnswer);
              const selectedOption = question.options.find(opt => opt && opt.id === question.selectedAnswer);
              
              return (
                <div key={question.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-semibold text-gray-500">
                          Question {index + 1}
                        </span>
                        {question.isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        {question.markedForReview && (
                          <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs rounded">
                            Marked for Review
                          </span>
                        )}
                      </div>
                      
                      {/* Question metadata */}
                      {(question.book || question.chapter || question.topic) && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {question.book && (
                            <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs rounded">
                              {question.book}
                            </span>
                          )}
                          {question.chapter && (
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs rounded">
                              Chapter {question.chapter}
                            </span>
                          )}
                          {question.topic && (
                            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-xs rounded">
                              {question.topic}
                            </span>
                          )}
                        </div>
                      )}
                      
                      <p className="text-gray-900 dark:text-white leading-relaxed">
                        {question.questionText}
                      </p>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleQuestionExpansion(question.id)}
                      className="ml-4"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  {isExpanded && (
                    <div className="space-y-4">
                      {/* Answer Summary */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className={`p-4 rounded-lg border-2 ${
                          question.isCorrect 
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        }`}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              Your Answer:
                            </span>
                            {question.isCorrect ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {selectedOption?.text || "Not answered"}
                          </p>
                        </div>
                        
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              Correct Answer:
                            </span>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {correctOption?.text}
                          </p>
                        </div>
                      </div>
                      
                      {/* Time spent */}
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Clock className="h-4 w-4" />
                        <span>Time spent: {formatTime(question.timeSpent)}</span>
                      </div>
                      
                      {/* Explanation */}
                      {question.explanation && (
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg">
                          <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                            Explanation:
                          </h4>
                          <p className="text-sm text-amber-700 dark:text-amber-300">
                            {question.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* Action Buttons */}
      <Section className="mt-6 pb-8">
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/student/quizzes" className="flex-1">
            <Button className="w-full bg-amber-600 hover:bg-amber-700">
              <BookOpen className="h-4 w-4 mr-2" />
              Take Another Quiz
            </Button>
          </Link>
          <Link href="/student/results" className="flex-1">
            <Button variant="outline" className="w-full">
              <TrendingUp className="h-4 w-4 mr-2" />
              View All Results
            </Button>
          </Link>
        </div>
      </Section>
    </PageContainer>
  );
}
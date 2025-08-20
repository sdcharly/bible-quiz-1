"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Trophy,
  BookOpen,
  AlertCircle,
  ChevronDown,
  ChevronUp,
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

  useEffect(() => {
    fetchResults();
  }, [attemptId]);

  const [resultsLocked, setResultsLocked] = useState(false);
  const [lockMessage, setLockMessage] = useState("");
  const [availableAt, setAvailableAt] = useState<string | null>(null);

  const fetchResults = async () => {
    try {
      const response = await fetch(`/api/student/results/${attemptId}`);
      if (response.status === 425) {
        // Results not available yet
        const data = await response.json();
        setResultsLocked(true);
        setLockMessage(data.message);
        setAvailableAt(data.availableAt);
      } else if (response.ok) {
        const data = await response.json();
        setResult(data);
      } else {
        console.error("Failed to fetch results");
      }
    } catch (error) {
      console.error("Error fetching results:", error);
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

  const getOptionLabel = (optionId: string) => {
    return optionId.toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (resultsLocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <Clock className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Results Not Available Yet</h2>
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
            <Button>Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Results Not Found</h2>
          <Link href="/student/dashboard">
            <Button>Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <Link href="/student/dashboard">
              <Button variant="ghost" size="sm" className="mr-4">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Quiz Results
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {result.quizTitle}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Score Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="text-center mb-6">
            {result.grade.startsWith('A') || result.grade.startsWith('B') ? (
              <div>
                <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {result.gradeDescription} Performance!
                </h2>
              </div>
            ) : result.grade.startsWith('C') ? (
              <div>
                <BookOpen className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {result.gradeDescription} - Keep Improving!
                </h2>
              </div>
            ) : (
              <div>
                <AlertCircle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  More Study Needed
                </h2>
              </div>
            )}
            
            <div className="mt-6">
              <div className="text-6xl font-bold text-gray-900 dark:text-white mb-2">
                {result.grade}
              </div>
              <div className="text-3xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {result.score}%
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Grade Points: {result.gradePoints.toFixed(1)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {result.correctAnswers}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Correct</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {result.wrongAnswers}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Wrong</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {result.totalQuestions}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatTime(result.timeTaken)}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Time Taken</p>
            </div>
          </div>
        </div>

        {/* Question Review */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Question Review
            </h3>
          </div>
          
          <div className="divide-y dark:divide-gray-700">
            {result.questions.map((question, index) => (
              <div key={question.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500">
                      Q{index + 1}
                    </span>
                    {question.isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    {question.markedForReview && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        Marked for Review
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleQuestionExpansion(question.id)}
                  >
                    {expandedQuestions.has(question.id) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Biblical Reference */}
                {question.book && (
                  <div className="mb-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                      📖 {question.book} {question.chapter}
                    </span>
                  </div>
                )}

                {/* Question Text */}
                <p className="text-gray-900 dark:text-white mb-4">
                  {question.questionText}
                </p>

                {/* Show answers summary */}
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 dark:text-gray-400">Your Answer:</span>
                    <span className={`font-medium ${
                      question.isCorrect ? "text-green-600" : "text-red-600"
                    }`}>
                      {getOptionLabel(question.selectedAnswer || "Not Answered")}
                    </span>
                  </div>
                  {!question.isCorrect && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 dark:text-gray-400">Correct Answer:</span>
                      <span className="font-medium text-green-600">
                        {getOptionLabel(question.correctAnswer)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">
                      {Math.round(question.timeSpent)}s
                    </span>
                  </div>
                </div>

                {/* Expanded View */}
                {expandedQuestions.has(question.id) && (
                  <div className="mt-6 space-y-4">
                    {/* Options */}
                    <div className="space-y-2">
                      <p className="font-medium text-gray-700 dark:text-gray-300">Options:</p>
                      {question.options.map((option) => {
                        const isSelected = question.selectedAnswer === option.id;
                        const isCorrect = question.correctAnswer === option.id;
                        
                        return (
                          <div
                            key={option.id}
                            className={`p-3 rounded-lg border ${
                              isCorrect
                                ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                                : isSelected
                                ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                                : "border-gray-300 dark:border-gray-600"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {getOptionLabel(option.id)}:
                              </span>
                              <span>{option.text}</span>
                              {isCorrect && (
                                <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
                              )}
                              {isSelected && !isCorrect && (
                                <XCircle className="h-4 w-4 text-red-500 ml-auto" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    {question.explanation && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                        <p className="font-medium text-blue-900 dark:text-blue-300 mb-2">
                          Explanation:
                        </p>
                        <p className="text-gray-700 dark:text-gray-300">
                          {question.explanation}
                        </p>
                      </div>
                    )}

                    {/* Topic */}
                    {question.topic && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Topic:</span> {question.topic}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-center gap-4">
          <Link href="/student/quizzes">
            <Button variant="outline">
              <BookOpen className="h-4 w-4 mr-2" />
              Browse More Quizzes
            </Button>
          </Link>
          <Link href="/student/dashboard">
            <Button>
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
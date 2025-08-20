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
  BarChart,
  TrendingUp,
  User,
  Calendar,
  Target,
  Brain,
  Timer,
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
  difficulty?: string;
  bloomsLevel?: string;
  timeSpent: number;
  markedForReview: boolean;
}

interface Analytics {
  byDifficulty: {
    easy: { total: number; correct: number; percentage: number };
    medium: { total: number; correct: number; percentage: number };
    hard: { total: number; correct: number; percentage: number };
  };
  byBloomsLevel: Record<string, { total: number; correct: number; percentage: number }>;
  byTopic: Record<string, { total: number; correct: number; percentage: number }>;
  timeAnalysis: {
    averageTimePerQuestion: number;
    fastestQuestion: { questionNumber: number; questionText: string; time: number } | null;
    slowestQuestion: { questionNumber: number; questionText: string; time: number } | null;
    totalTime: number;
  };
  questionPerformance: { questionNumber: number; isCorrect: boolean; timeSpent: number; topic?: string; difficulty?: string; bloomsLevel?: string }[];
}

interface AttemptDetail {
  attemptId: string;
  quizTitle: string;
  studentName: string;
  studentEmail: string;
  score: number;
  grade: string;
  gradePoints: number;
  gradeDescription: string;
  correctAnswers: number;
  totalQuestions: number;
  wrongAnswers: number;
  timeTaken: number;
  startTime: string;
  endTime: string;
  status: string;
  questions: QuestionResult[];
  analytics: Analytics;
}

export default function EducatorAttemptDetailPage() {
  const params = useParams();
  const quizId = params.id as string;
  const attemptId = params.attemptId as string;
  
  const [attempt, setAttempt] = useState<AttemptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"questions" | "analytics">("analytics");

  useEffect(() => {
    fetchAttemptDetails();
  }, [attemptId]);

  const fetchAttemptDetails = async () => {
    try {
      const response = await fetch(`/api/educator/attempt/${attemptId}`);
      if (response.ok) {
        const data = await response.json();
        setAttempt(data);
      } else {
        console.error("Failed to fetch attempt details");
      }
    } catch (error) {
      console.error("Error fetching attempt details:", error);
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

  if (!attempt) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Attempt Not Found</h2>
          <Link href={`/educator/quiz/${quizId}/results`}>
            <Button>Back to Results</Button>
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
            <Link href={`/educator/quiz/${quizId}/results`}>
              <Button variant="ghost" size="sm" className="mr-4">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Detailed Attempt Analysis
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {attempt.quizTitle} - {attempt.studentName}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Student Info & Score Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Student Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="h-5 w-5" />
              Student Information
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                <p className="font-medium">{attempt.studentName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                <p className="font-medium">{attempt.studentEmail}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Started At</p>
                  <p className="font-medium">{new Date(attempt.startTime).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Completed At</p>
                  <p className="font-medium">{new Date(attempt.endTime).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Score Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Performance Summary
            </h3>
            <div className="text-center mb-4">
              <div className="text-5xl font-bold text-gray-900 dark:text-white">
                {attempt.grade}
              </div>
              <div className="text-2xl font-semibold text-gray-700 dark:text-gray-300">
                {attempt.score}%
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                {attempt.gradeDescription} • {attempt.gradePoints.toFixed(1)} points
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xl font-bold text-green-600">
                  {attempt.correctAnswers}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Correct</p>
              </div>
              <div>
                <div className="text-xl font-bold text-red-600">
                  {attempt.wrongAnswers}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Wrong</p>
              </div>
              <div>
                <div className="text-xl font-bold text-blue-600">
                  {formatTime(attempt.timeTaken)}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Time</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
          <div className="border-b dark:border-gray-700">
            <div className="flex">
              <button
                onClick={() => setActiveTab("analytics")}
                className={`px-6 py-3 font-medium ${
                  activeTab === "analytics"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                <BarChart className="h-4 w-4 inline mr-2" />
                Analytics
              </button>
              <button
                onClick={() => setActiveTab("questions")}
                className={`px-6 py-3 font-medium ${
                  activeTab === "questions"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                <BookOpen className="h-4 w-4 inline mr-2" />
                Question Review
              </button>
            </div>
          </div>
        </div>

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            {/* Performance by Difficulty */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Target className="h-5 w-5" />
                Performance by Difficulty
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(attempt.analytics.byDifficulty).map(([level, stats]) => (
                  <div key={level} className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400 capitalize mb-2">
                      {level}
                    </p>
                    <div className="text-3xl font-bold mb-1">
                      {stats.percentage}%
                    </div>
                    <p className="text-sm text-gray-500">
                      {stats.correct}/{stats.total} correct
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance by Bloom&apos;s Taxonomy */}
            {Object.keys(attempt.analytics.byBloomsLevel).length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Performance by Bloom&apos;s Taxonomy
                </h3>
                <div className="space-y-3">
                  {Object.entries(attempt.analytics.byBloomsLevel).map(([level, stats]) => (
                    <div key={level} className="flex items-center justify-between">
                      <span className="font-medium capitalize">{level}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">
                          {stats.correct}/{stats.total}
                        </span>
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${stats.percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">
                          {stats.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Performance by Topic */}
            {Object.keys(attempt.analytics.byTopic).length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Performance by Topic
                </h3>
                <div className="space-y-3">
                  {Object.entries(attempt.analytics.byTopic).map(([topic, stats]) => (
                    <div key={topic} className="flex items-center justify-between">
                      <span className="font-medium">{topic}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">
                          {stats.correct}/{stats.total}
                        </span>
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${stats.percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">
                          {stats.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Time Analysis */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Timer className="h-5 w-5" />
                Time Analysis
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Time</p>
                  <p className="text-xl font-bold">{formatTime(attempt.analytics.timeAnalysis.totalTime)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg per Question</p>
                  <p className="text-xl font-bold">{attempt.analytics.timeAnalysis.averageTimePerQuestion}s</p>
                </div>
                {attempt.analytics.timeAnalysis.fastestQuestion && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Fastest Question</p>
                    <p className="text-xl font-bold">Q{attempt.analytics.timeAnalysis.fastestQuestion.questionNumber}</p>
                    <p className="text-sm text-gray-500">{attempt.analytics.timeAnalysis.fastestQuestion.time}s</p>
                  </div>
                )}
                {attempt.analytics.timeAnalysis.slowestQuestion && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Slowest Question</p>
                    <p className="text-xl font-bold">Q{attempt.analytics.timeAnalysis.slowestQuestion.questionNumber}</p>
                    <p className="text-sm text-gray-500">{attempt.analytics.timeAnalysis.slowestQuestion.time}s</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Questions Tab */}
        {activeTab === "questions" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="divide-y dark:divide-gray-700">
              {attempt.questions.map((question, index) => (
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

                  {/* Metadata */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {question.book && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                        📖 {question.book} {question.chapter}
                      </span>
                    )}
                    {question.topic && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300">
                        {question.topic}
                      </span>
                    )}
                    {question.difficulty && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                        {question.difficulty}
                      </span>
                    )}
                    {question.bloomsLevel && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300">
                        {question.bloomsLevel}
                      </span>
                    )}
                  </div>

                  {/* Question Text */}
                  <p className="text-gray-900 dark:text-white mb-4">
                    {question.questionText}
                  </p>

                  {/* Answer summary */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 dark:text-gray-400">Student&apos;s Answer:</span>
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
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
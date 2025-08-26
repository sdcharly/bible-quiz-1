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
import {
  PageHeader,
  PageContainer,
  Section,
  LoadingState,
  EmptyState,
  TabNavigation
} from "@/components/educator-v2";
import { logger } from "@/lib/logger";

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
        logger.error("Failed to fetch attempt details");
      }
    } catch (error) {
      logger.error("Error fetching attempt details:", error);
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
    return <LoadingState fullPage text="Loading attempt details..." />;
  }

  if (!attempt) {
    return (
      <PageContainer>
        <EmptyState
          icon={AlertCircle}
          title="Attempt Not Found"
          description="The quiz attempt you're looking for doesn't exist or has been removed."
          action={{
            label: "Back to Results",
            onClick: () => window.location.href = `/educator/quiz/${quizId}/results`
          }}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Detailed Attempt Analysis"
        subtitle={`${attempt.quizTitle} - ${attempt.studentName}`}
        icon={TrendingUp}
        backButton={{
          href: `/educator/quiz/${quizId}/results`,
          label: "Results"
        }}
      />

      {/* Student Info & Score Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Student Information */}
        <Section
          title="Student Information"
          icon={User}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Name</p>
              <p className="text-base font-medium text-gray-900 dark:text-white">{attempt.studentName}</p>
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Email</p>
              <p className="text-base font-medium text-gray-900 dark:text-white break-all">{attempt.studentEmail}</p>
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Started At</p>
              <p className="text-base font-medium text-gray-900 dark:text-white">{new Date(attempt.startTime).toLocaleString()}</p>
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Completed At</p>
              <p className="text-base font-medium text-gray-900 dark:text-white">{new Date(attempt.endTime).toLocaleString()}</p>
            </div>
          </div>
        </Section>

        {/* Score Summary */}
        <Section
          title="Performance Summary"
          icon={Trophy}
        >
          <div className="text-center mb-4">
            <div className="text-5xl font-bold text-gray-900 dark:text-white">
              {attempt.grade}
            </div>
            <div className="text-2xl font-semibold text-amber-600">
              {attempt.score}%
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              {attempt.gradeDescription} • {attempt.gradePoints.toFixed(1)} points
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xl font-bold text-amber-600">
                {attempt.correctAnswers}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Correct</p>
            </div>
            <div>
              <div className="text-xl font-bold text-orange-600">
                {attempt.wrongAnswers}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Wrong</p>
            </div>
            <div>
              <div className="text-xl font-bold text-amber-600">
                {formatTime(attempt.timeTaken)}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Time</p>
            </div>
          </div>
        </Section>
      </div>

      {/* Tabs */}
      <TabNavigation
        tabs={[
          { id: 'analytics', label: 'Analytics', icon: BarChart },
          { id: 'questions', label: 'Question Review', icon: BookOpen }
        ]}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as "analytics" | "questions")}
      />

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* Performance by Difficulty */}
          <Section
            title="Performance by Difficulty"
            icon={Target}
          >
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(attempt.analytics.byDifficulty).map(([level, stats]) => (
                <div key={level} className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400 capitalize mb-2">
                    {level}
                  </p>
                  <div className="text-3xl font-bold mb-1 text-gray-900 dark:text-white">
                    {stats.percentage}%
                  </div>
                  <p className="text-sm text-gray-500">
                    {stats.correct}/{stats.total} correct
                  </p>
                </div>
              ))}
            </div>
          </Section>

          {/* Performance by Bloom's Taxonomy */}
          {Object.keys(attempt.analytics.byBloomsLevel).length > 0 && (
            <Section
              title="Performance by Bloom's Taxonomy"
              icon={Brain}
            >
              <div className="space-y-3">
                {Object.entries(attempt.analytics.byBloomsLevel).map(([level, stats]) => (
                  <div key={level} className="flex items-center justify-between">
                    <span className="font-medium capitalize text-gray-900 dark:text-white">{level}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {stats.correct}/{stats.total}
                      </span>
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-amber-600 h-2 rounded-full"
                          style={{ width: `${stats.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right text-gray-900 dark:text-white">
                        {stats.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Performance by Topic */}
          {Object.keys(attempt.analytics.byTopic).length > 0 && (
            <Section
              title="Performance by Topic"
              icon={BookOpen}
            >
              <div className="space-y-3">
                {Object.entries(attempt.analytics.byTopic).map(([topic, stats]) => (
                  <div key={topic} className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-white">{topic}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {stats.correct}/{stats.total}
                      </span>
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-amber-600 h-2 rounded-full"
                          style={{ width: `${stats.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right text-gray-900 dark:text-white">
                        {stats.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Time Analysis */}
          <Section
            title="Time Analysis"
            icon={Timer}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Time</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{formatTime(attempt.analytics.timeAnalysis.totalTime)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg per Question</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{attempt.analytics.timeAnalysis.averageTimePerQuestion}s</p>
              </div>
              {attempt.analytics.timeAnalysis.fastestQuestion && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Fastest Question</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">Q{attempt.analytics.timeAnalysis.fastestQuestion.questionNumber}</p>
                  <p className="text-sm text-gray-500">{attempt.analytics.timeAnalysis.fastestQuestion.time}s</p>
                </div>
              )}
              {attempt.analytics.timeAnalysis.slowestQuestion && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Slowest Question</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">Q{attempt.analytics.timeAnalysis.slowestQuestion.questionNumber}</p>
                  <p className="text-sm text-gray-500">{attempt.analytics.timeAnalysis.slowestQuestion.time}s</p>
                </div>
              )}
            </div>
          </Section>
        </div>
      )}

      {/* Questions Tab */}
      {activeTab === "questions" && (
        <Section
          title="Question Review"
          description="Detailed breakdown of each question and answer"
          icon={BookOpen}
        >
          <div className="divide-y dark:divide-gray-700">
            {attempt.questions.map((question, index) => (
              <div key={question.id} className="py-6 first:pt-0">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      Q{index + 1}
                    </span>
                    {question.isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-amber-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-orange-500" />
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
                    className="hover:bg-amber-50"
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
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                      📖 {question.book} {question.chapter}
                    </span>
                  )}
                  {question.topic && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                      {question.topic}
                    </span>
                  )}
                  {question.difficulty && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                      {question.difficulty}
                    </span>
                  )}
                  {question.bloomsLevel && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
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
                    <span className="text-gray-600 dark:text-gray-400">Student's Answer:</span>
                    <span className={`font-medium ${
                      question.isCorrect ? "text-amber-600" : "text-orange-600"
                    }`}>
                      {getOptionLabel(question.selectedAnswer || "Not Answered")}
                    </span>
                  </div>
                  {!question.isCorrect && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 dark:text-gray-400">Correct Answer:</span>
                      <span className="font-medium text-amber-600">
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
                                ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                                : isSelected
                                ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20"
                                : "border-gray-300 dark:border-gray-600"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {getOptionLabel(option.id)}:
                              </span>
                              <span className="text-gray-900 dark:text-white">{option.text}</span>
                              {isCorrect && (
                                <CheckCircle className="h-4 w-4 text-amber-500 ml-auto" />
                              )}
                              {isSelected && !isCorrect && (
                                <XCircle className="h-4 w-4 text-orange-500 ml-auto" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    {question.explanation && (
                      <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200">
                        <p className="font-medium text-amber-900 dark:text-amber-300 mb-2">
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
        </Section>
      )}
    </PageContainer>
  );
}
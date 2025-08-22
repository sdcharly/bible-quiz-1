"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Flag,
  AlertTriangle,
  AlertCircle,
  Send,
  Loader2,
} from "lucide-react";
import { logger } from "@/lib/logger";

interface Question {
  id: string;
  questionText: string;
  options: { id: string; text: string }[];
  orderIndex: number;
  book?: string | null;
  chapter?: string | null;
  topic?: string | null;
  difficulty?: string | null;
  bloomsLevel?: string | null;
}

interface QuizAttempt {
  id: string;
  quizId: string;
  questions: Question[];
  duration: number;
  title: string;
  totalQuestions: number;
}

interface Answer {
  questionId: string;
  answer: string;
  markedForReview: boolean;
  timeSpent: number;
}

export default function OptimizedQuizTakingPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quiz, setQuiz] = useState<QuizAttempt | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [completionMessage, setCompletionMessage] = useState("");
  const [attemptId, setAttemptId] = useState<string | null>(null);

  // Use refs to avoid stale closures in timer
  const timeRemainingRef = useRef(0);
  const quizRef = useRef<QuizAttempt | null>(null);
  const questionStartTimeRef = useRef(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize current question to avoid recalculation
  const currentQuestion = useMemo(() => {
    if (!quiz || !quiz.questions[currentQuestionIndex]) return null;
    return quiz.questions[currentQuestionIndex];
  }, [quiz, currentQuestionIndex]);

  // Fetch quiz data
  useEffect(() => {
    let mounted = true;

    const fetchQuiz = async () => {
      try {
        const response = await fetch(`/api/student/quiz/${quizId}/start`, {
          method: "POST",
        });
        
        if (!mounted) return;
        
        if (response.ok) {
          const data = await response.json();
          setQuiz(data.quiz);
          quizRef.current = data.quiz;
          setAttemptId(data.attemptId);
          const remainingTime = data.remainingTime || data.quiz.duration * 60;
          setTimeRemaining(remainingTime);
          timeRemainingRef.current = remainingTime;
          if (data.resumed) {
            alert("Resuming your in-progress quiz");
          }
          setLoading(false);
        } else if (response.status === 403) {
          const data = await response.json();
          if (data.error === "Quiz already completed") {
            setQuizCompleted(true);
            setCompletionMessage(data.message);
            setAttemptId(data.attemptId);
            setLoading(false);
          } else {
            alert(data.message || "Cannot start quiz");
            router.push("/student/quizzes");
          }
        } else {
          const data = await response.json();
          alert(data.message || "Failed to load quiz");
          router.push("/student/quizzes");
        }
      } catch (error) {
        logger.error("Error loading quiz:", error);
        if (mounted) {
          alert("Network error. Please check your connection and try again.");
          router.push("/student/quizzes");
        }
      }
    };

    fetchQuiz();

    return () => {
      mounted = false;
    };
  }, [quizId, router]);

  // Optimized submit handler using ref
  const handleSubmit = useCallback(async () => {
    if (!quizRef.current || submitting) return;
    
    const unansweredCount = quizRef.current.questions.filter(q => !answers[q.id]?.answer).length;
    
    if (unansweredCount > 0) {
      if (!confirm(`You have ${unansweredCount} unanswered questions. Are you sure you want to submit?`)) {
        return;
      }
    }
    
    setSubmitting(true);
    
    try {
      const response = await fetch(`/api/student/quiz/${quizId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answers: Object.values(answers),
          timeSpent: (quizRef.current.duration * 60) - timeRemainingRef.current,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        router.push(`/student/results/${data.attemptId}`);
      } else {
        alert("Failed to submit quiz. Please try again.");
        setSubmitting(false);
      }
    } catch (error) {
      logger.error("Error submitting quiz:", error);
      alert("Network error. Please check your connection and try again.");
      setSubmitting(false);
    }
  }, [answers, quizId, router, submitting]);

  // Optimized timer with cleanup
  useEffect(() => {
    if (timeRemaining <= 0 || !quiz) return;

    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      timeRemainingRef.current -= 1;
      setTimeRemaining(timeRemainingRef.current);
      
      if (timeRemainingRef.current <= 0) {
        handleSubmit();
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        return;
      }
      
      // Show warning at 5 minutes
      if (timeRemainingRef.current === 300) {
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 5000);
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [quiz, handleSubmit, timeRemaining]);

  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const handleAnswerSelect = useCallback((answer: string) => {
    if (!currentQuestion) return;
    
    const timeSpent = Math.floor((Date.now() - questionStartTimeRef.current) / 1000);
    
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: {
        questionId: currentQuestion.id,
        answer,
        markedForReview: prev[currentQuestion.id]?.markedForReview || false,
        timeSpent: (prev[currentQuestion.id]?.timeSpent || 0) + timeSpent,
      },
    }));
  }, [currentQuestion]);

  const handleMarkForReview = useCallback(() => {
    if (!currentQuestion) return;
    
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: {
        ...prev[currentQuestion.id],
        questionId: currentQuestion.id,
        answer: prev[currentQuestion.id]?.answer || "",
        markedForReview: !prev[currentQuestion.id]?.markedForReview,
        timeSpent: prev[currentQuestion.id]?.timeSpent || 0,
      },
    }));
  }, [currentQuestion]);

  const handleNext = useCallback(() => {
    if (!quiz || currentQuestionIndex >= quiz.questions.length - 1) return;
    questionStartTimeRef.current = Date.now();
    setCurrentQuestionIndex(prev => prev + 1);
  }, [quiz, currentQuestionIndex]);

  const handlePrevious = useCallback(() => {
    if (currentQuestionIndex <= 0) return;
    questionStartTimeRef.current = Date.now();
    setCurrentQuestionIndex(prev => prev - 1);
  }, [currentQuestionIndex]);

  const handleJumpToQuestion = useCallback((index: number) => {
    questionStartTimeRef.current = Date.now();
    setCurrentQuestionIndex(index);
  }, []);

  // Early returns for loading and error states
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (quizCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <AlertCircle className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Quiz Already Completed
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {completionMessage}
          </p>
          {attemptId && (
            <Link href={`/student/results/${attemptId}`}>
              <Button className="w-full mb-2">View Results</Button>
            </Link>
          )}
          <Link href="/student/quizzes">
            <Button variant="outline" className="w-full">
              Back to Quizzes
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!quiz || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Unable to load quiz</p>
          <Link href="/student/quizzes">
            <Button className="mt-4">Back to Quizzes</Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentAnswer = answers[currentQuestion.id];
  const isTimeLow = timeRemaining < 300;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Timer Warning */}
      {showWarning && (
        <div className="fixed top-4 right-4 bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 dark:border-yellow-600 text-yellow-700 dark:text-yellow-300 px-4 py-3 rounded-lg shadow-lg z-50 animate-pulse">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <span className="font-semibold">5 minutes remaining!</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {quiz.title}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Question {currentQuestionIndex + 1} of {quiz.totalQuestions}
              </p>
            </div>
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
              isTimeLow ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' : 'bg-gray-100 dark:bg-gray-700'
            }`}>
              <Clock className="h-5 w-5" />
              <span className="font-mono font-semibold text-lg">
                {formatTime(timeRemaining)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Panel */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              {/* Question Text */}
              <div className="mb-6">
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Question {currentQuestionIndex + 1}
                  </h2>
                  <Button
                    variant={currentAnswer?.markedForReview ? "default" : "outline"}
                    size="sm"
                    onClick={handleMarkForReview}
                  >
                    <Flag className="h-4 w-4 mr-1" />
                    {currentAnswer?.markedForReview ? "Marked" : "Mark for Review"}
                  </Button>
                </div>
                
                {/* Question Metadata */}
                {(currentQuestion.book || currentQuestion.chapter || currentQuestion.topic) && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {currentQuestion.book && (
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded">
                        {currentQuestion.book}
                      </span>
                    )}
                    {currentQuestion.chapter && (
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs rounded">
                        Chapter {currentQuestion.chapter}
                      </span>
                    )}
                    {currentQuestion.topic && (
                      <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs rounded">
                        {currentQuestion.topic}
                      </span>
                    )}
                    {currentQuestion.difficulty && (
                      <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 text-xs rounded">
                        {currentQuestion.difficulty}
                      </span>
                    )}
                  </div>
                )}
                
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {currentQuestion.questionText}
                </p>
              </div>

              {/* Answer Options */}
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={option.id}
                    onClick={() => handleAnswerSelect(option.id)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      currentAnswer?.answer === option.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-start">
                      <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold mr-3 ${
                        currentAnswer?.answer === option.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}>
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {option.text}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center mt-8">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                
                {currentQuestionIndex === quiz.questions.length - 1 ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit Quiz
                      </>
                    )}
                  </Button>
                ) : (
                  <Button onClick={handleNext}>
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Question Navigator */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sticky top-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Question Navigator
              </h3>
              <div className="grid grid-cols-5 gap-2">
                {quiz.questions.map((_, index) => {
                  const answer = answers[quiz.questions[index].id];
                  const isActive = index === currentQuestionIndex;
                  const isAnswered = !!answer?.answer;
                  const isMarked = !!answer?.markedForReview;
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleJumpToQuestion(index)}
                      className={`
                        w-10 h-10 rounded-lg text-sm font-medium transition-all
                        ${isActive ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                        ${isAnswered && isMarked ? 'bg-yellow-500 text-white' :
                          isAnswered ? 'bg-green-500 text-white' :
                          isMarked ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' :
                          'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}
                      `}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
              
              {/* Legend */}
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                  <span className="text-gray-600 dark:text-gray-400">Answered</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
                  <span className="text-gray-600 dark:text-gray-400">Marked for Review</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded mr-2"></div>
                  <span className="text-gray-600 dark:text-gray-400">Not Answered</span>
                </div>
              </div>

              {/* Submit Button */}
              <div className="mt-6">
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Quiz
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
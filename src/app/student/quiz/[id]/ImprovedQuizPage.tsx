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
import { useToast } from "@/hooks/use-toast";
import { isFeatureEnabled } from "@/lib/feature-flags";

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

export default function ImprovedQuizPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = params.id as string;
  const { toast } = useToast();

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
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Memoize current question to avoid recalculation
  const currentQuestion = useMemo(() => {
    if (!quiz || !quiz.questions[currentQuestionIndex]) return null;
    return quiz.questions[currentQuestionIndex];
  }, [quiz, currentQuestionIndex]);

  // Fetch quiz data
  useEffect(() => {
    isMountedRef.current = true;
    let mounted = true;

    const fetchQuiz = async () => {
      try {
        // Always use AbortController for proper cleanup
        abortControllerRef.current = new AbortController();
        
        const response = await fetch(`/api/student/quiz/${quizId}/start`, {
          method: "POST",
          signal: abortControllerRef.current.signal,
        });
        
        if (!mounted || !isMountedRef.current) return;
        
        if (response.ok) {
          const data = await response.json();
          setQuiz(data.quiz);
          quizRef.current = data.quiz;
          setAttemptId(data.attemptId);
          const remainingTime = data.remainingTime || data.quiz.duration * 60;
          setTimeRemaining(remainingTime);
          timeRemainingRef.current = remainingTime;
          if (data.resumed) {
            toast({
              title: "Quiz Resumed",
              description: "Resuming your in-progress quiz",
            });
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
            toast({
              title: "Access Denied",
              description: data.message || "Cannot start quiz",
              variant: "destructive"
            });
            router.push("/student/quizzes");
          }
        } else if (response.status === 425) {
          const data = await response.json();
          toast({
            title: "Quiz Not Available",
            description: data.message || "Quiz not started yet",
            variant: "destructive"
          });
          router.push("/student/quizzes");
        } else {
          const data = await response.json();
          toast({
            title: "Error",
            description: data.message || "Failed to load quiz",
            variant: "destructive"
          });
          router.push("/student/quizzes");
        }
      } catch (error: any) {
        // Check if the error is due to an abort (user navigated away)
        if (error?.name === 'AbortError' || error instanceof DOMException) {
          // Silently return - this is expected when component unmounts
          return;
        }
        
        // Only show error and navigate if component is still mounted
        if (!isMountedRef.current) return;
        
        logger.error("Error loading quiz:", error);
        toast({
          title: "Network Error",
          description: "Please check your connection and try again.",
          variant: "destructive"
        });
        router.push("/student/quizzes");
      }
    };

    fetchQuiz();

    return () => {
      mounted = false;
      isMountedRef.current = false;
      
      // Clean up all timers
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
      
      // Always abort any pending API calls on cleanup
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      // Clear refs to prevent memory leaks
      quizRef.current = null;
      timeRemainingRef.current = 0;
      
      logger.debug('Quiz page cleanup completed');
    };
  }, [quizId, router, toast]);

  // Timer effect
  useEffect(() => {
    if (!quiz || timeRemaining <= 0) return;

    // Clear existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Start countdown timer
    timerRef.current = setInterval(() => {
      const newTime = timeRemainingRef.current - 1;
      timeRemainingRef.current = newTime;
      setTimeRemaining(newTime);

      // Show 5-minute warning
      if (newTime === 300 && !showWarning) {
        setShowWarning(true);
        alert("Warning: 5 minutes remaining!");
      }

      // Auto-submit when time runs out
      if (newTime <= 0 && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        handleSubmit(true);
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [quiz]);

  // Helper functions
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

  const handleSubmit = useCallback(async (isAutoSubmit = false) => {
    if (!quiz || submitting) return;

    const unansweredCount = quiz.questions.filter(
      q => !answers[q.id]?.answer
    ).length;

    if (!isAutoSubmit && unansweredCount > 0) {
      if (!confirm(`You have ${unansweredCount} unanswered questions. Are you sure you want to submit?`)) {
        return;
      }
    }

    setSubmitting(true);
    
    // Create a new AbortController for this submission
    const submitController = new AbortController();

    try {
      const response = await fetch(`/api/student/quiz/${quizId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          attemptId,
          answers: Object.values(answers),
          timeSpent: (quiz.duration * 60) - timeRemaining,
        }),
        signal: submitController.signal,
      });

      // Check if component is still mounted before proceeding
      if (!isMountedRef.current) return;

      if (response.ok) {
        const data = await response.json();
        
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        
        if (isAutoSubmit && isMountedRef.current) {
          alert("Time's up! Your quiz has been automatically submitted.");
        }
        
        if (isMountedRef.current) {
          router.push(`/student/results/${data.attemptId}`);
        }
      } else {
        const errorData = await response.json();
        if (errorData.error === "Quiz already submitted") {
          if (isMountedRef.current) {
            alert(errorData.message);
            router.push(`/student/results/${errorData.attemptId}`);
          }
        } else {
          throw new Error(errorData.error || "Submission failed");
        }
      }
    } catch (error: any) {
      // Check if the error is due to an abort
      if (error?.name === 'AbortError' || error instanceof DOMException) {
        return;
      }
      
      // Only show error if component is still mounted
      if (!isMountedRef.current) return;
      
      logger.error("Submit error:", error);
      alert("Failed to submit quiz. Please try again.");
      setSubmitting(false);
    }
  }, [quiz, answers, attemptId, quizId, router, submitting, timeRemaining]);

  // Render states
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (quizCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <AlertCircle className="h-12 w-12 text-blue-600 mx-auto mb-4" />
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
      {/* Warning Banner */}
      {showWarning && (
        <div className="bg-yellow-100 border-b border-yellow-300 p-3 text-center">
          <p className="text-yellow-800 font-medium flex items-center justify-center">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Warning: Less than 5 minutes remaining!
          </p>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {quiz.title}
            </h1>
            <div className="flex items-center space-x-4">
              <div className={`flex items-center px-3 py-1 rounded-lg ${
                isTimeLow ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400' : 
                'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}>
                <Clock className="h-4 w-4 mr-2" />
                <span className="font-mono">{formatTime(timeRemaining)}</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Question {currentQuestionIndex + 1} of {quiz.totalQuestions}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Panel */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              {/* Question Header */}
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Question {currentQuestionIndex + 1}
                </h2>
                <button
                  onClick={handleMarkForReview}
                  className={`flex items-center px-3 py-1 rounded-lg transition-colors ${
                    currentAnswer?.markedForReview
                      ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/10'
                  }`}
                >
                  <Flag className="h-4 w-4 mr-1" />
                  {currentAnswer?.markedForReview ? 'Marked' : 'Mark for Review'}
                </button>
              </div>

              {/* Question Text */}
              <div className="mb-6">
                {currentQuestion.book && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {currentQuestion.book}
                    {currentQuestion.chapter && ` - Chapter ${currentQuestion.chapter}`}
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
                    onClick={() => handleSubmit()}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
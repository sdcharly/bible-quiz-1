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
} from "lucide-react";
import { logger } from "@/lib/logger";
import { BiblicalPageLoader, BiblicalLoader } from "@/components/ui/biblical-loader";
import { useSessionManager } from "@/hooks/useSessionManager";

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
  const [isResumed, setIsResumed] = useState(false);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  
  // Session management
  const {
    sessionState,
    isWarning,
    isExpired,
    extendSession,
    resetActivity,
  } = useSessionManager({
    isQuizActive: true,
    enableAutoExtend: true,
    onSessionExpired: () => {
      // Auto-submit quiz on session expiry
      if (quiz && !submitting) {
        alert("Your session has expired. Your quiz will be automatically submitted.");
        handleSubmit(true);
      }
    },
    onSessionWarning: (remaining) => {
      const minutes = Math.ceil(remaining / 60000);
      logger.info(`Session warning: ${minutes} minutes remaining`);
    },
  });

  // Use refs to avoid stale closures in timer
  const timeRemainingRef = useRef(0);
  const quizRef = useRef<QuizAttempt | null>(null);
  const questionStartTimeRef = useRef(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const attemptIdRef = useRef<string | null>(null);

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
          attemptIdRef.current = data.attemptId;
          const remainingTime = data.remainingTime || data.quiz.duration * 60;
          setTimeRemaining(remainingTime);
          timeRemainingRef.current = remainingTime;
          
          // Show better resumption message
          if (data.resumed) {
            setIsResumed(true);
            const minutesRemaining = Math.floor(remainingTime / 60);
            alert(`Welcome back! You have ${minutesRemaining} minutes remaining to complete this quiz.`);
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
            if (mounted) {
              setLoading(false);
              alert(data.message || "Cannot start quiz");
              router.push("/student/quizzes");
            }
          }
        } else if (response.status === 425) {
          // Quiz not started yet
          const data = await response.json();
          if (mounted) {
            setLoading(false);
            
            // Format the start time in user's local timezone
            if (data.startTime) {
              const startTime = new Date(data.startTime);
              const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
              
              // Format in user's timezone
              const formattedTime = startTime.toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
                timeZone: userTimezone
              });
              
              const message = data.timeUntilStart 
                ? `This quiz will start at ${formattedTime} (${data.timeUntilStart})`
                : `This quiz will start at ${formattedTime}`;
              
              alert(message);
            } else {
              alert(data.message || "Quiz not started yet");
            }
            
            router.push("/student/quizzes");
          }
        } else {
          const data = await response.json();
          if (mounted) {
            setLoading(false);
            alert(data.message || "Failed to load quiz");
            router.push("/student/quizzes");
          }
        }
      } catch (error) {
        logger.error("Error loading quiz:", error);
        if (mounted) {
          setLoading(false);
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
  const handleSubmit = useCallback(async (isAutoSubmit = false) => {
    if (!quizRef.current || submitting) return;
    
    // Don't ask for confirmation on auto-submit
    if (!isAutoSubmit) {
      const unansweredCount = quizRef.current.questions.filter(q => !answers[q.id]?.answer).length;
      
      if (unansweredCount > 0) {
        if (!confirm(`You have ${unansweredCount} unanswered questions. Are you sure you want to submit?`)) {
          return;
        }
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
          attemptId: attemptIdRef.current,
          answers: Object.values(answers),
          timeSpent: (quizRef.current.duration * 60) - timeRemainingRef.current,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Clear timer on successful submission
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        
        if (isAutoSubmit) {
          alert("Time's up! Your quiz has been automatically submitted.");
        }
        
        router.push(`/student/results/${data.attemptId}`);
      } else {
        const errorData = await response.json();
        
        if (errorData.error === "Quiz already submitted") {
          alert(errorData.message);
          router.push(`/student/results/${errorData.attemptId}`);
        } else {
          alert(errorData.error || "Failed to submit quiz. Please try again.");
          setSubmitting(false);
        }
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
        // Auto-submit when time expires
        handleSubmit(true);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        return;
      }
      
      // Show warnings at different time intervals
      if (timeRemainingRef.current === 600) { // 10 minutes
        setShowTimeWarning(true);
        alert("⏰ 10 minutes remaining!");
        setTimeout(() => setShowTimeWarning(false), 5000);
      } else if (timeRemainingRef.current === 300) { // 5 minutes
        setShowWarning(true);
        alert("⚠️ Only 5 minutes remaining! Please submit your quiz soon.");
        setTimeout(() => setShowWarning(false), 5000);
      } else if (timeRemainingRef.current === 60) { // 1 minute
        setShowWarning(true);
        alert("🚨 Final minute! Your quiz will auto-submit when time expires.");
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
    
    // Reset session activity on answer selection
    resetActivity();
  }, [currentQuestion, resetActivity]);

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
  if (loading || !quiz) {
    return <BiblicalPageLoader text="Loading quiz..." />;
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
      {/* Session Warning */}
      {isWarning && (
        <div className="fixed top-4 left-4 bg-amber-100 dark:bg-amber-900 border border-amber-400 dark:border-amber-600 text-amber-700 dark:text-amber-300 px-4 py-3 rounded-lg shadow-lg z-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <span className="font-semibold">Session expiring soon!</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={extendSession}
              className="ml-4 text-xs"
            >
              Extend Session
            </Button>
          </div>
        </div>
      )}
      
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
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 sm:py-4 gap-2">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white truncate">
                {quiz.title}
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Question {currentQuestionIndex + 1} of {quiz.totalQuestions}
              </p>
            </div>
            <div className={`flex items-center space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg ${
              isTimeLow ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
            }`}>
              <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="font-mono font-semibold text-sm sm:text-base lg:text-lg">
                {formatTime(timeRemaining)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Question Panel */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-5 lg:p-6">
              {/* Question Text */}
              <div className="mb-4 sm:mb-6">
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Question {currentQuestionIndex + 1}
                  </h2>
                  <Button
                    variant={currentAnswer?.markedForReview ? "default" : "outline"}
                    size="sm"
                    onClick={handleMarkForReview}
                    className="text-xs sm:text-sm touch-manipulation"
                  >
                    <Flag className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                    <span className="hidden sm:inline">{currentAnswer?.markedForReview ? "Marked" : "Mark for Review"}</span>
                    <span className="sm:hidden">{currentAnswer?.markedForReview ? "Marked" : "Mark"}</span>
                  </Button>
                </div>
                
                {/* Question Metadata */}
                {(currentQuestion.book || currentQuestion.chapter || currentQuestion.topic) && (
                  <div className="flex flex-wrap gap-1 sm:gap-2 mb-3 sm:mb-4">
                    {currentQuestion.book && (
                      <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs rounded">
                        {currentQuestion.book}
                      </span>
                    )}
                    {currentQuestion.chapter && (
                      <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs rounded">
                        Chapter {currentQuestion.chapter}
                      </span>
                    )}
                    {currentQuestion.topic && (
                      <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-xs rounded">
                        {currentQuestion.topic}
                      </span>
                    )}
                    {currentQuestion.difficulty && (
                      <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 text-xs rounded">
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
              <div className="space-y-2 sm:space-y-3">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={option.id}
                    onClick={() => handleAnswerSelect(option.id)}
                    className={`w-full text-left p-3 sm:p-4 rounded-lg border-2 transition-all touch-manipulation ${
                      currentAnswer?.answer === option.id
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 active:bg-gray-50 dark:active:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-start">
                      <span className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold mr-2 sm:mr-3 ${
                        currentAnswer?.answer === option.id
                          ? 'bg-amber-500 text-white'
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
              <div className="flex justify-between items-center mt-4 sm:mt-6 lg:mt-8 gap-2 sm:gap-3 pb-16 lg:pb-0">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0}
                  className="h-10 sm:h-11 text-sm sm:text-base px-3 sm:px-4 touch-manipulation"
                >
                  <ChevronLeft className="h-4 w-4 mr-0 sm:mr-1" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>
                
                {currentQuestionIndex === quiz.questions.length - 1 ? (
                  <Button
                    onClick={() => handleSubmit(false)}
                    disabled={submitting}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 h-10 sm:h-11 text-sm sm:text-base px-3 sm:px-4 touch-manipulation"
                  >
                    {submitting ? (
                      <>
                        <BiblicalLoader size="sm" inline />
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
                  <Button 
                    onClick={handleNext}
                    className="h-10 sm:h-11 text-sm sm:text-base px-3 sm:px-4 touch-manipulation"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="h-4 w-4 ml-0 sm:ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Question Navigator - Hidden on mobile, shown on desktop */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sticky top-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Question Navigator
              </h3>
              <div className="grid grid-cols-4 xl:grid-cols-5 gap-1.5 sm:gap-2">
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
                        w-11 h-11 rounded-lg text-xs sm:text-sm font-medium transition-all touch-manipulation
                        ${isActive ? 'ring-2 ring-amber-500 ring-offset-2' : ''}
                        ${isAnswered && isMarked ? 'bg-amber-500 text-white' :
                          isAnswered ? 'bg-green-500 text-white' :
                          isMarked ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300' :
                          'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}
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
                  <div className="w-4 h-4 bg-amber-500 rounded mr-2"></div>
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
                  onClick={() => handleSubmit(false)}
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 touch-manipulation"
                >
                  {submitting ? (
                    <BiblicalLoader size="sm" text="Submitting..." inline />
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

      {/* Mobile Question Navigator - Fixed Bottom */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-2 z-50">
        <div className="flex items-center justify-between max-w-7xl mx-auto px-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Progress:</span>
            <div className="flex space-x-1">
              <span className="text-xs font-semibold text-green-600">{Object.values(answers).filter(a => a.answer).length}</span>
              <span className="text-xs text-gray-500">/</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">{quiz.totalQuestions}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const markedQuestions = quiz.questions
                  .map((q, i) => ({ question: q, index: i }))
                  .filter(({ question }) => answers[question.id]?.markedForReview);
                if (markedQuestions.length > 0) {
                  setCurrentQuestionIndex(markedQuestions[0].index);
                }
              }}
              className="h-7 text-xs px-2"
            >
              <Flag className="h-3 w-3 mr-1" />
              <span className="hidden xs:inline">Review</span> ({Object.values(answers).filter(a => a.markedForReview).length})
            </Button>
            
            <Button
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              size="sm"
              className="h-7 text-xs px-3 bg-gradient-to-r from-green-600 to-green-700"
            >
              Submit Quiz
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
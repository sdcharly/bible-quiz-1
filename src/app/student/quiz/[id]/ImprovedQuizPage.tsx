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
  WifiOff,
  Save,
} from "lucide-react";
import { logger } from "@/lib/logger";
import { useSessionManager } from "@/hooks/useSessionManager";
import { useToast } from "@/hooks/use-toast";
import { 
  QuizAutoSaveService, 
  AutoSaveData,
  isMobileDevice,
  getDeviceInfo,
  type QuizAnswer 
} from "@/lib/quiz-autosave";
import QuizDiagnostics from "@/lib/monitoring/quiz-diagnostics";
import {
  MobileQuizInterface,
  ImprovedQuizLoader,
  SessionRecoveryPrompt,
} from "@/components/student/MobileQuizInterface";

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

export default function ImprovedQuizTakingPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const quizId = params.id as string;

  // Core quiz state
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("Initializing quiz...");
  const [submitting, setSubmitting] = useState(false);
  const [quiz, setQuiz] = useState<QuizAttempt | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, QuizAnswer>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [completionMessage, setCompletionMessage] = useState("");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [isResumed, setIsResumed] = useState(false);
  const [showTimeWarning, setShowTimeWarning] = useState(false);

  // Mobile and auto-save state
  const [isOnline, setIsOnline] = useState(true);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaveTime, setLastSaveTime] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false);
  const [recoveryData, setRecoveryData] = useState<AutoSaveData | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [hasLostFocus, setHasLostFocus] = useState(false);
  
  // Auto-save service
  const autoSaveService = useRef<QuizAutoSaveService | null>(null);
  
  // Diagnostics tracking
  const diagnostics = useRef(new QuizDiagnostics());
  
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
    quizId,
    onSessionExpired: () => {
      if (quiz && !submitting) {
        toast({
          title: "Session Expired",
          description: "Your quiz will be automatically submitted.",
          variant: "destructive"
        });
        handleSubmit(true);
      }
    },
    onSessionWarning: (remaining) => {
      const minutes = Math.ceil(remaining / 60000);
      logger.info(`Session warning: ${minutes} minutes remaining`);
    },
  });

  // Refs for timer management
  const timeRemainingRef = useRef(0);
  const quizRef = useRef<QuizAttempt | null>(null);
  const questionStartTimeRef = useRef(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const attemptIdRef = useRef<string | null>(null);
  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pageVisibilityRef = useRef<number>(Date.now());

  // Memoize current question
  const currentQuestion = useMemo(() => {
    if (!quiz) {
      console.log('[QUIZ_DEBUG] No quiz object');
      return null;
    }
    if (!quiz.questions) {
      console.log('[QUIZ_DEBUG] Quiz has no questions array');
      return null;
    }
    if (!Array.isArray(quiz.questions)) {
      console.log('[QUIZ_DEBUG] Quiz questions is not an array:', typeof quiz.questions);
      return null;
    }
    if (quiz.questions.length === 0) {
      console.log('[QUIZ_DEBUG] Quiz questions array is empty');
      return null;
    }
    if (!quiz.questions[currentQuestionIndex]) {
      console.log('[QUIZ_DEBUG] No question at index:', currentQuestionIndex, 'Total questions:', quiz.questions.length);
      return null;
    }
    return quiz.questions[currentQuestionIndex];
  }, [quiz, currentQuestionIndex]);

  // Initialize mobile detection and network monitoring
  useEffect(() => {
    setIsMobile(isMobileDevice());
    
    // Network monitoring
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Back Online",
        description: "Your connection has been restored.",
      });
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Connection Lost",
        description: "Your answers will be saved locally until reconnected.",
        variant: "destructive",
      });
    };
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    // Page visibility monitoring (for mobile tab switching)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        pageVisibilityRef.current = Date.now();
        setHasLostFocus(true);
        
        // Force save when page loses focus
        if (autoSaveService.current && quiz) {
          autoSaveService.current.save(
            {
              answers,
              currentQuestionIndex,
              timeRemaining: timeRemainingRef.current,
            },
            (success) => {
              logger.info("Emergency save on focus loss", { success });
            }
          );
        }
      } else {
        // Page regained focus
        const hiddenDuration = Date.now() - pageVisibilityRef.current;
        if (hiddenDuration > 60000 && isMobile) { // More than 1 minute
          toast({
            title: "Welcome Back",
            description: "Your quiz session has been preserved.",
          });
        }
        setHasLostFocus(false);
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    // Prevent accidental navigation
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (quiz && !quizCompleted && !submitting) {
        e.preventDefault();
        e.returnValue = "Your quiz is in progress. Are you sure you want to leave?";
      }
    };
    
    window.addEventListener("beforeunload", handleBeforeUnload);
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [quiz, quizCompleted, submitting, answers, currentQuestionIndex, isMobile, toast]);

  // Fetch quiz with recovery check
  useEffect(() => {
    let mounted = true;

    const fetchQuiz = async () => {
      try {
        // Mark page loaded for diagnostics
        diagnostics.current.markPageLoaded();
        
        // Update loading progress
        setLoadingProgress(20);
        setLoadingMessage("Checking for previous session...");
        
        // Check if user explicitly wants to start fresh
        const urlParams = new URLSearchParams(window.location.search);
        const startFresh = urlParams.get('fresh') === 'true';
        
        if (!startFresh) {
          // Check for existing auto-save data
          const response = await fetch(`/api/student/quiz/${quizId}/autosave`);
          if (response.ok && mounted) {
            const { hasAutoSave, autoSaveData } = await response.json();
            
            if (hasAutoSave && autoSaveData) {
              setRecoveryData(autoSaveData);
              setShowRecoveryPrompt(true);
              setLoading(false);
              return;
            }
          }
        } else {
          // Clean up the URL
          urlParams.delete('fresh');
          const newUrl = `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`;
          window.history.replaceState({}, '', newUrl);
        }
        
        setLoadingProgress(50);
        setLoadingMessage("Loading quiz questions...");
        
        // Start quiz normally
        const quizResponse = await fetch(`/api/student/quiz/${quizId}/start`, {
          method: "POST",
        });
        
        if (!mounted) return;
        
        setLoadingProgress(80);
        
        if (quizResponse.ok) {
          const data = await quizResponse.json();
          
          // Debug logging for reassignment issue
          console.log('[QUIZ_DEBUG] API Response:', {
            hasQuiz: !!data.quiz,
            hasQuestions: !!(data.quiz?.questions),
            questionCount: data.quiz?.questions?.length || 0,
            firstQuestion: data.quiz?.questions?.[0] ? {
              id: data.quiz.questions[0].id,
              hasText: !!data.quiz.questions[0].questionText,
              text: data.quiz.questions[0].questionText?.substring(0, 50)
            } : null,
            isReassignment: data.isReassignment,
            attemptId: data.attemptId
          });
          
          setQuiz(data.quiz);
          quizRef.current = data.quiz;
          setAttemptId(data.attemptId);
          attemptIdRef.current = data.attemptId;
          
          // Mark quiz loaded for diagnostics
          diagnostics.current.markQuizLoaded();
          if (data.quiz.questions && data.quiz.questions.length > 0) {
            diagnostics.current.markQuestionsVisible();
            diagnostics.current.markCanInteract();
          }
          
          const remainingTime = data.remainingTime || data.quiz.duration * 60;
          setTimeRemaining(remainingTime);
          timeRemainingRef.current = remainingTime;
          
          // Initialize auto-save service
          if (data.attemptId) {
            autoSaveService.current = new QuizAutoSaveService(quizId, data.attemptId);
            
            // Start auto-save
            autoSaveService.current.startAutoSave(
              () => ({
                answers,
                currentQuestionIndex,
                timeRemaining: timeRemainingRef.current,
              }),
              (success) => {
                setIsSaving(false);
                if (success) {
                  setLastSaveTime(Date.now());
                }
              }
            );
            
            // Set up periodic save indicator
            setInterval(() => {
              setIsSaving(true);
            }, 29000); // Show saving indicator 1 second before actual save
          }
          
          if (data.resumed) {
            setIsResumed(true);
            const minutesRemaining = Math.floor(remainingTime / 60);
            toast({
              title: "Session Restored",
              description: `Welcome back! You have ${minutesRemaining} minutes remaining.`,
            });
          }
          
          setLoadingProgress(100);
          setTimeout(() => setLoading(false), 500);
          
        } else if (quizResponse.status === 403) {
          const data = await quizResponse.json();
          if (data.error === "Quiz already completed") {
            setQuizCompleted(true);
            setCompletionMessage(data.message);
            setAttemptId(data.attemptId);
            setLoading(false);
          } else {
            handleQuizError(data.message || "Cannot start quiz");
          }
        } else if (quizResponse.status === 425) {
          const data = await quizResponse.json();
          handleQuizNotStarted(data);
        } else {
          const data = await quizResponse.json();
          handleQuizError(data.message || "Failed to load quiz");
        }
      } catch (error) {
        logger.error("Error loading quiz:", error);
        if (mounted) {
          // Send diagnostics for error
          if (attemptIdRef.current) {
            diagnostics.current.sendIfNeeded(attemptIdRef.current, 'error');
          }
          handleNetworkError();
        }
      }
    };

    fetchQuiz();

    return () => {
      mounted = false;
      // Cleanup auto-save on unmount
      if (autoSaveService.current) {
        autoSaveService.current.stopAutoSave();
      }
    };
  }, [quizId, router, toast]);

  // Handle recovery
  const handleRecover = useCallback(() => {
    if (!recoveryData) return;
    
    // Restore quiz state
    setAnswers(recoveryData.answers);
    setCurrentQuestionIndex(recoveryData.currentQuestionIndex);
    setTimeRemaining(recoveryData.timeRemaining);
    timeRemainingRef.current = recoveryData.timeRemaining;
    
    setShowRecoveryPrompt(false);
    setLoading(true);
    setLoadingMessage("Restoring your session...");
    
    // Continue with normal quiz flow
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Session Restored",
        description: "Your previous answers have been recovered.",
      });
    }, 1000);
  }, [recoveryData, toast]);

  const handleStartNew = useCallback(async () => {
    setLoadingMessage("Clearing previous session...");
    setLoading(true);
    
    try {
      // 1. Clear ALL localStorage data for any quiz attempts
      if (typeof window !== 'undefined' && window.localStorage) {
        // Clear all quiz autosave data
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('quiz_autosave_')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      }
      
      // 2. Clear session on server - this abandons ALL in-progress attempts
      await fetch(`/api/student/quiz/${quizId}/clear-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      // 3. If we have a specific attempt, abandon it too
      if (recoveryData?.attemptId) {
        await fetch(`/api/student/quiz/${quizId}/abandon`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attemptId: recoveryData.attemptId }),
        });
      }
    } catch (error) {
      logger.error('Failed to clear session:', error);
    }
    
    // 4. Clear all state
    setShowRecoveryPrompt(false);
    setRecoveryData(null);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setTimeRemaining(0);
    
    // 5. Start fresh by reloading with a flag to skip recovery
    const url = new URL(window.location.href);
    url.searchParams.set('fresh', 'true');
    window.location.href = url.toString();
  }, [recoveryData, quizId]);

  // Enhanced submit with retry logic
  const handleSubmit = useCallback(async (isAutoSubmit = false) => {
    if (!quizRef.current || submitting) return;
    
    // Cleanup auto-save
    if (autoSaveService.current) {
      autoSaveService.current.stopAutoSave();
    }
    
    if (!isAutoSubmit) {
      const unansweredCount = quizRef.current.questions.filter(
        q => !answers[q.id]?.answer
      ).length;
      
      if (unansweredCount > 0) {
        if (!confirm(`You have ${unansweredCount} unanswered questions. Are you sure you want to submit?`)) {
          return;
        }
      }
    }
    
    setSubmitting(true);
    
    // Retry logic for network issues
    let retryCount = 0;
    const maxRetries = 3;
    
    const attemptSubmit = async (): Promise<boolean> => {
      try {
        const response = await fetch(`/api/student/quiz/${quizId}/submit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            attemptId: attemptIdRef.current,
            answers: Object.values(answers),
            timeSpent: (quizRef.current!.duration * 60) - timeRemainingRef.current,
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          
          // Clear saved data on successful submission
          if (attemptIdRef.current) {
            QuizAutoSaveService.clearSavedData(attemptIdRef.current);
          }
          
          // Clear timers
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          if (timeoutTimerRef.current) {
            clearTimeout(timeoutTimerRef.current);
            timeoutTimerRef.current = null;
          }
          
          // Clear all session data after successful submission
          if (attemptIdRef.current) {
            QuizAutoSaveService.clearSavedData(attemptIdRef.current);
          }
          
          if (isAutoSubmit) {
            alert("Time's up! Your quiz has been automatically submitted.");
          }
          
          router.push(`/student/results/${data.attemptId}`);
          return true;
        } else {
          const errorData = await response.json();
          
          if (errorData.error === "Quiz already submitted") {
            alert(errorData.message);
            router.push(`/student/results/${errorData.attemptId}`);
            return true;
          }
          
          throw new Error(errorData.error || "Submission failed");
        }
      } catch (error) {
        logger.error(`Submit attempt ${retryCount + 1} failed:`, error);
        return false;
      }
    };
    
    // Try submission with retries
    while (retryCount < maxRetries) {
      const success = await attemptSubmit();
      if (success) break;
      
      retryCount++;
      if (retryCount < maxRetries) {
        toast({
          title: `Submission failed (Attempt ${retryCount}/${maxRetries})`,
          description: "Retrying...",
          variant: "destructive",
        });
        await new Promise(resolve => setTimeout(resolve, 2000 * retryCount)); // Exponential backoff
      }
    }
    
    if (retryCount === maxRetries) {
      toast({
        title: "Submission Failed",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  }, [answers, quizId, router, submitting, toast]);

  // Enhanced timer with timeout handling
  useEffect(() => {
    if (timeRemaining <= 0 || !quiz) return;

    // Clear existing timers
    if (timerRef.current) clearInterval(timerRef.current);
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);

    // Set up timeout for 2x duration (abandon after this)
    const maxDuration = quiz.duration * 60 * 2; // 2x the original duration
    const timeElapsed = (quiz.duration * 60) - timeRemaining;
    const remainingMaxTime = maxDuration - timeElapsed;
    
    if (remainingMaxTime > 0) {
      timeoutTimerRef.current = setTimeout(async () => {
        // Send diagnostics for timeout
        if (attemptIdRef.current) {
          await diagnostics.current.sendIfNeeded(attemptIdRef.current, 'timeout');
        }
        toast({
          title: "Quiz Timeout",
          description: "Maximum time exceeded. Submitting your quiz.",
          variant: "destructive",
        });
        handleSubmit(true);
      }, remainingMaxTime * 1000);
    }

    timerRef.current = setInterval(() => {
      timeRemainingRef.current -= 1;
      setTimeRemaining(timeRemainingRef.current);
      
      if (timeRemainingRef.current <= 0) {
        handleSubmit(true);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        return;
      }
      
      // Enhanced warnings for mobile users
      if (isMobile) {
        if (timeRemainingRef.current === 900) { // 15 minutes
          toast({
            title: "⏰ 15 minutes remaining",
            description: "Make sure to review your answers.",
          });
        } else if (timeRemainingRef.current === 600) { // 10 minutes
          setShowTimeWarning(true);
          toast({
            title: "⏰ 10 minutes remaining",
            description: "Consider submitting soon to avoid timeout.",
          });
          setTimeout(() => setShowTimeWarning(false), 5000);
        } else if (timeRemainingRef.current === 300) { // 5 minutes
          setShowWarning(true);
          toast({
            title: "⚠️ Only 5 minutes left!",
            description: "Submit your quiz to avoid losing your answers.",
            variant: "destructive",
          });
          setTimeout(() => setShowWarning(false), 5000);
        } else if (timeRemainingRef.current === 60) { // 1 minute
          setShowWarning(true);
          toast({
            title: "🚨 Final minute!",
            description: "Your quiz will auto-submit when time expires.",
            variant: "destructive",
          });
        }
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    };
  }, [quiz, handleSubmit, timeRemaining, isMobile, toast]);

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

  const handleQuizError = (message: string) => {
    setLoading(false);
    alert(message);
    router.push("/student/quizzes");
  };

  const handleQuizNotStarted = (data: any) => {
    setLoading(false);
    
    if (data.startTime) {
      const startTime = new Date(data.startTime);
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
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
  };

  const handleNetworkError = () => {
    setLoading(false);
    toast({
      title: "Network Error",
      description: "Please check your connection and try again.",
      variant: "destructive",
    });
    router.push("/student/quizzes");
  };

  // Render states
  if (loading) {
    return (
      <ImprovedQuizLoader
        message={loadingMessage}
        progress={loadingProgress}
        subMessage={isMobile ? "Optimizing for mobile experience..." : undefined}
      />
    );
  }

  if (showRecoveryPrompt && recoveryData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50/50 to-white dark:from-gray-900 dark:to-gray-950 p-4">
        <div className="max-w-md w-full">
          <SessionRecoveryPrompt
            lastSaved={recoveryData.lastSaved.toString()}
            answersCount={Object.keys(recoveryData.answers).length}
            onRecover={handleRecover}
            onStartNew={handleStartNew}
          />
        </div>
      </div>
    );
  }

  if (quizCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50/50 to-white dark:from-gray-900 dark:to-gray-950">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
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
    // Log debug info
    console.log('[QUIZ_DEBUG] Render check failed:', {
      hasQuiz: !!quiz,
      hasCurrentQuestion: !!currentQuestion,
      quizId: quiz?.id,
      questionsLength: quiz?.questions?.length || 0,
      currentIndex: currentQuestionIndex
    });
    
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-2">Unable to load quiz</p>
          <p className="text-sm text-gray-500 mb-4">
            {!quiz ? 'Quiz data not loaded' : 'Questions not available'}
          </p>
          <div className="space-y-2">
            <Button 
              onClick={() => window.location.reload()} 
              variant="default"
              className="w-full"
            >
              Try Again
            </Button>
            <Link href="/student/quizzes">
              <Button variant="outline" className="w-full">
                Back to Quizzes
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentAnswer = answers[currentQuestion.id];
  const isTimeLow = timeRemaining < 300;

  // Main quiz interface (similar to original but with mobile enhancements)
  // ... [Rest of the UI remains similar to the original with added MobileQuizInterface component]
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 to-white dark:from-gray-900 dark:to-gray-950">
      {/* Mobile Interface Enhancements */}
      <MobileQuizInterface
        isOnline={isOnline}
        lastSaveTime={lastSaveTime}
        isSaving={isSaving}
        autoSaveEnabled={autoSaveEnabled}
        onEnableAutoSave={() => setAutoSaveEnabled(true)}
        timeRemaining={timeRemaining}
        totalDuration={quiz.duration * 60}
      />
      
      {/* Rest of the original quiz UI continues here... */}
      {/* [Include the rest of the original quiz UI with the session warning, header, question panel, etc.] */}
    </div>
  );
}
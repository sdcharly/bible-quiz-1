"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useWebSocket } from "@/lib/websocket";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { 
  RefreshCw, AlertCircle, CheckCircle, 
  Loader2, X, BookOpen, ArrowLeft 
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

interface Question {
  id: string;
  questionText: string;
  options: { text: string; id: string }[];
  correctAnswer: string;
  explanation: string | null;
  difficulty: string | null;
  bloomsLevel: string | null;
  topic: string | null;
  book: string | null;
  chapter: string | null;
  orderIndex: number;
}

interface QuizDetails {
  id: string;
  title: string;
  description: string | null;
  questions: Question[];
  status: string;
  totalQuestions: number;
}

interface ReviewPageOptimizedProps {
  quizId: string;
}

export default function ReviewPageOptimized({ quizId }: ReviewPageOptimizedProps) {
  const router = useRouter();
  const [quiz, setQuiz] = useState<QuizDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [replacingQuestion, setReplacingQuestion] = useState<string | null>(null);
  const [replaceJobId, setReplaceJobId] = useState<string | null>(null);
  const [replaceProgress, setReplaceProgress] = useState(0);
  const [replaceMessage, setReplaceMessage] = useState("");
  
  // Track if we're already handling completion to prevent duplicates
  const isCompletingRef = useRef(false);
  const startTimeRef = useRef<number>(0);

  // Fetch quiz details
  const fetchQuizDetails = useCallback(async () => {
    try {
      const response = await fetch(`/api/educator/quiz/${quizId}`);
      if (response.ok) {
        const data = await response.json();
        setQuiz(data);
      }
    } catch (error) {
      logger.error("Error fetching quiz details:", error);
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    fetchQuizDetails();
  }, [fetchQuizDetails]);

  // Use WebSocket for real-time updates on question replacement
  useWebSocket('quiz_status', (message) => {
    const data = message.data as {
      jobId?: string;
      quizId?: string;
      questionId?: string;
      status?: string;
      progress?: number;
      error?: string;
      message?: string;
    };

    // Only process messages for our current job
    if (data.jobId !== replaceJobId || isCompletingRef.current) {
      return;
    }

    logger.debug('Received quiz status update:', data);

    // Calculate elapsed time for better messaging
    const elapsedSeconds = startTimeRef.current 
      ? Math.floor((Date.now() - startTimeRef.current) / 1000)
      : 0;

    // Update progress with time-aware messages
    let progressMessage = data.message || "Generating replacement question...";
    
    if (data.status === 'processing') {
      if (elapsedSeconds > 600) { // 10+ minutes
        progressMessage = "Deep theological analysis in progress... AI is ensuring biblical accuracy.";
      } else if (elapsedSeconds > 300) { // 5+ minutes
        progressMessage = "Analyzing scripture context and crafting meaningful questions...";
      } else if (elapsedSeconds > 120) { // 2+ minutes
        progressMessage = "AI is studying your biblical texts to create the perfect question...";
      } else if (elapsedSeconds > 60) {
        progressMessage = "Complex theological questions take time to craft perfectly...";
      } else if (elapsedSeconds > 30) {
        progressMessage = "AI is carefully analyzing biblical content...";
      }
    }

    setReplaceProgress(data.progress || Math.min(5 + elapsedSeconds, 90));
    setReplaceMessage(progressMessage);

    // Handle completion
    if (data.status === 'completed') {
      handleReplaceCompletion();
    } else if (data.status === 'failed') {
      handleReplaceFailure(data.error || "Failed to replace question");
    }
  }, [replaceJobId]);

  const handleReplaceCompletion = async () => {
    if (isCompletingRef.current) return;
    
    logger.log('Question replacement completed');
    isCompletingRef.current = true;
    
    setReplaceProgress(100);
    setReplaceMessage("Question replaced successfully!");
    
    // Refresh quiz data to show the new question
    await fetchQuizDetails();
    
    // Clear states after a short delay
    setTimeout(() => {
      setReplacingQuestion(null);
      setReplaceJobId(null);
      setReplaceProgress(0);
      setReplaceMessage("");
      isCompletingRef.current = false;
      startTimeRef.current = 0;
    }, 1500);
  };

  const handleReplaceFailure = (error: string) => {
    logger.error('Question replacement failed:', error);
    
    setReplacingQuestion(null);
    setReplaceJobId(null);
    setReplaceProgress(0);
    setReplaceMessage("");
    startTimeRef.current = 0;
    
    alert(error);
  };

  const handleReplaceQuestion = async (questionId: string) => {
    if (replacingQuestion) return;

    setReplacingQuestion(questionId);
    setReplaceProgress(5);
    setReplaceMessage("Initiating AI-powered question generation...");
    isCompletingRef.current = false;
    startTimeRef.current = Date.now();

    try {
      const response = await fetch(
        `/api/educator/quiz/${quizId}/question/${questionId}/replace-async`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to initiate question replacement");
      }

      const data = await response.json();
      
      if (data.jobId) {
        logger.log("Replace job started with ID:", data.jobId);
        setReplaceJobId(data.jobId);
        setReplaceMessage("Connected to AI service. Generating biblical question...");
        // WebSocket will handle status updates from here
      } else {
        throw new Error("No job ID received");
      }
    } catch (error) {
      logger.error("Error replacing question:", error);
      handleReplaceFailure(
        error instanceof Error ? error.message : "Failed to replace question"
      );
    }
  };

  const handleCancelReplace = () => {
    logger.log("Cancelling question replacement");
    setReplacingQuestion(null);
    setReplaceJobId(null);
    setReplaceProgress(0);
    setReplaceMessage("");
    isCompletingRef.current = false;
    startTimeRef.current = 0;
  };

  const handlePublishQuiz = async () => {
    if (!quiz) return;

    try {
      const response = await fetch(`/api/educator/quiz/${quiz.id}/publish`, {
        method: "POST",
      });

      if (response.ok) {
        router.push(`/educator/quiz/${quiz.id}/manage`);
      } else {
        const error = await response.json();
        alert(error.message || "Failed to publish quiz");
      }
    } catch (error) {
      logger.error("Error publishing quiz:", error);
      alert("Failed to publish quiz");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p>Quiz not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/educator/quizzes")}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Review Quiz: {quiz.title}
                </h1>
                <p className="text-sm text-gray-500">
                  {quiz.totalQuestions} questions • {quiz.status}
                </p>
              </div>
            </div>
            <Button onClick={handlePublishQuiz}>
              Publish Quiz
            </Button>
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {quiz.questions.map((question, index) => (
            <div
              key={question.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-500">
                      Question {index + 1}
                    </span>
                    {question.difficulty && (
                      <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                        {question.difficulty}
                      </span>
                    )}
                    {question.bloomsLevel && (
                      <span className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-800">
                        {question.bloomsLevel}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                    {question.questionText}
                  </h3>
                  <div className="space-y-2">
                    {question.options.map((option) => (
                      <div
                        key={option.id}
                        className={`p-3 rounded-lg border ${
                          option.id === question.correctAnswer
                            ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                            : "border-gray-200 dark:border-gray-700"
                        }`}
                      >
                        <div className="flex items-center">
                          {option.id === question.correctAnswer && (
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                          )}
                          <span className="text-sm">{option.text}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {question.explanation && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <strong>Explanation:</strong> {question.explanation}
                      </p>
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReplaceQuestion(question.id)}
                  disabled={replacingQuestion !== null}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Replace
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Replace Question Modal */}
      <Dialog open={replacingQuestion !== null} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Generating New Question
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Progress value={replaceProgress} className="h-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                {replaceMessage}
              </p>
            </div>
            {replaceProgress < 100 && (
              <p className="text-xs text-gray-500 text-center">
                AI is analyzing your biblical content to create meaningful questions.
                This process ensures theological accuracy and educational value.
              </p>
            )}
            {replaceProgress < 100 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelReplace}
                className="w-full"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
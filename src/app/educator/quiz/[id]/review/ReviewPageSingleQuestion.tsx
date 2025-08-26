"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  RefreshCw, AlertCircle, CheckCircle, 
  Loader2, X, BookOpen, ArrowLeft, Languages,
  ChevronLeft, ChevronRight, Edit2, Save, Eye, EyeOff,
  Grid3x3, Hash, Target, Brain, BarChart3, Shield, Shuffle
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TranslationModal } from "@/components/quiz/TranslationModal";
import { useQuestionTranslation } from "@/hooks/useQuestionTranslation";
import { QuestionValidationResult } from "@/lib/question-validator";
import { PublishButton } from "@/components/quiz/PublishButton";

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
  educatorId: string;
  schedulingStatus?: string;
  startTime?: string | null;
  timezone?: string;
  duration?: number;
}

interface ReviewPageSingleQuestionProps {
  quizId: string;
}

export default function ReviewPageSingleQuestion({ quizId }: ReviewPageSingleQuestionProps) {
  const router = useRouter();
  const [quiz, setQuiz] = useState<QuizDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [editedQuestion, setEditedQuestion] = useState<Question | null>(null);
  const [saving, setSaving] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [viewMode, setViewMode] = useState<"single" | "grid">("single");
  const [shuffling, setShuffling] = useState(false);
  const [shuffleAllLoading, setShuffleAllLoading] = useState(false);
  
  // Validation state
  const [validationResults, setValidationResults] = useState<Record<string, QuestionValidationResult>>({});
  const [validating, setValidating] = useState(false);
  
  // Replace question state
  const [replacingQuestion, setReplacingQuestion] = useState<string | null>(null);
  const [replaceJobId, setReplaceJobId] = useState<string | null>(null);
  const [replaceProgress, setReplaceProgress] = useState(0);
  const [replaceMessage, setReplaceMessage] = useState("");
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [questionToReplace, setQuestionToReplace] = useState<string | null>(null);
  const [replaceOptions, setReplaceOptions] = useState({
    difficulty: "medium",
    book: "",
    chapter: ""
  });
  
  const isCompletingRef = useRef(false);
  const startTimeRef = useRef<number>(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // Translation hook
  const {
    isTranslating,
    isModalOpen,
    translatingQuestionId,
    openTranslationModal,
    closeTranslationModal,
    translateQuestion,
    success: translationSuccess
  } = useQuestionTranslation({ 
    quizId, 
    onTranslationComplete: async () => {
      // Only refresh the current question data
      await fetchQuizDetails();
    }
  });

  useEffect(() => {
    fetchQuizDetails();
  }, [fetchQuizDetails]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Validate current question
  const validateCurrentQuestion = async () => {
    if (!quiz || !currentQuestion) return;
    
    setValidating(true);
    try {
      const questionData = {
        id: currentQuestion.id,
        questionText: currentQuestion.questionText,
        options: currentQuestion.options,
        correctAnswer: currentQuestion.correctAnswer,
        explanation: currentQuestion.explanation,
        book: currentQuestion.book,
        chapter: currentQuestion.chapter,
        topic: currentQuestion.topic,
        difficulty: currentQuestion.difficulty,
        bloomsLevel: currentQuestion.bloomsLevel
      };

      const response = await fetch('/api/educator/questions/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: questionData, single: true })
      });

      if (response.ok) {
        const data = await response.json();
        setValidationResults(prev => ({
          ...prev,
          [currentQuestion.id]: data.validation
        }));
      }
    } catch (error) {
      logger.error('Validation failed:', error);
    } finally {
      setValidating(false);
    }
  };

  // WebSocket for replace question updates - DISABLED
  // WebSocket server not currently implemented, using polling instead
  // useWebSocket('quiz_status', (message) => {
  //   const data = message.data as {
  //     jobId?: string;
  //     quizId?: string;
  //     questionId?: string;
  //     status?: string;
  //     progress?: number;
  //     error?: string;
  //     message?: string;
  //   };

  //   if (data.jobId !== replaceJobId || isCompletingRef.current) {
  //     return;
  //   }

  //   logger.debug('Received quiz status update:', data);

  //   const elapsedSeconds = startTimeRef.current 
  //     ? Math.floor((Date.now() - startTimeRef.current) / 1000)
  //     : 0;

  //   let progressMessage = data.message || "Generating replacement question...";
    
  //   if (data.status === 'processing') {
  //     if (elapsedSeconds > 120) {
  //       progressMessage = "AI is studying your biblical texts to create the perfect question...";
  //     } else if (elapsedSeconds > 60) {
  //       progressMessage = "Complex theological questions take time to craft perfectly...";
  //     } else if (elapsedSeconds > 30) {
  //       progressMessage = "AI is carefully analyzing biblical content...";
  //     }
  //   }

  //   setReplaceProgress(data.progress || Math.min(5 + elapsedSeconds, 90));
  //   setReplaceMessage(progressMessage);

  //   // WebSocket handlers removed - using synchronous endpoint
  // }, [replaceJobId]);

  // Removed WebSocket completion handlers - now integrated into main function

  // Poll for job status
  const pollJobStatus = (jobId: string) => {
    let attempts = 0;
    const MAX_ATTEMPTS = 240; // 4 minutes at 1 second intervals (2 min processing + buffer)
    
    pollIntervalRef.current = setInterval(async () => {
      attempts++;
      
      // Update progress based on time elapsed
      const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const estimatedProgress = Math.min(5 + (elapsedSeconds / 120) * 85, 90); // Progress up to 90% over 2 minutes
      setReplaceProgress(estimatedProgress);
      
      // Update message based on elapsed time
      if (elapsedSeconds > 90) {
        setReplaceMessage("AI is carefully crafting your biblical question... (this usually takes 2 minutes)");
      } else if (elapsedSeconds > 60) {
        setReplaceMessage("AI agent is analyzing biblical context and theology...");
      } else if (elapsedSeconds > 30) {
        setReplaceMessage("Processing your request through the AI agent...");
      } else {
        setReplaceMessage("Request sent to AI agent. Processing started...");
      }
      
      try {
        const response = await fetch(`/api/educator/quiz/poll-status?jobId=${jobId}`);
        
        if (response.ok) {
          const status = await response.json();
          logger.log(`[POLL-REPLACE] Job ${jobId} status:`, status.status);
          
          if (status.status === 'completed') {
            // Stop polling
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            
            setReplaceProgress(95);
            setReplaceMessage("Question generated! Updating your quiz...");
            
            // Refresh the quiz to get the new question
            await fetchQuizDetails();
            
            setReplaceProgress(100);
            setReplaceMessage("Question replaced successfully!");
            
            setTimeout(() => {
              setReplacingQuestion(null);
              setReplaceJobId(null);
              setReplaceProgress(0);
              setReplaceMessage("");
              isCompletingRef.current = false;
            }, 2000);
            
          } else if (status.status === 'failed') {
            // Stop polling immediately - job has failed
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            
            // Show clear error message
            let errorMessage = "AI failed to generate replacement question. ";
            
            if (status.error?.includes("missing required fields")) {
              errorMessage += "The AI couldn't create a properly formatted question.";
            } else if (status.error?.includes("timeout")) {
              errorMessage += "The generation process took too long.";
            } else {
              errorMessage += status.error || "Unknown error occurred.";
            }
            
            setReplaceProgress(0);
            setReplaceMessage(errorMessage);
            
            // Keep error message visible for 5 seconds
            setTimeout(() => {
              setReplacingQuestion(null);
              setReplaceJobId(null);
              setReplaceProgress(0);
              setReplaceMessage("");
              
              // Alert user with option to try again
              if (confirm(errorMessage + "\n\nWould you like to try replacing this question again?")) {
                // User can click Replace button again
              }
            }, 5000);
          }
        } else if (response.status === 404) {
          // Job not found - might have expired
          logger.warn(`[POLL-REPLACE] Job ${jobId} not found`);
        }
      } catch (error) {
        logger.error(`[POLL-REPLACE] Error polling job ${jobId}:`, error);
      }
      
      // Stop after max attempts (4 minutes)
      if (attempts >= MAX_ATTEMPTS) {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        
        setReplaceMessage("Question generation is taking longer than expected. Please try again.");
        setTimeout(() => {
          setReplacingQuestion(null);
          setReplaceJobId(null);
          setReplaceProgress(0);
          setReplaceMessage("");
        }, 3000);
      }
    }, 1000); // Poll every second
  };

  // Open the replace dialog with the question ID
  const openReplaceDialog = (questionId: string) => {
    const question = quiz?.questions.find(q => q.id === questionId);
    if (question) {
      setQuestionToReplace(questionId);
      setReplaceOptions({
        difficulty: question.difficulty || "medium",
        book: question.book || "",
        chapter: question.chapter || ""
      });
      setShowReplaceDialog(true);
    }
  };

  // Handle the actual replacement after configuration
  const handleReplaceQuestion = async () => {
    if (!questionToReplace || replacingQuestion) return;

    setShowReplaceDialog(false);
    setReplacingQuestion(questionToReplace);
    setReplaceProgress(5);
    setReplaceMessage("Initiating AI-powered question generation...");
    isCompletingRef.current = false;
    startTimeRef.current = Date.now();

    try {
      const response = await fetch(
        `/api/educator/quiz/${quizId}/question/${questionToReplace}/replace-async`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(replaceOptions)
        }
      );

      if (!response.ok) {
        throw new Error("Failed to initiate question replacement");
      }

      const data = await response.json();
      
      if (data.jobId) {
        logger.log("Replace job started with ID:", data.jobId);
        setReplaceJobId(data.jobId);
        setReplaceMessage("Request received. AI agent is now working on your question...");
        
        // Start polling for job status
        pollJobStatus(data.jobId);
      } else {
        throw new Error("No job ID received");
      }
    } catch (error) {
      logger.error("Error replacing question:", error);
      setReplaceMessage(error instanceof Error ? error.message : "Failed to replace question");
      
      setTimeout(() => {
        setReplacingQuestion(null);
        setReplaceJobId(null);
        setReplaceProgress(0);
        setReplaceMessage("");
        setQuestionToReplace(null);
      }, 3000);
    }
  };

  const handleEditQuestion = () => {
    if (!quiz) return;
    const question = quiz.questions[currentQuestionIndex];
    setEditedQuestion({ ...question });
    setEditingQuestion(question.id);
  };

  const handleSaveQuestion = async () => {
    if (!editedQuestion || !quiz) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/educator/quiz/${quizId}/question/${editedQuestion.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedQuestion)
      });

      if (response.ok) {
        // Update local state
        setQuiz(prev => {
          if (!prev) return null;
          return {
            ...prev,
            questions: prev.questions.map(q => 
              q.id === editedQuestion.id ? editedQuestion : q
            )
          };
        });
        setEditingQuestion(null);
        setEditedQuestion(null);
      } else {
        alert("Failed to save question");
      }
    } catch (error) {
      logger.error("Error saving question:", error);
      alert("Error saving question");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingQuestion(null);
    setEditedQuestion(null);
  };

  // Shuffle options for current question
  const handleShuffleOptions = async () => {
    if (!quiz || shuffling) return;
    const question = quiz.questions[currentQuestionIndex];
    
    setShuffling(true);
    try {
      const response = await fetch(
        `/api/educator/quiz/${quizId}/question/${question.id}/shuffle-options`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        // Update local state with shuffled options
        setQuiz(prev => {
          if (!prev) return null;
          return {
            ...prev,
            questions: prev.questions.map(q => 
              q.id === question.id 
                ? { ...q, options: data.options }
                : q
            )
          };
        });
      } else {
        const error = await response.json();
        alert(error.error || "Failed to shuffle options");
      }
    } catch (error) {
      logger.error("Error shuffling options:", error);
      alert("Error shuffling options");
    } finally {
      setShuffling(false);
    }
  };

  // Shuffle all questions' options
  const handleShuffleAllOptions = async () => {
    if (!quiz || shuffleAllLoading) return;
    
    if (!confirm("This will randomly shuffle the options for ALL questions in this quiz. Continue?")) {
      return;
    }
    
    setShuffleAllLoading(true);
    try {
      const response = await fetch(
        `/api/educator/quiz/${quizId}/shuffle-all-options`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        // Refresh quiz data to get updated options
        await fetchQuizDetails();
        
        // Show distribution improvement
        if (data.distributionAfter) {
          const positions = data.distributionAfter.positionCounts;
          alert(`Options shuffled successfully!\n\nCorrect answer distribution:\nA: ${positions.A} questions\nB: ${positions.B} questions\nC: ${positions.C} questions\nD: ${positions.D} questions`);
        }
      } else {
        const error = await response.json();
        alert(error.error || "Failed to shuffle options");
      }
    } catch (error) {
      logger.error("Error shuffling all options:", error);
      alert("Error shuffling all options");
    } finally {
      setShuffleAllLoading(false);
    }
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
        throw new Error(error.error || error.message || "Failed to publish quiz");
      }
    } catch (error) {
      logger.error("Error publishing quiz:", error);
      throw error;
    }
  };

  const handleScheduleQuiz = async (schedule: { startTime: string; timezone: string; duration: number }) => {
    // This is handled by the PublishButton component
    await fetchQuizDetails();
  };

  // Auto-validate when changing questions
  useEffect(() => {
    if (quiz && currentQuestion) {
      // Check if we already have validation for this question
      if (!validationResults[currentQuestion.id]) {
        // Auto-validate after a short delay
        const timer = setTimeout(() => {
          validateCurrentQuestion();
        }, 500);
        return () => clearTimeout(timer);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionIndex, quiz?.questions[currentQuestionIndex]?.id]);

  const goToNextQuestion = () => {
    if (quiz && currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setShowExplanation(false);
      setEditingQuestion(null);
      setEditedQuestion(null);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setShowExplanation(false);
      setEditingQuestion(null);
      setEditedQuestion(null);
    }
  };

  const goToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
    setShowExplanation(false);
    setEditingQuestion(null);
    setEditedQuestion(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
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

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const isEditing = editingQuestion === currentQuestion?.id;
  const displayQuestion = isEditing && editedQuestion ? editedQuestion : currentQuestion;
  const progressPercentage = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

  // Grid view
  if (viewMode === "grid") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/educator/quizzes")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Quizzes
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShuffleAllOptions}
                disabled={shuffleAllLoading || quiz.status === "published"}
                title="Shuffle options for all questions to improve distribution"
              >
                <Shuffle className="h-4 w-4 mr-2" />
                {shuffleAllLoading ? "Shuffling All..." : "Shuffle All"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode("single")}
              >
                <Eye className="h-4 w-4 mr-2" />
                Single View
              </Button>
              <PublishButton
                quizId={quiz.id}
                quizTitle={quiz.title}
                quizStatus={quiz.status}
                schedulingStatus={quiz.schedulingStatus}
                hasStartTime={!!quiz.startTime}
                startTime={quiz.startTime}
                timezone={quiz.timezone}
                duration={quiz.duration}
                educatorId={quiz.educatorId}
                onPublish={handlePublishQuiz}
                onSchedule={handleScheduleQuiz}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{quiz.title}</h1>
            <p className="text-gray-600 mt-2">{quiz.description}</p>
          </div>

          {/* Questions Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quiz.questions.map((question, index) => (
              <Card 
                key={question.id}
                className="cursor-pointer hover:shadow-lg transition-all"
                onClick={() => {
                  goToQuestion(index);
                  setViewMode("single");
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-500">
                      Question {index + 1}
                    </span>
                    {question.difficulty && (
                      <span className={`px-2 py-1 text-xs rounded ${
                        question.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                        question.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {question.difficulty}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm line-clamp-3 mb-3">{question.questionText}</p>
                  {question.book && (
                    <div className="flex items-center gap-1 text-xs text-amber-700">
                      <BookOpen className="h-3 w-3" />
                      <span>{question.book} {question.chapter || ''}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Single question view
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Compact Header */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/educator/quizzes")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Quizzes
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShuffleAllOptions}
                disabled={shuffleAllLoading || quiz.status === "published"}
                title="Shuffle options for all questions to improve distribution"
              >
                <Shuffle className="h-4 w-4 mr-2" />
                {shuffleAllLoading ? "Shuffling All..." : "Shuffle All"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid3x3 className="h-4 w-4 mr-2" />
                Grid View
              </Button>
              <PublishButton
                quizId={quiz.id}
                quizTitle={quiz.title}
                quizStatus={quiz.status}
                schedulingStatus={quiz.schedulingStatus}
                hasStartTime={!!quiz.startTime}
                startTime={quiz.startTime}
                timezone={quiz.timezone}
                duration={quiz.duration}
                educatorId={quiz.educatorId}
                onPublish={handlePublishQuiz}
                onSchedule={handleScheduleQuiz}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              />
            </div>
          </div>

          {/* Compact Quiz Info */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg px-4 py-2 mb-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-amber-900">{quiz.title}</h1>
                <p className="text-xs text-amber-700">{quiz.description}</p>
              </div>
              <div className="text-xs text-amber-800">
                <span>{quiz.totalQuestions} Questions</span>
                <span className="mx-2">•</span>
                <span className="capitalize">{quiz.status}</span>
              </div>
            </div>
          </div>

          {/* Compact Progress and Navigation */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">
                {currentQuestionIndex + 1}/{quiz.questions.length}
              </span>
              <div className="w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
            
            {/* Compact Question Navigation Dots */}
            <div className="flex gap-1">
            {quiz.questions.map((_, index) => (
              <Button
                key={index}
                variant={index === currentQuestionIndex ? "default" : "outline"}
                size="sm"
                onClick={() => goToQuestion(index)}
                className={`w-7 h-7 p-0 text-xs font-medium transition-all relative ${
                  index === currentQuestionIndex
                    ? 'bg-amber-600 text-white shadow scale-105 hover:bg-amber-700'
                    : 'bg-white hover:bg-amber-50 text-gray-600 border-gray-300'
                }`}
              >
                {index + 1}
                {validationResults[quiz.questions[index].id] && (
                  <div className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${
                    validationResults[quiz.questions[index].id].score >= 90 ? 'bg-amber-500' :
                    validationResults[quiz.questions[index].id].score >= 75 ? 'bg-yellow-500' :
                    validationResults[quiz.questions[index].id].score >= 60 ? 'bg-orange-500' :
                    'bg-orange-700'
                  }`} />
                )}
              </Button>
            ))}
            </div>
          </div>
        </div>

        {/* Main Question Card */}
        {currentQuestion && (
          <Card className="shadow-lg border-0 mb-4">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-lg py-3 px-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold text-amber-900">Question {currentQuestionIndex + 1}</span>
                  {displayQuestion.book && (
                    <span className="text-amber-700">
                      • {displayQuestion.book} {displayQuestion.chapter || ''}
                    </span>
                  )}
                  {displayQuestion.difficulty && (
                    <span className="text-amber-700">
                      • {displayQuestion.difficulty}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {quiz.status !== "published" && (
                    <>
                      {isEditing ? (
                        <>
                          <Button
                            size="sm"
                            onClick={handleSaveQuestion}
                            disabled={saving}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Save className="h-4 w-4 mr-1" />
                            {saving ? "Saving..." : "Save"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleEditQuestion}
                            className="border-amber-200 hover:bg-amber-50"
                          >
                            <Edit2 className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleShuffleOptions}
                            disabled={shuffling}
                            className="border-amber-200 hover:bg-amber-50"
                            title="Randomly reorder answer options"
                          >
                            <Shuffle className="h-4 w-4 mr-1" />
                            {shuffling ? "Shuffling..." : "Shuffle"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openTranslationModal(currentQuestion.id)}
                            disabled={isTranslating}
                            className="border-amber-200 hover:bg-amber-50"
                          >
                            <Languages className="h-4 w-4 mr-1" />
                            Translate
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openReplaceDialog(currentQuestion.id)}
                            disabled={replacingQuestion !== null}
                            className="border-amber-200 hover:bg-amber-50"
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Replace
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={validateCurrentQuestion}
                            disabled={validating}
                            className="border-amber-200 hover:bg-amber-50"
                          >
                            <Shield className="h-4 w-4 mr-1" />
                            {validating ? "Validating..." : "Validate"}
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4">
              {/* Question Text */}
              <div className="mb-4">
                {isEditing ? (
                  <Textarea
                    value={editedQuestion?.questionText || ''}
                    onChange={(e) => setEditedQuestion(prev => 
                      prev ? { ...prev, questionText: e.target.value } : null
                    )}
                    className="text-lg min-h-[100px]"
                  />
                ) : (
                  <h2 className="text-xl font-medium">{displayQuestion.questionText}</h2>
                )}
              </div>

              {/* Options */}
              <div className="space-y-2 mb-4">
                {displayQuestion.options.filter(option => option && option.id).map((option, index) => (
                  <div 
                    key={option.id}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                      option.id === displayQuestion.correctAnswer 
                        ? "bg-green-50 border border-green-400" 
                        : "bg-gray-50 border border-gray-200"
                    }`}
                  >
                    <span className={`w-10 h-10 rounded-lg flex items-center justify-center font-semibold ${
                      option.id === displayQuestion.correctAnswer 
                        ? "bg-green-500 text-white" 
                        : "bg-white text-gray-700 border"
                    }`}>
                      {String.fromCharCode(65 + index)}
                    </span>
                    {isEditing ? (
                      <Input
                        value={option.text}
                        onChange={(e) => {
                          if (editedQuestion) {
                            const newOptions = [...editedQuestion.options];
                            newOptions[index] = { ...option, text: e.target.value };
                            setEditedQuestion({ ...editedQuestion, options: newOptions });
                          }
                        }}
                        className="flex-1"
                      />
                    ) : (
                      <span className="flex-1">{option.text}</span>
                    )}
                    {option.id === displayQuestion.correctAnswer && !isEditing && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                ))}
              </div>

              {/* Correct Answer Selector (Edit Mode) */}
              {isEditing && editedQuestion && (
                <div className="mb-4 p-3 bg-amber-50 rounded-lg">
                  <Label className="text-sm text-amber-900">Correct Answer</Label>
                  <Select
                    value={editedQuestion.correctAnswer}
                    onValueChange={(value) => setEditedQuestion({ ...editedQuestion, correctAnswer: value })}
                  >
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {editedQuestion.options.filter(opt => opt && opt.id && opt.text).map((opt, index) => (
                        <SelectItem key={opt.id} value={opt.id}>
                          Option {String.fromCharCode(65 + index)}: {opt.text.substring(0, 50)}...
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Explanation */}
              <div className="border-t pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowExplanation(!showExplanation)}
                  className="flex items-center gap-2 text-amber-600 hover:text-amber-700 text-sm font-medium p-0 h-auto"
                >
                  {showExplanation ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {showExplanation ? "Hide" : "Show"} Explanation
                </Button>
                
                {showExplanation && (
                  <div className="mt-3 p-3 bg-amber-50 rounded-lg">
                    {isEditing ? (
                      <Textarea
                        value={editedQuestion?.explanation || ''}
                        onChange={(e) => setEditedQuestion(prev => 
                          prev ? { ...prev, explanation: e.target.value } : null
                        )}
                        rows={2}
                        className="text-sm"
                        placeholder="Add explanation..."
                      />
                    ) : (
                      <p className="text-sm text-gray-700">
                        {displayQuestion.explanation || "No explanation provided"}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Metadata (Edit Mode) */}
              {isEditing && editedQuestion && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-semibold mb-4 text-amber-900">Question Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Book</Label>
                      <Input
                        value={editedQuestion.book || ''}
                        onChange={(e) => setEditedQuestion({ ...editedQuestion, book: e.target.value })}
                        placeholder="e.g., Genesis"
                      />
                    </div>
                    <div>
                      <Label>Chapter</Label>
                      <Input
                        value={editedQuestion.chapter || ''}
                        onChange={(e) => setEditedQuestion({ ...editedQuestion, chapter: e.target.value })}
                        placeholder="e.g., 3:16"
                      />
                    </div>
                    <div>
                      <Label>Topic</Label>
                      <Input
                        value={editedQuestion.topic || ''}
                        onChange={(e) => setEditedQuestion({ ...editedQuestion, topic: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Difficulty</Label>
                      <Select
                        value={editedQuestion.difficulty || ''}
                        onValueChange={(value) => setEditedQuestion({ ...editedQuestion, difficulty: value })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Compact Metadata Display (View Mode) */}
              {!isEditing && (
                <div className="mt-3 pt-3 border-t text-xs text-gray-500 flex items-center gap-4">
                  <span>Topic: {displayQuestion.topic || 'N/A'}</span>
                  <span>Bloom's: {displayQuestion.bloomsLevel || 'N/A'}</span>
                  <span>Difficulty: {displayQuestion.difficulty || 'N/A'}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Validation Score Below Question (if exists) */}
        {currentQuestion && validationResults[currentQuestion.id] && (
          <div className="mb-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-900">Validation Score</span>
              </div>
              <div className="flex items-center gap-1">
                <span className={`text-lg font-bold ${
                  validationResults[currentQuestion.id].score >= 90 ? 'text-green-600' :
                  validationResults[currentQuestion.id].score >= 75 ? 'text-yellow-600' :
                  validationResults[currentQuestion.id].score >= 60 ? 'text-orange-600' :
                  'text-red-600'
                }`}>
                  {validationResults[currentQuestion.id].score}
                </span>
                <span className="text-sm text-gray-600">/100</span>
              </div>
            </div>
            
            <Progress 
              value={validationResults[currentQuestion.id].score} 
              className="h-1.5 mb-2"
            />
            
            {/* Compact Issues and Suggestions */}
            <div className="text-xs space-y-1">
              {validationResults[currentQuestion.id].issues.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {validationResults[currentQuestion.id].issues.map((issue, idx) => (
                    <Badge 
                      key={idx}
                      variant={issue.severity === 'high' ? 'destructive' : 
                              issue.severity === 'medium' ? 'secondary' : 'outline'}
                      className="text-xs py-0"
                    >
                      {issue.message}
                    </Badge>
                  ))}
                </div>
              )}
              
              {validationResults[currentQuestion.id].suggestions.length > 0 && (
                <div className="text-gray-600">
                  {validationResults[currentQuestion.id].suggestions.slice(0, 2).map((suggestion, idx) => (
                    <span key={idx} className="block">• {suggestion}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Compact Navigation Controls */}
        <div className="flex justify-between items-center">
          <Button
            onClick={goToPreviousQuestion}
            disabled={currentQuestionIndex === 0}
            variant="outline"
            size="sm"
            className="min-w-[100px]"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>

          <Button
            onClick={goToNextQuestion}
            disabled={currentQuestionIndex === quiz.questions.length - 1}
            size="sm"
            className="min-w-[100px] bg-amber-600 hover:bg-amber-700 text-white"
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>

        {/* Replace Question Configuration Modal */}
        <Dialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-amber-900">Replace Question Options</DialogTitle>
              <DialogDescription className="text-amber-700">
                Customize the parameters for the replacement question. The AI will generate a new question based on these settings.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="difficulty" className="text-amber-900 font-medium">
                  Difficulty Level
                </Label>
                <Select
                  value={replaceOptions.difficulty}
                  onValueChange={(value) => setReplaceOptions(prev => ({ ...prev, difficulty: value }))}
                >
                  <SelectTrigger id="difficulty" className="border-amber-200 focus:ring-amber-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="book" className="text-amber-900 font-medium">
                  Biblical Book
                </Label>
                <Input
                  id="book"
                  placeholder="e.g., Genesis, Matthew, Psalms"
                  value={replaceOptions.book}
                  onChange={(e) => setReplaceOptions(prev => ({ ...prev, book: e.target.value }))}
                  className="border-amber-200 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="chapter" className="text-amber-900 font-medium">
                  Chapter & Verse (Optional)
                </Label>
                <Input
                  id="chapter"
                  placeholder="e.g., 3:16, 1:1-5, 23"
                  value={replaceOptions.chapter}
                  onChange={(e) => setReplaceOptions(prev => ({ ...prev, chapter: e.target.value }))}
                  className="border-amber-200 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-xs text-amber-800">
                  💡 The AI will create a contextually relevant question based on your specified book and chapter, 
                  ensuring theological accuracy and educational value.
                </p>
              </div>
            </div>
            
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowReplaceDialog(false);
                  setQuestionToReplace(null);
                }}
                className="border-amber-200 hover:bg-amber-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReplaceQuestion}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate Replacement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Replace Question Progress Modal */}
        <Dialog open={replacingQuestion !== null} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-900">
                <BookOpen className="h-5 w-5 text-amber-600" />
                Generating New Question
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Progress value={replaceProgress} className="h-2" />
                <p className="text-sm text-gray-600 text-center">
                  {replaceMessage}
                </p>
              </div>
              
              {replaceOptions.book && (
                <div className="p-3 bg-amber-50 rounded-lg">
                  <p className="text-xs text-amber-800">
                    📖 Generating for: <strong>{replaceOptions.book}</strong>
                    {replaceOptions.chapter && ` Chapter ${replaceOptions.chapter}`}
                    {' • '}<span className="capitalize">{replaceOptions.difficulty}</span> difficulty
                  </p>
                </div>
              )}
              
              {replaceProgress < 100 && (
                <p className="text-xs text-gray-500 text-center">
                  AI is analyzing biblical content to create a meaningful question...
                </p>
              )}
              
              {replaceProgress < 100 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (pollIntervalRef.current) {
                      clearInterval(pollIntervalRef.current);
                      pollIntervalRef.current = null;
                    }
                    setReplacingQuestion(null);
                    setReplaceJobId(null);
                    setReplaceProgress(0);
                    setReplaceMessage("");
                    setQuestionToReplace(null);
                  }}
                  className="w-full border-amber-200 hover:bg-amber-50"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel Generation
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Translation Modal */}
        <TranslationModal
          isOpen={isModalOpen}
          onClose={closeTranslationModal}
          onTranslate={translateQuestion}
          isTranslating={isTranslating}
          questionPreview={
            currentQuestion?.questionText
          }
        />

        {/* Success Toast */}
        {translationSuccess && (
          <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-5 duration-300">
            <CheckCircle className="h-4 w-4" />
            Question translated successfully!
          </div>
        )}
      </div>
    </div>
  );
}
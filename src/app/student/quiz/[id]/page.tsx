"use client";

import { useState, useEffect } from "react";
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

export default function QuizTakingPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quiz, setQuiz] = useState<QuizAttempt | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [showWarning, setShowWarning] = useState(false);

  // Fetch quiz data
  useEffect(() => {
    fetchQuiz();
  }, [quizId]);

  const [quizCompleted, setQuizCompleted] = useState(false);
  const [completionMessage, setCompletionMessage] = useState("");
  const [attemptId, setAttemptId] = useState<string | null>(null);

  const fetchQuiz = async () => {
    try {
      const response = await fetch(`/api/student/quiz/${quizId}/start`, {
        method: "POST",
      });
      
      if (response.ok) {
        const data = await response.json();
        setQuiz(data.quiz);
        setAttemptId(data.attemptId);
        setTimeRemaining(data.remainingTime || data.quiz.duration * 60);
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
      console.error("Error loading quiz:", error);
      router.push("/student/quizzes");
    }
  };

  // Timer countdown
  useEffect(() => {
    if (timeRemaining <= 0 || !quiz) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        
        // Show warning at 5 minutes
        if (prev === 300) {
          setShowWarning(true);
          setTimeout(() => setShowWarning(false), 5000);
        }
        
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, quiz]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAnswerSelect = (answer: string) => {
    if (!quiz) return;
    
    const currentQuestion = quiz.questions[currentQuestionIndex];
    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    
    setAnswers({
      ...answers,
      [currentQuestion.id]: {
        questionId: currentQuestion.id,
        answer,
        markedForReview: answers[currentQuestion.id]?.markedForReview || false,
        timeSpent: (answers[currentQuestion.id]?.timeSpent || 0) + timeSpent,
      },
    });
  };

  const handleMarkForReview = () => {
    if (!quiz) return;
    
    const currentQuestion = quiz.questions[currentQuestionIndex];
    setAnswers({
      ...answers,
      [currentQuestion.id]: {
        ...answers[currentQuestion.id],
        questionId: currentQuestion.id,
        answer: answers[currentQuestion.id]?.answer || "",
        markedForReview: !answers[currentQuestion.id]?.markedForReview,
        timeSpent: answers[currentQuestion.id]?.timeSpent || 0,
      },
    });
  };

  const handleNext = () => {
    if (!quiz || currentQuestionIndex >= quiz.questions.length - 1) return;
    setQuestionStartTime(Date.now());
    setCurrentQuestionIndex(currentQuestionIndex + 1);
  };

  const handlePrevious = () => {
    if (currentQuestionIndex <= 0) return;
    setQuestionStartTime(Date.now());
    setCurrentQuestionIndex(currentQuestionIndex - 1);
  };

  const handleJumpToQuestion = (index: number) => {
    setQuestionStartTime(Date.now());
    setCurrentQuestionIndex(index);
  };

  const handleSubmit = async () => {
    if (!quiz) return;
    
    const unansweredCount = quiz.questions.filter(q => !answers[q.id]?.answer).length;
    
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
          timeSpent: (quiz.duration * 60) - timeRemaining,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        router.push(`/student/results/${data.attemptId}`);
      } else {
        alert("Failed to submit quiz");
      }
    } catch (error) {
      console.error("Error submitting quiz:", error);
      alert("Failed to submit quiz");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion.id];
  const isTimeLow = timeRemaining < 300; // Less than 5 minutes

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
        <div className="text-center max-w-md p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Quiz Already Completed</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{completionMessage}</p>
          <div className="flex gap-4 justify-center">
            {attemptId && (
              <Link href={`/student/results/${attemptId}`}>
                <Button variant="outline">Check Results</Button>
              </Link>
            )}
            <Link href="/student/quizzes">
              <Button>Browse Other Quizzes</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Quiz not found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header with Timer */}
      <div className="bg-white dark:bg-gray-800 shadow sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {quiz.title}
            </h1>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              isTimeLow ? "bg-red-100 dark:bg-red-900/20" : "bg-blue-100 dark:bg-blue-900/20"
            }`}>
              <Clock className={`h-5 w-5 ${isTimeLow ? "text-red-600" : "text-blue-600"}`} />
              <span className={`font-mono font-bold ${
                isTimeLow ? "text-red-600" : "text-blue-600"
              }`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Warning Banner */}
      {showWarning && (
        <div className="bg-yellow-100 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
            <p className="text-yellow-700 dark:text-yellow-300">
              Warning: Only 5 minutes remaining!
            </p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Question Area */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              {/* Question Header */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Question {currentQuestionIndex + 1} of {quiz.totalQuestions}
                </h2>
                <Button
                  variant={currentAnswer?.markedForReview ? "default" : "outline"}
                  size="sm"
                  onClick={handleMarkForReview}
                >
                  <Flag className="h-4 w-4 mr-2" />
                  {currentAnswer?.markedForReview ? "Marked" : "Mark for Review"}
                </Button>
              </div>

              {/* Question Text */}
              <div className="mb-6">
                {/* Biblical Reference if available */}
                {(currentQuestion.book || currentQuestion.chapter) && (
                  <div className="mb-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                      📖 {currentQuestion.book} {currentQuestion.chapter && `${currentQuestion.chapter}`}
                    </span>
                  </div>
                )}
                <p className="text-lg text-gray-900 dark:text-white">
                  {currentQuestion.questionText}
                </p>
                {/* Question Type/Topic if available */}
                {currentQuestion.topic && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">
                    Topic: {currentQuestion.topic}
                  </p>
                )}
              </div>

              {/* Answer Options */}
              <div className="space-y-3">
                {currentQuestion.options.map((option) => (
                  <label
                    key={option.id}
                    className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                      currentAnswer?.answer === option.id
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
                    }`}
                  >
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name={`question-${currentQuestion.id}`}
                        value={option.id}
                        checked={currentAnswer?.answer === option.id}
                        onChange={() => handleAnswerSelect(option.id)}
                        className="mr-3"
                      />
                      <span className="text-gray-900 dark:text-white">
                        {option.text}
                      </span>
                    </div>
                  </label>
                ))}
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center mt-8">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {Object.keys(answers).length} of {quiz.totalQuestions} answered
                </span>

                {currentQuestionIndex < quiz.questions.length - 1 ? (
                  <Button onClick={handleNext}>
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
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
                )}
              </div>
            </div>
          </div>

          {/* Question Navigator */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sticky top-24">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Question Navigator
              </h3>
              <div className="grid grid-cols-5 gap-2">
                {quiz.questions.map((q, index) => {
                  const answer = answers[q.id];
                  const isActive = index === currentQuestionIndex;
                  const isAnswered = !!answer?.answer;
                  const isMarked = !!answer?.markedForReview;

                  return (
                    <button
                      key={q.id}
                      onClick={() => handleJumpToQuestion(index)}
                      className={`
                        p-2 text-sm font-medium rounded-lg transition-colors
                        ${isActive ? "ring-2 ring-blue-500" : ""}
                        ${isAnswered && !isMarked ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300" : ""}
                        ${isAnswered && isMarked ? "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300" : ""}
                        ${!isAnswered ? "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400" : ""}
                      `}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-100 dark:bg-gray-700 rounded" />
                  <span className="text-gray-600 dark:text-gray-400">Not Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-100 dark:bg-green-900/20 rounded" />
                  <span className="text-gray-600 dark:text-gray-400">Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-100 dark:bg-yellow-900/20 rounded" />
                  <span className="text-gray-600 dark:text-gray-400">Marked for Review</span>
                </div>
              </div>

              <Button
                className="w-full mt-6"
                variant="outline"
                onClick={handleSubmit}
                disabled={submitting}
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
  );
}
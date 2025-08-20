"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { QuestionValidationDisplay } from "@/components/question-validation-display";
import { ValidationSummary } from "@/components/validation-summary";
import { QuestionValidationResult } from "@/lib/question-validator";
import {
  ArrowLeft,
  ArrowRight,
  Edit2,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Clock,
  Target,
  Brain,
  Send,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Sparkles,
  List,
  Grid3x3,
  Check,
  FileText,
  BarChart3,
  Hash,
  RefreshCw,
  Loader2,
} from "lucide-react";

interface QuizQuestion {
  id: string;
  questionText: string;
  options: { id: string; text: string }[];
  correctAnswer: string;
  explanation: string;
  difficulty: string;
  bloomsLevel: string;
  topic: string;
  book: string;
  chapter: string;
}

interface QuizDetails {
  id: string;
  title: string;
  description: string;
  educatorId: string;
  questions: QuizQuestion[];
  configuration: {
    difficulty: string;
    bloomsLevels: string[];
    topics: string[];
    books: string[];
    chapters: string[];
    duration: number;
    passingScore: number;
  };
  status: string;
  createdAt: string;
}

export default function QuizReviewPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;
  
  const [quiz, setQuiz] = useState<QuizDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [editedQuestions, setEditedQuestions] = useState<{[key: string]: QuizQuestion}>({});
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [viewMode, setViewMode] = useState<"single" | "grid">("single");
  const [replacingQuestion, setReplacingQuestion] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<Record<string, QuestionValidationResult>>({});
  const [validationSummary, setValidationSummary] = useState<{
    totalQuestions: number;
    validQuestions: number;
    invalidQuestions: number;
    averageScore: number;
    issueCount: { high: number; medium: number; low: number; };
    overallValid: boolean;
  } | null>(null);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    fetchQuizDetails();
  }, [quizId]);

  const fetchQuizDetails = async () => {
    try {
      const response = await fetch(`/api/educator/quiz/${quizId}`);
      if (response.ok) {
        const data = await response.json();
        setQuiz(data);
        // Auto-validate questions after loading
        if (data?.questions?.length > 0) {
          validateAllQuestions(data.questions);
        }
      } else {
        setError("Failed to load quiz details");
      }
    } catch (err) {
      setError("Error loading quiz");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const validateAllQuestions = async (questions?: QuizQuestion[]) => {
    const questionsToValidate = questions || quiz?.questions;
    if (!questionsToValidate?.length) return;

    setValidating(true);
    try {
      const questionsData = questionsToValidate.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation
      }));

      const response = await fetch('/api/educator/questions/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: questionsData })
      });

      if (response.ok) {
        const data = await response.json();
        setValidationResults(data.validations || {});
        setValidationSummary(data.summary);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setValidating(false);
    }
  };

  const validateSingleQuestion = async (questionId: string) => {
    const question = quiz?.questions.find(q => q.id === questionId);
    if (!question) return;

    try {
      const questionData = {
        id: question.id,
        questionText: question.questionText,
        options: question.options,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation
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
          [questionId]: data.validation
        }));
        
        // Update summary with new results
        const allResults = { ...validationResults, [questionId]: data.validation };
        const results = Object.values(allResults);
        const summary = {
          totalQuestions: Object.keys(allResults).length,
          validQuestions: results.filter((r) => r.isValid).length,
          invalidQuestions: results.filter((r) => !r.isValid).length,
          averageScore: Math.round(results.reduce((sum, r) => sum + r.score, 0) / Object.keys(allResults).length),
          issueCount: {
            high: results.reduce((count, r) => 
              count + r.issues.filter((issue: { severity: string }) => issue.severity === 'high').length, 0
            ),
            medium: results.reduce((count, r) => 
              count + r.issues.filter((issue: { severity: string }) => issue.severity === 'medium').length, 0
            ),
            low: results.reduce((count, r) => 
              count + r.issues.filter((issue: { severity: string }) => issue.severity === 'low').length, 0
            )
          },
          overallValid: true // Will be calculated properly by the server
        };
        setValidationSummary(summary);
      }
    } catch (error) {
      console.error('Single question validation failed:', error);
    }
  };

  const handleEditQuestion = (questionId: string) => {
    const question = quiz?.questions.find(q => q.id === questionId);
    if (question) {
      setEditedQuestions(prev => ({ ...prev, [questionId]: { ...question } }));
      setEditingQuestion(questionId);
    }
  };

  const handleSaveQuestion = async (questionId: string) => {
    setSaving(true);
    try {
      const editedQuestion = editedQuestions[questionId];
      const response = await fetch(`/api/educator/quiz/${quizId}/question/${questionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedQuestion)
      });

      if (response.ok) {
        setQuiz(prev => {
          if (!prev) return null;
          return {
            ...prev,
            questions: prev.questions.map(q => 
              q.id === questionId ? editedQuestion : q
            )
          };
        });
        setEditingQuestion(null);
      } else {
        alert("Failed to save question");
      }
    } catch (err) {
      console.error("Error saving question:", err);
      alert("Error saving question");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = (questionId: string) => {
    setEditingQuestion(null);
    const updatedEdited = { ...editedQuestions };
    delete updatedEdited[questionId];
    setEditedQuestions(updatedEdited);
  };

  const handleReplaceQuestion = async (questionId: string) => {
    if (!confirm("Are you sure you want to replace this question with a newly generated one? This action cannot be undone.")) {
      return;
    }

    setReplacingQuestion(questionId);
    try {
      const response = await fetch(`/api/educator/quiz/${quizId}/question/${questionId}/replace`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update quiz state with new question
        setQuiz(prev => {
          if (!prev) return null;
          return {
            ...prev,
            questions: prev.questions.map(q => 
              q.id === questionId ? {
                id: data.question.id,
                questionText: data.question.questionText,
                options: data.question.options,
                correctAnswer: data.question.correctAnswer,
                explanation: data.question.explanation,
                difficulty: data.question.difficulty,
                bloomsLevel: data.question.bloomsLevel,
                topic: data.question.topic,
                book: data.question.book,
                chapter: data.question.chapter,
              } : q
            )
          };
        });
        
        // Clear any editing state for this question
        if (editingQuestion === questionId) {
          setEditingQuestion(null);
        }
        const updatedEdited = { ...editedQuestions };
        delete updatedEdited[questionId];
        setEditedQuestions(updatedEdited);
        
      } else {
        const errorData = await response.json();
        alert(errorData.message || "Failed to replace question");
      }
    } catch (error) {
      console.error("Error replacing question:", error);
      alert("Error replacing question");
    } finally {
      setReplacingQuestion(null);
    }
  };

  const handlePublishQuiz = async () => {
    if (!confirm("Are you sure you want to publish this quiz? Once published, you won't be able to edit the questions anymore.")) {
      return;
    }

    setPublishing(true);
    try {
      const response = await fetch(`/api/educator/quiz/${quizId}/publish`, {
        method: "POST"
      });

      if (response.ok) {
        // Update local state to reflect published status
        setQuiz(prev => prev ? { ...prev, status: "published" } : null);
        
        alert("Quiz published successfully! 🎉\nYou can now assign students to take this quiz.");
        // Redirect to quiz management page instead of dashboard
        router.push(`/educator/quiz/${quizId}/manage`);
      } else {
        alert("Failed to publish quiz");
      }
    } catch (err) {
      console.error("Error publishing quiz:", err);
      alert("Error publishing quiz");
    } finally {
      setPublishing(false);
    }
  };

  const updateEditedQuestion = (questionId: string, field: string, value: string) => {
    setEditedQuestions(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [field]: value
      }
    }));
  };

  const updateOption = (questionId: string, optionId: string, text: string) => {
    setEditedQuestions(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        options: prev[questionId].options.map(opt =>
          opt.id === optionId ? { ...opt, text } : opt
        )
      }
    }));
  };

  const goToNextQuestion = () => {
    if (quiz && currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setShowExplanation(false);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setShowExplanation(false);
    }
  };

  const goToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
    setShowExplanation(false);
    setViewMode("single");
  };

  if (loading) {
    return <Loading variant="page" message="Loading quiz questions..." />;
  }

  if (error || !quiz) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState
          icon={<AlertCircle className="h-12 w-12 text-red-500" />}
          title="Error Loading Quiz"
          description={error || "Quiz not found"}
          action={{
            label: "Return to Dashboard",
            onClick: () => router.push("/educator/dashboard")
          }}
        />
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const isEditing = editingQuestion === currentQuestion?.id;
  const displayQuestion = isEditing ? editedQuestions[currentQuestion.id] : currentQuestion;
  const progressPercentage = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

  if (viewMode === "grid") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <Link href="/educator/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Button
                onClick={() => setViewMode("single")}
                variant="outline"
                size="sm"
              >
                <Eye className="mr-2 h-4 w-4" />
                Card View
              </Button>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold mb-2 font-heading">{quiz.title}</h1>
                  <p className="text-gray-600">{quiz.description}</p>
                </div>
                <Button
                  onClick={handlePublishQuiz}
                  disabled={publishing || quiz.status === "published"}
                  className="bg-gradient-to-r from-green-500 to-green-600"
                  size="lg"
                >
                  {publishing ? (
                    "Publishing..."
                  ) : quiz.status === "published" ? (
                    <>
                      <CheckCircle className="mr-2 h-5 w-5" />
                      Published
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-5 w-5" />
                      Publish Quiz
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Questions Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quiz.questions.map((question, index) => (
              <Card 
                key={question.id} 
                className="hover:shadow-lg transition-all duration-200 cursor-pointer border-2 hover:border-primary/50"
                onClick={() => goToQuestion(index)}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-500">
                      Question {index + 1}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      question.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                      question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {question.difficulty}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm line-clamp-3 mb-3">{question.questionText}</p>
                  {/* Biblical Reference Badge */}
                  {question.book && (
                    <div className="mb-2">
                      <div className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-medium">
                        <BookOpen className="h-3 w-3" />
                        <span>{question.book} {question.chapter || ''}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Target className="h-3 w-3" />
                    <span>{question.topic || 'General'}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <Link href="/educator/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <div className="flex gap-2">
              <Button
                onClick={() => setViewMode("grid")}
                variant="outline"
                size="sm"
              >
                <Grid3x3 className="mr-2 h-4 w-4" />
                Grid View
              </Button>
              <Button
                onClick={handlePublishQuiz}
                disabled={publishing || quiz.status === "published"}
                className="bg-gradient-to-r from-green-500 to-green-600"
              >
                {publishing ? (
                  "Publishing..."
                ) : quiz.status === "published" ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Published
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Publish Quiz
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {/* Quiz Title Card */}
          <Card className="bg-gradient-to-r from-primary-50 to-accent-50 border-0 shadow-sm mb-6">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold mb-2 font-heading">{quiz.title}</h1>
                  <p className="text-gray-600 text-sm">{quiz.description}</p>
                </div>
                <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2">
                  <Sparkles className="h-5 w-5 text-accent-500" />
                  <span className="font-semibold">{quiz.questions.length} Questions</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Validation Summary */}
          {validationSummary && (
            <div className="mb-6">
              <ValidationSummary
                summary={validationSummary}
                onRevalidateAll={() => validateAllQuestions()}
                isRevalidating={validating}
              />
            </div>
          )}

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">
                Question {currentQuestionIndex + 1} of {quiz.questions.length}
              </span>
              <span className="text-sm font-medium text-gray-600">
                {Math.round(progressPercentage)}% Complete
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Question Navigation Dots */}
          <div className="flex justify-center gap-2 mb-6 flex-wrap">
            {quiz.questions.map((_, index) => (
              <button
                key={index}
                onClick={() => goToQuestion(index)}
                className={`w-10 h-10 rounded-lg font-medium text-sm transition-all duration-200 ${
                  index === currentQuestionIndex
                    ? 'bg-primary text-white shadow-lg scale-110'
                    : 'bg-white hover:bg-gray-50 text-gray-600 border'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Main Question Card */}
        {currentQuestion && (
          <Card className="shadow-xl border-0 mb-6">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Question {currentQuestionIndex + 1}</span>
                  </div>
                  {/* Biblical Reference - Prominently displayed */}
                  {displayQuestion.book && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-full">
                      <BookOpen className="h-4 w-4" />
                      <span className="text-sm font-semibold">
                        {displayQuestion.book} {displayQuestion.chapter || ''}
                      </span>
                    </div>
                  )}
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    displayQuestion.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                    displayQuestion.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {displayQuestion.difficulty}
                  </span>
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                    {displayQuestion.bloomsLevel}
                  </span>
                </div>
                <div className="flex gap-2">
                  {quiz.status === "published" ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Published - Read Only</span>
                    </div>
                  ) : isEditing ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleSaveQuestion(currentQuestion.id)}
                        disabled={saving}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        {saving ? "Saving..." : "Save"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancelEdit(currentQuestion.id)}
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
                        onClick={() => handleEditQuestion(currentQuestion.id)}
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReplaceQuestion(currentQuestion.id)}
                        disabled={replacingQuestion === currentQuestion.id}
                        className="text-orange-600 border-orange-200 hover:bg-orange-50 hover:border-orange-300"
                      >
                        {replacingQuestion === currentQuestion.id ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-1" />
                        )}
                        {replacingQuestion === currentQuestion.id ? "Replacing..." : "Replace Question"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-8">
              {/* Question Text */}
              <div className="mb-8">
                {isEditing ? (
                  <Textarea
                    value={displayQuestion.questionText}
                    onChange={(e) => updateEditedQuestion(currentQuestion.id, "questionText", e.target.value)}
                    className="text-lg"
                    rows={3}
                  />
                ) : (
                  <h2 className="text-xl font-medium leading-relaxed">{displayQuestion.questionText}</h2>
                )}
              </div>

              {/* Options */}
              <div className="space-y-3 mb-8">
                {displayQuestion.options.map((option) => (
                  <div 
                    key={option.id} 
                    className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-200 ${
                      option.id === displayQuestion.correctAnswer 
                        ? "bg-green-50 border-2 border-green-200" 
                        : "bg-gray-50 border-2 border-transparent hover:border-gray-200"
                    }`}
                  >
                    <span className={`w-10 h-10 rounded-lg flex items-center justify-center font-semibold ${
                      option.id === displayQuestion.correctAnswer 
                        ? "bg-green-500 text-white" 
                        : "bg-white text-gray-700 border"
                    }`}>
                      {option.id.toUpperCase()}
                    </span>
                    {isEditing ? (
                      <Input
                        value={option.text}
                        onChange={(e) => updateOption(currentQuestion.id, option.id, e.target.value)}
                        className="flex-1"
                      />
                    ) : (
                      <span className="flex-1 text-base">{option.text}</span>
                    )}
                    {option.id === displayQuestion.correctAnswer && !isEditing && (
                      <Check className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                ))}
              </div>

              {/* Correct Answer Selector (Edit Mode) */}
              {isEditing && (
                <div className="mb-6">
                  <Label>Correct Answer</Label>
                  <select
                    value={displayQuestion.correctAnswer}
                    onChange={(e) => updateEditedQuestion(currentQuestion.id, "correctAnswer", e.target.value)}
                    className="mt-2 w-full px-4 py-2 border-2 rounded-lg"
                  >
                    {displayQuestion.options.map(opt => (
                      <option key={opt.id} value={opt.id}>
                        Option {opt.id.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Explanation Toggle */}
              <div className="border-t pt-6">
                <button
                  onClick={() => setShowExplanation(!showExplanation)}
                  className="flex items-center gap-2 text-primary hover:text-primary-600 transition-colors duration-200"
                >
                  {showExplanation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span className="font-medium">
                    {showExplanation ? "Hide" : "Show"} Explanation
                  </span>
                </button>
                
                {showExplanation && (
                  <div className="mt-4 p-4 bg-amber-50 rounded-lg">
                    {isEditing ? (
                      <Textarea
                        value={displayQuestion.explanation}
                        onChange={(e) => updateEditedQuestion(currentQuestion.id, "explanation", e.target.value)}
                        rows={3}
                      />
                    ) : (
                      <p className="text-gray-700">{displayQuestion.explanation}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Question Validation */}
              {validationResults[currentQuestion.id] && (
                <div className="mt-6 pt-6 border-t">
                  <QuestionValidationDisplay
                    validation={validationResults[currentQuestion.id]}
                    questionId={currentQuestion.id}
                    questionText={currentQuestion.questionText}
                    onRevalidate={() => validateSingleQuestion(currentQuestion.id)}
                    compact={false}
                  />
                </div>
              )}

              {/* Metadata */}
              <div className="mt-6 pt-6 border-t">
                {/* Biblical Reference Section - More prominent */}
                {(displayQuestion.book || displayQuestion.chapter) && (
                  <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="h-5 w-5 text-amber-600" />
                      <h3 className="font-semibold text-amber-900">Biblical Reference</h3>
                    </div>
                    {isEditing ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm text-amber-700">Book</Label>
                          <Input
                            value={displayQuestion.book || ''}
                            onChange={(e) => updateEditedQuestion(currentQuestion.id, "book", e.target.value)}
                            placeholder="e.g., Genesis, Matthew"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm text-amber-700">Chapter & Verse</Label>
                          <Input
                            value={displayQuestion.chapter || ''}
                            onChange={(e) => updateEditedQuestion(currentQuestion.id, "chapter", e.target.value)}
                            placeholder="e.g., 3:16, 6:6-8, 1:1-5"
                            className="mt-1"
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-lg font-medium text-amber-800">
                        {displayQuestion.book} {displayQuestion.chapter || ''}
                      </p>
                    )}
                  </div>
                )}
                
                {/* Other Metadata */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-gray-500">Topic</p>
                      {isEditing ? (
                        <Input
                          value={displayQuestion.topic || ''}
                          onChange={(e) => updateEditedQuestion(currentQuestion.id, "topic", e.target.value)}
                          className="mt-1 h-8 text-sm"
                        />
                      ) : (
                        <p className="font-medium">{displayQuestion.topic || 'N/A'}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-gray-500">Bloom&apos;s Level</p>
                      {isEditing ? (
                        <select
                          value={displayQuestion.bloomsLevel || ''}
                          onChange={(e) => updateEditedQuestion(currentQuestion.id, "bloomsLevel", e.target.value)}
                          className="mt-1 w-full px-2 py-1 text-sm border rounded"
                        >
                          <option value="knowledge">Knowledge</option>
                          <option value="comprehension">Comprehension</option>
                          <option value="application">Application</option>
                          <option value="analysis">Analysis</option>
                          <option value="synthesis">Synthesis</option>
                          <option value="evaluation">Evaluation</option>
                        </select>
                      ) : (
                        <p className="font-medium capitalize">{displayQuestion.bloomsLevel || 'N/A'}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-gray-500">Difficulty</p>
                      {isEditing ? (
                        <select
                          value={displayQuestion.difficulty || ''}
                          onChange={(e) => updateEditedQuestion(currentQuestion.id, "difficulty", e.target.value)}
                          className="mt-1 w-full px-2 py-1 text-sm border rounded"
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      ) : (
                        <p className="font-medium capitalize">{displayQuestion.difficulty || 'N/A'}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Controls */}
        <div className="flex justify-between items-center">
          <Button
            onClick={goToPreviousQuestion}
            disabled={currentQuestionIndex === 0}
            variant="outline"
            size="lg"
            className="min-w-[120px]"
          >
            <ChevronLeft className="mr-2 h-5 w-5" />
            Previous
          </Button>

          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-gray-400" />
            <span className="text-sm text-gray-600">
              {quiz.configuration.duration} min • {quiz.configuration.passingScore}% to pass
            </span>
          </div>

          <Button
            onClick={goToNextQuestion}
            disabled={currentQuestionIndex === quiz.questions.length - 1}
            size="lg"
            className="min-w-[120px]"
          >
            Next
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

      </div>
    </div>
  );
}
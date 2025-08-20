"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Edit2,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Clock,
  Target,
  Brain,
  Send
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
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [editedQuestions, setEditedQuestions] = useState<{[key: string]: QuizQuestion}>({});
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    fetchQuizDetails();
  }, [quizId]);

  const fetchQuizDetails = async () => {
    try {
      const response = await fetch(`/api/educator/quiz/${quizId}`);
      if (response.ok) {
        const data = await response.json();
        setQuiz(data);
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
        // Update local state
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

  const handlePublishQuiz = async () => {
    setPublishing(true);
    try {
      const response = await fetch(`/api/educator/quiz/${quizId}/publish`, {
        method: "POST"
      });

      if (response.ok) {
        alert("Quiz published successfully!");
        router.push("/educator/dashboard");
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading quiz...</div>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Quiz</h2>
          <p className="text-gray-600 mb-4">{error || "Quiz not found"}</p>
          <Button onClick={() => router.push("/educator/dashboard")}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/educator/dashboard">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{quiz.title}</h1>
            <p className="text-gray-600">{quiz.description}</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handlePublishQuiz}
              disabled={publishing || quiz.status === "published"}
              className="bg-green-600 hover:bg-green-700"
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
      </div>

      {/* Quiz Configuration Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Quiz Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Difficulty</p>
                <p className="font-medium">{quiz.configuration.difficulty}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Duration</p>
                <p className="font-medium">{quiz.configuration.duration} minutes</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Bloom&apos;s Levels</p>
                <p className="font-medium">{quiz.configuration.bloomsLevels.join(", ")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Books</p>
                <p className="font-medium">{quiz.configuration.books.join(", ")}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold mb-4">
          Questions ({quiz.questions.length})
        </h2>
        
        {quiz.questions.map((question, index) => {
          const isEditing = editingQuestion === question.id;
          const currentQuestion = isEditing ? editedQuestions[question.id] : question;
          
          return (
            <Card key={question.id} className="relative">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">
                    Question {index + 1}
                  </CardTitle>
                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleSaveQuestion(question.id)}
                          disabled={saving}
                        >
                          <Save className="h-4 w-4 mr-1" />
                          {saving ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancelEdit(question.id)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditQuestion(question.id)}
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Question Text */}
                <div>
                  <Label>Question</Label>
                  {isEditing ? (
                    <Textarea
                      value={currentQuestion.questionText}
                      onChange={(e) => updateEditedQuestion(question.id, "questionText", e.target.value)}
                      className="mt-1"
                      rows={3}
                    />
                  ) : (
                    <p className="mt-1">{currentQuestion.questionText}</p>
                  )}
                </div>

                {/* Options */}
                <div>
                  <Label>Options</Label>
                  <div className="space-y-2 mt-2">
                    {currentQuestion.options.map((option) => (
                      <div key={option.id} className="flex items-center gap-2">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          option.id === currentQuestion.correctAnswer 
                            ? "bg-green-100 text-green-700" 
                            : "bg-gray-100"
                        }`}>
                          {option.id.toUpperCase()}
                        </span>
                        {isEditing ? (
                          <Input
                            value={option.text}
                            onChange={(e) => updateOption(question.id, option.id, e.target.value)}
                            className="flex-1"
                          />
                        ) : (
                          <span className="flex-1">{option.text}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Correct Answer */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Correct Answer</Label>
                    {isEditing ? (
                      <select
                        value={currentQuestion.correctAnswer}
                        onChange={(e) => updateEditedQuestion(question.id, "correctAnswer", e.target.value)}
                        className="mt-1 w-full px-3 py-2 border rounded-md"
                      >
                        {currentQuestion.options.map(opt => (
                          <option key={opt.id} value={opt.id}>
                            {opt.id.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="mt-1 font-medium text-green-600">
                        Option {currentQuestion.correctAnswer.toUpperCase()}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Difficulty</Label>
                    {isEditing ? (
                      <select
                        value={currentQuestion.difficulty}
                        onChange={(e) => updateEditedQuestion(question.id, "difficulty", e.target.value)}
                        className="mt-1 w-full px-3 py-2 border rounded-md"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    ) : (
                      <p className="mt-1 capitalize">{currentQuestion.difficulty}</p>
                    )}
                  </div>
                </div>

                {/* Explanation */}
                <div>
                  <Label>Explanation</Label>
                  {isEditing ? (
                    <Textarea
                      value={currentQuestion.explanation}
                      onChange={(e) => updateEditedQuestion(question.id, "explanation", e.target.value)}
                      className="mt-1"
                      rows={2}
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-600">{currentQuestion.explanation}</p>
                  )}
                </div>

                {/* Metadata */}
                <div className="flex gap-4 text-sm text-gray-500">
                  <span>Topic: {currentQuestion.topic}</span>
                  <span>Book: {currentQuestion.book}</span>
                  <span>Chapter: {currentQuestion.chapter}</span>
                  <span>Bloom&apos;s: {currentQuestion.bloomsLevel}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
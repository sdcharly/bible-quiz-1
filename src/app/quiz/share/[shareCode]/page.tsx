"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, BookOpen, Clock, Users, AlertCircle } from "lucide-react";
import Link from "next/link";

interface QuizInfo {
  id: string;
  title: string;
  description: string;
  totalQuestions: number;
  duration: number;
  educatorName: string;
  isEnrolled: boolean;
  requiresAuth: boolean;
  invitationToken?: string;
}

export default function QuizSharePage() {
  const router = useRouter();
  const params = useParams();
  const shareCode = params.shareCode as string;
  
  const [loading, setLoading] = useState(true);
  const [quizInfo, setQuizInfo] = useState<QuizInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    fetchQuizInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareCode]);

  const fetchQuizInfo = async () => {
    try {
      const response = await fetch(`/api/quiz/share/${shareCode}`);
      
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to load quiz information");
        setLoading(false);
        return;
      }

      const data = await response.json();
      setQuizInfo(data);
      
      // If user is already enrolled, redirect to quiz
      if (data.isEnrolled && !data.requiresAuth) {
        router.push(`/student/quiz/${data.id}`);
      }
    } catch (err) {
      console.error("Error fetching quiz info:", err);
      setError("Failed to load quiz information");
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = async () => {
    if (!quizInfo) return;

    // If user needs to authenticate
    if (quizInfo.requiresAuth) {
      // Store the share code in session storage for after login
      sessionStorage.setItem('pendingQuizShare', shareCode);
      
      if (quizInfo.invitationToken) {
        // New user - redirect to signup with invitation
        router.push(`/auth/signup?token=${quizInfo.invitationToken}`);
      } else {
        // Existing user - redirect to signin
        router.push(`/auth/signin?redirect=/quiz/share/${shareCode}`);
      }
      return;
    }

    // User is authenticated but not enrolled - auto-enroll
    if (!quizInfo.isEnrolled) {
      setEnrolling(true);
      try {
        const response = await fetch(`/api/quiz/share/${shareCode}/enroll`, {
          method: 'POST'
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || "Failed to enroll in quiz");
          return;
        }

        // Redirect to quiz
        router.push(`/student/quiz/${quizInfo.id}`);
      } catch (err) {
        console.error("Error enrolling:", err);
        setError("Failed to enroll in quiz");
      } finally {
        setEnrolling(false);
      }
      return;
    }

    // User is enrolled - redirect to quiz
    router.push(`/student/quiz/${quizInfo.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-amber-600" />
          <p className="mt-2 text-amber-700">Loading quiz information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Unable to Load Quiz
              </h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Link href="/">
                <Button variant="outline">Go to Home</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!quizInfo) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-4">
      <div className="max-w-2xl mx-auto mt-12">
        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-amber-600 to-orange-600 text-white">
            <CardTitle className="text-2xl">Scrolls of Wisdom - Biblical Knowledge Quest</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {/* Quiz Title */}
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {quizInfo.title}
                </h1>
                {quizInfo.description && (
                  <p className="text-gray-600">{quizInfo.description}</p>
                )}
              </div>

              {/* Quiz Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2 text-gray-700">
                  <BookOpen className="h-5 w-5 text-amber-600" />
                  <span>{quizInfo.totalQuestions} Questions</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-700">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <span>{quizInfo.duration} Minutes</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-700">
                  <Users className="h-5 w-5 text-amber-600" />
                  <span>By {quizInfo.educatorName}</span>
                </div>
              </div>

              {/* Status Messages */}
              {quizInfo.requiresAuth && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800">
                    {quizInfo.invitationToken 
                      ? "You'll need to create an account to take this quiz. Click below to get started!"
                      : "Please log in to access this quiz."}
                  </p>
                </div>
              )}

              {!quizInfo.requiresAuth && !quizInfo.isEnrolled && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-amber-800">
                    You&apos;ll be automatically enrolled when you start the quiz.
                  </p>
                </div>
              )}

              {/* Action Button */}
              <div className="flex justify-center pt-4">
                <Button
                  onClick={handleStartQuiz}
                  disabled={enrolling}
                  size="lg"
                  className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-8 py-3"
                >
                  {enrolling ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Enrolling...
                    </>
                  ) : quizInfo.requiresAuth ? (
                    quizInfo.invitationToken ? "Sign Up & Start Quiz" : "Log In to Start"
                  ) : quizInfo.isEnrolled ? (
                    "Start Quiz"
                  ) : (
                    "Enroll & Start Quiz"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>This quiz link was shared with you by your educator.</p>
          <p>Your progress will be saved and reported to the educator.</p>
        </div>
      </div>
    </div>
  );
}
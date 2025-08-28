"use client";

import { useEffect, useState } from "react";
import { BookOpen, Clock, Users, AlertCircle, UserPlus, LogIn } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BiblicalPageLoader, BiblicalLoader } from "@/components/ui/biblical-loader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { logger } from "@/lib/logger";


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
  startTime?: string;
  schedulingStatus?: string;
  timezone?: string;
}

export default function QuizSharePage() {
  const router = useRouter();
  const params = useParams();
  const shareCode = params.shareCode as string;
  
  const [loading, setLoading] = useState(true);
  const [quizInfo, setQuizInfo] = useState<QuizInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  useEffect(() => {
    fetchQuizInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareCode]);

  const fetchQuizInfo = async () => {
    try {
      logger.debug(`Fetching quiz info for share code: ${shareCode}`);
      const response = await fetch(`/api/quiz/share/${shareCode}`);
      
      if (!response.ok) {
        const data = await response.json();
        logger.error(`API error for share code ${shareCode}:`, data);
        setError(data.error || "Failed to load quiz information");
        setLoading(false);
        return;
      }

      const data = await response.json();
      logger.debug(`Quiz info received:`, data);
      
      // Always set quiz info if we got data
      if (data) {
        setQuizInfo(data);
        
        // If user is already enrolled, redirect to quiz
        if (data.isEnrolled && !data.requiresAuth) {
          logger.debug(`User is enrolled, redirecting to quiz ${data.id}`);
          router.push(`/student/quiz/${data.id}`);
        }
      } else {
        logger.error(`No data received for share code ${shareCode}`);
        setError("No quiz information received");
      }
    } catch (err) {
      logger.error("Error fetching quiz info:", err);
      setError("Failed to load quiz information. Please try refreshing the page.");
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
      
      // Show authentication dialog
      setShowAuthDialog(true);
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
        logger.error("Error enrolling:", err);
        setError("Failed to enroll in quiz");
      } finally {
        setEnrolling(false);
      }
      return;
    }

    // User is enrolled - redirect to quiz
    router.push(`/student/quiz/${quizInfo.id}`);
  };

  const handleSignUp = () => {
    if (!quizInfo?.invitationToken) return;
    setShowAuthDialog(false);
    router.push(`/auth/signup?invitation=${quizInfo.invitationToken}`);
  };

  const handleSignIn = () => {
    setShowAuthDialog(false);
    router.push(`/auth/signin?redirect=/quiz/share/${shareCode}`);
  };

  const formatStartTime = (startTime: string, timezone: string) => {
    const date = new Date(startTime);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      timeZoneName: 'short'
    };
    
    try {
      return date.toLocaleString('en-US', { ...options, timeZone: timezone });
    } catch {
      return date.toLocaleString('en-US', options);
    }
  };

  if (loading) {
    return <BiblicalPageLoader text="Loading quiz information..." />;
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
    // This shouldn't happen, but show error instead of blank page
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Unable to Load Quiz
              </h2>
              <p className="text-gray-600 mb-4">
                The quiz information could not be loaded. Please try refreshing the page.
              </p>
              <div className="space-y-2">
                <Button 
                  onClick={() => window.location.reload()} 
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  Refresh Page
                </Button>
                <Link href="/">
                  <Button variant="outline" className="w-full">Go to Home</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
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
              {quizInfo.schedulingStatus === 'deferred' && !quizInfo.startTime && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-blue-900 font-semibold">Quiz Not Yet Scheduled</p>
                      <p className="text-blue-700 text-sm mt-1">
                        This quiz is awaiting scheduling by your educator. Please check back later or contact your educator for the quiz schedule.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {quizInfo.startTime && new Date(quizInfo.startTime) > new Date() && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-amber-900 font-semibold">Quiz Scheduled</p>
                      <p className="text-amber-700 text-sm mt-1">
                        This quiz will be available on {formatStartTime(quizInfo.startTime, quizInfo.timezone || 'UTC')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {quizInfo.requiresAuth && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-amber-800">
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
                    <BiblicalLoader size="sm" text="Enrolling..." inline />
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

      {/* Authentication Dialog */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Authentication Required</DialogTitle>
            <DialogDescription>
              You need to be logged in to take this quiz. Are you a new or existing student?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-3 pt-4">
            <Button
              onClick={handleSignUp}
              className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
              disabled={!quizInfo?.invitationToken}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              I'm New - Sign Up
            </Button>
            <Button
              onClick={handleSignIn}
              variant="outline"
              className="w-full"
            >
              <LogIn className="w-4 h-4 mr-2" />
              I Have an Account - Sign In
            </Button>
          </div>
          <div className="text-sm text-gray-500 mt-4 text-center">
            {quizInfo?.invitationToken ? (
              <p>New students will be automatically enrolled in this quiz after signing up.</p>
            ) : (
              <p>Please sign in with your existing student account.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
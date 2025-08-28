"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, 
  Clock, 
  Calendar,
  Users,
  PlayCircle,
  Lock,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Timer
} from "lucide-react";
// Tooltip component not available yet
import { getQuizAvailabilityStatus } from "@/lib/quiz-scheduling";

interface QuizCardProps {
  quiz: {
    id: string;
    title: string;
    description?: string;
    totalQuestions: number;
    duration: number;
    startTime?: string | null;
    timezone?: string;
    status: string;
    schedulingStatus?: string;
    enrolled: boolean;
    attempted: boolean;
    attemptId?: string;
    score?: number;
  };
  onEnroll: (quizId: string) => Promise<void>;
  onStartQuiz: (quizId: string) => void;
}

export function QuizCard({ quiz, onEnroll, onStartQuiz }: QuizCardProps) {
  const [enrolling, setEnrolling] = useState(false);

  // Get availability status using the scheduling utility
  const availability = getQuizAvailabilityStatus({
    id: quiz.id,
    title: quiz.title,
    startTime: quiz.startTime ? new Date(quiz.startTime) : null,
    timezone: quiz.timezone || 'UTC',
    duration: quiz.duration,
    schedulingStatus: quiz.schedulingStatus || 'legacy',
    timeConfiguration: null,
    status: quiz.status
  });

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      await onEnroll(quiz.id);
    } finally {
      setEnrolling(false);
    }
  };

  const formatQuizTime = () => {
    if (!quiz.startTime) {
      return "Time to be announced";
    }
    
    const date = new Date(quiz.startTime);
    return date.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
      // Use browser's default timezone (user's local timezone)
    });
  };

  const getTimeDisplay = () => {
    if (quiz.schedulingStatus === 'deferred' && !quiz.startTime) {
      return {
        icon: <HelpCircle className="h-4 w-4" />,
        text: "Schedule pending",
        color: "text-gray-500 dark:text-gray-400",
        tooltip: "The educator will announce the quiz time soon"
      };
    }

    if (!quiz.startTime) {
      return {
        icon: <Calendar className="h-4 w-4" />,
        text: "No time set",
        color: "text-gray-500 dark:text-gray-400"
      };
    }

    switch (availability.status) {
      case 'not_scheduled':
        return {
          icon: <HelpCircle className="h-4 w-4" />,
          text: availability.message,
          color: "text-amber-500 dark:text-amber-400"
        };
      case 'upcoming':
        return {
          icon: <Timer className="h-4 w-4" />,
          text: availability.message,
          color: "text-orange-600 dark:text-orange-400"
        };
      case 'active':
        return {
          icon: <PlayCircle className="h-4 w-4" />,
          text: availability.message,
          color: "text-amber-600 dark:text-amber-400"
        };
      case 'ended':
        return {
          icon: <Lock className="h-4 w-4" />,
          text: availability.message,
          color: "text-red-600 dark:text-red-400" // Keep red for ended status
        };
      default:
        return {
          icon: <Clock className="h-4 w-4" />,
          text: "Status unknown",
          color: "text-amber-500 dark:text-amber-400"
        };
    }
  };

  const timeDisplay = getTimeDisplay();

  const renderActionButton = () => {
    // Already attempted
    if (quiz.attempted) {
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-900/20 rounded">
            <span className="text-sm text-amber-700 dark:text-amber-300 flex items-center">
              <CheckCircle className="h-4 w-4 mr-1" />
              Completed
            </span>
            {quiz.score !== undefined && (
              <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                Score: {quiz.score}%
              </span>
            )}
          </div>
          {quiz.attemptId && (
            <Link href={`/student/results/${quiz.attemptId}`}>
              <Button variant="outline" className="w-full">
                View Results
              </Button>
            </Link>
          )}
        </div>
      );
    }

    // Not enrolled yet
    if (!quiz.enrolled) {
      return (
        <div className="space-y-2">
          {quiz.schedulingStatus === 'deferred' && !quiz.startTime && (
            <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
              <AlertCircle className="h-3 w-3 inline mr-1" />
              You can enroll now. Quiz time will be announced later.
            </div>
          )}
          <Button 
            onClick={handleEnroll}
            variant="outline"
            className="w-full"
            disabled={enrolling}
          >
            {enrolling ? "Enrolling..." : "Enroll in Quiz"}
          </Button>
        </div>
      );
    }

    // Enrolled - check availability
    if (availability.status === 'active') {
      return (
        <Button 
          onClick={() => onStartQuiz(quiz.id)}
          className="w-full"
        >
          <PlayCircle className="h-4 w-4 mr-2" />
          Start Quiz
        </Button>
      );
    }

    if (availability.status === 'not_scheduled') {
      return (
        <div className="space-y-2">
          <Button disabled className="w-full" variant="secondary">
            <Clock className="h-4 w-4 mr-2" />
            Awaiting Schedule
          </Button>
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            You&apos;re enrolled. Time will be announced soon.
          </p>
        </div>
      );
    }

    if (availability.status === 'upcoming') {
      return (
        <div className="space-y-2">
          <Button disabled className="w-full" variant="secondary">
            <Timer className="h-4 w-4 mr-2" />
            Not Yet Available
          </Button>
          {availability.startTime && (
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              Starts {availability.startTime.toLocaleString('en-US', {
                dateStyle: 'short',
                timeStyle: 'short'
              })}
            </p>
          )}
        </div>
      );
    }

    if (availability.status === 'ended') {
      return (
        <Button disabled className="w-full" variant="outline">
          <Lock className="h-4 w-4 mr-2" />
          Quiz Ended
        </Button>
      );
    }

    // Fallback
    return (
      <Button disabled className="w-full" variant="outline">
        <Lock className="h-4 w-4 mr-2" />
        Not Available
      </Button>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow">
      <div className="p-6">
        {/* Header with title and status */}
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex-1">
            {quiz.title}
          </h3>
          {quiz.status === 'published' && quiz.enrolled && !quiz.attempted && (
            <Badge variant="outline" className="ml-2">
              Enrolled
            </Badge>
          )}
        </div>

        {quiz.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {quiz.description}
          </p>
        )}

        {/* Quiz Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <BookOpen className="h-4 w-4 mr-2" />
            {quiz.totalQuestions} questions
          </div>
          
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Clock className="h-4 w-4 mr-2" />
            {quiz.duration} minutes
          </div>
          
          {/* Time Display with special handling for deferred */}
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="h-4 w-4 mr-2" />
            {quiz.startTime || quiz.schedulingStatus !== 'deferred' ? (
              formatQuizTime()
            ) : (
              <span className="italic">Time to be announced</span>
            )}
          </div>
          
          {/* Availability Status */}
          <div className={`flex items-center text-sm ${timeDisplay.color}`} title={timeDisplay.tooltip}>
            {timeDisplay.icon}
            <span className="ml-2">{timeDisplay.text}</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-4">
          {renderActionButton()}
        </div>
      </div>
    </div>
  );
}

export default QuizCard;
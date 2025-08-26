"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Trophy, 
  BookOpen, 
  Calendar,
  CheckCircle,
  XCircle,
  Eye,
  Clock
} from "lucide-react";

interface ResultCardProps {
  id: string;
  quizTitle: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  completedAt: string;
  duration?: number;
  className?: string;
}

export function ResultCard({
  id,
  quizTitle,
  score,
  correctAnswers,
  totalQuestions,
  completedAt,
  duration,
  className
}: ResultCardProps) {
  const isPassed = score >= 70;
  const formattedDate = new Date(completedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div
      className={cn(
        "bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md",
        "transition-all duration-200 border border-amber-100 dark:border-amber-900/20",
        "hover:border-amber-200 dark:hover:border-amber-800/30",
        className
      )}
    >
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {/* Title and Status */}
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {quizTitle}
              </h3>
              {isPassed ? (
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              )}
            </div>

            {/* Score Badge */}
            <div className="mb-3">
              <div
                className={cn(
                  "inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold",
                  isPassed
                    ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                    : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                )}
              >
                <Trophy className="h-4 w-4 mr-1.5" />
                {score}%
              </div>
            </div>

            {/* Details */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                {correctAnswers}/{totalQuestions} correct
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                {formattedDate}
              </span>
              {duration && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  {Math.round(duration / 60)} min
                </span>
              )}
            </div>
          </div>

          {/* Action Button */}
          <Link href={`/student/results/${id}`}>
            <Button 
              variant="outline" 
              size="sm"
              className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/20"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
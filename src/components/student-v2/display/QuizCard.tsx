"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusBadge, StatusIndicator } from "@/components/ui/status-badge";
import { getStatusConfig } from "@/lib/status-theme";
import {
  BookOpen, 
  Clock, 
  Calendar,
  Users,
  PlayCircle,
  Lock,
  AlertCircle,
  CheckCircle
} from "lucide-react";

interface QuizCardProps {
  title: string;
  description?: string;
  totalQuestions: number;
  duration: number;
  startTimeFormatted: string;
  statusText: string;
  statusColor: "green" | "amber" | "red";
  attempted: boolean;
  enrolled: boolean;
  score?: number;
  isExpired: boolean;
  isAvailable: boolean;
  isReassignment?: boolean;
  reassignmentReason?: string;
  onEnroll?: () => void;
  onStart?: () => void;
  actionElement?: ReactNode;
  className?: string;
}

export function QuizCard({
  title,
  description,
  totalQuestions,
  duration,
  startTimeFormatted,
  statusText,
  statusColor,
  attempted,
  enrolled,
  score,
  isExpired,
  isAvailable,
  isReassignment = false,
  reassignmentReason,
  onEnroll,
  onStart,
  actionElement,
  className
}: QuizCardProps) {
  const statusColorClasses = {
    green: "text-green-600 dark:text-green-400",
    amber: "text-amber-600 dark:text-amber-400",
    red: "text-red-600 dark:text-red-400"
  };

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
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2 mb-2">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
              {description}
            </p>
          )}
        </div>

        {/* Quiz Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <BookOpen className="h-4 w-4 mr-2 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <span>{totalQuestions} questions</span>
          </div>
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Clock className="h-4 w-4 mr-2 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <span>{duration} minutes</span>
          </div>
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="h-4 w-4 mr-2 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="truncate">{startTimeFormatted}</span>
          </div>
          <div className="flex items-center text-sm">
            <Users className="h-4 w-4 mr-2 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <span className={cn("font-medium", statusColorClasses[statusColor])}>
              {statusText}
            </span>
          </div>
        </div>

        {/* Status Badge */}
        {attempted && (
          <div className="mb-4">
            <div className={cn(
              "flex items-center justify-between p-3 rounded-lg border",
              getStatusConfig('enrollment', 'completed').colors.bg,
              getStatusConfig('enrollment', 'completed').colors.border
            )}>
              <StatusBadge 
                type="enrollment" 
                status="completed" 
                size="sm"
                showIcon={true}
              />
              {score !== undefined && (
                <span className={cn(
                  "text-sm font-semibold",
                  getStatusConfig('enrollment', 'completed').colors.text
                )}>
                  Score: {score}%
                </span>
              )}
            </div>
          </div>
        )}
        
        {/* Reassignment Badge */}
        {isReassignment && !attempted && (
          <div className="mb-4">
            <div className="flex items-center p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mr-2" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Reassigned Quiz
              </span>
              {reassignmentReason && (
                <span className="text-xs text-blue-600 dark:text-blue-400 ml-2">
                  ({reassignmentReason})
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action Section */}
        <div className="mt-auto">
          {actionElement ? (
            actionElement
          ) : attempted ? (
            <Button 
              variant="outline" 
              className="w-full border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/20"
            >
              View Results
            </Button>
          ) : enrolled ? (
            isExpired && !isReassignment ? (
              <Button disabled className="w-full">
                <AlertCircle className="h-4 w-4 mr-2" />
                Quiz Expired
              </Button>
            ) : isAvailable || isReassignment ? (
              <Button 
                onClick={onStart}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Start Quiz
              </Button>
            ) : (
              <Button disabled className="w-full">
                <Lock className="h-4 w-4 mr-2" />
                Not Yet Available
              </Button>
            )
          ) : isExpired && !isReassignment ? (
            <Button disabled variant="outline" className="w-full">
              <AlertCircle className="h-4 w-4 mr-2" />
              Quiz Expired
            </Button>
          ) : (
            <Button 
              onClick={onEnroll}
              variant="outline"
              className="w-full border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/20"
            >
              Enroll in Quiz
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
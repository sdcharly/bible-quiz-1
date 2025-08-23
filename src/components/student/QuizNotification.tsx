"use client";

import { useState, useEffect } from "react";
import { AlertCircle, Calendar, Clock, X, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuizNotificationProps {
  quiz: {
    id: string;
    title: string;
    startTime?: string | null;
    timezone?: string;
    schedulingStatus?: string;
    hasScheduledTime?: boolean;
  };
  type: 'scheduled' | 'rescheduled' | 'reminder' | 'unscheduled';
  onDismiss?: () => void;
}

export function QuizNotification({ quiz, type, onDismiss }: QuizNotificationProps) {
  const [visible, setVisible] = useState(true);

  const handleDismiss = () => {
    setVisible(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  if (!visible) return null;

  const getNotificationContent = () => {
    switch (type) {
      case 'scheduled':
        return {
          icon: <Calendar className="h-5 w-5 text-green-600" />,
          title: "Quiz Scheduled!",
          message: quiz.startTime 
            ? `"${quiz.title}" has been scheduled for ${new Date(quiz.startTime).toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
                timeZone: quiz.timezone
              })}`
            : `"${quiz.title}" has been scheduled. Check the details for the exact time.`,
          bgColor: "bg-green-50 dark:bg-green-900/20",
          borderColor: "border-green-200 dark:border-green-800",
          textColor: "text-green-800 dark:text-green-200"
        };

      case 'rescheduled':
        return {
          icon: <Clock className="h-5 w-5 text-amber-600" />,
          title: "Quiz Time Changed",
          message: quiz.startTime
            ? `"${quiz.title}" has been rescheduled to ${new Date(quiz.startTime).toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
                timeZone: quiz.timezone
              })}`
            : `"${quiz.title}" time has been updated. Please check the new schedule.`,
          bgColor: "bg-amber-50 dark:bg-amber-900/20",
          borderColor: "border-amber-200 dark:border-amber-800",
          textColor: "text-amber-800 dark:text-amber-200"
        };

      case 'reminder':
        if (!quiz.startTime) return null;
        const hoursUntil = Math.ceil((new Date(quiz.startTime).getTime() - Date.now()) / (1000 * 60 * 60));
        return {
          icon: <Bell className="h-5 w-5 text-blue-600" />,
          title: "Quiz Starting Soon",
          message: `"${quiz.title}" starts in ${hoursUntil} hour${hoursUntil !== 1 ? 's' : ''}. Get ready!`,
          bgColor: "bg-blue-50 dark:bg-blue-900/20",
          borderColor: "border-blue-200 dark:border-blue-800",
          textColor: "text-blue-800 dark:text-blue-200"
        };

      case 'unscheduled':
        return {
          icon: <AlertCircle className="h-5 w-5 text-gray-600" />,
          title: "Awaiting Schedule",
          message: `You're enrolled in "${quiz.title}". The time will be announced soon.`,
          bgColor: "bg-gray-50 dark:bg-gray-900/20",
          borderColor: "border-gray-200 dark:border-gray-800",
          textColor: "text-gray-800 dark:text-gray-200"
        };

      default:
        return null;
    }
  };

  const content = getNotificationContent();
  if (!content) return null;

  return (
    <div className={`${content.bgColor} ${content.borderColor} border rounded-lg p-4 mb-4 shadow-sm`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {content.icon}
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${content.textColor}`}>
            {content.title}
          </h3>
          <div className={`mt-1 text-sm ${content.textColor} opacity-90`}>
            {content.message}
          </div>
        </div>
        <div className="ml-auto pl-3">
          <button
            onClick={handleDismiss}
            className={`inline-flex rounded-md ${content.textColor} hover:opacity-70 focus:outline-none`}
          >
            <span className="sr-only">Dismiss</span>
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default QuizNotification;
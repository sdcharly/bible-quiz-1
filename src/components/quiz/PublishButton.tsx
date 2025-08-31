"use client";

import { useState, useEffect } from "react";
import { CheckCircle, Send, Calendar, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { FEATURES } from "@/lib/feature-flags";
import { SchedulingModal } from "./SchedulingModal";

// Tooltip component not available yet

interface PublishButtonProps {
  quizId: string;
  quizTitle: string;
  quizStatus: string;
  schedulingStatus?: string;
  hasStartTime?: boolean;
  startTime?: string | null;
  timezone?: string;
  duration?: number;
  educatorId: string;
  onPublish: () => Promise<void>;
  onSchedule?: (schedule: { startTime: string; timezone: string; duration: number }) => Promise<void>;
  disabled?: boolean;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
}

export function PublishButton({
  quizId,
  quizTitle,
  quizStatus,
  schedulingStatus,
  hasStartTime,
  startTime,
  timezone,
  duration,
  educatorId,
  onPublish,
  onSchedule,
  disabled = false,
  className = "",
  size = "default"
}: PublishButtonProps) {
  const [showSchedulingModal, setShowSchedulingModal] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const isDeferredEnabled = useFeatureFlag('DEFERRED_TIME');

  // Determine if quiz needs scheduling before publishing
  const needsScheduling = isDeferredEnabled && 
                         schedulingStatus === 'deferred' && 
                         !hasStartTime && 
                         quizStatus !== 'published';

  const isPublished = quizStatus === 'published';
  const canReschedule = isDeferredEnabled && 
                       schedulingStatus !== 'legacy' && 
                       !['completed', 'archived'].includes(quizStatus);

  const handleButtonClick = async () => {
    if (isPublished && canReschedule) {
      // Show scheduling modal for rescheduling
      setShowSchedulingModal(true);
    } else if (needsScheduling) {
      // Show scheduling modal before publishing
      setShowSchedulingModal(true);
    } else if (!isPublished) {
      // Direct publish for legacy mode or already scheduled quizzes
      await handlePublish();
    }
  };

  const handlePublish = async () => {
    if (!confirm("Are you sure you want to publish this quiz? Once published, you won't be able to edit the questions anymore.")) {
      return;
    }

    setPublishing(true);
    try {
      await onPublish();
    } catch (error) {
      // Handle publish error with proper message display
      const errorMessage = error instanceof Error ? error.message : String(error) || 'Failed to publish quiz';
      alert(errorMessage);
    } finally {
      setPublishing(false);
    }
  };

  const handleSchedule = async (schedule: { startTime: string; timezone: string; duration: number }) => {
    setScheduling(true);
    try {
      // Call the scheduling API
      const response = await fetch(`/api/educator/quiz/${quizId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...schedule,
          notifyStudents: isPublished // Only notify if already published
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to schedule quiz');
      }

      // If quiz is not published yet, publish it after scheduling
      if (!isPublished) {
        await handlePublish();
      } else if (onSchedule) {
        // Call parent's schedule handler for UI updates
        await onSchedule(schedule);
      }

      setShowSchedulingModal(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error) || 'Failed to schedule quiz');
      throw error;
    } finally {
      setScheduling(false);
    }
  };

  // Determine button appearance and text
  let buttonIcon = <Send className="mr-2 h-4 w-4" />;
  let buttonText = "Publish Quiz";
  let buttonVariant: "default" | "outline" | "secondary" = "default";

  if (publishing || scheduling) {
    buttonIcon = <Loader2 className="mr-2 h-4 w-4 animate-spin" />;
    buttonText = publishing ? "Publishing..." : "Scheduling...";
  } else if (isPublished) {
    if (canReschedule) {
      buttonIcon = <Calendar className="mr-2 h-4 w-4" />;
      buttonText = hasStartTime ? "Reschedule" : "Set Time";
      buttonVariant = "outline";
    } else {
      buttonIcon = <CheckCircle className="mr-2 h-4 w-4" />;
      buttonText = "Published";
    }
  } else if (needsScheduling) {
    buttonIcon = <Calendar className="mr-2 h-4 w-4" />;
    buttonText = "Schedule & Publish";
  }

  const button = (
    <Button
      onClick={handleButtonClick}
      disabled={disabled || (isPublished && !canReschedule) || publishing || scheduling}
      className={className}
      variant={buttonVariant}
      size={size}
    >
      {buttonIcon}
      {buttonText}
    </Button>
  );

  return (
    <>
      {button}

      <SchedulingModal
        isOpen={showSchedulingModal}
        onClose={() => setShowSchedulingModal(false)}
        onSchedule={handleSchedule}
        quizTitle={quizTitle}
        defaultDuration={duration}
        existingSchedule={
          hasStartTime && startTime
            ? { startTime, timezone, duration }
            : undefined
        }
        isRescheduling={isPublished && hasStartTime}
      />
    </>
  );
}

export default PublishButton;
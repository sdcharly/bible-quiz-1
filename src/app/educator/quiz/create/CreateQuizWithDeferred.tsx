"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SchedulingModeSelector } from "@/components/quiz/SchedulingModeSelector";
import { TimeSchedulingFields } from "@/components/quiz/TimeSchedulingFields";
import { useTimezone } from "@/hooks/useTimezone";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { FEATURES } from "@/lib/feature-flags";
import { isQuizTimeValid } from "@/lib/timezone";

interface EnhancedQuizConfig {
  title: string;
  description: string;
  documentIds: string[];
  questionCount: number;
  duration: number;
  difficulty: "easy" | "intermediate" | "hard";
  bloomsLevels: string[];
  topics: string[];
  books: string[];
  chapters: string[];
  startTime: string;
  timezone: string;
  shuffleQuestions: boolean;
  schedulingMode: "immediate" | "deferred";
  useDeferredScheduling?: boolean;
}

export function CreateQuizWithDeferred({ 
  educatorId,
  initialConfig,
  onSubmit,
  children 
}: {
  educatorId: string;
  initialConfig: Partial<EnhancedQuizConfig>;
  onSubmit: (config: EnhancedQuizConfig) => Promise<void>;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const { timezone: userTimezone, getCurrentDateTime, toUTC, formatDate } = useTimezone();
  const isDeferredEnabled = useFeatureFlag('DEFERRED_TIME', educatorId);
  
  const [schedulingMode, setSchedulingMode] = useState<"immediate" | "deferred">("immediate");
  const [config, setConfig] = useState<EnhancedQuizConfig>({
    title: "",
    description: "",
    documentIds: [],
    questionCount: 10,
    duration: 30,
    difficulty: "intermediate",
    bloomsLevels: [],
    topics: [],
    books: [],
    chapters: [],
    startTime: "",
    timezone: userTimezone,
    shuffleQuestions: false,
    ...initialConfig,
    schedulingMode: "immediate",
    useDeferredScheduling: false
  } as EnhancedQuizConfig);

  // Initialize startTime with user's timezone (only for immediate mode)
  useEffect(() => {
    if (schedulingMode === "immediate" && !config.startTime && userTimezone) {
      const currentTimeInUserTz = getCurrentDateTime();
      setConfig(prev => ({ 
        ...prev, 
        startTime: currentTimeInUserTz,
        timezone: userTimezone 
      }));
    }
  }, [userTimezone, getCurrentDateTime, config.startTime, schedulingMode]);

  const handleSchedulingModeChange = (mode: "immediate" | "deferred") => {
    setSchedulingMode(mode);
    setConfig(prev => ({
      ...prev,
      schedulingMode: mode,
      useDeferredScheduling: mode === "deferred",
      // Clear time fields if switching to deferred
      startTime: mode === "deferred" ? "" : (prev.startTime || getCurrentDateTime()),
      timezone: mode === "deferred" ? userTimezone : prev.timezone
    }));
  };

  const updateDateTime = (date: string, time: string) => {
    const timeWithSeconds = time.includes(':') && time.split(':').length === 2 
      ? `${time}:00` 
      : time;
    const newDateTime = `${date}T${timeWithSeconds}`;
    setConfig({ ...config, startTime: newDateTime });
  };

  const getDateFromStartTime = () => {
    if (!config.startTime) {
      const currentTimeInUserTz = getCurrentDateTime();
      return currentTimeInUserTz.split('T')[0];
    }
    return config.startTime.split('T')[0];
  };

  const getTimeFromStartTime = () => {
    if (!config.startTime) {
      const currentTimeInUserTz = getCurrentDateTime();
      const time = currentTimeInUserTz.split('T')[1];
      return time ? time.substring(0, 5) : '';
    }
    const time = config.startTime.split('T')[1];
    return time ? time.substring(0, 5) : '';
  };

  const handleFormSubmit = async () => {
    // Validate based on scheduling mode
    if (schedulingMode === "immediate") {
      if (!config.startTime || !isQuizTimeValid(config.startTime, config.timezone)) {
        alert("Please select a valid start time (at least 5 minutes in the future)");
        return;
      }
    }

    // Call the parent's submit handler with enhanced config
    await onSubmit({
      ...config,
      schedulingMode,
      useDeferredScheduling: schedulingMode === "deferred"
    });
  };

  return (
    <div className="space-y-6">
      {/* Basic Information Section */}
      <div className="space-y-5">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">
          Basic Information
        </h2>
        
        <div>
          <Label className="text-sm font-heading font-medium text-gray-900 dark:text-white mb-2">
            Sacred Quest Title
          </Label>
          <Input
            type="text"
            value={config.title}
            onChange={(e) => setConfig({ ...config, title: e.target.value })}
            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            placeholder="e.g., Wisdom of Solomon Quest"
          />
        </div>

        <div>
          <Label className="text-sm font-heading font-medium text-gray-900 dark:text-white mb-2">
            Divine Description
          </Label>
          <Textarea
            value={config.description}
            onChange={(e) => setConfig({ ...config, description: e.target.value })}
            rows={3}
            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            placeholder="Describe the sacred journey and learning objectives..."
          />
        </div>

        {/* Scheduling Mode Selector - Only show if feature is enabled */}
        {isDeferredEnabled && (
          <SchedulingModeSelector
            mode={schedulingMode}
            onChange={handleSchedulingModeChange}
            educatorId={educatorId}
          />
        )}

        {/* Time Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <TimeSchedulingFields
            schedulingMode={schedulingMode}
            startTime={config.startTime}
            timezone={config.timezone}
            onDateChange={(date) => updateDateTime(date, getTimeFromStartTime())}
            onTimeChange={(time) => updateDateTime(getDateFromStartTime(), time)}
            onTimezoneChange={(tz) => setConfig({ ...config, timezone: tz })}
            getDateFromStartTime={getDateFromStartTime}
            getTimeFromStartTime={getTimeFromStartTime}
            isTimeValid={schedulingMode === "deferred" || isQuizTimeValid(config.startTime, config.timezone)}
          />
          
          <div>
            <Label className="text-sm font-heading font-medium text-gray-900 dark:text-white mb-2">
              Quest Duration
            </Label>
            <Select
              value={config.duration.toString()}
              onValueChange={(value) => setConfig({ ...config, duration: parseInt(value) })}
            >
              <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="90">1.5 hours</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Date/Time Preview - Only show for immediate mode */}
        {schedulingMode === "immediate" && config.startTime && (
          <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-heading font-semibold text-amber-800 dark:text-amber-300">
                  🗓️ Quest Schedule Preview:
                </span>
                <span className="text-xs px-2 py-1 bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-300 rounded-full">
                  {config.timezone.split('/')[1]?.replace('_', ' ')}
                </span>
              </div>
              <div className="font-body text-amber-700 dark:text-amber-400">
                📅 {(() => {
                  const utcDate = toUTC(config.startTime);
                  return isNaN(utcDate.getTime()) ? 'Invalid time' : formatDate(utcDate);
                })()}
              </div>
              <div className="text-xs text-amber-600 dark:text-amber-500">
                ⏱️ Duration: {config.duration} minutes
              </div>
              {!isQuizTimeValid(config.startTime, userTimezone) && (
                <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                  ⚠️ Quiz time should be at least 5 minutes in the future
                </div>
              )}
            </div>
          </div>
        )}

        {/* Deferred Mode Info */}
        {schedulingMode === "deferred" && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="space-y-2">
              <div className="font-heading font-semibold text-green-800 dark:text-green-300">
                📝 Quiz will be created in draft mode
              </div>
              <div className="text-sm text-green-700 dark:text-green-400">
                You can set the start time later when you&apos;re ready to publish the quiz.
                Students will be able to enroll, but won&apos;t see the quiz time until you schedule it.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Additional form fields and submit button would go here */}
      {children}

      <div className="flex justify-end space-x-3">
        <Button
          variant="outline"
          onClick={() => router.push("/educator/dashboard")}
        >
          Cancel
        </Button>
        <Button
          onClick={handleFormSubmit}
          disabled={!config.title || config.documentIds.length === 0}
        >
          {schedulingMode === "deferred" ? "Create Draft Quiz" : "Create Quiz"}
        </Button>
      </div>
    </div>
  );
}

export default CreateQuizWithDeferred;
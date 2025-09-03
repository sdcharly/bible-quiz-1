"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimezoneSelector } from "@/components/ui/timezone-selector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Calendar, Clock, CheckCircle } from "lucide-react";
import { useTimezone } from "@/hooks/useTimezone";
import { validateStartTime } from "@/lib/quiz-scheduling";
import { convertUserTimezoneToUTC } from "@/lib/timezone";

interface SchedulingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (schedule: {
    startTime: string;
    timezone: string;
    duration: number;
  }) => Promise<void>;
  quizTitle: string;
  defaultDuration?: number;
  existingSchedule?: {
    startTime?: string;
    timezone?: string;
    duration?: number;
  };
  isRescheduling?: boolean;
}

export function SchedulingModal({
  isOpen,
  onClose,
  onSchedule,
  quizTitle,
  defaultDuration = 30,
  existingSchedule,
  isRescheduling = false
}: SchedulingModalProps) {
  const { timezone: userTimezone, getCurrentDateTime, toUTC, formatDate } = useTimezone();
  
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [timezone, setTimezone] = useState(userTimezone);
  const [duration, setDuration] = useState(defaultDuration);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with existing schedule or defaults
  useEffect(() => {
    if (existingSchedule?.startTime) {
      // The startTime is stored in UTC, convert it to the quiz's timezone for display
      const utcDate = new Date(existingSchedule.startTime);
      const displayTimezone = existingSchedule.timezone || userTimezone;
      
      // Format the date in the quiz's timezone
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: displayTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      
      const parts = formatter.formatToParts(utcDate);
      const dateParts: Record<string, string> = {};
      parts.forEach(part => {
        dateParts[part.type] = part.value;
      });
      
      setStartDate(`${dateParts.year}-${dateParts.month}-${dateParts.day}`);
      setStartTime(`${dateParts.hour}:${dateParts.minute}`);
      setTimezone(displayTimezone);
      setDuration(existingSchedule.duration || defaultDuration);
    } else {
      // Set default to current time + 1 hour in user's timezone
      const future = new Date(Date.now() + 60 * 60 * 1000);
      
      // Format future date in user's timezone
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: userTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      
      const parts = formatter.formatToParts(future);
      const dateParts: Record<string, string> = {};
      parts.forEach(part => {
        dateParts[part.type] = part.value;
      });
      
      setStartDate(`${dateParts.year}-${dateParts.month}-${dateParts.day}`);
      setStartTime(`${dateParts.hour}:${dateParts.minute}`);
      setTimezone(userTimezone);
    }
  }, [existingSchedule, userTimezone, defaultDuration]);

  const handleSubmit = async () => {
    // Simple: User enters date/time in their selected timezone
    // We convert to UTC for database storage
    const dateTimeString = `${startDate}T${startTime}:00`;
    
    // Validate the time
    const validation = validateStartTime(dateTimeString);
    if (!validation.valid) {
      setError(validation.error || "Invalid start time");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Convert from selected timezone to UTC for database
      const utcDate = convertUserTimezoneToUTC(dateTimeString, timezone);
      
      // Validation check
      if (isNaN(utcDate.getTime())) {
        throw new Error('Invalid date/time conversion');
      }
      
      // Send UTC time to database
      await onSchedule({
        startTime: utcDate.toISOString(), // This is UTC for database
        timezone, // Store timezone for reference
        duration
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule quiz");
    } finally {
      setLoading(false);
    }
  };

  const getSchedulePreview = () => {
    if (!startDate || !startTime) return null;
    
    const dateTimeString = `${startDate}T${startTime}:00`;
    
    // Convert the selected time to UTC for accurate preview
    // The input represents time in the SELECTED timezone
    try {
      const utcDate = convertUserTimezoneToUTC(dateTimeString, timezone);
      
      if (isNaN(utcDate.getTime())) return null;
      
      return {
        start: utcDate,
        end: new Date(utcDate.getTime() + duration * 60 * 1000)
      };
    } catch {
      return null;
    }
  };

  const preview = getSchedulePreview();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl text-amber-900 dark:text-amber-100">
            {isRescheduling ? "Reschedule Quiz" : "Schedule Quiz Time"}
          </DialogTitle>
          <DialogDescription className="font-body text-amber-700 dark:text-amber-300">
            Set when &ldquo;{quizTitle}&rdquo; will be available to students.
            {isRescheduling && (
              <span className="text-amber-600 dark:text-amber-400 block mt-2">
                <AlertCircle className="inline h-4 w-4 mr-1" />
                This will update the time for all enrolled students.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center text-red-700 dark:text-red-300">
                <AlertCircle className="h-4 w-4 mr-2" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Clear timezone indicator */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-4">
            <div className="flex items-center text-blue-700 dark:text-blue-300">
              <Clock className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">
                All times are in {timezone === 'Asia/Kolkata' ? 'IST (India Standard Time)' : timezone}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="date" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                disabled={loading}
                className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div>
              <Label htmlFor="time" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                Time <span className="text-red-500">*</span>
              </Label>
              <Input
                id="time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={loading}
                className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
              Timezone
            </Label>
            <TimezoneSelector
              value={timezone}
              onChange={setTimezone}
              showLabel={false}
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="duration" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Duration</Label>
            <Select
              value={duration.toString()}
              onValueChange={(value) => setDuration(parseInt(value))}
              disabled={loading}
            >
              <SelectTrigger id="duration" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-amber-500 focus:border-amber-500">
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

          {/* Schedule Preview */}
          {preview && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <div className="space-y-2">
                <div className="flex items-center text-amber-700 dark:text-amber-300 font-medium">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Preview
                </div>
                <div className="text-sm text-amber-600 dark:text-amber-400 space-y-1">
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 mr-2" />
                    <span>
                      Starts: {preview.start.toLocaleString('en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                        timeZone: timezone
                      })}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-3 w-3 mr-2" />
                    <span>
                      Ends: {preview.end.toLocaleString('en-US', {
                        timeStyle: 'short',
                        timeZone: timezone
                      })}
                    </span>
                  </div>
                  <div className="text-xs mt-2 text-amber-500 dark:text-amber-500">
                    Timezone: {timezone}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={loading}
            className="font-body border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/20"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !startDate || !startTime}
            className="font-body bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
          >
            {loading ? "Scheduling..." : isRescheduling ? "Update Schedule" : "Set Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SchedulingModal;
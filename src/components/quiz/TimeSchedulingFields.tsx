"use client";

import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimezoneSelector } from "@/components/ui/timezone-selector";


interface TimeSchedulingFieldsProps {
  schedulingMode: "immediate" | "deferred";
  startTime: string;
  timezone: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onTimezoneChange: (timezone: string) => void;
  getDateFromStartTime: () => string;
  getTimeFromStartTime: () => string;
  isTimeValid?: boolean;
}

export function TimeSchedulingFields({
  schedulingMode,
  startTime,
  timezone,
  onDateChange,
  onTimeChange,
  onTimezoneChange,
  getDateFromStartTime,
  getTimeFromStartTime,
  isTimeValid = true
}: TimeSchedulingFieldsProps) {
  if (schedulingMode === "deferred") {
    return (
      <div className="col-span-full">
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">
              Time scheduling will be configured when you publish the quiz
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div>
        <Label className="text-sm font-heading font-medium text-gray-900 dark:text-white mb-2">
          Sacred Date
        </Label>
        <Input
          type="date"
          value={getDateFromStartTime()}
          onChange={(e) => onDateChange(e.target.value)}
          className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-amber-500 focus:border-amber-500"
          required
        />
      </div>
      <div>
        <Label className="text-sm font-heading font-medium text-gray-900 dark:text-white mb-2">
          Divine Hour
        </Label>
        <Input
          type="time"
          value={getTimeFromStartTime()}
          onChange={(e) => onTimeChange(e.target.value)}
          className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-amber-500 focus:border-amber-500"
          required
        />
      </div>
      <div>
        <TimezoneSelector
          value={timezone}
          onChange={onTimezoneChange}
          onTimezoneChange={onTimezoneChange}
          showLabel={true}
          className=""
        />
      </div>
      {!isTimeValid && (
        <div className="col-span-full">
          <div className="text-xs text-red-600 dark:text-red-400 font-medium">
            ⚠️ Quiz time should be at least 5 minutes in the future
          </div>
        </div>
      )}
    </>
  );
}

export default TimeSchedulingFields;
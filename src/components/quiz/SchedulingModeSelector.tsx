"use client";

import { useState, useEffect } from "react";
import { Clock, Calendar, AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { isFeatureEnabled, FEATURE_FLAGS } from "@/lib/feature-flags";


interface SchedulingModeSelectorProps {
  mode: "immediate" | "deferred";
  onChange: (mode: "immediate" | "deferred") => void;
  educatorId?: string;
  disabled?: boolean;
}

export function SchedulingModeSelector({
  mode,
  onChange,
  educatorId,
  disabled = false
}: SchedulingModeSelectorProps) {
  const [featureEnabled, setFeatureEnabled] = useState(false);

  useEffect(() => {
    // Check if deferred scheduling is enabled for this educator
    const enabled = isFeatureEnabled(FEATURE_FLAGS.DEFERRED_TIME, educatorId || null);
    setFeatureEnabled(enabled);
    
    // If feature is not enabled, force immediate mode
    if (!enabled && mode === "deferred") {
      onChange("immediate");
    }
  }, [educatorId, mode, onChange]);

  // Don't show the selector if feature is not enabled
  if (!featureEnabled) {
    return null;
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-heading font-medium text-gray-900 dark:text-white">
        Scheduling Mode
      </Label>
      
      <RadioGroup
        value={mode}
        onValueChange={(value) => onChange(value as "immediate" | "deferred")}
        disabled={disabled}
        className="space-y-3"
      >
        <div className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <RadioGroupItem value="immediate" id="immediate" className="mt-1" />
          <label htmlFor="immediate" className="flex-1 cursor-pointer">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="font-medium">Set Time Now</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Choose the quiz start time during creation (traditional method)
            </p>
          </label>
        </div>

        <div className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <RadioGroupItem value="deferred" id="deferred" className="mt-1" />
          <label htmlFor="deferred" className="flex-1 cursor-pointer">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-green-500" />
              <span className="font-medium">Set Time Later</span>
              <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full">
                New
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Create the quiz now, schedule the time when publishing
            </p>
          </label>
        </div>
      </RadioGroup>

      {mode === "deferred" && (
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium">How it works:</p>
              <ul className="mt-1 space-y-1 list-disc list-inside">
                <li>Create and configure your quiz without setting a time</li>
                <li>Students can enroll but won&apos;t see the start time yet</li>
                <li>Set the time when you&apos;re ready to publish</li>
                <li>Perfect for preparing quizzes in advance</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SchedulingModeSelector;
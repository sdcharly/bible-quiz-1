"use client";

import { useState, useEffect } from "react";
import { ChevronDownIcon, GlobeAltIcon } from "@heroicons/react/24/outline";
import { TIMEZONE_OPTIONS, getDefaultTimezone, getBrowserTimezone } from "@/lib/timezone";

interface TimezoneSelectorProps {
  value?: string;
  onChange: (timezone: string) => void;
  disabled?: boolean;
  className?: string;
  showLabel?: boolean;
}

export function TimezoneSelector({ 
  value, 
  onChange, 
  disabled = false, 
  className = "", 
  showLabel = true 
}: TimezoneSelectorProps) {
  const [selectedTimezone, setSelectedTimezone] = useState(value || "Asia/Kolkata");
  const [isOpen, setIsOpen] = useState(false);
  const [detectedTimezone, setDetectedTimezone] = useState<string | null>(null);

  useEffect(() => {
    // Detect user's timezone and set default
    const browserTz = getBrowserTimezone();
    const defaultTz = getDefaultTimezone();
    
    setDetectedTimezone(browserTz);
    
    if (!value) {
      setSelectedTimezone(defaultTz);
      onChange(defaultTz);
    }
  }, [value, onChange]);

  const handleTimezoneChange = (timezone: string) => {
    setSelectedTimezone(timezone);
    onChange(timezone);
    setIsOpen(false);
  };

  const selectedOption = TIMEZONE_OPTIONS.find(tz => tz.value === selectedTimezone) || TIMEZONE_OPTIONS[0];
  
  // Group timezones by region for better UX
  const indianTimezones = TIMEZONE_OPTIONS.filter(tz => 
    tz.country === "India" || tz.country === "Bangladesh" || tz.country === "Pakistan" || 
    tz.country === "Sri Lanka" || tz.country === "Nepal"
  );
  
  const internationalTimezones = TIMEZONE_OPTIONS.filter(tz => 
    !indianTimezones.includes(tz)
  );

  return (
    <div className={`relative ${className}`}>
      {showLabel && (
        <label className="block text-sm font-heading font-medium text-gray-900 dark:text-white mb-2">
          <GlobeAltIcon className="inline h-4 w-4 mr-1" />
          Sacred Time Zone
        </label>
      )}
      
      {/* Auto-detected timezone info */}
      {detectedTimezone && detectedTimezone !== selectedTimezone && (
        <div className="mb-2 text-xs text-amber-600 dark:text-amber-400">
          Detected: {TIMEZONE_OPTIONS.find(tz => tz.value === detectedTimezone)?.label || detectedTimezone}
        </div>
      )}
      
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 
            rounded-lg text-sm font-body text-left
            focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 
            transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
            hover:border-amber-300 dark:hover:border-amber-700
          `}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 dark:text-white truncate">
                {selectedOption.label}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {selectedOption.offset} • {selectedOption.country}
              </div>
            </div>
            <ChevronDownIcon 
              className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                isOpen ? 'transform rotate-180' : ''
              }`} 
            />
          </div>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-96 overflow-y-auto">
            {/* Indian/South Asian Timezones */}
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <div className="text-xs font-heading font-semibold text-amber-600 dark:text-amber-400 px-2 py-1 uppercase tracking-wide">
                🇮🇳 India & South Asia
              </div>
              {indianTimezones.map((timezone) => (
                <button
                  key={timezone.value}
                  onClick={() => handleTimezoneChange(timezone.value)}
                  className={`
                    w-full text-left px-3 py-2 rounded-md text-sm transition-colors duration-150
                    hover:bg-amber-50 dark:hover:bg-amber-900/20
                    ${timezone.value === selectedTimezone 
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200' 
                      : 'text-gray-900 dark:text-white'
                    }
                  `}
                >
                  <div className="font-medium">{timezone.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {timezone.offset} • {timezone.country}
                  </div>
                </button>
              ))}
            </div>

            {/* International Timezones */}
            <div className="p-2">
              <div className="text-xs font-heading font-semibold text-gray-500 dark:text-gray-400 px-2 py-1 uppercase tracking-wide">
                🌍 International
              </div>
              {internationalTimezones.map((timezone) => (
                <button
                  key={timezone.value}
                  onClick={() => handleTimezoneChange(timezone.value)}
                  className={`
                    w-full text-left px-3 py-2 rounded-md text-sm transition-colors duration-150
                    hover:bg-gray-50 dark:hover:bg-gray-700
                    ${timezone.value === selectedTimezone 
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200' 
                      : 'text-gray-900 dark:text-white'
                    }
                  `}
                >
                  <div className="font-medium">{timezone.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {timezone.offset} • {timezone.country}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
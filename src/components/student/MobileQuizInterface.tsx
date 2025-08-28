"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Wifi, WifiOff, Save, Smartphone, Monitor, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { isMobileDevice, getDeviceInfo } from "@/lib/quiz-autosave";
import { logger } from "@/lib/logger";

interface MobileQuizInterfaceProps {
  isOnline: boolean;
  lastSaveTime: number | null;
  isSaving: boolean;
  autoSaveEnabled: boolean;
  onEnableAutoSave: () => void;
  timeRemaining: number;
  totalDuration: number;
}

export function MobileQuizInterface({
  isOnline,
  lastSaveTime,
  isSaving,
  autoSaveEnabled,
  onEnableAutoSave,
  timeRemaining,
  totalDuration,
}: MobileQuizInterfaceProps) {
  const [showMobileWarning, setShowMobileWarning] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<ReturnType<typeof getDeviceInfo>>();
  const [networkStatus, setNetworkStatus] = useState<"online" | "offline" | "slow">("online");

  useEffect(() => {
    const info = getDeviceInfo();
    setDeviceInfo(info);
    
    // Show mobile warning for first-time mobile users
    if (info.isMobile && !localStorage.getItem("mobile_warning_dismissed")) {
      setShowMobileWarning(true);
    }

    // Monitor network status
    const handleOnline = () => setNetworkStatus("online");
    const handleOffline = () => setNetworkStatus("offline");
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    // Check network speed
    const connection = (navigator as any).connection;
    if (connection) {
      const checkSpeed = () => {
        if (!navigator.onLine) {
          setNetworkStatus("offline");
        } else if (connection.effectiveType === "slow-2g" || connection.effectiveType === "2g") {
          setNetworkStatus("slow");
        } else {
          setNetworkStatus("online");
        }
      };
      
      checkSpeed();
      connection.addEventListener("change", checkSpeed);
      
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        connection.removeEventListener("change", checkSpeed);
      };
    }
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const dismissMobileWarning = () => {
    setShowMobileWarning(false);
    localStorage.setItem("mobile_warning_dismissed", "true");
  };

  const formatLastSave = () => {
    if (!lastSaveTime) return "Not saved yet";
    const secondsAgo = Math.floor((Date.now() - lastSaveTime) / 1000);
    if (secondsAgo < 60) return `${secondsAgo}s ago`;
    const minutesAgo = Math.floor(secondsAgo / 60);
    if (minutesAgo < 60) return `${minutesAgo}m ago`;
    return `${Math.floor(minutesAgo / 60)}h ago`;
  };

  const progressPercentage = ((totalDuration - timeRemaining) / totalDuration) * 100;

  return (
    <>
      {/* Mobile Warning */}
      {showMobileWarning && deviceInfo?.isMobile && (
        <Alert className="mb-4 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <Smartphone className="h-4 w-4" />
          <AlertTitle>Mobile Device Detected</AlertTitle>
          <AlertDescription>
            <div className="space-y-2 mt-2">
              <p className="text-sm">For the best experience:</p>
              <ul className="text-sm list-disc list-inside space-y-1">
                <li>Keep this tab active - don't switch apps</li>
                <li>Ensure stable internet connection</li>
                <li>Your answers are auto-saved every 30 seconds</li>
                <li>You can resume if interrupted</li>
              </ul>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={dismissMobileWarning}>
                  Got it
                </Button>
                {!autoSaveEnabled && (
                  <Button size="sm" onClick={onEnableAutoSave}>
                    Enable Auto-Save
                  </Button>
                )}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Network Status Bar */}
      {networkStatus !== "online" && (
        <Alert 
          className={`mb-4 ${
            networkStatus === "offline" 
              ? "border-red-200 bg-red-50 dark:bg-red-950/20" 
              : "border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20"
          }`}
        >
          <WifiOff className="h-4 w-4" />
          <AlertTitle>
            {networkStatus === "offline" ? "No Internet Connection" : "Slow Connection"}
          </AlertTitle>
          <AlertDescription>
            {networkStatus === "offline" 
              ? "Your answers are saved locally and will sync when reconnected."
              : "Connection is slow. Your answers are being saved locally."}
          </AlertDescription>
        </Alert>
      )}

      {/* Auto-Save Status - Mobile Optimized */}
      {deviceInfo?.isMobile && (
        <div className="fixed top-14 right-2 z-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 text-xs">
          <div className="flex items-center gap-2">
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-amber-600"></div>
                <span className="text-amber-600">Saving...</span>
              </>
            ) : lastSaveTime ? (
              <>
                <Save className="h-3 w-3 text-green-600" />
                <span className="text-green-600">{formatLastSave()}</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3 text-gray-400" />
                <span className="text-gray-400">Not saved</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Progress Bar for Mobile */}
      {deviceInfo?.isMobile && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 z-50">
          <div 
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-1000"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      )}
    </>
  );
}

// ImprovedQuizLoader removed - use BiblicalPageLoader from @/components/ui/biblical-loader instead

/**
 * Session recovery prompt
 */
export function SessionRecoveryPrompt({
  lastSaved,
  answersCount,
  onRecover,
  onStartNew,
}: {
  lastSaved: string;
  answersCount: number;
  onRecover: () => void;
  onStartNew: () => void;
}) {
  const timeSince = new Date(lastSaved).toLocaleString();
  
  return (
    <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Previous Session Found</AlertTitle>
      <AlertDescription>
        <div className="space-y-3 mt-2">
          <p className="text-sm">
            You have an incomplete quiz session from <strong>{timeSince}</strong> with{" "}
            <strong>{answersCount} answered questions</strong>.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={onRecover}>
              Continue Previous Session
            </Button>
            <Button size="sm" variant="outline" onClick={onStartNew}>
              Start Fresh
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
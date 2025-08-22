"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface SessionMonitorProps {
  sessionTimeout?: number; // in milliseconds
  warningTime?: number; // in milliseconds before timeout
  onSessionExpired?: () => void;
}

export function SessionMonitor({
  sessionTimeout = 30 * 60 * 1000, // 30 minutes default
  warningTime = 5 * 60 * 1000, // 5 minutes before expiry
  onSessionExpired,
}: SessionMonitorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(sessionTimeout);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());

  // Reset activity timer on user interaction
  const resetActivity = useCallback(() => {
    setLastActivity(Date.now());
    setShowWarning(false);
  }, []);

  // Extend session
  const extendSession = useCallback(async () => {
    try {
      // Call an API endpoint to refresh the session
      const response = await fetch("/api/auth/refresh-session", {
        method: "POST",
      });

      if (response.ok) {
        resetActivity();
        toast({
          title: "Session Extended",
          description: "Your session has been extended.",
        });
      } else {
        throw new Error("Failed to extend session");
      }
    } catch (error) {
      console.error("Failed to extend session:", error);
      toast({
        title: "Error",
        description: "Failed to extend session. Please log in again.",
        variant: "destructive",
      });
      handleSessionExpired();
    }
  }, [resetActivity]);

  // Handle session expiry
  const handleSessionExpired = useCallback(() => {
    setShowWarning(false);
    
    if (onSessionExpired) {
      onSessionExpired();
    } else {
      // Default behavior: redirect to login
      toast({
        title: "Session Expired",
        description: "Your session has expired. Please log in again.",
        variant: "destructive",
      });
      
      // Redirect based on current path
      const isAdmin = window.location.pathname.startsWith("/admin");
      const loginPath = isAdmin ? "/admin/login" : "/auth/signin";
      router.push(`${loginPath}?redirect=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [onSessionExpired, router]);

  // Monitor session timeout
  useEffect(() => {
    const checkSession = () => {
      const now = Date.now();
      const elapsed = now - lastActivity;
      const remaining = sessionTimeout - elapsed;

      setTimeRemaining(remaining);

      if (remaining <= 0) {
        // Session expired
        handleSessionExpired();
      } else if (remaining <= warningTime && !showWarning) {
        // Show warning
        setShowWarning(true);
      }
    };

    // Check every second
    const interval = setInterval(checkSession, 1000);

    // Add activity listeners
    const activityEvents = ["mousedown", "keydown", "scroll", "touchstart"];
    
    const handleActivity = () => {
      const now = Date.now();
      const elapsed = now - lastActivity;
      
      // Only reset if more than 1 minute has passed (to avoid too frequent updates)
      if (elapsed > 60000) {
        resetActivity();
      }
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      clearInterval(interval);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [
    lastActivity,
    sessionTimeout,
    warningTime,
    showWarning,
    handleSessionExpired,
    resetActivity,
  ]);

  // Format time remaining
  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Session Expiring Soon</AlertDialogTitle>
          <AlertDialogDescription>
            Your session will expire in {formatTime(timeRemaining)}. Would you like to extend your session?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleSessionExpired}>
            Log Out
          </AlertDialogCancel>
          <AlertDialogAction onClick={extendSession}>
            Extend Session
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
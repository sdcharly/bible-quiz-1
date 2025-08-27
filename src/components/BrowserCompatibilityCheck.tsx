"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

/**
 * Browser Compatibility Checker
 * Shows warning for unsupported browsers
 */
export function BrowserCompatibilityCheck() {
  const [showWarning, setShowWarning] = useState(false);
  const [browserInfo, setBrowserInfo] = useState<{
    name: string;
    version: number;
    issue?: string;
  } | null>(null);

  useEffect(() => {
    const checkBrowser = () => {
      const ua = navigator.userAgent;
      let name = "Unknown";
      let version = 0;
      let issue = "";

      // Detect browser and version
      if (ua.includes("Chrome") && !ua.includes("Edg")) {
        name = "Chrome";
        const match = ua.match(/Chrome\/(\d+)/);
        version = match ? parseInt(match[1]) : 0;
        if (version < 90) issue = "Please update Chrome to version 90 or higher";
      } else if (ua.includes("Safari") && !ua.includes("Chrome")) {
        name = "Safari";
        const match = ua.match(/Version\/(\d+)/);
        version = match ? parseInt(match[1]) : 0;
        if (version < 14) issue = "Please update Safari to version 14 or higher";
      } else if (ua.includes("Firefox")) {
        name = "Firefox";
        const match = ua.match(/Firefox\/(\d+)/);
        version = match ? parseInt(match[1]) : 0;
        if (version < 88) issue = "Please update Firefox to version 88 or higher";
      } else if (ua.includes("Edg")) {
        name = "Edge";
        const match = ua.match(/Edg\/(\d+)/);
        version = match ? parseInt(match[1]) : 0;
        if (version < 90) issue = "Please update Edge to version 90 or higher";
      } else if (ua.includes("SamsungBrowser")) {
        name = "Samsung Browser";
        const match = ua.match(/SamsungBrowser\/(\d+)/);
        version = match ? parseInt(match[1]) : 0;
        if (version < 14) issue = "Samsung Browser may have compatibility issues";
      } else if (ua.includes("Opera") || ua.includes("OPR")) {
        name = "Opera";
        issue = "Opera may have compatibility issues. Please use Chrome, Safari, or Firefox";
      } else {
        issue = "Your browser may not be fully supported. Please use Chrome, Safari, or Firefox";
      }

      // Check for WebView (in-app browsers)
      if (ua.includes("wv") || ua.includes("WebView")) {
        issue = "In-app browsers are not supported. Please open in Chrome or Safari";
      }

      // Check for old iOS
      if (ua.includes("iPhone") || ua.includes("iPad")) {
        const iosMatch = ua.match(/OS (\d+)_/);
        const iosVersion = iosMatch ? parseInt(iosMatch[1]) : 0;
        if (iosVersion < 14) {
          issue = "Please update your iOS to version 14 or higher";
        }
      }

      // Check for old Android
      if (ua.includes("Android")) {
        const androidMatch = ua.match(/Android (\d+)/);
        const androidVersion = androidMatch ? parseInt(androidMatch[1]) : 0;
        if (androidVersion < 10) {
          issue = "Please update your Android to version 10 or higher";
        }
      }

      setBrowserInfo({ name, version, issue });
      if (issue) {
        setShowWarning(true);
      }
    };

    checkBrowser();
  }, []);

  if (!showWarning || !browserInfo?.issue) {
    return null;
  }

  return (
    <Alert className="m-4 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Browser Compatibility Warning</AlertTitle>
      <AlertDescription>
        <div className="space-y-2">
          <p>
            You're using {browserInfo.name} {browserInfo.version > 0 ? `version ${browserInfo.version}` : ""}.
          </p>
          <p className="font-medium">{browserInfo.issue}</p>
          <p className="text-sm">
            For the best experience, we recommend:
          </p>
          <ul className="text-sm list-disc list-inside">
            <li>Chrome 90+ (Recommended)</li>
            <li>Safari 14+ on iOS</li>
            <li>Firefox 88+</li>
            <li>Edge 90+</li>
          </ul>
        </div>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Pre-quiz compatibility test
 * Returns true if browser is compatible
 */
export function checkQuizCompatibility(): {
  compatible: boolean;
  reason?: string;
} {
  try {
    // Check for required features
    if (!window.localStorage) {
      return { compatible: false, reason: "localStorage not supported" };
    }
    
    if (!window.fetch) {
      return { compatible: false, reason: "fetch API not supported" };
    }
    
    if (!window.Promise) {
      return { compatible: false, reason: "Promise not supported" };
    }
    
    // Check for JSON support
    if (!window.JSON || !JSON.parse || !JSON.stringify) {
      return { compatible: false, reason: "JSON not supported" };
    }
    
    // Test localStorage (might be blocked)
    try {
      const test = "__test__";
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
    } catch {
      return { compatible: false, reason: "localStorage is blocked" };
    }
    
    // Check for third-party cookie blocking (can affect auth)
    if (!navigator.cookieEnabled) {
      return { compatible: false, reason: "Cookies are disabled" };
    }
    
    return { compatible: true };
  } catch (error) {
    return { compatible: false, reason: "Compatibility check failed" };
  }
}
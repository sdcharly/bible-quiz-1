"use client";

import { useState, useEffect } from "react";
import { isFeatureEnabled } from "@/lib/feature-flags";

/**
 * React hook for checking feature flags
 * Phase 3.4: Feature flag integration for UI components
 */
export function useFeatureFlag(flagName: string, userId?: string | null): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Check feature flag on mount and when dependencies change
    const checkFlag = () => {
      const isEnabled = isFeatureEnabled(flagName, userId);
      setEnabled(isEnabled);
    };

    checkFlag();
  }, [flagName, userId]);

  return enabled;
}

export default useFeatureFlag;
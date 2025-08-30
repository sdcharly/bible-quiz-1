"use client";

import { useState, useEffect } from "react";
import { isFeatureEnabled, FeatureFlag } from "@/lib/feature-flags";


/**
 * React hook for checking feature flags
 * Phase 3.4: Feature flag integration for UI components
 */
export function useFeatureFlag(flagName: FeatureFlag, userId?: string | null): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Check feature flag on mount and when dependencies change
    const checkFlag = () => {
      const isEnabled = isFeatureEnabled(flagName);
      setEnabled(isEnabled);
    };

    checkFlag();
  }, [flagName]);

  return enabled;
}

export default useFeatureFlag;
"use client";

import { useState, useEffect } from "react";
import { isFeatureEnabled, FeatureFlag } from "@/lib/feature-flags";


/**
 * React hook for checking feature flags
 * Phase 3.4: Feature flag integration for UI components
 * 
 * @param flagName - The feature flag to check
 * @param _userId - @deprecated This parameter is not used and will be removed in a future version
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useFeatureFlag(flagName: FeatureFlag, _userId?: string | null): boolean {
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
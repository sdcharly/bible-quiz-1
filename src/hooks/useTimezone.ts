"use client";

import { useCallback, useMemo } from 'react';
import { useUserContext } from '@/contexts/UserContext';
import {
  formatDateInTimezone,
  convertUTCToUserTimezone,
  convertUserTimezoneToUTC,
  getCurrentTimeInUserTimezone,
  convertUTCToDateTimeLocal
} from '@/lib/timezone';

/**
 * Custom hook for timezone-aware operations
 * Provides easy access to common timezone functions using user's timezone
 */
export function useTimezone() {
  const { timezone, setTimezone, isLoading } = useUserContext();

  // Memoize functions to prevent recreating on every render
  const formatDate = useCallback(
    (utcDate: Date | string, options?: Intl.DateTimeFormatOptions) => 
      formatDateInTimezone(utcDate, timezone, options),
    [timezone]
  );

  const toUserTimezone = useCallback(
    (utcDate: Date | string) => 
      convertUTCToUserTimezone(utcDate, timezone),
    [timezone]
  );

  const toUTC = useCallback(
    (dateTimeString: string) => 
      convertUserTimezoneToUTC(dateTimeString, timezone),
    [timezone]
  );

  const getCurrentDateTime = useCallback(
    () => getCurrentTimeInUserTimezone(timezone),
    [timezone]
  );

  const toDateTimeLocal = useCallback(
    (utcDate: Date | string) => 
      convertUTCToDateTimeLocal(utcDate, timezone),
    [timezone]
  );

  return useMemo(() => ({
    timezone,
    setTimezone,
    isLoading,
    formatDate,
    toUserTimezone,
    toUTC,
    getCurrentDateTime,
    toDateTimeLocal
  }), [
    timezone,
    setTimezone,
    isLoading,
    formatDate,
    toUserTimezone,
    toUTC,
    getCurrentDateTime,
    toDateTimeLocal
  ]);
}
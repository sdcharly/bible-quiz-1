"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getBrowserTimezone } from '@/lib/timezone';


interface UserContextType {
  timezone: string;
  setTimezone: (timezone: string) => void;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function useUserContext() {
  const context = useContext(UserContext);
  if (!context) {
    // Return default values instead of throwing error during initialization
    // [REMOVED: Console statement for performance]
    return {
      timezone: 'Asia/Kolkata',
      setTimezone: () => {},
      isLoading: false
    };
  }
  return context;
}

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [timezone, setTimezoneState] = useState<string>('Asia/Kolkata'); // Default fallback
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }
    
    // Get timezone from browser
    const browserTz = getBrowserTimezone();
    setTimezoneState(browserTz);
    
    // Try to get user's stored preference from localStorage
    try {
      const storedTz = localStorage.getItem('user-timezone');
      if (storedTz) {
        setTimezoneState(storedTz);
      }
    } catch (error) {
      // [REMOVED: Console statement for performance]
    }
    
    setIsLoading(false);
  }, []);

  const setTimezone = (newTimezone: string) => {
    setTimezoneState(newTimezone);
    
    // Store in localStorage for persistence (only on client side)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('user-timezone', newTimezone);
      } catch (error) {
        // [REMOVED: Console statement for performance]
      }
    }
    
    // TODO: Also update user profile in database when user authentication is available
  };

  const value = {
    timezone,
    setTimezone,
    isLoading,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
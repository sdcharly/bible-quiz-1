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
    throw new Error('useUserContext must be used within a UserProvider');
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
      console.warn('Failed to read timezone from localStorage:', error);
    }
    
    setIsLoading(false);
  }, []);

  const setTimezone = (newTimezone: string) => {
    setTimezoneState(newTimezone);
    
    // Store in localStorage for persistence
    try {
      localStorage.setItem('user-timezone', newTimezone);
    } catch (error) {
      console.warn('Failed to save timezone to localStorage:', error);
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
"use client";

import React from "react";
import { StudentErrorBoundary } from "./StudentErrorBoundary";

interface StudentPageWrapperProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
}

/**
 * Wrapper component that provides error boundary protection for student pages
 * This ensures that errors in one page don't crash the entire application
 */
export function StudentPageWrapper({ 
  children, 
  fallback
}: StudentPageWrapperProps) {
  return (
    <StudentErrorBoundary fallback={fallback}>
      {children}
    </StudentErrorBoundary>
  );
}

/**
 * HOC to wrap student page components with error boundary
 * Usage: export default withErrorBoundary(YourComponent);
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>
) {
  const WrappedComponent = (props: P) => {
    return (
      <StudentPageWrapper fallback={fallback}>
        <Component {...props} />
      </StudentPageWrapper>
    );
  };
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}
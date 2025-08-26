"use client";

import React from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";


interface Props {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class StudentErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // [REMOVED: Console statement for performance]
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} reset={this.reset} />;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
          <div className="max-w-md w-full">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 sm:p-8">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              
              <h2 className="text-lg sm:text-xl font-bold text-center text-gray-900 dark:text-white mb-2">
                Oops! Something went wrong
              </h2>
              
              <p className="text-sm sm:text-base text-center text-gray-600 dark:text-gray-400 mb-6">
                We encountered an error while loading this page. Please try refreshing or return to your dashboard.
              </p>

              {process.env.NODE_ENV === "development" && this.state.error && (
                <div className="mb-6 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <p className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={this.reset}
                  className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                
                <Link href="/student/dashboard" className="flex-1">
                  <Button variant="outline" className="w-full">
                    <Home className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function StudentErrorFallback({ 
  error, 
  reset 
}: { 
  error: Error; 
  reset: () => void 
}) {
  return (
    <div className="min-h-[400px] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-100 dark:bg-amber-900/20 rounded-full mb-4">
          <AlertCircle className="h-6 w-6 text-amber-600" />
        </div>
        
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Unable to load content
        </h3>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-sm mx-auto">
          {error.message || "An unexpected error occurred"}
        </p>
        
        <Button
          onClick={reset}
          size="sm"
          className="bg-gradient-to-r from-amber-600 to-orange-600"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Retry
        </Button>
      </div>
    </div>
  );
}
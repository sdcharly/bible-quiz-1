"use client";

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary for educator panel
 * Catches and displays errors gracefully
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="max-w-md w-full border-red-200">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Something went wrong
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {this.state.error?.message || 'An unexpected error occurred'}
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={this.handleReset}
                    variant="outline"
                    className="border-amber-200 hover:bg-amber-50"
                  >
                    Try Again
                  </Button>
                  <Button
                    onClick={() => window.location.reload()}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    Refresh Page
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
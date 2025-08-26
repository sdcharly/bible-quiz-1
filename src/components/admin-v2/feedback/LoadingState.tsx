"use client";

import { type FC } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';


export interface LoadingStateProps {
  text?: string;
  fullPage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingState: FC<LoadingStateProps> = ({
  text = 'Loading...',
  fullPage = false,
  size = 'md',
  className
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const content = (
    <div className={cn(
      'flex flex-col items-center justify-center gap-3',
      fullPage && 'min-h-[60vh]',
      className
    )}>
      <div className="relative">
        <Loader2 className={cn(
          sizeClasses[size],
          'animate-spin text-red-600 dark:text-red-400'
        )} />
        <div className="absolute inset-0 blur-xl opacity-30">
          <Loader2 className={cn(
            sizeClasses[size],
            'animate-spin text-red-600 dark:text-red-400'
          )} />
        </div>
      </div>
      <p className={cn(
        textSizeClasses[size],
        'text-gray-600 dark:text-gray-400 font-medium'
      )}>
        {text}
      </p>
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        {content}
      </div>
    );
  }

  return content;
};

// Skeleton loader for tables and lists
export interface SkeletonProps {
  lines?: number;
  className?: string;
}

export const Skeleton: FC<SkeletonProps> = ({
  lines = 3,
  className
}) => {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
        </div>
      ))}
    </div>
  );
};
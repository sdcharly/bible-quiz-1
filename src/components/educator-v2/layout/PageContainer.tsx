"use client";

import { type FC, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface PageContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full';
  padding?: boolean;
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full'
};

export const PageContainer: FC<PageContainerProps> = ({
  children,
  className,
  maxWidth = '7xl',
  padding = true
}) => {
  return (
    <div 
      className={cn(
        'min-h-screen bg-gray-50 dark:bg-gray-900',
        className
      )}
    >
      <div 
        className={cn(
          maxWidthClasses[maxWidth],
          'mx-auto',
          padding && 'px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8'
        )}
      >
        {children}
      </div>
    </div>
  );
};
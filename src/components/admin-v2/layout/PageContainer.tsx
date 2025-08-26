"use client";

import { type FC, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { adminTheme } from '../theme/colors';


export interface AdminPageContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full';
  noPadding?: boolean;
}

export const AdminPageContainer: FC<AdminPageContainerProps> = ({
  children,
  className,
  maxWidth = '7xl',
  noPadding = false
}) => {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-full'
  };

  return (
    <div className={cn(
      adminTheme.background.main,
      'min-h-screen',
      className
    )}>
      <div className={cn(
        maxWidthClasses[maxWidth],
        'mx-auto',
        !noPadding && 'px-4 sm:px-6 lg:px-8 py-6'
      )}>
        {children}
      </div>
    </div>
  );
};
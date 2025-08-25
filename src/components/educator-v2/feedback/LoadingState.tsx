"use client";

import { type FC } from 'react';
import { BiblicalLoader, BiblicalPageLoader } from '@/components/ui/biblical-loader';
import { cn } from '@/lib/utils';

export interface LoadingStateProps {
  text?: string;
  fullPage?: boolean;
  inline?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Consistent loading state for educator panel
 * Replaces all blue spinners with biblical theme
 */
export const LoadingState: FC<LoadingStateProps> = ({
  text = 'Loading...',
  fullPage = false,
  inline = false,
  size = 'md',
  className
}) => {
  if (fullPage) {
    return <BiblicalPageLoader text={text} />;
  }

  return (
    <div 
      className={cn(
        'flex items-center justify-center',
        !inline && 'min-h-[200px]',
        className
      )}
    >
      <BiblicalLoader 
        size={size} 
        text={text} 
        inline={inline}
      />
    </div>
  );
};
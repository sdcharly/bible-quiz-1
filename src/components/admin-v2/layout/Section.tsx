"use client";

import { type FC, type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { adminTheme } from '../theme/colors';


export interface AdminSectionProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
  transparent?: boolean;
  securityLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export const AdminSection: FC<AdminSectionProps> = ({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
  noPadding = false,
  transparent = false,
  securityLevel
}) => {
  const securityBorders = {
    low: 'border-l-4 border-l-gray-400',
    medium: 'border-l-4 border-l-yellow-500',
    high: 'border-l-4 border-l-orange-500',
    critical: 'border-l-4 border-l-red-600'
  };

  if (transparent) {
    return (
      <div className={cn('space-y-4 mb-6', className)}>
        {(title || actions) && (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {title && (
              <div>
                <div className="flex items-center gap-2">
                  {Icon && (
                    <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded">
                      <Icon className="h-5 w-5 text-red-700 dark:text-red-400" />
                    </div>
                  )}
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {title}
                  </h2>
                </div>
                {description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {description}
                  </p>
                )}
              </div>
            )}
            {actions && <div className="flex gap-2">{actions}</div>}
          </div>
        )}
        {children}
      </div>
    );
  }

  return (
    <Card className={cn(
      'border-red-100 dark:border-gray-700 shadow-sm mb-6',
      securityLevel && securityBorders[securityLevel],
      adminTheme.shadow.hover,
      className
    )}>
      {(title || actions) && (
        <CardHeader className="pb-4 border-b border-red-50 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              {title && (
                <CardTitle className="flex items-center gap-2">
                  {Icon && (
                    <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded">
                      <Icon className="h-5 w-5 text-red-700 dark:text-red-400" />
                    </div>
                  )}
                  <span className="text-gray-900 dark:text-white">{title}</span>
                </CardTitle>
              )}
              {description && (
                <CardDescription className="mt-1">
                  {description}
                </CardDescription>
              )}
            </div>
            {actions && <div className="flex gap-2">{actions}</div>}
          </div>
        </CardHeader>
      )}
      <CardContent className={cn(
        !noPadding ? 'p-6' : 'p-0',
        (!title && !actions) && 'pt-6'
      )}>
        {children}
      </CardContent>
    </Card>
  );
};
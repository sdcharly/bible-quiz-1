"use client";

import { type FC, type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';


export interface SectionProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
  transparent?: boolean;
}

export const Section: FC<SectionProps> = ({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
  noPadding = false,
  transparent = false
}) => {
  if (transparent) {
    return (
      <div className={cn('space-y-4 mb-6', className)}>
        {(title || actions) && (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {title && (
              <div>
                <div className="flex items-center gap-2">
                  {Icon && <Icon className="h-5 w-5 text-amber-600" />}
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
    <Card className={cn('border-amber-100 shadow-sm mb-6', className)}>
      {(title || actions) && (
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              {title && (
                <CardTitle className="flex items-center gap-2">
                  {Icon && <Icon className="h-5 w-5 text-amber-600" />}
                  {title}
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
      <CardContent className={cn(noPadding && 'p-0')}>
        {children}
      </CardContent>
    </Card>
  );
};
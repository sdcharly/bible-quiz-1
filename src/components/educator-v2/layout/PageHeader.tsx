"use client";

import { type FC, type ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
  backButton?: {
    label?: string;
    href: string;
  };
  actions?: ReactNode;
  className?: string;
}

export const PageHeader: FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  breadcrumbs,
  backButton,
  actions,
  className
}) => {
  return (
    <div className={cn("bg-white dark:bg-gray-800 shadow", className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="pt-4">
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2">
                {breadcrumbs.map((crumb, index) => (
                  <li key={index} className="flex items-center">
                    {index > 0 && (
                      <span className="mx-2 text-gray-400">/</span>
                    )}
                    {crumb.href ? (
                      <Link
                        href={crumb.href}
                        className="text-sm font-medium text-gray-500 hover:text-amber-600 transition-colors"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {crumb.label}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        )}

        {/* Main Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 sm:py-6 gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              {Icon && (
                <Icon className="h-8 w-8 text-amber-600" />
              )}
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                {title}
              </h1>
            </div>
            {subtitle && (
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                {subtitle}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {backButton && (
              <Link href={backButton.href}>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {backButton.label || 'Back'}
                </Button>
              </Link>
            )}
            {actions}
          </div>
        </div>
      </div>
    </div>
  );
};
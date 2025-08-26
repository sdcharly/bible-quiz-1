"use client";

import { type FC, type ReactNode } from 'react';
import { ArrowLeft, Shield, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { adminTheme } from '../theme/colors';


export interface AdminPageHeaderProps {
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
  securityLevel?: 'low' | 'medium' | 'high' | 'critical';
  className?: string;
}

export const AdminPageHeader: FC<AdminPageHeaderProps> = ({
  title,
  subtitle,
  icon: Icon = Shield,
  breadcrumbs,
  backButton,
  actions,
  securityLevel,
  className
}) => {
  const securityColors = {
    low: 'border-l-gray-400',
    medium: 'border-l-yellow-500',
    high: 'border-l-orange-500',
    critical: 'border-l-red-600'
  };

  return (
    <div className={cn(
      "bg-white dark:bg-gray-800 shadow-sm mb-6",
      securityLevel && `border-l-4 ${securityColors[securityLevel]}`,
      className
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="pt-4">
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2">
                <li className="flex items-center">
                  <Link
                    href="/admin/dashboard"
                    className="text-sm font-medium text-gray-500 hover:text-red-700 transition-colors"
                  >
                    Admin
                  </Link>
                </li>
                {breadcrumbs.map((crumb, index) => (
                  <li key={index} className="flex items-center">
                    <span className="mx-2 text-gray-400">/</span>
                    {crumb.href ? (
                      <Link
                        href={crumb.href}
                        className="text-sm font-medium text-gray-500 hover:text-red-700 transition-colors"
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
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Icon className="h-6 w-6 text-red-700 dark:text-red-400" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {backButton && (
              <Link href={backButton.href}>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-200 hover:bg-red-50 text-red-700 dark:border-red-800 dark:hover:bg-red-900/20"
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
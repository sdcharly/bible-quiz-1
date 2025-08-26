"use client";

import { type FC } from 'react';
import { type LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';


export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label?: string;
  };
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}

export const StatCard: FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  trend,
  variant = 'default',
  className
}) => {
  const variantColors = {
    default: {
      icon: 'text-gray-600',
      iconBg: 'bg-gray-100 dark:bg-gray-800',
      trend: 'text-gray-600'
    },
    success: {
      icon: 'text-green-600',
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      trend: 'text-green-600'
    },
    warning: {
      icon: 'text-yellow-600',
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
      trend: 'text-yellow-600'
    },
    danger: {
      icon: 'text-red-600',
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      trend: 'text-red-600'
    }
  };

  const colors = variantColors[variant];
  const TrendIcon = trend && trend.value > 0 ? TrendingUp : trend && trend.value < 0 ? TrendingDown : Minus;

  return (
    <Card className={cn(
      'border-red-100 dark:border-gray-700 hover:shadow-md transition-shadow',
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {label}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
              {value}
            </p>
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                <TrendIcon className={cn('h-4 w-4', colors.trend)} />
                <span className={cn('text-sm font-medium', colors.trend)}>
                  {Math.abs(trend.value)}%
                </span>
                {trend.label && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {trend.label}
                  </span>
                )}
              </div>
            )}
          </div>
          {Icon && (
            <div className={cn(
              'p-3 rounded-lg',
              colors.iconBg
            )}>
              <Icon className={cn('h-6 w-6', colors.icon)} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Mini stat for inline display
export interface MiniStatProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  className?: string;
}

export const MiniStat: FC<MiniStatProps> = ({
  label,
  value,
  icon: Icon,
  className
}) => {
  return (
    <div className={cn(
      'flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg',
      className
    )}>
      {Icon && (
        <Icon className="h-4 w-4 text-gray-500 flex-shrink-0" />
      )}
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {label}
        </p>
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
          {value}
        </p>
      </div>
    </div>
  );
};
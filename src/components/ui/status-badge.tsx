import React from 'react';
import { getStatusConfig } from '@/lib/status-theme';
import {
  CheckCircleIcon,
  PencilSquareIcon,
  ArchiveBoxIcon,
  ClockIcon,
  UserPlusIcon,
  ArrowPathIcon,
  XCircleIcon,
  CheckBadgeIcon,
  NoSymbolIcon,
  DocumentCheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import {
  CheckCircleIcon as CheckCircleSolid
} from '@heroicons/react/24/solid';
import { cn } from '@/lib/utils';

const iconMap = {
  CheckCircleIcon,
  PencilSquareIcon,
  ArchiveBoxIcon,
  ClockIcon,
  UserPlusIcon,
  ArrowPathIcon,
  XCircleIcon,
  CheckBadgeIcon,
  NoSymbolIcon,
  DocumentCheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  UserIcon,
  UserCheckIcon: UserIcon,
  UserXIcon: XCircleIcon
};

interface StatusBadgeProps {
  type: 'quiz' | 'enrollment' | 'student' | 'educator' | 'document';
  status: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showDot?: boolean;
  className?: string;
  variant?: 'badge' | 'pill' | 'text';
  customLabel?: string;
}

export function StatusBadge({
  type,
  status,
  size = 'sm',
  showIcon = true,
  showDot = false,
  className,
  variant = 'badge',
  customLabel
}: StatusBadgeProps) {
  const config = getStatusConfig(type, status);
  const Icon = iconMap[config.icon as keyof typeof iconMap] || InformationCircleIcon;
  
  const sizeClasses = {
    xs: {
      container: 'px-1.5 py-0.5 text-xs',
      icon: 'h-3 w-3',
      dot: 'h-1.5 w-1.5',
      gap: 'gap-0.5'
    },
    sm: {
      container: 'px-2 py-1 text-xs',
      icon: 'h-3.5 w-3.5',
      dot: 'h-2 w-2',
      gap: 'gap-1'
    },
    md: {
      container: 'px-2.5 py-1.5 text-sm',
      icon: 'h-4 w-4',
      dot: 'h-2.5 w-2.5',
      gap: 'gap-1.5'
    },
    lg: {
      container: 'px-3 py-2 text-base',
      icon: 'h-5 w-5',
      dot: 'h-3 w-3',
      gap: 'gap-2'
    }
  };
  
  const variantClasses = {
    badge: `inline-flex items-center font-medium rounded-full ${config.colors.badge}`,
    pill: `inline-flex items-center font-medium rounded-lg ${config.colors.badge}`,
    text: `inline-flex items-center font-medium ${config.colors.text}`
  };
  
  return (
    <span
      className={cn(
        variantClasses[variant],
        sizeClasses[size].container,
        sizeClasses[size].gap,
        className
      )}
    >
      {showDot && (
        <span 
          className={cn(
            'rounded-full',
            config.colors.dot,
            sizeClasses[size].dot
          )} 
        />
      )}
      {showIcon && !showDot && (
        <Icon className={sizeClasses[size].icon} />
      )}
      <span>{customLabel || config.label}</span>
    </span>
  );
}

interface StatusCardProps {
  type: 'quiz' | 'enrollment' | 'student' | 'educator' | 'document';
  status: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
}

export function StatusCard({
  type,
  status,
  children,
  className,
  onClick,
  interactive = false
}: StatusCardProps) {
  const config = getStatusConfig(type, status);
  
  return (
    <div
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-lg border transition-all duration-200',
        config.colors.bg,
        config.colors.border,
        interactive && config.colors.hover,
        interactive && 'cursor-pointer',
        className
      )}
    >
      {/* Status indicator bar */}
      <div className={cn('absolute top-0 left-0 w-1 h-full', config.colors.dot)} />
      
      {/* Content */}
      <div className="pl-3">
        {children}
      </div>
    </div>
  );
}

interface StatusIndicatorProps {
  type: 'quiz' | 'enrollment' | 'student' | 'educator' | 'document';
  status: string;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}

export function StatusIndicator({
  type,
  status,
  size = 'md',
  pulse = false,
  className
}: StatusIndicatorProps) {
  const config = getStatusConfig(type, status);
  
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4'
  };
  
  return (
    <div className={cn('relative', className)}>
      <span
        className={cn(
          'block rounded-full',
          config.colors.dot,
          sizeClasses[size],
          pulse && 'animate-pulse'
        )}
      />
      {pulse && (
        <span
          className={cn(
            'absolute inset-0 rounded-full animate-ping',
            config.colors.dot,
            'opacity-75'
          )}
        />
      )}
    </div>
  );
}
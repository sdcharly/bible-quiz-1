"use client";

import { type FC } from 'react';
import { Shield, Lock, Eye, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { adminColors, securityLevels } from '../theme/colors';


export interface SecurityBadgeProps {
  level: 'low' | 'medium' | 'high' | 'critical';
  label?: string;
  showIcon?: boolean;
  className?: string;
}

export const SecurityBadge: FC<SecurityBadgeProps> = ({
  level,
  label,
  showIcon = true,
  className
}) => {
  const icons = {
    low: Eye,
    medium: Shield,
    high: Lock,
    critical: AlertTriangle
  };

  const labels = {
    low: 'Low Risk',
    medium: 'Medium Risk',
    high: 'High Risk',
    critical: 'Critical'
  };

  const Icon = icons[level];
  const displayLabel = label || labels[level];

  return (
    <Badge 
      className={cn(
        securityLevels[level].badge,
        'font-medium',
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {displayLabel}
    </Badge>
  );
};

// Permission Badge Component
export interface PermissionBadgeProps {
  role: 'superAdmin' | 'admin' | 'manager' | 'readOnly' | 'restricted';
  className?: string;
}

export const PermissionBadge: FC<PermissionBadgeProps> = ({
  role,
  className
}) => {
  const labels = {
    superAdmin: 'Super Admin',
    admin: 'Admin',
    manager: 'Manager',
    readOnly: 'Read Only',
    restricted: 'Restricted'
  };

  return (
    <Badge 
      className={cn(
        adminColors.permission[role],
        'font-medium',
        className
      )}
    >
      <Shield className="h-3 w-3 mr-1" />
      {labels[role]}
    </Badge>
  );
};

// Status Badge Component
export interface StatusBadgeProps {
  status: 'active' | 'pending' | 'suspended' | 'rejected' | 'approved';
  className?: string;
}

export const StatusBadge: FC<StatusBadgeProps> = ({
  status,
  className
}) => {
  const labels = {
    active: 'Active',
    pending: 'Pending',
    suspended: 'Suspended',
    rejected: 'Rejected',
    approved: 'Approved'
  };

  return (
    <Badge 
      variant="outline"
      className={cn(
        adminColors.status[status],
        'font-medium border',
        className
      )}
    >
      {labels[status]}
    </Badge>
  );
};
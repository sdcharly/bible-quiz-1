/**
 * Admin-v2 Component Library
 * Security-first, professional administrative interface components
 * Built with TypeScript, React, and Tailwind CSS
 */

// Layout Components
export { AdminPageHeader } from './layout/PageHeader';
export { AdminPageContainer } from './layout/PageContainer';
export { AdminSection } from './layout/Section';

// Navigation Components
export { AdminTabNavigation } from './navigation/TabNavigation';

// Security Components
export { ConfirmDialog } from './security/ConfirmDialog';
export { SecurityBadge, PermissionBadge, StatusBadge } from './security/SecurityBadge';

// Feedback Components
export { LoadingState, Skeleton } from './feedback/LoadingState';
export { EmptyState } from './feedback/EmptyState';

// Data Display Components
export { StatCard, MiniStat } from './data/StatCard';

// Theme Exports
export { 
  adminColors, 
  adminTheme, 
  adminButtonVariants, 
  securityLevels 
} from './theme/colors';

// Type Exports
export type { AdminPageHeaderProps } from './layout/PageHeader';
export type { AdminPageContainerProps } from './layout/PageContainer';
export type { AdminSectionProps } from './layout/Section';
export type { ConfirmDialogProps } from './security/ConfirmDialog';
export type { SecurityBadgeProps, PermissionBadgeProps, StatusBadgeProps } from './security/SecurityBadge';
export type { LoadingStateProps, SkeletonProps } from './feedback/LoadingState';
export type { EmptyStateProps } from './feedback/EmptyState';
export type { StatCardProps, MiniStatProps } from './data/StatCard';
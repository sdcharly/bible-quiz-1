/**
 * Educator V2 Components - Safe Refactored Version
 * These components will gradually replace existing educator code
 * WITHOUT breaking any current functionality
 */

// Layout components
export { PageHeader } from './layout/PageHeader';
export { PageContainer } from './layout/PageContainer';
export { Section } from './layout/Section';

// Navigation components
export { TabNavigation } from './navigation/TabNavigation';

// Feedback components
export { LoadingState } from './feedback/LoadingState';
export { EmptyState } from './feedback/EmptyState';
export { ErrorBoundary } from './feedback/ErrorBoundary';

// Export types
export type { PageHeaderProps } from './layout/PageHeader';
export type { PageContainerProps } from './layout/PageContainer';
export type { SectionProps } from './layout/Section';
export type { LoadingStateProps } from './feedback/LoadingState';
export type { EmptyStateProps } from './feedback/EmptyState';
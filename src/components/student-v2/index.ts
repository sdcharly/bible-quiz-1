/**
 * Student V2 Components - Centralized Exports
 * 
 * Import all components from this single file:
 * import { PageContainer, PageHeader, ... } from "@/components/student-v2"
 */

// Layout Components
export { PageContainer } from "./layout/PageContainer";
export { PageHeader } from "./layout/PageHeader";
export { Section } from "./layout/Section";

// Navigation Components
export { TabNavigation } from "./navigation/TabNavigation";

// State Components
export { LoadingState, LoadingSpinner, SkeletonLoader } from "./states/LoadingState";
export { EmptyState } from "./states/EmptyState";

// Display Components
export { StatCard } from "./display/StatCard";
export { QuizCard } from "./display/QuizCard";
export { FilterBar } from "./display/FilterBar";
export { ResultCard } from "./display/ResultCard";

// Re-export types
export type { Tab } from "./navigation/TabNavigation";
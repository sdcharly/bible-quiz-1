import { BookOpen, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";


interface LoadingStateProps {
  text?: string;
  fullPage?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * LoadingState - Consistent loading UI for student pages
 * Uses biblical theme with amber colors
 */
export function LoadingState({
  text = "Loading...",
  fullPage = false,
  size = "md",
  className
}: LoadingStateProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16"
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg"
  };

  const content = (
    <div className={cn(
      "flex flex-col items-center justify-center",
      fullPage && "min-h-[60vh]",
      className
    )}>
      <div className="relative">
        {/* Background book icon */}
        <BookOpen className={cn(
          sizeClasses[size],
          "text-amber-200 dark:text-amber-900/30"
        )} />
        {/* Spinning loader overlay */}
        <Loader2 className={cn(
          sizeClasses[size],
          "absolute inset-0 animate-spin text-amber-600 dark:text-amber-400"
        )} />
      </div>
      <p className={cn(
        "mt-4 text-gray-600 dark:text-gray-400 font-medium",
        textSizeClasses[size]
      )}>
        {text}
      </p>
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50/50 to-white dark:from-gray-900 dark:to-gray-950 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}

/**
 * LoadingSpinner - Simple inline spinner
 */
export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <Loader2 className={cn(
      "h-4 w-4 animate-spin text-amber-600 dark:text-amber-400",
      className
    )} />
  );
}

/**
 * SkeletonLoader - For content placeholder loading
 */
export function SkeletonLoader({ 
  lines = 3,
  className 
}: { 
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-4 bg-gradient-to-r from-amber-100 to-amber-50 dark:from-gray-800 dark:to-gray-700 rounded animate-pulse",
            i === lines - 1 && "w-3/4"
          )}
        />
      ))}
    </div>
  );
}
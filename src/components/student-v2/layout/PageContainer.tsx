import { ReactNode } from "react";
import { cn } from "@/lib/utils";


interface PageContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

/**
 * PageContainer - Consistent page wrapper for all student pages
 * Provides responsive padding and max-width constraints
 */
export function PageContainer({ 
  children, 
  className,
  maxWidth = "2xl"
}: PageContainerProps) {
  const maxWidthClasses = {
    sm: "max-w-screen-sm",
    md: "max-w-screen-md", 
    lg: "max-w-screen-lg",
    xl: "max-w-screen-xl",
    "2xl": "max-w-screen-2xl",
    full: "max-w-full"
  };

  return (
    <div className={cn(
      "min-h-screen bg-gradient-to-b from-amber-50/50 to-white dark:from-gray-900 dark:to-gray-950",
      className
    )}>
      <div className={cn(
        "mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8",
        maxWidthClasses[maxWidth]
      )}>
        {children}
      </div>
    </div>
  );
}
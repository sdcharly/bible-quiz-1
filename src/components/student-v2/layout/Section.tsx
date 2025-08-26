import { ReactNode } from "react";
import { cn } from "@/lib/utils";


interface SectionProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
  transparent?: boolean;
  noPadding?: boolean;
}

/**
 * Section - Consistent content section wrapper
 * Used for organizing content within pages
 */
export function Section({
  children,
  title,
  subtitle,
  actions,
  className,
  transparent = false,
  noPadding = false
}: SectionProps) {
  return (
    <div className={cn(
      "mb-6 lg:mb-8",
      !transparent && "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100 dark:border-amber-900/20",
      !noPadding && !transparent && "p-4 lg:p-6",
      className
    )}>
      {(title || actions) && (
        <div className={cn(
          "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2",
          !transparent && !noPadding && "mb-4",
          transparent && "mb-4"
        )}>
          <div>
            {title && (
              <h2 className="text-lg lg:text-xl font-semibold text-gray-900 dark:text-white">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center space-x-2">
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
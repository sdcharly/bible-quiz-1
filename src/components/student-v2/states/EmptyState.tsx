import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";


interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "outline" | "ghost";
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  children?: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * EmptyState - Consistent empty/no-data state for student pages
 * Provides clear messaging and actions when content is unavailable
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  children,
  className,
  size = "md"
}: EmptyStateProps) {
  const sizeClasses = {
    sm: {
      icon: "h-12 w-12",
      title: "text-base",
      description: "text-sm",
      padding: "py-8"
    },
    md: {
      icon: "h-16 w-16",
      title: "text-lg",
      description: "text-base",
      padding: "py-12"
    },
    lg: {
      icon: "h-20 w-20",
      title: "text-xl",
      description: "text-base",
      padding: "py-16"
    }
  };

  const sizes = sizeClasses[size];

  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center",
      sizes.padding,
      className
    )}>
      {Icon && (
        <div className="mb-4 p-4 bg-amber-100 dark:bg-amber-900/20 rounded-full">
          <Icon className={cn(
            sizes.icon,
            "text-amber-600 dark:text-amber-400"
          )} />
        </div>
      )}
      
      <h3 className={cn(
        "font-semibold text-gray-900 dark:text-white mb-2",
        sizes.title
      )}>
        {title}
      </h3>
      
      {description && (
        <p className={cn(
          "text-gray-600 dark:text-gray-400 max-w-md mb-6",
          sizes.description
        )}>
          {description}
        </p>
      )}
      
      {children && (
        <div className="mb-6">
          {children}
        </div>
      )}
      
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || "default"}
              className={cn(
                action.variant !== "outline" && action.variant !== "ghost" &&
                "bg-amber-600 hover:bg-amber-700 text-white"
              )}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant={secondaryAction.variant || "outline"}
              className={cn(
                secondaryAction.variant === "outline" &&
                "border-amber-200 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-900/20"
              )}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
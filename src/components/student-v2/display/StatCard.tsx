import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";


interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: {
    value: number;
    direction: "up" | "down" | "neutral";
  };
  description?: string;
  className?: string;
  iconColor?: string;
}

/**
 * StatCard - Consistent stat display card for student dashboards
 * Shows metrics with optional icons and trends
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  description,
  className,
  iconColor = "text-amber-600 dark:text-amber-400"
}: StatCardProps) {
  const TrendIcon = trend?.direction === "up" 
    ? TrendingUp 
    : trend?.direction === "down" 
    ? TrendingDown 
    : Minus;

  const trendColor = trend?.direction === "up"
    ? "text-green-600 dark:text-green-400"
    : trend?.direction === "down"
    ? "text-red-600 dark:text-red-400"
    : "text-gray-600 dark:text-gray-400";

  return (
    <div className={cn(
      "bg-white dark:bg-gray-800 p-4 lg:p-6 rounded-lg shadow-sm border border-amber-100 dark:border-amber-900/20 hover:shadow-md transition-shadow",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {label}
          </p>
          <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          {description && (
            <p className="mt-2 text-xs lg:text-sm text-gray-500 dark:text-gray-500">
              {description}
            </p>
          )}
          {trend && (
            <div className={cn("mt-2 flex items-center gap-1", trendColor)}>
              <TrendIcon className="h-3 w-3" />
              <span className="text-xs font-medium">
                {trend.value > 0 ? '+' : ''}{trend.value}%
              </span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="ml-4">
            <Icon className={cn("h-8 w-8 lg:h-10 lg:w-10 opacity-20", iconColor)} />
          </div>
        )}
      </div>
    </div>
  );
}
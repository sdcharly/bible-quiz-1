import { ReactNode } from "react";
import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";


interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  breadcrumbs?: Breadcrumb[];
  actions?: ReactNode;
  className?: string;
}

/**
 * PageHeader - Unified header component for student pages
 * Includes title, subtitle, breadcrumbs, and action buttons
 */
export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  breadcrumbs = [],
  actions,
  className
}: PageHeaderProps) {
  // Always include home breadcrumb for students
  const fullBreadcrumbs = [
    { label: "Dashboard", href: "/student/dashboard" },
    ...breadcrumbs
  ];

  return (
    <div className={cn(
      "mb-6 lg:mb-8 pb-6 border-b border-amber-100 dark:border-amber-900/20",
      className
    )}>
      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400 mb-4">
        <Link 
          href="/student/dashboard"
          className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
        >
          <Home className="h-4 w-4" />
        </Link>
        {fullBreadcrumbs.slice(1).map((crumb, index) => (
          <div key={index} className="flex items-center">
            <ChevronRight className="h-4 w-4 mx-1" />
            {crumb.href ? (
              <Link 
                href={crumb.href}
                className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="text-gray-900 dark:text-gray-100 font-medium">
                {crumb.label}
              </span>
            )}
          </div>
        ))}
      </nav>

      {/* Header Content */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start space-x-3">
          {Icon && (
            <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
              <Icon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm sm:text-base text-gray-600 dark:text-gray-400">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center space-x-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
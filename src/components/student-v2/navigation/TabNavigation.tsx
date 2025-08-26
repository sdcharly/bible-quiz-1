import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";


export interface Tab {
  id: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

/**
 * TabNavigation - Consistent tab navigation for student pages
 * Matches educator panel styling with amber theme
 */
export function TabNavigation({
  tabs,
  activeTab,
  onTabChange,
  className
}: TabNavigationProps) {
  return (
    <div className={cn(
      "border-b border-amber-100 dark:border-amber-900/20",
      className
    )}>
      <nav className="flex space-x-1 -mb-px overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap",
                isActive
                  ? "border-amber-600 text-amber-600 dark:border-amber-400 dark:text-amber-400"
                  : "border-transparent text-gray-600 hover:text-amber-600 hover:border-amber-200 dark:text-gray-400 dark:hover:text-amber-400"
              )}
            >
              {Icon && (
                <Icon className="h-4 w-4" />
              )}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={cn(
                  "ml-1.5 px-2 py-0.5 text-xs rounded-full",
                  isActive
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
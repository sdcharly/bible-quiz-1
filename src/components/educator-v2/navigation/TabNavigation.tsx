import React from 'react';
import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: string;
  icon?: React.ElementType;
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function TabNavigation({ 
  tabs, 
  activeTab, 
  onTabChange,
  className 
}: TabNavigationProps) {
  return (
    <div className={cn(
      "bg-white dark:bg-gray-800 rounded-lg border border-amber-100",
      className
    )}>
      <div className="flex">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex-1 px-6 py-3 text-sm font-medium transition-colors relative",
                index !== 0 && "border-l border-gray-200 dark:border-gray-700",
                isActive ? [
                  "text-amber-700 dark:text-amber-400",
                  "bg-amber-50 dark:bg-gray-700/50",
                ] : [
                  "text-gray-600 dark:text-gray-400",
                  "hover:text-amber-600 dark:hover:text-amber-400",
                  "hover:bg-gray-50 dark:hover:bg-gray-700/30"
                ]
              )}
            >
              <div className="flex items-center justify-center gap-2">
                {Icon && (
                  <Icon className={cn(
                    "h-4 w-4",
                    isActive ? "text-amber-600" : "text-gray-400"
                  )} />
                )}
                <span>{tab.label}</span>
              </div>
              
              {/* Active indicator */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
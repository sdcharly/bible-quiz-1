"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { adminTheme } from '../theme/colors';


interface Tab {
  id: string;
  label: string;
  icon?: React.ElementType;
  badge?: string | number;
  badgeVariant?: 'default' | 'danger' | 'warning' | 'success';
}

interface AdminTabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function AdminTabNavigation({ 
  tabs, 
  activeTab, 
  onTabChange,
  className 
}: AdminTabNavigationProps) {
  const badgeColors = {
    default: 'bg-gray-600 text-white',
    danger: 'bg-red-600 text-white',
    warning: 'bg-yellow-600 text-white',
    success: 'bg-green-600 text-white'
  };

  return (
    <div className={cn(
      "bg-white dark:bg-gray-800 rounded-lg border border-red-100 dark:border-gray-700 shadow-sm",
      className
    )}>
      <div className="flex overflow-x-auto">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex-1 min-w-fit px-6 py-3 text-sm font-medium transition-all relative group",
                index !== 0 && "border-l border-gray-200 dark:border-gray-700",
                isActive ? [
                  "text-red-700 dark:text-red-400",
                  "bg-red-50 dark:bg-red-900/20",
                ] : [
                  "text-gray-600 dark:text-gray-400",
                  "hover:text-red-600 dark:hover:text-red-400",
                  "hover:bg-gray-50 dark:hover:bg-gray-700/30"
                ]
              )}
            >
              <div className="flex items-center justify-center gap-2">
                {Icon && (
                  <Icon className={cn(
                    "h-4 w-4 transition-colors",
                    isActive ? "text-red-600" : "text-gray-400 group-hover:text-red-500"
                  )} />
                )}
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={cn(
                    "ml-2 px-2 py-0.5 text-xs font-medium rounded-full",
                    badgeColors[tab.badgeVariant || 'default']
                  )}>
                    {tab.badge}
                  </span>
                )}
              </div>
              
              {/* Active indicator */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
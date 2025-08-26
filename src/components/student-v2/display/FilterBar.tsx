"use client";

import { ReactNode } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";


interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  filterValue: string;
  onFilterChange: (value: string) => void;
  filterOptions: FilterOption[];
  searchPlaceholder?: string;
  className?: string;
  children?: ReactNode;
}

export function FilterBar({
  searchValue,
  onSearchChange,
  filterValue,
  onFilterChange,
  filterOptions,
  searchPlaceholder = "Search...",
  className,
  children
}: FilterBarProps) {
  return (
    <div className={cn(
      "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100 dark:border-amber-900/20 p-4",
      className
    )}>
      <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:gap-4">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-amber-600 dark:text-amber-400 pointer-events-none" />
          <Input
            type="search"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className={cn(
              "w-full pl-10 pr-4 h-11",
              "border-amber-200 dark:border-amber-800",
              "focus:border-amber-300 dark:focus:border-amber-700",
              "placeholder:text-gray-400 dark:placeholder:text-gray-500"
            )}
            autoComplete="off"
            inputMode="search"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {filterOptions.map((option) => (
            <Button
              key={option.value}
              variant={filterValue === option.value ? "default" : "outline"}
              onClick={() => onFilterChange(option.value)}
              className={cn(
                "min-w-[80px] h-11 text-sm sm:text-base whitespace-nowrap",
                filterValue === option.value
                  ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-600"
                  : "border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/20"
              )}
            >
              {option.label}
              {option.count !== undefined && (
                <span className="ml-1.5 text-xs">({option.count})</span>
              )}
            </Button>
          ))}
        </div>

        {/* Additional Actions Slot */}
        {children && (
          <div className="flex items-center gap-2">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
"use client";

import { LucideIcon } from "lucide-react";
import { type FC } from "react";
import { Card, CardHeader, CardDescription, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";


export interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  valueColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export const StatsCard: FC<StatsCardProps> = ({
  title,
  value,
  description,
  icon: Icon,
  iconColor = "text-amber-600",
  valueColor,
  trend,
  className
}) => {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardDescription>{title}</CardDescription>
        <CardTitle className={cn("text-2xl", valueColor)}>
          {value}
        </CardTitle>
      </CardHeader>
      {(Icon || description || trend) && (
        <CardContent>
          <div className="flex items-center justify-between">
            {Icon && (
              <Icon className={cn("h-8 w-8 opacity-50", iconColor)} />
            )}
            <div className="text-right">
              {description && (
                <p className="text-xs text-gray-500">{description}</p>
              )}
              {trend && (
                <p className={cn(
                  "text-xs font-medium",
                  trend.isPositive ? "text-green-600" : "text-red-600"
                )}>
                  {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
                </p>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
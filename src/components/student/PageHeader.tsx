"use client";

import { ArrowLeft, type LucideIcon } from "lucide-react";
import { type ReactNode, type FC } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";


export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  backText?: string;
  action?: {
    href?: string;
    onClick?: () => void;
    text: string;
    icon?: LucideIcon;
    variant?: "default" | "outline" | "ghost";
  };
  children?: ReactNode;
}

export const PageHeader: FC<PageHeaderProps> = ({
  title,
  subtitle,
  backHref = "/student/dashboard",
  backText = "Back to Dashboard",
  action,
  children
}) => {
  const ActionIcon = action?.icon;
  
  return (
    <div className="bg-white dark:bg-gray-800 shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {title}
            </h1>
            {subtitle && (
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {children}
            {action && (
              action.href ? (
                <Link href={action.href}>
                  <Button 
                    variant={action.variant || "default"}
                    className={action.variant === "outline" 
                      ? "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200" 
                      : action.variant !== "ghost" 
                      ? "bg-amber-600 hover:bg-amber-700 text-white" 
                      : ""
                    }
                  >
                    {ActionIcon && <ActionIcon className="h-4 w-4 mr-2" />}
                    {action.text}
                  </Button>
                </Link>
              ) : (
                <Button 
                  onClick={action.onClick}
                  variant={action.variant || "default"}
                  className={action.variant === "outline" 
                    ? "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200" 
                    : action.variant !== "ghost" 
                    ? "bg-amber-600 hover:bg-amber-700 text-white" 
                    : ""
                  }
                >
                  {ActionIcon && <ActionIcon className="h-4 w-4 mr-2" />}
                  {action.text}
                </Button>
              )
            )}
            {backHref && (
              <Link href={backHref}>
                <Button variant="outline" className="bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {backText}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
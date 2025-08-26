import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";


interface BiblicalLoaderProps {
  size?: "sm" | "md" | "lg" | "xl";
  text?: string;
  className?: string;
  inline?: boolean;
}

export function BiblicalLoader({ 
  size = "md", 
  text, 
  className,
  inline = false 
}: BiblicalLoaderProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
    xl: "h-12 w-12"
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-xl"
  };

  if (inline) {
    return (
      <span className={cn("inline-flex items-center", className)}>
        <Loader2 className={cn(
          sizeClasses[size],
          "animate-spin text-amber-600",
          text && "mr-2"
        )} />
        {text && (
          <span className={cn(
            textSizeClasses[size],
            "text-amber-700"
          )}>
            {text}
          </span>
        )}
      </span>
    );
  }

  return (
    <div className={cn(
      "flex flex-col items-center justify-center",
      className
    )}>
      <Loader2 className={cn(
        sizeClasses[size],
        "animate-spin text-amber-600"
      )} />
      {text && (
        <p className={cn(
          "mt-2 text-amber-700",
          textSizeClasses[size]
        )}>
          {text}
        </p>
      )}
    </div>
  );
}

// Full page loader with biblical theme
export function BiblicalPageLoader({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
      <BiblicalLoader size="xl" text={text} />
    </div>
  );
}

// Loading card placeholder with biblical theme
export function BiblicalLoadingCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 animate-pulse">
      <div className="h-4 bg-amber-200 dark:bg-amber-900/30 rounded w-3/4 mb-4"></div>
      <div className="h-3 bg-amber-100 dark:bg-amber-900/20 rounded w-full mb-2"></div>
      <div className="h-3 bg-amber-100 dark:bg-amber-900/20 rounded w-5/6"></div>
    </div>
  );
}
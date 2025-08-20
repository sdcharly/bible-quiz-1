import * as React from "react"
import { cn } from "@/lib/utils"

export interface LoadingProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "page" | "card"
  message?: string
}

const Loading = React.forwardRef<HTMLDivElement, LoadingProps>(
  ({ className, variant = "default", message, ...props }, ref) => {
    if (variant === "page") {
      return (
        <div
          ref={ref}
          className={cn(
            "flex flex-col items-center justify-center min-h-[400px] p-8",
            className
          )}
          {...props}
        >
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-200 rounded-full" />
            <div className="absolute top-0 w-16 h-16 border-4 border-primary rounded-full border-t-transparent animate-spin" />
          </div>
          {message && (
            <>
              <p className="mt-4 text-gray-600 font-medium text-center">
                {message}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                This won&apos;t take long! 🚀
              </p>
            </>
          )}
        </div>
      )
    }

    if (variant === "card") {
      return (
        <div
          ref={ref}
          className={cn(
            "bg-white rounded-2xl p-6 animate-pulse",
            className
          )}
          {...props}
        >
          <div className="h-6 bg-gray-200 rounded-full w-24 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
          <div className="flex gap-2">
            <div className="h-8 bg-gray-200 rounded-lg flex-1" />
            <div className="h-8 bg-gray-200 rounded-lg flex-1" />
          </div>
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center gap-2",
          className
        )}
        {...props}
      >
        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        {message && (
          <span className="text-sm text-muted-foreground">{message}</span>
        )}
      </div>
    )
  }
)
Loading.displayName = "Loading"

export { Loading }
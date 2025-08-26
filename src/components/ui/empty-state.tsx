import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "./button"


export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: string | React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon, title, description, action, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center text-center py-12 px-6",
          className
        )}
        {...props}
      >
        {icon && (
          <div className="text-6xl mb-4">
            {typeof icon === "string" ? icon : icon}
          </div>
        )}
        <h3 className="text-xl font-semibold text-gray-900 mb-2 font-heading">
          {title}
        </h3>
        {description && (
          <p className="text-gray-600 mb-6 max-w-sm mx-auto">
            {description}
          </p>
        )}
        {action && (
          <Button onClick={action.onClick} size="default">
            {action.label}
          </Button>
        )}
      </div>
    )
  }
)
EmptyState.displayName = "EmptyState"

export { EmptyState }
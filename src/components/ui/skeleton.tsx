import type React from "react"
import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-amber-200/50 dark:bg-amber-900/20 animate-pulse rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton }

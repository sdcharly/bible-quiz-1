import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"


const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-heading font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-4 focus-visible:ring-primary/20 transform hover:scale-[1.02] active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-primary to-primary-600 text-primary-foreground shadow-md hover:shadow-lg rounded-lg",
        destructive:
          "bg-destructive text-white shadow-md hover:bg-destructive/90 hover:shadow-lg rounded-lg",
        outline:
          "border-2 border-border bg-background hover:border-primary hover:text-primary rounded-lg",
        secondary:
          "bg-secondary text-secondary-foreground shadow-md hover:bg-secondary/90 hover:shadow-lg rounded-lg",
        ghost:
          "hover:bg-primary-50 hover:text-primary rounded-lg",
        link: "text-primary underline-offset-4 hover:underline",
        gradient:
          "bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-md hover:shadow-lg rounded-lg",
      },
      size: {
        default: "min-h-[44px] px-6 py-3 text-base",
        sm: "min-h-[36px] px-4 py-2 text-sm rounded-md",
        lg: "min-h-[52px] px-8 py-4 text-lg rounded-lg",
        icon: "size-11 rounded-lg",
        mobile: "min-h-[56px] px-8 py-4 text-base rounded-xl w-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)]/35 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border border-[var(--brand-color,#e35336)]/25 bg-[rgba(var(--brand-color-rgb,227,83,54),0.9)] text-white shadow-sm hover:bg-[rgba(var(--brand-color-rgb,227,83,54),0.82)] hover:shadow-lg hover:shadow-[var(--brand-color,#e35336)]/20",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-[rgba(var(--brand-color-rgb,227,83,54),0.22)] bg-[rgba(var(--brand-color-rgb,227,83,54),0.14)] text-sm font-semibold text-[var(--brand-color,#e35336)] shadow-sm hover:bg-[rgba(var(--brand-color-rgb,227,83,54),0.2)] hover:text-[var(--brand-color,#e35336)]",
        secondary:
          "border border-slate-200 bg-slate-100 text-slate-700 shadow-sm hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
        ghost:
          "text-[var(--brand-color,#e35336)] hover:bg-[rgba(var(--brand-color-rgb,227,83,54),0.14)] hover:text-[var(--brand-color,#e35336)]",
        link: "font-semibold text-[var(--brand-color,#e35336)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

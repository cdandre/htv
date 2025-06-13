import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center px-2 py-0.5 text-xs font-medium uppercase tracking-wider transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default:
          "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
        secondary:
          "bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
        destructive:
          "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400",
        outline: "border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300",
        success: "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400",
        warning: "bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
        info: "bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-black text-white rounded-2xl shadow-lg shadow-black/25 hover:bg-gray-900 hover:shadow-xl hover:shadow-black/30 hover:scale-[1.02] dark:bg-white dark:text-black dark:shadow-white/25 dark:hover:bg-gray-100 dark:hover:shadow-white/30",
        destructive: "bg-red-600 text-white rounded-2xl shadow-lg shadow-red-600/25 hover:bg-red-700 hover:shadow-xl hover:shadow-red-600/30 hover:scale-[1.02]",
        outline: "border-2 border-gray-300/60 bg-white/90 backdrop-blur-sm text-black rounded-2xl shadow-sm hover:bg-gray-50 hover:border-gray-400 hover:shadow-md hover:scale-[1.02] dark:border-gray-600/60 dark:bg-gray-900/90 dark:text-white dark:hover:bg-gray-800 dark:hover:border-gray-500",
        secondary: "bg-white text-black rounded-2xl shadow-sm border border-gray-200 hover:bg-gray-50 hover:shadow-md hover:scale-[1.02] dark:bg-gray-900 dark:text-white dark:border-gray-700 dark:hover:bg-gray-800",
        ghost: "text-black rounded-2xl hover:bg-gray-100 hover:text-black hover:scale-[1.02] dark:text-white dark:hover:bg-gray-800 dark:hover:text-white",
        link: "text-black underline-offset-4 hover:underline hover:text-gray-800 dark:text-white dark:hover:text-gray-200",
        primary: "bg-black text-white rounded-2xl shadow-lg shadow-black/25 hover:bg-gray-900 hover:shadow-xl hover:shadow-black/30 hover:scale-[1.02] dark:bg-white dark:text-black dark:shadow-white/25 dark:hover:bg-gray-100 dark:hover:shadow-white/30",
        dark: "bg-black text-white rounded-2xl shadow-lg shadow-black/25 hover:bg-gray-900 hover:shadow-xl hover:shadow-black/30 hover:scale-[1.02]",
      },
      size: {
        default: "h-12 sm:h-11 px-6 py-3 text-base sm:text-sm",
        sm: "h-10 sm:h-9 px-4 py-2 text-sm rounded-xl",
        lg: "h-14 sm:h-14 px-8 py-4 text-base sm:text-base rounded-2xl",
        xl: "h-16 sm:h-16 px-10 py-5 text-lg sm:text-lg rounded-2xl",
        icon: "h-12 w-12 sm:h-11 sm:w-11 rounded-2xl",
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
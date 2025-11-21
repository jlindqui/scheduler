import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    "inline-flex",
    "items-center",
    "justify-center",
    "gap-2",
    "whitespace-nowrap",
    "rounded-md",
    "text-sm",
    "font-medium",
    "transition-colors",
    "focus-visible:outline-none",
    "focus-visible:ring-1",
    "focus-visible:ring-ring",
    "disabled:pointer-events-none",
    "disabled:opacity-50",
    "[&_svg]:pointer-events-none",
    "[&_svg]:size-4",
    "[&_svg]:shrink-0"
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-slate-700",
          "text-white",
          "shadow",
          "hover:bg-slate-800",
          "focus-visible:ring-slate-600"
        ].join(" "),
        destructive: [
          "bg-red-600",
          "text-white",
          "shadow-sm",
          "hover:bg-red-700",
          "focus-visible:ring-red-500"
        ].join(" "),
        outline: [
          "border",
          "border-slate-200",
          "bg-white",
          "text-slate-700",
          "shadow-sm",
          "hover:bg-slate-50",
          "hover:text-slate-900",
          "focus-visible:ring-slate-500"
        ].join(" "),
        secondary: [
          "bg-slate-100",
          "text-slate-700",
          "shadow-sm",
          "hover:bg-slate-200",
          "focus-visible:ring-slate-500"
        ].join(" "),
        ghost: [
          "text-slate-700",
          "hover:bg-slate-100",
          "hover:text-slate-900",
          "focus-visible:ring-slate-500"
        ].join(" "),
        link: [
          "text-slate-700",
          "underline-offset-4",
          "hover:underline",
          "hover:text-slate-900"
        ].join(" "),
        success: [
          "bg-emerald-600",
          "text-white",
          "shadow",
          "hover:bg-emerald-700",
          "focus-visible:ring-emerald-500"
        ].join(" "),
        warning: [
          "bg-amber-500",
          "text-white",
          "shadow",
          "hover:bg-amber-600",
          "focus-visible:ring-amber-400"
        ].join(" ")
      },
      size: {
        default: ["h-9", "px-4", "py-2"].join(" "),
        sm: ["h-8", "rounded-md", "px-3", "text-xs"].join(" "),
        lg: ["h-10", "rounded-md", "px-8"].join(" "),
        xl: ["h-12", "rounded-md", "px-10", "text-base"].join(" "),
        icon: ["h-9", "w-9"].join(" ")
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
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
    const variantClasses = buttonVariants({ variant, size })
    
    return (
      <Comp
        className={cn(variantClasses, className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

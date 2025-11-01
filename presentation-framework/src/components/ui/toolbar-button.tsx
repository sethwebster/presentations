"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Button, type ButtonProps } from "./button"

const ToolbarButton = React.forwardRef<HTMLButtonElement, ButtonProps & { pressed?: boolean }>(
  ({ className, pressed = false, variant = "ghost", size = "icon", type = "button", ...props }, ref) => (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      type={type}
      data-state={pressed ? "on" : "off"}
      className={cn(
        "h-9 w-9 rounded-lg border border-transparent text-muted-foreground transition-colors data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
)
ToolbarButton.displayName = "ToolbarButton"

export { ToolbarButton }



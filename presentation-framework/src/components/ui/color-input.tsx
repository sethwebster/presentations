import * as React from "react"

import { cn } from "@/lib/utils"

const ColorInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    type="color"
    className={cn(
      "h-10 w-full cursor-pointer rounded-lg border border-border/20 bg-card/95 p-1 shadow-[inset_0_1px_4px_rgba(11,16,34,0.08)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--editor-accent,theme(colors.primary.DEFAULT))]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background backdrop-blur supports-[backdrop-filter]:bg-card/70",
      "dark:bg-muted/60 dark:border-border/25",
      className
    )}
    {...props}
  />
))
ColorInput.displayName = "ColorInput"

export { ColorInput }




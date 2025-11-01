import * as React from "react"

import { cn } from "@/lib/utils"

const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between rounded-lg border border-border/20 bg-card/95 px-3 text-sm text-foreground shadow-[0_6px_18px_rgba(11,16,34,0.08)] transition-colors backdrop-blur supports-[backdrop-filter]:bg-card/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--editor-accent,theme(colors.primary.DEFAULT))]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60",
      "dark:bg-muted/60 dark:border-border/25",
      className
    )}
    {...props}
  />
))
Select.displayName = "Select"

export { Select }




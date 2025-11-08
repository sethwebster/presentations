import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-xl border bg-card/98 px-3 py-2 text-base text-foreground shadow-[0_8px_24px_rgba(11,16,34,0.08)] transition-colors backdrop-blur-sm supports-[backdrop-filter]:bg-card/85 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--editor-accent,theme(colors.primary.DEFAULT))]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60 dark:bg-muted/70",
          className
        )}
        style={{
          borderColor: 'rgba(148, 163, 184, 0.3)',
          ...(props.style || {}),
        }}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }

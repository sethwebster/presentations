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
      "h-10 w-full cursor-pointer rounded-xl border bg-card/98 p-1 shadow-[inset_0_1px_2px_rgba(11,16,34,0.08)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--editor-accent,theme(colors.primary.DEFAULT))]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background backdrop-blur-sm supports-[backdrop-filter]:bg-card/85",
      "dark:bg-muted/70",
      className
    )}
    style={{
      borderColor: 'rgba(148, 163, 184, 0.3)',
      ...(props.style || {}),
    }}
    {...props}
  />
))
ColorInput.displayName = "ColorInput"

export { ColorInput }




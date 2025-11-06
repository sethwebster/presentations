"use client"

import * as React from "react"
import * as TogglePrimitive from "@radix-ui/react-toggle"

import { cn } from "@/lib/utils"

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root>
>(({ className, pressed, ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    pressed={pressed}
    className={cn(
      "inline-flex items-center justify-center rounded-md border bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--editor-accent,theme(colors.primary.DEFAULT))] focus-visible:ring-offset-2 data-[state=on]:border-[var(--editor-accent,theme(colors.primary.DEFAULT))]/60 data-[state=on]:bg-[var(--editor-accent,theme(colors.primary.DEFAULT))]/12 data-[state=on]:text-[var(--editor-accent-strong,theme(colors.primary.DEFAULT))] disabled:pointer-events-none disabled:opacity-60",
      className
    )}
    style={{
      borderColor: 'rgba(148, 163, 184, 0.3)',
      ...(props.style || {}),
    }}
    {...props}
  />
))
Toggle.displayName = TogglePrimitive.Root.displayName

export { Toggle }



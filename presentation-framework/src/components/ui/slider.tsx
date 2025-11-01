"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-6 w-full">
        <span className="pointer-events-none absolute left-0 right-0 top-1/2 block h-px -translate-y-1/2 bg-border/35" />
        <SliderPrimitive.Range className="pointer-events-none absolute left-0 top-1/2 h-px -translate-y-1/2 bg-[var(--editor-accent,theme(colors.primary.DEFAULT))]" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-4 w-4 -translate-y-1/2 rounded-full border border-border/25 bg-card/95 shadow-[0_8px_20px_rgba(11,16,34,0.22)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--editor-accent,theme(colors.primary.DEFAULT))]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 backdrop-blur supports-[backdrop-filter]:bg-card/70" />
    </SliderPrimitive.Root>
  )
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }



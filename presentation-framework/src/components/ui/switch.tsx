"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

type SwitchProps = React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> & {
  "data-switch-on-color"?: string
}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(({ className, style, ...props }, ref) => (
  <SwitchPrimitives.Root
    ref={ref}
    style={{
      "--switch-on-color": props["data-switch-on-color"] ?? "var(--editor-accent,theme(colors.primary.DEFAULT))",
      ...(style as React.CSSProperties),
    }}
    className={cn(
      "relative group inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-card/92 shadow-[inset_0_1px_3px_rgba(11,16,34,0.18),0_10px_28px_rgba(11,16,34,0.08)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--editor-accent,theme(colors.primary.DEFAULT))] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 group-data-[state=checked]:shadow-[inset_0_1px_3px_rgba(11,16,34,0.22),0_12px_30px_rgba(22,194,199,0.22)]",
      className
    )}
    {...props}
  >
    <span
      className="pointer-events-none absolute left-1 top-1 h-4 w-[calc(100%-0.5rem)] origin-left scale-x-0 rounded-full bg-[color:var(--switch-on-color)] opacity-0 transition-all duration-200 ease-out group-data-[state=checked]:scale-x-100 group-data-[state=checked]:opacity-100"
    />
    <SwitchPrimitives.Thumb className="pointer-events-none relative z-[1] block h-5 w-5 translate-x-0 rounded-full bg-gradient-to-b from-white to-[#f3f5f8] shadow-[0_4px_12px_rgba(11,16,34,0.18)] transition-transform data-[state=checked]:translate-x-5 data-[state=checked]:shadow-[0_4px_14px_rgba(22,194,199,0.28)]" />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }



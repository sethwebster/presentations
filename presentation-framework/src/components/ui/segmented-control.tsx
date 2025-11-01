"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface SegmentedControlItem {
  value: string
  label: React.ReactNode
  tooltip?: string
}

export interface SegmentedControlProps {
  items: SegmentedControlItem[]
  value: string
  onValueChange(value: string): void
  className?: string
  variant?: "default" | "editor"
}

const SegmentedControl = React.forwardRef<HTMLDivElement, SegmentedControlProps>((props, ref) => {
    const { items, onValueChange, className, variant = "default" } = props
    const activeValue = props.value
    const isEditor = variant === "editor"
    
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex h-10 items-center justify-center rounded-xl border bg-card/96 p-1 shadow-[0_10px_28px_rgba(11,16,34,0.09)] backdrop-blur-sm supports-[backdrop-filter]:bg-card/85",
          !isEditor && "text-muted-foreground",
          className
        )}
        style={{
          borderColor: 'rgba(148, 163, 184, 0.3)',
        }}
        role="tablist"
      >
        {items.map((item) => {
          const isSelected = item.value === activeValue
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={isSelected}
              title={typeof item.label === "string" ? item.label : item.tooltip}
              onClick={() => onValueChange(item.value)}
              className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ring-offset-background disabled:pointer-events-none disabled:opacity-50",
                isSelected
                  ? "text-white shadow-[0_6px_18px_rgba(22,194,199,0.15)]"
                  : "text-muted-foreground hover:text-foreground/80",
                "focus-visible:ring-[var(--editor-accent,theme(colors.primary.DEFAULT))]/45"
              )}
              style={{
                border: 'none',
                ...(isSelected ? { backgroundColor: 'var(--lume-primary, #16C2C7)' } : {}),
              }}
            >
              {item.label}
            </button>
          )
        })}
      </div>
    )
  }
)
SegmentedControl.displayName = "SegmentedControl"

export { SegmentedControl }


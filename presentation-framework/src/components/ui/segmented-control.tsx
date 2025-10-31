"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface SegmentedControlItem {
  value: string
  label: string
}

export interface SegmentedControlProps {
  items: SegmentedControlItem[]
  value: string
  onValueChange: (value: string) => void
  className?: string
  variant?: "default" | "editor"
}

const SegmentedControl = React.forwardRef<HTMLDivElement, SegmentedControlProps>(
  ({ items, value, onValueChange, className, variant = "default" }, ref) => {
    const isEditor = variant === "editor"
    
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex h-10 items-center justify-center rounded-lg p-1",
          isEditor
            ? "bg-[var(--editor-surface)] border border-[var(--editor-border)]"
            : "bg-muted text-muted-foreground",
          className
        )}
        role="tablist"
      >
        {items.map((item) => {
          const isSelected = item.value === value
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => onValueChange(item.value)}
              className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                isEditor
                  ? isSelected
                    ? "bg-[var(--editor-accent)] text-white shadow-sm"
                    : "text-[var(--editor-text-muted)] hover:text-[var(--editor-text-strong)]"
                  : isSelected
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                isEditor
                  ? "focus-visible:ring-[var(--editor-accent)]"
                  : "focus-visible:ring-ring"
              )}
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


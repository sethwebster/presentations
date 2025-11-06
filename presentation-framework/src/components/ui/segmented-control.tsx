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
    const isFullWidth = className?.includes('w-full') ?? false
    
    const containerRef = React.useRef<HTMLDivElement>(null)
    const [indicatorStyle, setIndicatorStyle] = React.useState<React.CSSProperties>({
      position: 'absolute',
      left: 0,
      top: 0,
      width: 0,
      height: '100%',
      backgroundColor: 'var(--lume-primary, #16C2C7)',
      borderRadius: '0.375rem',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      zIndex: 0,
    })
    const [isInitialized, setIsInitialized] = React.useState(false)
    
    // Update indicator position when active value changes
    React.useLayoutEffect(() => {
      if (!containerRef.current) return
      
      const activeButton = containerRef.current.querySelector(
        `[data-segment-value="${activeValue}"]`
      ) as HTMLElement
      
      if (!activeButton) {
        setIsInitialized(false)
        return
      }
      
      const containerRect = containerRef.current.getBoundingClientRect()
      const buttonRect = activeButton.getBoundingClientRect()
      const containerPadding = 6 // p-1.5 = 0.375rem = 6px
      
      setIndicatorStyle({
        position: 'absolute',
        left: `${buttonRect.left - containerRect.left}px`,
        top: `${containerPadding}px`,
        width: `${buttonRect.width}px`,
        height: `calc(100% - ${containerPadding * 2}px)`,
        backgroundColor: 'var(--lume-primary, #16C2C7)',
        borderRadius: '0.375rem',
        transition: isInitialized 
          ? 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' 
          : 'none',
        zIndex: 0,
      })
      
      if (!isInitialized) {
        // Use requestAnimationFrame to ensure initial position is set without animation
        requestAnimationFrame(() => {
          setIsInitialized(true)
        })
      }
    }, [activeValue, isInitialized])
    
    return (
      <div
        ref={(node) => {
          if (typeof ref === 'function') {
            ref(node)
          } else if (ref) {
            ref.current = node
          }
          containerRef.current = node
        }}
        className={cn(
          "relative h-10 items-center justify-center rounded-xl border bg-card/96 p-1.5 shadow-[0_10px_28px_rgba(11,16,34,0.09)] backdrop-blur-sm supports-[backdrop-filter]:bg-card/85",
          isFullWidth ? 'flex w-full' : 'inline-flex',
          !isEditor && "text-muted-foreground",
          className
        )}
        style={{
          borderColor: 'rgba(148, 163, 184, 0.3)',
        }}
        role="tablist"
      >
        {/* Animated sliding indicator */}
        <div style={indicatorStyle} />
        
        {items.map((item) => {
          const isSelected = item.value === activeValue
          return (
            <button
              key={item.value}
              data-segment-value={item.value}
              type="button"
              role="tab"
              aria-selected={isSelected}
              title={typeof item.label === "string" ? item.label : item.tooltip}
              onClick={() => onValueChange(item.value)}
              className={cn(
                "relative z-10 items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ring-offset-background disabled:pointer-events-none disabled:opacity-50",
                isFullWidth ? 'flex flex-1' : 'inline-flex',
                isSelected
                  ? "text-white shadow-[0_6px_18px_rgba(22,194,199,0.15)]"
                  : "text-muted-foreground hover:text-foreground/80",
                "focus-visible:ring-[var(--editor-accent,theme(colors.primary.DEFAULT))]/45"
              )}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
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


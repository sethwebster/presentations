import * as React from "react"

import { cn } from "@/lib/utils"

const Panel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-border/20 bg-card/90 text-card-foreground shadow-[0_18px_48px_rgba(11,16,34,0.12)] ring-1 ring-border/10 backdrop-blur-md supports-[backdrop-filter]:bg-card/75",
        className
      )}
      {...props}
    />
  )
)
Panel.displayName = "Panel"

const PanelHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-between border-b border-border/15 bg-card/60 px-5 py-4 backdrop-blur-sm supports-[backdrop-filter]:bg-card/40",
        className
      )}
      {...props}
    />
  )
)
PanelHeader.displayName = "PanelHeader"

const PanelTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm font-semibold tracking-tight", className)}
      {...props}
    />
  )
)
PanelTitle.displayName = "PanelTitle"

const PanelDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  )
)
PanelDescription.displayName = "PanelDescription"

const PanelBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex-1 overflow-y-auto px-5 py-4", className)}
      {...props}
    />
  )
)
PanelBody.displayName = "PanelBody"

export { Panel, PanelHeader, PanelBody, PanelTitle, PanelDescription }




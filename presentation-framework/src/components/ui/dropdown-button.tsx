"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "./button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "./dropdown-menu";

interface DropdownItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  separator?: boolean;
}

interface DropdownButtonProps extends Omit<ButtonProps, "onClick"> {
  mainButton: {
    title: string;
    icon?: React.ReactNode;
    onClick: () => void;
  };
  dropdownItems: DropdownItem[];
}

export const DropdownButton = React.forwardRef<HTMLDivElement, DropdownButtonProps>(
  ({ mainButton, dropdownItems, variant = "ghost", size = "icon", className, ...props }, ref) => {
    const [open, setOpen] = React.useState(false);

    return (
      <div
        ref={ref}
        className={cn("inline-flex items-center rounded-md", className)}
        style={{
          // Soft gray border around the entire unit
          border: "1px solid rgba(148, 163, 184, 0.25)",
          borderRadius: "6px",
          overflow: "hidden",
          backgroundColor: variant === "ghost" ? "transparent" : undefined,
          verticalAlign: "middle",
          display: "inline-flex",
          position: "relative",
          width: "fit-content", // Ensure container fits content
        }}
      >
        {/* Main Button */}
        <Button
          variant={variant}
          size={size}
          onClick={mainButton.onClick}
          title={mainButton.title}
          className={cn(
            "rounded-r-none rounded-l-md border-0",
            // Remove all borders from button - handled by wrapper
            "border-r-0",
            // Remove focus ring
            "focus-visible:ring-0 focus-visible:outline-none"
          )}
          style={{
            borderRight: "none",
            ...props.style,
          }}
          {...props}
        >
          {mainButton.icon}
        </Button>

        {/* Divider between buttons */}
        <div
          className="w-px h-full"
          style={{
            backgroundColor: "rgba(148, 163, 184, 0.3)",
            flexShrink: 0,
          }}
        />

        {/* Dropdown Trigger */}
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant={variant}
              size={size}
              className={cn(
                "rounded-l-none rounded-r-md border-0 h-full",
                // Remove all borders from button - handled by wrapper
                "border-l-0",
                // Triangle icon container - 20px
                "w-[20px] min-w-[20px] max-w-[20px] flex items-center justify-center flex-shrink-0",
                // Remove focus ring
                "focus-visible:ring-0 focus-visible:outline-none"
              )}
              title="More options"
            >
              {/* Triangle icon - 20px */}
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5"
                style={{ width: "20px", height: "20px" }}
              >
                <path d="M12 15L6 9h12z" />
              </svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={4}>
            {dropdownItems.map((item, index) => (
              <React.Fragment key={index}>
                {item.separator && index > 0 && (
                  <div className="h-px my-1 bg-border/30" />
                )}
                <DropdownMenuItem
                  onClick={() => {
                    item.onClick();
                    setOpen(false);
                  }}
                  className="flex items-center gap-2"
                >
                  {item.icon && <span className="flex items-center justify-center w-4 h-4">{item.icon}</span>}
                  <span>{item.label}</span>
                </DropdownMenuItem>
              </React.Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }
);

DropdownButton.displayName = "DropdownButton";

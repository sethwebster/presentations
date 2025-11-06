"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"

interface QualitySliderProps {
  value: number[];
  onValueChange: (value: number[]) => void;
  options: string[];
  className?: string;
}

export function QualitySlider({ value, onValueChange, options, className }: QualitySliderProps) {
  const maxValue = options.length - 1;
  const currentValue = value[0] ?? 0;

  return (
    <div className={cn("w-full", className)}>
      {/* Slider with tick marks */}
      <div className="relative px-2">
        <SliderPrimitive.Root
          value={value}
          onValueChange={onValueChange}
          min={0}
          max={maxValue}
          step={1}
          className="relative flex w-full touch-none select-none items-center"
        >
          <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-700/60">
            <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-primary/80 via-sky-400/60 to-primary/80 transition-all duration-300" />
          </SliderPrimitive.Track>

          {/* Tick marks */}
          {options.map((_, index) => {
            const position = (index / maxValue) * 100;
            const isActive = index <= currentValue;
            return (
              <div
                key={index}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none"
                style={{ left: `${position}%` }}
              >
                <div
                  className={cn(
                    "w-2 h-2 rounded-full border-2 transition-all duration-300",
                    isActive
                      ? "bg-primary border-white dark:border-slate-900 scale-100"
                      : "bg-slate-300 dark:bg-slate-600 border-slate-400 dark:border-slate-500 scale-75"
                  )}
                />
              </div>
            );
          })}

          <SliderPrimitive.Thumb
            className={cn(
              "block h-5 w-5 rounded-full border-2 border-white bg-primary shadow-[0_6px_16px_rgba(20,102,230,0.35)]",
              "backdrop-blur-sm",
              "transition-all duration-300 ease-out",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
              "disabled:pointer-events-none disabled:opacity-60",
              "hover:scale-110 active:scale-105",
              "dark:border-slate-900"
            )}
          />
        </SliderPrimitive.Root>
      </div>

      {/* Labels aligned with tick marks */}
      <div className="relative mt-3 px-2 h-6">
        {options.map((label, index) => {
          const position = (index / maxValue) * 100;
          const isActive = index === currentValue;
          const isFirst = index === 0;
          const isLast = index === maxValue;

          return (
            <span
              key={index}
              className={cn(
                "absolute top-0 text-xs transition-all duration-300 select-none whitespace-nowrap",
                !isFirst && !isLast && "-translate-x-1/2",
                isActive
                  ? "text-primary font-medium scale-105"
                  : "text-muted-foreground"
              )}
              style={{
                left: isFirst ? '0%' : isLast ? 'auto' : `${position}%`,
                right: isLast ? '0%' : 'auto',
              }}
            >
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

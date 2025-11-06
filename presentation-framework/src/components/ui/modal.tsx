"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

type ModalSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
type ModalTone = "neutral" | "brand" | "emerald" | "violet" | "amber";

const sizeClasses: Record<ModalSize, string> = {
  xs: "max-w-xs",
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
};

const toneDecorations: Record<ModalTone, string> = {
  neutral:
    "before:pointer-events-none before:absolute before:inset-x-10 before:-top-28 before:h-48 before:rounded-full before:bg-white/20 before:opacity-70 before:blur-[80px] before:content-[''] dark:before:bg-white/12",
  brand:
    "before:pointer-events-none before:absolute before:inset-x-10 before:-top-32 before:h-60 before:rounded-full before:bg-gradient-to-br before:from-sky-400/35 before:via-indigo-500/20 before:to-fuchsia-500/30 before:opacity-80 before:blur-[90px] before:content-[''] dark:before:opacity-65",
  emerald:
    "before:pointer-events-none before:absolute before:inset-x-10 before:-top-32 before:h-60 before:rounded-full before:bg-gradient-to-br before:from-emerald-400/35 before:via-teal-500/18 before:to-lime-400/26 before:opacity-80 before:blur-[90px] before:content-[''] dark:before:opacity-65",
  violet:
    "before:pointer-events-none before:absolute before:inset-x-10 before:-top-32 before:h-60 before:rounded-full before:bg-gradient-to-br before:from-violet-400/35 before:via-fuchsia-500/20 before:to-blue-500/22 before:opacity-80 before:blur-[90px] before:content-[''] dark:before:opacity-70",
  amber:
    "before:pointer-events-none before:absolute before:inset-x-10 before:-top-32 before:h-60 before:rounded-full before:bg-gradient-to-br before:from-amber-400/35 before:via-orange-500/20 before:to-yellow-400/26 before:opacity-80 before:blur-[90px] before:content-[''] dark:before:opacity-70",
};

const glowDecorations =
  "after:pointer-events-none after:absolute after:inset-x-10 after:-bottom-36 after:h-56 after:rounded-full after:bg-gradient-to-t after:from-black/8 after:via-white/8 after:to-transparent after:blur-[90px] after:content-[''] dark:after:from-white/6";

const CloseIcon = () => (
  <svg viewBox="0 0 15 15" className="h-4 w-4" aria-hidden="true">
    <path
      d="M11.78 4.03c.22-.22.22-.58 0-.8a.57.57 0 0 0-.81 0L7.5 6.7 4.03 3.22a.57.57 0 0 0-.8.81L6.7 7.5l-3.47 3.47a.57.57 0 1 0 .8.81L7.5 8.3l3.47 3.48a.57.57 0 1 0 .81-.81L8.3 7.5l3.48-3.47Z"
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
    />
  </svg>
);

const ModalOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-40 bg-black/35 backdrop-blur-lg transition-all data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
      className
    )}
    {...props}
  />
));
ModalOverlay.displayName = "ModalOverlay";

interface ModalContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  size?: ModalSize;
  tone?: ModalTone;
  hideCloseButton?: boolean;
  glass?: boolean;
}

const ModalContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  ModalContentProps
>(({ className, children, size = "lg", tone = "brand", hideCloseButton, glass = false, ...props }, ref) => (
  <DialogPrimitive.Content
    ref={ref}
    className={cn(
      "group/modal pointer-events-auto fixed left-1/2 top-1/2 z-50 mx-auto w-[calc(100%-1.5rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[26px] border border-black/6 bg-white p-8 text-slate-900 shadow-[0_40px_120px_-40px_rgba(15,23,42,0.45)] transition-all duration-300 ease-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 dark:border-white/12 dark:bg-slate-950 dark:text-slate-50",
      glass ? "supports-[backdrop-filter]:bg-white/95 dark:supports-[backdrop-filter]:bg-slate-950/92" : "",
      sizeClasses[size],
      toneDecorations[tone],
      glowDecorations,
      className
    )}
    {...props}
  >
    {!hideCloseButton && (
      <DialogPrimitive.Close className="absolute right-6 top-6 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/90 text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:scale-105 hover:bg-white hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-white/15 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-900">
        <span className="sr-only">Close</span>
        <CloseIcon />
      </DialogPrimitive.Close>
    )}
    <div className="relative flex flex-col gap-8">
      {children}
    </div>
  </DialogPrimitive.Content>
));
ModalContent.displayName = "ModalContent";

const ModalHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col gap-2 border-b border-black/5 bg-white pb-6 text-left text-slate-900 dark:border-white/10 dark:bg-transparent dark:text-slate-50",
      className
    )}
    {...props}
  />
);
ModalHeader.displayName = "ModalHeader";

const ModalTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50",
      className
    )}
    {...props}
  />
));
ModalTitle.displayName = "ModalTitle";

const ModalDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn(
      "text-base text-slate-600 dark:text-slate-300",
      className
    )}
    {...props}
  />
));
ModalDescription.displayName = "ModalDescription";

const ModalBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "max-h-[calc(80vh-220px)] overflow-y-auto space-y-6 bg-white py-6 pr-1 text-slate-600 dark:bg-transparent dark:text-slate-300",
      className
    )}
    {...props}
  />
);
ModalBody.displayName = "ModalBody";

const ModalFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse gap-3 border-t border-black/5 bg-white pt-4 sm:flex-row sm:items-center sm:justify-end dark:border-white/10 dark:bg-transparent",
      className
    )}
    {...props}
  />
);
ModalFooter.displayName = "ModalFooter";

const ModalHero = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "relative -mx-4 -mt-4 overflow-hidden rounded-[24px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-inner sm:-mx-6",
      "after:absolute after:bottom-0 after:left-1/2 after:h-40 after:w-[120%] after:-translate-x-1/2 after:rounded-full after:bg-gradient-to-t after:from-white/20 after:to-transparent after:opacity-60 after:blur-3xl after:content-['']",
      className
    )}
    {...props}
  />
);
ModalHero.displayName = "ModalHero";

const ModalSection = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("rounded-2xl border border-white/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5", className)}
    {...props}
  />
);
ModalSection.displayName = "ModalSection";

interface ModalRootProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: ModalSize;
  tone?: ModalTone;
  hideCloseButton?: boolean;
  glass?: boolean;
  contentClassName?: string;
  overlayClassName?: string;
  className?: string;
}

function ModalRoot({
  open,
  onClose,
  children,
  size = "lg",
  tone = "brand",
  hideCloseButton,
  glass,
  contentClassName,
  overlayClassName,
  className,
}: ModalRootProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        onClose();
      }
    }}>
      <DialogPrimitive.Portal>
        <ModalOverlay className={overlayClassName} />
        <ModalContent
          size={size}
          tone={tone}
          hideCloseButton={hideCloseButton}
          glass={glass}
          className={className ? cn(className, contentClassName) : contentClassName}
        >
          {children}
        </ModalContent>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

const ModalTrigger = DialogPrimitive.Trigger;
const ModalClose = DialogPrimitive.Close;

export const Modal = Object.assign(ModalRoot, {
  Trigger: ModalTrigger,
  Close: ModalClose,
  Content: ModalContent,
  Overlay: ModalOverlay,
  Header: ModalHeader,
  Title: ModalTitle,
  Description: ModalDescription,
  Body: ModalBody,
  Footer: ModalFooter,
  Hero: ModalHero,
  Section: ModalSection,
});

export type { ModalSize, ModalTone };
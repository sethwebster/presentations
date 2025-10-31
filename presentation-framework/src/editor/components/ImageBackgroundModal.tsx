"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";

type ImageMode = "background" | "element";

interface ImageBackgroundModalProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (prompt: string, mode: ImageMode) => Promise<void>;
  onUpload: (mode: ImageMode) => void;
  status?: {
    isGenerating: boolean;
    error?: string | null;
    success?: string | null;
  };
}

/**
 * Modal used for generating or uploading slide background images.
 */
export function ImageBackgroundModal({
  open,
  onClose,
  onGenerate,
  onUpload,
  status,
}: ImageBackgroundModalProps) {
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<ImageMode>("background");
  const [activeTab, setActiveTab] = useState<"generate" | "upload">("generate");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!open) {
      setPrompt("");
      setMode("background");
      setActiveTab("generate");
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const handleGenerateClick = useCallback(async () => {
    if (!prompt.trim()) {
      return;
    }
    await onGenerate(prompt.trim(), mode);
  }, [onGenerate, prompt, mode]);

  if (!open || !mounted) {
    return null;
  }

  const isGenerating = status?.isGenerating ?? false;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-black/10 bg-white/95 p-6 text-[var(--editor-text-strong)] shadow-[0_30px_90px_-30px_rgba(0,0,0,0.55)]"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-[var(--editor-text-strong)]">
            Generate Image
          </h2>
          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--editor-text-muted)] transition hover:bg-white/5 hover:text-[var(--editor-text-strong)]"
            aria-label="Close image generator"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="mt-6 border-b border-[var(--editor-border)]">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setActiveTab("generate")}
              className={cn(
                "pb-3 px-1 text-sm font-medium border-b-2 transition-colors",
                activeTab === "generate"
                  ? "border-[var(--editor-accent)] text-[var(--editor-text-strong)]"
                  : "border-transparent text-[var(--editor-text-muted)] hover:text-[var(--editor-text-strong)]"
              )}
            >
              Generate
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("upload")}
              className={cn(
                "pb-3 px-1 text-sm font-medium border-b-2 transition-colors",
                activeTab === "upload"
                  ? "border-[var(--editor-accent)] text-[var(--editor-text-strong)]"
                  : "border-transparent text-[var(--editor-text-muted)] hover:text-[var(--editor-text-strong)]"
              )}
            >
              Upload
            </button>
          </div>
        </div>

        {/* Generate Tab */}
        {activeTab === "generate" && (
          <>
            <label className="mt-6 block text-sm font-medium text-[var(--editor-text-muted)]">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Describe the image you want to generate..."
              className={cn(
                "mt-2 w-full rounded-xl border border-[var(--editor-border)] bg-[var(--editor-surface)] p-3 text-sm text-[var(--editor-text)]",
                "focus:border-[var(--editor-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--editor-accent)]/40"
              )}
              rows={4}
            />

            <div className="mt-4">
              <label className="block text-sm font-medium text-[var(--editor-text-muted)] mb-2">
                Type
              </label>
              <SegmentedControl
                items={[
                  { value: "background", label: "Background" },
                  { value: "element", label: "Image Element" },
                ]}
                value={mode}
                onValueChange={(value) => setMode(value as ImageMode)}
              />
            </div>

            {status?.error && (
              <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {status.error}
              </div>
            )}

            {status?.success && (
              <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                {status.success}
              </div>
            )}

            <div className="mt-6">
              <Button
                type="button"
                onClick={handleGenerateClick}
                disabled={isGenerating || !prompt.trim()}
                className="w-full"
              >
                {isGenerating ? "Generating…" : "Generate"}
              </Button>
            </div>
          </>
        )}

        {/* Upload Tab */}
        {activeTab === "upload" && (
          <>
            <div className="mt-6">
              <label className="block text-sm font-medium text-[var(--editor-text-muted)] mb-2">
                Type
              </label>
              <SegmentedControl
                items={[
                  { value: "background", label: "Background" },
                  { value: "element", label: "Image Element" },
                ]}
                value={mode}
                onValueChange={(value) => setMode(value as ImageMode)}
              />
            </div>
            <div className="mt-6">
              <Button
                type="button"
                onClick={() => onUpload(mode)}
                variant="secondary"
                className="w-full"
              >
                Choose Image File
              </Button>
              <p className="mt-3 text-sm text-[var(--editor-text-muted)]">
                Select an image file from your computer to use as a {mode === "background" ? "background" : "image element"}.
              </p>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}



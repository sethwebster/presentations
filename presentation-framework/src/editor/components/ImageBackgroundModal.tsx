"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ImageBackgroundModalProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (prompt: string) => Promise<void>;
  onUpload: () => void;
  onInsertImageElement: () => void;
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
  onInsertImageElement,
  status,
}: ImageBackgroundModalProps) {
  const [prompt, setPrompt] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!open) {
      setPrompt("");
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
    await onGenerate(prompt.trim());
  }, [onGenerate, prompt]);

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
          <div>
            <h2 className="text-lg font-semibold text-[var(--editor-text-strong)]">
              Craft a Slide Background
            </h2>
            <p className="mt-1 text-sm text-[var(--editor-text-muted)]">
              Describe the scene you want. We’ll generate a presentation-grade, projection-ready image.
            </p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--editor-text-muted)] transition hover:bg-white/5 hover:text-[var(--editor-text-strong)]"
            aria-label="Close background generator"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <label className="mt-6 block text-sm font-medium text-[var(--editor-text-muted)]">
          Prompt
        </label>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="E.g. A dramatic dusk skyline over a futuristic city, soft rim lighting, cinematic atmosphere"
          className={cn(
            "mt-2 w-full rounded-xl border border-[var(--editor-border)] bg-[var(--editor-surface)] p-3 text-sm text-[var(--editor-text)]",
            "focus:border-[var(--editor-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--editor-accent)]/40"
          )}
          rows={4}
        />

        <div className="mt-4 flex flex-col gap-2 text-xs text-[var(--editor-text-muted)]">
          <div>
            • Favor cinematic lighting, depth, and texture. Avoid text, logos, or recognizable faces.
          </div>
          <div>
            • Leave visual breathing room for slide titles and content.
          </div>
          <div>
            • Mention color palettes or moods you want to emphasize.
          </div>
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

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={handleGenerateClick}
            disabled={isGenerating || !prompt.trim()}
            className="min-w-[160px]"
          >
            {isGenerating ? "Generating…" : "Generate Background"}
          </Button>
          <Button
            type="button"
            onClick={onUpload}
            variant="secondary"
            className="min-w-[160px]"
          >
            Upload Image
          </Button>
          <button
            type="button"
            onClick={onInsertImageElement}
            className="text-xs font-semibold uppercase tracking-wide text-[var(--editor-text-muted)] transition hover:text-[var(--editor-text)]"
          >
            Or insert as slide element
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}



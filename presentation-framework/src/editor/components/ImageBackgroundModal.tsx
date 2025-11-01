"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { ImageLibraryItem } from "@/editor/types/imageLibrary";

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
  libraryItems?: ImageLibraryItem[];
  onSelectFromLibrary?: (item: ImageLibraryItem, mode: ImageMode) => void;
  onRefreshLibrary?: () => Promise<void> | void;
  libraryStatus?: {
    isLoading?: boolean;
    isSyncing?: boolean;
    error?: string | null;
  };
  initialTab?: 'generate' | 'upload' | 'library';
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
  libraryItems = [],
  onSelectFromLibrary,
  onRefreshLibrary,
  libraryStatus,
  initialTab = 'generate',
}: ImageBackgroundModalProps) {
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<ImageMode>("background");
  const [activeTab, setActiveTab] = useState<"generate" | "upload" | "library">("generate");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!open) {
      setPrompt("");
      setMode("background");
      setActiveTab(initialTab);
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, initialTab]);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  const handleGenerateClick = useCallback(async () => {
    if (!prompt.trim()) {
      return;
    }
    await onGenerate(prompt.trim(), mode);
  }, [onGenerate, prompt, mode]);

  const isLibraryTabEnabled = Boolean(onSelectFromLibrary);

  const sortedLibraryItems = useMemo(() => {
    if (!libraryItems?.length) {
      return [] as ImageLibraryItem[];
    }
    return [...libraryItems].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }, [libraryItems]);

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
            {isLibraryTabEnabled && (
              <button
                type="button"
                onClick={() => setActiveTab("library")}
                className={cn(
                  "pb-3 px-1 text-sm font-medium border-b-2 transition-colors",
                  activeTab === "library"
                    ? "border-[var(--editor-accent)] text-[var(--editor-text-strong)]"
                    : "border-transparent text-[var(--editor-text-muted)] hover:text-[var(--editor-text-strong)]"
                )}
              >
                Library
              </button>
            )}
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

        {/* Library Tab */}
        {activeTab === "library" && isLibraryTabEnabled && (
          <div className="mt-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-[var(--editor-text-muted)]">
                    Saved Images
                  </span>
                  <span className="text-xs text-[var(--editor-text-muted)]">
                    {libraryItems.length > 0
                      ? `${libraryItems.length} item${libraryItems.length === 1 ? "" : "s"} in your library`
                      : "Images you upload or generate will appear here"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <SegmentedControl
                    items={[
                      { value: "background", label: "Background" },
                      { value: "element", label: "Image Element" },
                    ]}
                    value={mode}
                    onValueChange={(value) => setMode(value as ImageMode)}
                  />
                  {onRefreshLibrary && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        void onRefreshLibrary();
                      }}
                      disabled={libraryStatus?.isLoading || libraryStatus?.isSyncing}
                    >
                      Refresh
                    </Button>
                  )}
                </div>
              </div>

              {libraryStatus?.error && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                  {libraryStatus.error}
                </div>
              )}

              {libraryStatus?.isSyncing && (
                <div className="rounded-lg border border-[var(--editor-border)] bg-[var(--editor-surface)] px-3 py-2 text-xs text-[var(--editor-text-muted)]">
                  Syncing library…
                </div>
              )}

              {sortedLibraryItems.length === 0 && (
                <div className="rounded-xl border border-dashed border-[var(--editor-border)] bg-[var(--editor-surface)]/60 p-8 text-center text-sm text-[var(--editor-text-muted)]">
                  <p className="font-medium text-[var(--editor-text)]">No images saved yet</p>
                  <p className="mt-2">
                    Generate or upload an image to add it to your library. Saved images are available offline and sync when you reconnect.
                  </p>
                </div>
              )}

              {sortedLibraryItems.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {sortedLibraryItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectFromLibrary?.(item, mode)}
                      className="group relative flex flex-col overflow-hidden rounded-xl border border-[var(--editor-border)] bg-[var(--editor-surface)]/80 text-left shadow-sm transition hover:border-[var(--editor-accent)]/60"
                    >
                      <div className="relative aspect-video w-full overflow-hidden bg-black/40">
                        <img
                          src={item.thumbnailDataUrl || item.dataUrl}
                          alt={item.metadata?.prompt || item.metadata?.originalFileName || 'Library image'}
                          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                          draggable={false}
                        />
                        <div className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[10px] uppercase tracking-wide text-white/80">
                          {item.origin === 'ai' ? 'Generated' : 'Uploaded'}
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col gap-1 p-3 text-xs text-[var(--editor-text-muted)]">
                        {item.metadata?.prompt ? (
                          <p className="line-clamp-2 text-[var(--editor-text)] font-medium" title={item.metadata.prompt}>
                            {item.metadata.prompt}
                          </p>
                        ) : (
                          <p className="text-[var(--editor-text)] font-medium">
                            {item.metadata?.originalFileName || 'Image'}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide">
                          <span className="rounded bg-[var(--editor-border)]/40 px-2 py-0.5">
                            {item.metadata?.usage === 'element' ? 'Element' : 'Background'}
                          </span>
                          {item.metadata?.provider && (
                            <span className="rounded bg-[var(--editor-border)]/40 px-2 py-0.5">
                              {item.metadata.provider}
                            </span>
                          )}
                          {item.metadata?.quality && (
                            <span className="rounded bg-[var(--editor-border)]/40 px-2 py-0.5">
                              {item.metadata.quality}
                            </span>
                          )}
                        </div>
                        <div className="mt-auto flex items-center justify-between text-[10px] text-[var(--editor-text-muted)]/80">
                          <span>
                            {new Date(item.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                          {item.metadata?.sizeBytes && (
                            <span>{Math.round(item.metadata.sizeBytes / 1024)} KB</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}



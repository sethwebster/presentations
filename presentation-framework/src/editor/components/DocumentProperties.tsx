"use client";

import { useMemo } from "react";

import { useEditor, useEditorInstance } from "../hooks/useEditor";
import { ColorPicker } from "./ColorPicker";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { DeckMeta } from "@/rsc/types";

const SECTION_HEADING = "text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground";

export function DocumentProperties() {
  const state = useEditor();
  const editor = useEditorInstance();

  const settings = useMemo(() => state.deck?.settings || {}, [state.deck?.settings]);
  const meta = useMemo(() => state.deck?.meta || ({} as Partial<DeckMeta>), [state.deck?.meta]);

  if (!state.deck) {
    return <div className="text-sm italic text-muted-foreground">No document loaded</div>;
  }

  return (
    <div className="flex flex-col gap-6 text-foreground">
      <div className="space-y-2">
        <Label className={SECTION_HEADING}>Title</Label>
        <Input
          value={meta.title || ""}
          onChange={(event) => editor.updateDeckMeta({ title: event.target.value })}
          placeholder="Untitled presentation"
          className="h-9"
        />
      </div>

      <div className="space-y-2">
        <Label className={SECTION_HEADING}>Description</Label>
        <textarea
          value={meta.description || ""}
          onChange={(event) => editor.updateDeckMeta({ description: event.target.value })}
          placeholder="Describe the intent or audience"
          className="min-h-[90px] w-full resize-y rounded-md border bg-background p-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          style={{ borderColor: 'rgba(148, 163, 184, 0.3)' }}
        />
      </div>

      <div className="space-y-2">
        <Label className={SECTION_HEADING}>Public Visibility</Label>
        <label className="flex items-center gap-3 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={meta.public || false}
            onChange={(event) => editor.updateDeckMeta({ public: event.target.checked })}
            className="w-4 h-4 border rounded bg-background text-primary focus:ring-primary focus:ring-offset-0"
            style={{ borderColor: 'rgba(148, 163, 184, 0.3)' }}
          />
          Make this presentation public
        </label>
        <p className="text-xs text-muted-foreground">
          When public, your presentation will be visible on your profile page at /u/[your-username]
        </p>
      </div>

      <div className="space-y-2">
        <Label className={SECTION_HEADING}>Presenter Password</Label>
        <p className="text-xs text-muted-foreground">Set a password to control this presentation. Leave empty to disable presenter mode.</p>
        <Input
          type="password"
          value={meta.presenterPasswordHash ? "••••••••" : ""}
          onChange={async (event) => {
            const password = event.target.value;
            if (password) {
              const encoder = new TextEncoder();
              const data = encoder.encode(password);
              const hashBuffer = await crypto.subtle.digest("SHA-256", data);
              const hashArray = Array.from(new Uint8Array(hashBuffer));
              const hash = hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
              editor.updateDeckMeta({ presenterPasswordHash: hash });
            } else {
              editor.updateDeckMeta({ presenterPasswordHash: undefined });
            }
          }}
          placeholder={meta.presenterPasswordHash ? "Enter new password to change" : "Set presenter password"}
          className="h-9"
        />
        {meta.presenterPasswordHash && (
          <button
            type="button"
            onClick={() => editor.updateDeckMeta({ presenterPasswordHash: undefined })}
            className="text-xs underline transition text-muted-foreground hover:text-foreground"
          >
            Clear password
          </button>
        )}
      </div>

      <div className="space-y-2">
        <Label className={SECTION_HEADING}>Slide Size</Label>
        <Select
          value={settings.slideSize?.preset || "ultrawide"}
          onChange={(event) => {
            const preset = event.target.value as "standard" | "ultrawide" | "cinema" | "square" | "custom";
            let width = 1920;
            let height = 1080;

            switch (preset) {
              case "standard":
                width = 1024;
                height = 768;
                break;
              case "ultrawide":
                width = 1920;
                height = 1080;
                break;
              case "cinema":
                width = 2560;
                height = 1080;
                break;
              case "square":
                width = 1080;
                height = 1080;
                break;
              case "custom":
                width = settings.slideSize?.width || 1280;
                height = settings.slideSize?.height || 720;
                break;
            }

            editor.updateDeckSettings({
              slideSize: {
                width,
                height,
                preset,
                units: "pixels",
              },
            });
          }}
        >
          <option value="standard">Standard (4:3) – 1024×768</option>
          <option value="ultrawide">HD (16:9) – 1920×1080</option>
          <option value="cinema">Cinema (21:9) – 2560×1080</option>
          <option value="square">Square (1:1) – 1080×1080</option>
          <option value="custom">Custom</option>
        </Select>
      </div>

      {settings.slideSize?.preset === "custom" && (
        <div className="space-y-3">
          <Label className={SECTION_HEADING}>Custom Dimensions</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[0.65rem] font-medium text-muted-foreground">Width</Label>
              <Input
                type="number"
                value={settings.slideSize?.width || 1280}
                onChange={(event) =>
                  editor.updateDeckSettings({
                    slideSize: {
                      width: parseInt(event.target.value) || 1280,
                      height: settings.slideSize?.height || 720,
                      preset: "custom",
                      units: "pixels",
                    },
                  })
                }
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[0.65rem] font-medium text-muted-foreground">Height</Label>
              <Input
                type="number"
                value={settings.slideSize?.height || 720}
                onChange={(event) =>
                  editor.updateDeckSettings({
                    slideSize: {
                      width: settings.slideSize?.width || 1280,
                      height: parseInt(event.target.value) || 720,
                      preset: "custom",
                      units: "pixels",
                    },
                  })
                }
                className="h-9"
              />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label className={SECTION_HEADING}>Orientation</Label>
        <Select
          value={settings.orientation || "landscape"}
          onChange={(event) =>
            editor.updateDeckSettings({
              orientation: event.target.value as "landscape" | "portrait",
            })
          }
        >
          <option value="landscape">Landscape</option>
          <option value="portrait">Portrait</option>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className={SECTION_HEADING}>Default Background</Label>
        <ColorPicker
          value={typeof settings.defaultBackground === "string" ? settings.defaultBackground : "#ffffff"}
          onChange={(value) =>
            editor.updateDeckSettings({
              defaultBackground: typeof value === "string" ? value : "#ffffff",
            })
          }
        />
      </div>

      <div className="pt-5 space-y-3 border-t" style={{ borderTopColor: 'rgba(148, 163, 184, 0.2)' }}>
        <Label className={SECTION_HEADING}>Presentation</Label>
        <div className="space-y-3">
          <label className="flex items-center gap-3 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={settings.presentation?.loop || false}
              onChange={(event) =>
                editor.updateDeckSettings({
                  presentation: {
                    ...settings.presentation,
                    loop: event.target.checked,
                    autoAdvance: settings.presentation?.autoAdvance || false,
                    skipHiddenSlides: settings.presentation?.skipHiddenSlides || false,
                    showSlideNumbers: settings.presentation?.showSlideNumbers || false,
                    showPresenterNotes: settings.presentation?.showPresenterNotes || false,
                  },
                })
              }
              className="w-4 h-4 border rounded bg-background text-primary focus:ring-primary focus:ring-offset-0"
            style={{ borderColor: 'rgba(148, 163, 184, 0.3)' }}
            />
            Loop presentation
          </label>
          <label className="flex items-center gap-3 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={settings.presentation?.autoAdvance || false}
              onChange={(event) =>
                editor.updateDeckSettings({
                  presentation: {
                    ...settings.presentation,
                    autoAdvance: event.target.checked,
                    loop: settings.presentation?.loop || false,
                    skipHiddenSlides: settings.presentation?.skipHiddenSlides || false,
                    showSlideNumbers: settings.presentation?.showSlideNumbers || false,
                    showPresenterNotes: settings.presentation?.showPresenterNotes || false,
                  },
                })
              }
              className="w-4 h-4 border rounded bg-background text-primary focus:ring-primary focus:ring-offset-0"
            style={{ borderColor: 'rgba(148, 163, 184, 0.3)' }}
            />
            Auto-advance slides
          </label>
          {settings.presentation?.autoAdvance && (
            <div className="pl-6 space-y-2">
              <Label className="text-[0.65rem] font-medium text-muted-foreground">Delay (seconds)</Label>
              <Input
                type="number"
                min={1}
                max={300}
                value={settings.presentation?.autoAdvanceDelay || 5}
                onChange={(event) =>
                  editor.updateDeckSettings({
                    presentation: {
                      ...settings.presentation,
                      autoAdvanceDelay: parseInt(event.target.value) || 5,
                      autoAdvance: settings.presentation?.autoAdvance || false,
                      loop: settings.presentation?.loop || false,
                      skipHiddenSlides: settings.presentation?.skipHiddenSlides || false,
                      showSlideNumbers: settings.presentation?.showSlideNumbers || false,
                      showPresenterNotes: settings.presentation?.showPresenterNotes || false,
                    },
                  })
                }
                className="h-9"
              />
            </div>
          )}
          <label className="flex items-center gap-3 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={settings.presentation?.showSlideNumbers || false}
              onChange={(event) =>
                editor.updateDeckSettings({
                  presentation: {
                    ...settings.presentation,
                    showSlideNumbers: event.target.checked,
                    loop: settings.presentation?.loop || false,
                    autoAdvance: settings.presentation?.autoAdvance || false,
                    skipHiddenSlides: settings.presentation?.skipHiddenSlides || false,
                    showPresenterNotes: settings.presentation?.showPresenterNotes || false,
                  },
                })
              }
              className="w-4 h-4 border rounded bg-background text-primary focus:ring-primary focus:ring-offset-0"
            style={{ borderColor: 'rgba(148, 163, 184, 0.3)' }}
            />
            Show slide numbers
          </label>
        </div>
      </div>

      <div className="pt-5 space-y-3 border-t" style={{ borderTopColor: 'rgba(148, 163, 184, 0.2)' }}>
        <Label className={SECTION_HEADING}>Grid &amp; Guides</Label>
        <div className="space-y-2">
          <label className="flex items-center gap-3 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={state.showGrid}
              onChange={(event) => {
                const enabled = event.target.checked;
                editor.setShowGrid(enabled);
                editor.updateDeckSettings({
                  grid: {
                    enabled,
                    size: settings.grid?.size || 20,
                    snapToGrid: settings.grid?.snapToGrid || false,
                    ...settings.grid,
                  },
                });
              }}
              className="w-4 h-4 border rounded bg-background text-primary focus:ring-primary focus:ring-offset-0"
            style={{ borderColor: 'rgba(148, 163, 184, 0.3)' }}
            />
            Show grid
          </label>
          {settings.grid?.enabled && (
            <div className="pl-6 space-y-3">
              <label className="flex items-center gap-3 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={settings.grid?.snapToGrid || false}
                  onChange={(event) =>
                    editor.updateDeckSettings({
                      grid: {
                        enabled: settings.grid?.enabled || false,
                        size: settings.grid?.size || 20,
                        snapToGrid: event.target.checked,
                        ...settings.grid,
                      },
                    })
                  }
                  className="w-4 h-4 border rounded bg-background text-primary focus:ring-primary focus:ring-offset-0"
            style={{ borderColor: 'rgba(148, 163, 184, 0.3)' }}
                />
                Snap to grid
              </label>
              <div className="space-y-2">
                <Label className="text-[0.65rem] font-medium text-muted-foreground">Grid Size</Label>
                <Input
                  type="number"
                  min={5}
                  max={100}
                  value={settings.grid?.size || 20}
                  onChange={(event) =>
                    editor.updateDeckSettings({
                      grid: {
                        enabled: settings.grid?.enabled || false,
                        size: parseInt(event.target.value) || 20,
                        snapToGrid: settings.grid?.snapToGrid || false,
                        ...settings.grid,
                      },
                    })
                  }
                  className="h-9"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

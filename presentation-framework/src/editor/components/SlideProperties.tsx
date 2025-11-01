"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useEditor, useEditorInstance } from '../hooks/useEditor';
import { ColorPicker } from './ColorPicker';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Button } from '@/components/ui/button';
import { ImageBackgroundModal } from './ImageBackgroundModal';
import { cn } from '@/lib/utils';
import { useImageLibrary } from '../hooks/useImageLibrary';
import type { ImageLibraryItem } from '@/editor/types/imageLibrary';

const SECTION_HEADING = "text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground";

export function SlideProperties() {
  const state = useEditor();
  const editor = useEditorInstance();

  const {
    items: imageLibraryItems,
    addItem: addImageToLibrary,
    updateItem: updateLibraryItem,
    sync: syncImageLibrary,
    refreshFromServer: refreshImageLibrary,
    isSyncing: isLibrarySyncing,
    lastSyncError: imageLibraryError,
  } = useImageLibrary();

  const deck = state.deck;
  const selectedSlideId = state.selectedSlideId;
  const deckId = state.deckId ?? deck?.meta?.id ?? null;
  
  if (!deck || !selectedSlideId) {
    return (
      <div className="text-sm italic text-muted-foreground">
        No slide selected
      </div>
    );
  }

  const slide = deck.slides.find(s => s.id === selectedSlideId);
  if (!slide) {
    return (
      <div className="text-sm italic text-muted-foreground">
        Slide not found
      </div>
    );
  }

  // Helper to convert gradient object to CSS string
  const gradientToCSS = (grad: any): string => {
    if (!grad || typeof grad !== 'object') return '#ffffff';
    if (grad.type === 'linear') {
      const stops = grad.stops?.map((s: any) => `${s.color} ${s.position}%`).join(', ') || '';
      return `linear-gradient(${grad.angle || 0}deg, ${stops})`;
    }
    if (grad.type === 'radial') {
      const stops = grad.stops?.map((s: any) => `${s.color} ${s.position}%`).join(', ') || '';
      return `radial-gradient(${stops})`;
    }
    return '#ffffff';
  };

  // Determine current background type
  const getBackgroundType = (): 'color' | 'gradient' | 'image' => {
    if (slide.background) {
      if (typeof slide.background === 'string') return 'color';
      if (slide.background.type === 'image') return 'image';
      if (slide.background.type === 'gradient') return 'gradient';
    }
    return 'color';
  };

  const [backgroundType, setBackgroundType] = useState<'color' | 'gradient' | 'image'>(getBackgroundType());
  const [showImageModal, setShowImageModal] = useState(false);
  const [showRefineModal, setShowRefineModal] = useState(false);
  const [refineRequest, setRefineRequest] = useState('');
  const [mounted, setMounted] = useState(false);
  const [imageModalInitialTab, setImageModalInitialTab] = useState<'generate' | 'upload' | 'library'>('generate');
  const [isLibraryRefreshing, setIsLibraryRefreshing] = useState(false);
  const [imageStatus, setImageStatus] = useState<{ isGenerating: boolean; error: string | null; success: string | null }>({
    isGenerating: false,
    error: null,
    success: null,
  });

  const handleLibraryRefresh = useCallback(async () => {
    setIsLibraryRefreshing(true);
    try {
      await refreshImageLibrary(true);
      await syncImageLibrary(true);
    } catch (error) {
      console.error('Failed to refresh image library:', error);
    } finally {
      setIsLibraryRefreshing(false);
    }
  }, [refreshImageLibrary, syncImageLibrary]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagePreviewRef = useRef<HTMLDivElement>(null);
  const isDraggingImageRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number }>({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  // Cache previous background values by type to restore when switching back
  const backgroundCacheRef = useRef<{
    color?: string | { type: 'color'; value: string; opacity?: number };
    gradient?: { type: 'gradient'; value: object; opacity?: number };
    image?: { type: 'image'; value: object; opacity?: number };
  }>({});

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (showImageModal) {
      void refreshImageLibrary();
    }
  }, [showImageModal, refreshImageLibrary]);

  // Sync backgroundType when slide changes and update cache
  useEffect(() => {
    const currentType = getBackgroundType();
    setBackgroundType(currentType);
    
    // Update cache with current background value
    const currentBg = slide.background;
    if (currentBg) {
      if (currentType === 'color') {
        if (typeof currentBg === 'string') {
          backgroundCacheRef.current.color = currentBg;
        } else if (typeof currentBg === 'object' && currentBg.type === 'color') {
          backgroundCacheRef.current.color = currentBg;
        }
      } else if (currentType === 'gradient' && typeof currentBg === 'object' && currentBg.type === 'gradient') {
        backgroundCacheRef.current.gradient = currentBg;
      } else if (currentType === 'image' && typeof currentBg === 'object' && currentBg.type === 'image') {
        backgroundCacheRef.current.image = currentBg;
      }
    }
  }, [selectedSlideId, slide.background]);

  // Get current background value for ColorPicker
  const getBackgroundValue = (): string | object => {
    if (slide.background) {
      if (typeof slide.background === 'string') return slide.background;
      if (slide.background.type === 'color') return slide.background.value as string;
      if (slide.background.type === 'gradient') {
        // Return the gradient object for ColorPicker
        return slide.background.value as object;
      }
    }
    if (slide.style?.background) {
      const bg = slide.style.background;
      if (typeof bg === 'string') return bg;
      if (bg && typeof bg === 'object') return bg;
    }
    const defaultBg = deck?.settings?.defaultBackground;
    if (!defaultBg) return '#ffffff';
    if (typeof defaultBg === 'string') return defaultBg;
    if (defaultBg && typeof defaultBg === 'object') return defaultBg;
    return '#ffffff';
  };

  // Get image background data
  const getImageBackground = () => {
    if (slide.background && typeof slide.background === 'object' && slide.background.type === 'image') {
      const value = slide.background.value;
      if (typeof value === 'object' && value !== null) {
        return {
          src: (value as any).src || '',
          offsetX: (value as any).offsetX || 0,
          offsetY: (value as any).offsetY || 0,
          scale: (value as any).scale || 100,
          meta: value,
        };
      }
      if (typeof value === 'string') {
        return { src: value, offsetX: 0, offsetY: 0, scale: 100, meta: { src: value } };
      }
    }
    return { src: '', offsetX: 0, offsetY: 0, scale: 100, meta: {} };
  };

  const imageData = useMemo(() => getImageBackground(), [slide.background]);

  const updateImageBackground = useCallback((updates: Record<string, unknown>) => {
    const currentValue = slide.background && typeof slide.background === 'object' && slide.background.type === 'image'
      ? (typeof slide.background.value === 'object' && slide.background.value !== null
        ? slide.background.value as Record<string, unknown>
        : {})
      : {};

    const nextValue = {
      ...currentValue,
      ...updates,
    };

    editor.updateSlide(selectedSlideId, {
      background: {
        type: 'image',
        value: nextValue,
        opacity: slide.background && typeof slide.background === 'object' ? (slide.background.opacity ?? 1) : 1,
      },
    });
  }, [editor, selectedSlideId, slide.background]);

  const handleImageFileRead = useCallback(async (file: File) => {
    const readAsDataURL = (inputFile: File) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file.'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsDataURL(inputFile);
    });

    const dataUrl = await readAsDataURL(file);
    const uploadedAt = new Date().toISOString();
    const libraryItem = addImageToLibrary({
      dataUrl,
      thumbnailDataUrl: dataUrl,
      origin: 'upload',
      metadata: {
        usage: 'background',
        originalFileName: file.name,
        sizeBytes: file.size,
        uploadedAt,
        deckId: deckId ?? undefined,
      },
    });

    updateImageBackground({
      src: dataUrl,
      offsetX: 0,
      offsetY: 0,
      scale: 100,
      source: 'upload',
      name: file.name,
      uploadedAt,
      libraryItemId: libraryItem.id,
    });
    setBackgroundType('image');
    setImageStatus({ isGenerating: false, error: null, success: 'Image uploaded successfully.' });
    setTimeout(() => setImageStatus({ isGenerating: false, error: null, success: null }), 2000);
  }, [updateImageBackground, addImageToLibrary, deckId]);

  const handleFileInputChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setImageStatus({ isGenerating: false, error: 'Please select an image file.', success: null });
      return;
    }

    try {
      setImageStatus({ isGenerating: true, error: null, success: null });
      await handleImageFileRead(file);
    } catch (error) {
      console.error('Image upload failed:', error);
      setImageStatus({
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Failed to process image upload.',
        success: null,
      });
    }
  }, [handleImageFileRead]);

  const openFilePicker = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }, []);

  const handleGenerateImage = useCallback(async (prompt: string, mode: 'background' | 'element') => {
    if (mode !== 'background') {
      // For image elements, we'd need to add to slide elements, but SlideProperties is only for backgrounds
      setImageStatus({ isGenerating: false, error: 'Image elements must be added from the toolbar.', success: null });
      return;
    }

    try {
      setImageStatus({ isGenerating: true, error: null, success: null });
      
      // Get slide dimensions from deck settings
      const slideWidth = deck?.settings?.slideSize?.width ?? 1280;
      const slideHeight = deck?.settings?.slideSize?.height ?? 720;
      
      const response = await fetch('/api/ai/background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt,
          width: slideWidth,
          height: slideHeight,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message = errorBody?.error || `Image generation failed (${response.status}).`;
        throw new Error(message);
      }

      const data = await response.json();
      const imageDataResponse: string | undefined = data?.image;
      const meta = data?.meta;

      if (!imageDataResponse) {
        throw new Error('No image returned by generator.');
      }

      const generatedAt = new Date().toISOString();
      const libraryItem = addImageToLibrary({
        dataUrl: imageDataResponse,
        thumbnailDataUrl: imageDataResponse,
        origin: 'ai',
        metadata: {
          usage: 'background',
          prompt,
          provider: meta?.provider ?? 'openai',
          quality: meta?.quality ?? 'hd',
          generatedAt,
          width: slideWidth,
          height: slideHeight,
          deckId: deckId ?? undefined,
        },
      });

      setBackgroundType('image');
      updateImageBackground({
        src: imageDataResponse,
        offsetX: 0,
        offsetY: 0,
        scale: 100,
        generatedAt,
        source: 'ai',
        provider: meta?.provider ?? 'openai',
        quality: meta?.quality ?? 'hd',
        prompt,
        libraryItemId: libraryItem.id,
      });

      setImageStatus({ isGenerating: false, error: null, success: 'Generated background applied.' });
      setTimeout(() => setShowImageModal(false), 1200);
    } catch (error) {
      console.error('AI background generation failed:', error);
      setImageStatus({
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Image generation failed.',
        success: null,
      });
    }
  }, [updateImageBackground, addImageToLibrary, deckId]);

  const handleRefineImage = useCallback(async () => {
    if (!refineRequest.trim() || !imageData.src) {
      return;
    }

    const originalPrompt = (imageData.meta as any)?.prompt;
    if (!originalPrompt) {
      setImageStatus({
        isGenerating: false,
        error: 'Cannot refine: original prompt not found. Only AI-generated images can be refined.',
        success: null,
      });
      return;
    }

    try {
      setImageStatus({ isGenerating: true, error: null, success: null });
      
      // Get slide dimensions from deck settings
      const slideWidth = deck?.settings?.slideSize?.width ?? 1280;
      const slideHeight = deck?.settings?.slideSize?.height ?? 720;

      console.log('Refining image with:', { 
        originalPrompt, 
        refinement: refineRequest.trim(), 
        width: slideWidth, 
        height: slideHeight,
        imageLength: imageData.src.length 
      });

      const response = await fetch('/api/ai/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageData.src, // Full image data
          originalPrompt,
          refinement: refineRequest.trim(),
          width: slideWidth,
          height: slideHeight,
        }),
      });

      console.log('Refine API response status:', response.status);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message = errorBody?.error || `Image refinement failed (${response.status}).`;
        throw new Error(message);
      }

      const data = await response.json();
      const imageDataResponse: string | undefined = data?.image;
      const meta = data?.meta;

      if (!imageDataResponse) {
        throw new Error('No image returned by refinement.');
      }

      // Update with refined image, preserving original prompt and refinement history
      const refinedPrompt = `${originalPrompt}, ${refineRequest.trim()}`;
      const generatedAt = new Date().toISOString();
      const refinementEntry = {
        id: `ref-${Date.now()}`,
        prompt: refineRequest.trim(),
        createdAt: generatedAt,
      };

      let libraryItemId = typeof (imageData.meta as any)?.libraryItemId === 'string'
        ? (imageData.meta as any).libraryItemId as string
        : undefined;

      if (libraryItemId) {
        updateLibraryItem(libraryItemId, (existing) => ({
          ...existing,
          dataUrl: imageDataResponse,
          thumbnailDataUrl: imageDataResponse,
          updatedAt: generatedAt,
          metadata: {
            ...existing.metadata,
            prompt: refinedPrompt,
            provider: meta?.provider ?? existing.metadata?.provider,
            quality: meta?.quality ?? existing.metadata?.quality,
            generatedAt,
            refinementHistory: [...(existing.metadata?.refinementHistory ?? []), refinementEntry],
          },
        }));
      } else {
        const newItem = addImageToLibrary({
          dataUrl: imageDataResponse,
          thumbnailDataUrl: imageDataResponse,
          origin: 'ai',
          metadata: {
            usage: 'background',
            prompt: refinedPrompt,
            provider: meta?.provider ?? 'openai',
            quality: meta?.quality ?? 'hd',
            generatedAt,
            deckId: deckId ?? undefined,
            refinementHistory: [refinementEntry],
          },
        });
        libraryItemId = newItem.id;
      }

      updateImageBackground({
        src: imageDataResponse,
        offsetX: imageData.offsetX,
        offsetY: imageData.offsetY,
        scale: imageData.scale,
        generatedAt,
        source: 'ai',
        provider: meta?.provider ?? 'openai',
        quality: meta?.quality ?? 'hd',
        prompt: refinedPrompt,
        refinement: refineRequest.trim(),
        libraryItemId,
      });

      setImageStatus({ isGenerating: false, error: null, success: 'Image refined successfully.' });
      setShowRefineModal(false);
      setRefineRequest('');
      setTimeout(() => setImageStatus({ isGenerating: false, error: null, success: null }), 2000);
    } catch (error) {
      console.error('AI image refinement failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Image refinement failed.';
      setImageStatus({
        isGenerating: false,
        error: errorMessage,
        success: null,
      });
      // Keep modal open so user can see the error and try again
    }
  }, [refineRequest, imageData, deck, updateImageBackground, updateLibraryItem, addImageToLibrary, deckId]);

  const handleImageDragStart = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!imageData.src) return;
    event.preventDefault();
    isDraggingImageRef.current = true;
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      offsetX: imageData.offsetX,
      offsetY: imageData.offsetY,
    };
  }, [imageData.offsetX, imageData.offsetY, imageData.src]);

  useEffect(() => {
    if (!isDraggingImageRef.current) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDraggingImageRef.current) return;
      const deltaX = event.clientX - dragStartRef.current.x;
      const deltaY = event.clientY - dragStartRef.current.y;

      const nextOffsetX = Math.round(dragStartRef.current.offsetX + deltaX);
      const nextOffsetY = Math.round(dragStartRef.current.offsetY + deltaY);
      updateImageBackground({ offsetX: nextOffsetX, offsetY: nextOffsetY });
    };

    const handleMouseUp = () => {
      isDraggingImageRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [updateImageBackground]);

  const handleScaleChange = useCallback((value: number) => {
    const clamped = Math.max(10, Math.min(400, value));
    updateImageBackground({ scale: clamped });
  }, [updateImageBackground]);

  const handleSelectLibraryImage = useCallback((item: ImageLibraryItem, mode: 'background' | 'element') => {
    if (mode !== 'background') {
      setImageStatus({ isGenerating: false, error: 'Image elements must be added from the toolbar.', success: null });
      return;
    }

    const generatedAt = item.metadata?.generatedAt ?? item.metadata?.uploadedAt ?? new Date().toISOString();

    updateImageBackground({
      src: item.dataUrl,
      offsetX: 0,
      offsetY: 0,
      scale: 100,
      prompt: item.metadata?.prompt,
      generatedAt,
      source: item.origin === 'ai' ? 'ai' : 'upload',
      provider: item.metadata?.provider,
      quality: item.metadata?.quality,
      name: item.metadata?.originalFileName,
      uploadedAt: item.metadata?.uploadedAt,
      libraryItemId: item.id,
    });

    setBackgroundType('image');
    setImageStatus({ isGenerating: false, error: null, success: 'Background applied from library.' });
    setTimeout(() => setImageStatus({ isGenerating: false, error: null, success: null }), 2000);
    setShowImageModal(false);
  }, [setBackgroundType, setImageStatus, updateImageBackground]);

  const imageButtons = (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        onClick={() => {
          setBackgroundType('image');
          setImageStatus({ isGenerating: false, error: null, success: null });
          setImageModalInitialTab('generate');
          setShowImageModal(true);
        }}
        className="inline-flex items-center gap-2"
      >
        <SparklesIcon className="h-4 w-4" />
        Generate
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={() => {
          setBackgroundType('image');
          setImageStatus({ isGenerating: false, error: null, success: null });
          openFilePicker();
        }}
        className="inline-flex items-center gap-2"
      >
        <UploadIcon className="h-4 w-4" />
        Upload
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          setBackgroundType('image');
          setImageStatus({ isGenerating: false, error: null, success: null });
          setImageModalInitialTab('library');
          setShowImageModal(true);
        }}
        className="inline-flex items-center gap-2"
      >
        <LibraryIcon className="h-4 w-4" />
        Library
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 text-foreground">
      {/* Slide Title */}
      <div className="space-y-2">
        <Label className={SECTION_HEADING}>Title</Label>
        <Input
          value={slide.title || ''}
          onChange={(e) => editor.updateSlide(selectedSlideId, { title: e.target.value })}
          placeholder="Untitled slide"
          className="h-9"
        />
      </div>

      {/* Background */}
      <div className="space-y-3">
        <Label className={SECTION_HEADING}>Background</Label>
        
        <SegmentedControl
          items={[
            { value: 'color', label: 'Color' },
            { value: 'gradient', label: 'Gradient' },
            { value: 'image', label: 'Image' },
          ]}
          value={backgroundType}
          onValueChange={(value) => {
            const newType = value as 'color' | 'gradient' | 'image';
            const currentBg = slide.background;
            const currentType = getBackgroundType();
            
            // Save current background to cache before switching
            if (currentBg) {
              if (currentType === 'color') {
                if (typeof currentBg === 'string') {
                  backgroundCacheRef.current.color = currentBg;
                } else if (typeof currentBg === 'object' && currentBg.type === 'color') {
                  backgroundCacheRef.current.color = currentBg;
                }
              } else if (currentType === 'gradient' && typeof currentBg === 'object' && currentBg.type === 'gradient') {
                backgroundCacheRef.current.gradient = currentBg;
              } else if (currentType === 'image' && typeof currentBg === 'object' && currentBg.type === 'image') {
                backgroundCacheRef.current.image = currentBg;
              }
            }
            
            setBackgroundType(newType);
            
            if (newType !== currentType) {
              // Check cache first - restore if available
              if (newType === 'color' && backgroundCacheRef.current.color) {
                const cachedColor = backgroundCacheRef.current.color;
                editor.updateSlide(selectedSlideId, {
                  background: typeof cachedColor === 'string' ? cachedColor : cachedColor,
                });
              } else if (newType === 'gradient' && backgroundCacheRef.current.gradient) {
                editor.updateSlide(selectedSlideId, {
                  background: backgroundCacheRef.current.gradient,
                });
              } else if (newType === 'image' && backgroundCacheRef.current.image) {
                editor.updateSlide(selectedSlideId, {
                  background: backgroundCacheRef.current.image,
                });
              } else {
                // No cached value, set default only if no background exists at all
                if (!currentBg) {
                  if (newType === 'color') {
                    editor.updateSlide(selectedSlideId, {
                      background: '#ffffff',
                    });
                  } else if (newType === 'gradient') {
                    editor.updateSlide(selectedSlideId, {
                      background: {
                        type: 'gradient',
                        value: {
                          type: 'linear',
                          angle: 0,
                          stops: [
                            { color: '#16C2C7', position: 0 },
                            { color: '#C84BD2', position: 100 },
                          ],
                        },
                      },
                    });
                  } else if (newType === 'image') {
                    editor.updateSlide(selectedSlideId, {
                      background: {
                        type: 'image',
                        value: {
                          src: '',
                          offsetX: 0,
                          offsetY: 0,
                          scale: 100,
                        },
                        opacity: 1,
                      },
                    });
                  }
                }
              }
            }
          }}
          variant="editor"
        />

        {backgroundType === 'image' && (() => {
          return (
            <div className="space-y-3">
              {imageButtons}

              {imageStatus.error && !showImageModal && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {imageStatus.error}
                </div>
              )}
              {imageStatus.success && !showImageModal && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                  {imageStatus.success}
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Image URL</Label>
                <Input
                  value={imageData.src}
                  onChange={(e) => {
                    updateImageBackground({
                      src: e.target.value,
                      offsetX: imageData.offsetX,
                      offsetY: imageData.offsetY,
                      scale: imageData.scale,
                    });
                  }}
                  placeholder="data:image/... or https://..."
                  className="h-9"
                />
              </div>
              
              {imageData.src && (() => {
                // Get slide dimensions and calculate aspect ratio for preview
                const slideWidth = deck?.settings?.slideSize?.width ?? 1280;
                const slideHeight = deck?.settings?.slideSize?.height ?? 720;
                
                // Calculate scaled offsets for preview (assuming preview will be ~400px wide)
                // We'll use a scale factor based on typical preview width
                const previewScaleFactor = 400 / slideWidth; // Approximate preview width
                const scaledOffsetX = imageData.offsetX * previewScaleFactor;
                const scaledOffsetY = imageData.offsetY * previewScaleFactor;
                
                // Use aspect-ratio to maintain correct proportions
                const previewStyle = {
                  aspectRatio: `${slideWidth} / ${slideHeight}`,
                  backgroundImage: `url(${imageData.src})`,
                  backgroundPosition: `${scaledOffsetX}px ${scaledOffsetY}px`,
                  backgroundSize: `${imageData.scale}% auto`,
                  backgroundRepeat: 'no-repeat' as const,
                };
                
                return (
                  <>
                    <div
                      ref={imagePreviewRef}
                      className="relative w-full overflow-hidden rounded-xl border border-border/60 bg-muted/40"
                      style={previewStyle}
                      onMouseDown={handleImageDragStart}
                    >
                    <div className="absolute left-1/2 top-1/2 flex w-full -translate-x-1/2 -translate-y-1/2 justify-center">
                      <span className="rounded-full bg-black/40 px-3 py-1 text-xs text-white">
                        Drag to reposition
                      </span>
                    </div>
                  </div>

                  {/* Refine Image Button - Only show for AI-generated images */}
                  {(() => {
                    const hasPrompt = (imageData.meta as any)?.prompt;
                    console.log('Refine button check:', { hasPrompt, meta: imageData.meta, showRefineModal, mounted });
                    return hasPrompt;
                  })() && (
                    <div className="space-y-2 pt-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Refine button clicked, opening modal');
                          setRefineRequest('');
                          setShowRefineModal(true);
                        }}
                        className="w-full inline-flex items-center gap-2"
                        disabled={imageStatus.isGenerating}
                      >
                        <SparklesIcon className="h-4 w-4" />
                        Refine Image
                      </Button>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Horizontal Offset</Label>
                    <Input
                      type="number"
                      value={imageData.offsetX}
                      onChange={(e) => {
                        updateImageBackground({
                          offsetX: parseInt(e.target.value) || 0,
                        });
                      }}
                      className="h-9"
                      step="1"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Vertical Offset</Label>
                    <Input
                      type="number"
                      value={imageData.offsetY}
                      onChange={(e) => {
                        updateImageBackground({
                          offsetY: parseInt(e.target.value) || 0,
                        });
                      }}
                      className="h-9"
                      step="1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Scale</Label>
                    <input
                      type="range"
                      min={50}
                      max={200}
                      value={imageData.scale}
                      onChange={(e) => handleScaleChange(parseInt(e.target.value) || 100)}
                      className="w-full"
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={imageData.scale}
                        onChange={(e) => handleScaleChange(parseInt(e.target.value) || 100)}
                        className="h-9"
                        min={10}
                        max={400}
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  </div>
                  </>
                );
              })()}
            </div>
          );
        })()}

        {(backgroundType === 'color' || backgroundType === 'gradient') && (
          <ColorPicker
            value={getBackgroundValue()}
            onChange={(value) => {
              // Convert ColorPicker value to slide background format
              // ColorPicker returns: string for colors, or { type: 'linear'|'radial', angle: number, stops: Array } for gradients
              let backgroundValue: string | { type: 'color' | 'gradient' | 'image' | 'video'; value: string | object; opacity?: number };
              
              if (typeof value === 'string') {
                backgroundValue = value;
              } else if (value && typeof value === 'object') {
                // Gradient object from ColorPicker
                backgroundValue = {
                  type: 'gradient',
                  value: value,
                };
              } else {
                backgroundValue = '#ffffff';
              }
              
              editor.updateSlide(selectedSlideId, {
                background: backgroundValue,
              });
            }}
          />
        )}
      </div>

      {/* Slide Number */}
      <div className="space-y-2">
        <Label className={SECTION_HEADING}>Slide Number</Label>
        <Input
          type="text"
          value={slide.customSlideNumber || ''}
          onChange={(e) => editor.updateSlide(selectedSlideId, { 
            customSlideNumber: e.target.value || undefined 
          })}
          placeholder="Auto"
          className="h-9"
        />
      </div>

      {/* Hidden */}
      <div className="space-y-2">
        <label className="flex items-center gap-3 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={slide.hidden || false}
            onChange={(e) => editor.updateSlide(selectedSlideId, { hidden: e.target.checked })}
            className="h-4 w-4 rounded border border-input bg-background text-primary focus:ring-primary focus:ring-offset-0"
          />
          Hide slide in presentation
        </label>
      </div>

      {/* Duration (for auto-advance) */}
      {deck?.settings?.presentation?.autoAdvance && (
        <div className="space-y-2">
          <Label className={SECTION_HEADING}>Duration (seconds)</Label>
          <Input
            type="number"
            min={1}
            max={300}
            value={slide.duration || deck.settings.presentation?.autoAdvanceDelay || 5}
            onChange={(e) => editor.updateSlide(selectedSlideId, { 
              duration: parseInt(e.target.value) || undefined 
            })}
            className="h-9"
          />
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInputChange}
      />

      <ImageBackgroundModal
        open={showImageModal}
        onClose={() => {
          setShowImageModal(false);
          setImageModalInitialTab('generate');
          setImageStatus({ isGenerating: false, error: null, success: null });
        }}
        onGenerate={(prompt, mode) => handleGenerateImage(prompt, mode)}
        onUpload={(mode) => {
          if (mode === 'background') {
            setBackgroundType('image');
            setImageStatus({ isGenerating: false, error: null, success: null });
            openFilePicker();
          } else {
            setImageStatus({ isGenerating: false, error: 'Image elements must be added from the toolbar.', success: null });
          }
        }}
        status={imageStatus}
        initialTab={imageModalInitialTab}
        libraryItems={imageLibraryItems}
        onSelectFromLibrary={handleSelectLibraryImage}
        onRefreshLibrary={handleLibraryRefresh}
        libraryStatus={{
          isLoading: isLibraryRefreshing,
          isSyncing: isLibrarySyncing,
          error: imageLibraryError,
        }}
      />

      {/* Refine Image Modal */}
      {showRefineModal && mounted && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowRefineModal(false);
              setRefineRequest('');
            }
          }}
        >
          <div
          className="w-full max-w-xl rounded-2xl border border-border/60 bg-card/95 p-6 text-foreground shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-card/80"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <h2 className="text-lg font-semibold text-foreground">
                Refine Image
              </h2>
              <button
                onClick={() => {
                  setShowRefineModal(false);
                  setRefineRequest('');
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
                aria-label="Close refine image dialog"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="mb-2 block text-sm font-medium text-muted-foreground">
                  How would you like to refine this image?
                </Label>
                <textarea
                  value={refineRequest}
                  onChange={(e) => setRefineRequest(e.target.value)}
                  placeholder="e.g., make it more vibrant, change the lighting, add more detail..."
                  className={cn(
                    "w-full rounded-xl border border-border/60 bg-card/80 p-3 text-sm text-foreground",
                    "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  )}
                  rows={4}
                  autoFocus
                />
              </div>

              {imageStatus.isGenerating && (
                <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm text-blue-200">
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating refined image... This may take 10-30 seconds.
                  </div>
                </div>
              )}

              {imageStatus.error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {imageStatus.error}
                </div>
              )}

              {imageStatus.success && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                  {imageStatus.success}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowRefineModal(false);
                    setRefineRequest('');
                    setImageStatus({ isGenerating: false, error: null, success: null });
                  }}
                  className="flex-1"
                  disabled={imageStatus.isGenerating}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleRefineImage}
                  disabled={imageStatus.isGenerating || !refineRequest.trim()}
                  className="flex-1"
                >
                  {imageStatus.isGenerating ? 'Refining...' : 'Refine'}
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 3.5L17 8l-3.5 1.5L12 13l-1.5-3.5L7 8l3.5-1.5L12 3z" />
      <path d="M5 15l.75 1.75L7.5 17.5 5.75 18.25 5 20l-.75-1.75L2.5 17.5l1.75-.75L5 15z" />
      <path d="M19 13l.75 1.75L21.5 15.5 19.75 16.25 19 18l-.75-1.75L16.5 15.5l1.75-.75L19 13z" />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" />
      <path d="M12 3v14" />
      <path d="M7 8l5-5 5 5" />
    </svg>
  );
}

function LibraryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16v16H4z" />
      <path d="M9 4v16" />
      <path d="M15 10h3" />
      <path d="M15 14h3" />
    </svg>
  );
}



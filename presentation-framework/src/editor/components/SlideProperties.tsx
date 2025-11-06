"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useEditor, useEditorInstance } from '../hooks/useEditor';
import { ColorPicker } from './ColorPicker';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { QualitySlider } from '@/components/ui/quality-slider';
import { Badge } from '@/components/ui/badge';
import { ImageBackgroundModal } from './ImageBackgroundModal';
import { Modal } from '@/components/ui/modal';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useImageLibrary } from '../hooks/useImageLibrary';
import type { ImageLibraryItem } from '@/editor/types/imageLibrary';
import type { SlideTransitionType } from '@/rsc/types';
import { getImageGenerationService } from '../services/ImageGenerationService';

const SECTION_HEADING = "text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground";
const MICRO_HEADING = "text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground";

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
  } = useImageLibrary({ autoHydrate: false }); // Don't hydrate on mount - only when image modal opens

  const deck = state.deck;
  const selectedSlideId = state.selectedSlideId;
  const deckId = state.deckId ?? deck?.meta?.id ?? null;
  const slide = deck?.slides.find(s => s.id === selectedSlideId);
  const [isPreviewingTransition, setIsPreviewingTransition] = useState(false);
  const currentSlideIndex = state.currentSlideIndex;

  // Get slide dimensions early for use in hooks
  const slideWidth = deck?.settings?.slideSize?.width ?? 1280;
  const slideHeight = deck?.settings?.slideSize?.height ?? 720;

  // Helper functions defined before hooks (used in useEffect)
  // Gradients are handled via the Color tab, so we map gradient -> color
  const getBackgroundType = (slideToCheck: typeof slide): 'color' | 'image' => {
    if (slideToCheck?.background) {
      if (typeof slideToCheck.background === 'string') return 'color';
      if (slideToCheck.background.type === 'image') return 'image';
      if (slideToCheck.background.type === 'gradient') return 'color'; // Gradients shown in Color tab
    }
    return 'color';
  };

  const getImageBackgroundSafe = () => {
    if (slide?.background && typeof slide.background === 'object' && slide.background.type === 'image') {
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

  // Derive image data before using it in hooks
  const imageData = useMemo(() => getImageBackgroundSafe(), [slide?.background]);
  
  // ALL HOOKS MUST BE DECLARED BEFORE ANY EARLY RETURNS
  // This ensures hooks are always called in the same order
  
  // Use default value - will be updated in useEffect when slide is available
  const [backgroundType, setBackgroundType] = useState<'color' | 'image'>('color');
  const [showImageModal, setShowImageModal] = useState(false);
  const [showRefineModal, setShowRefineModal] = useState(false);
  const [refineRequest, setRefineRequest] = useState('');
  const [refineQualityLevel, setRefineQualityLevel] = useState<number>(0); // 0=fast, 1=good, 2=great, 3=premium, 4=ultimate
  const [imageModalInitialTab, setImageModalInitialTab] = useState<'generate' | 'upload' | 'library'>('generate');

  // Derive model and quality from slider position
  // 0: Fast → Fireworks + flux-1-schnell-fp8
  // 1: Good → Fireworks + flux-1-dev-fp8
  // 2: Great → Fireworks + flux-kontext-pro
  // 3: Premium → Fireworks + TBD (4th model variant)
  // 4: Ultimate → OpenAI + gpt-image-1
  const getRefineModelAndQuality = (level: number): { model: 'openai' | 'flux'; quality: 'quick' | 'polish' | 'heroic' } => {
    switch (level) {
      case 0:
        return { model: 'flux', quality: 'quick' }; // flux-1-schnell-fp8
      case 1:
        return { model: 'flux', quality: 'polish' }; // flux-1-dev-fp8
      case 2:
        return { model: 'flux', quality: 'heroic' }; // flux-kontext-pro
      case 3:
        return { model: 'flux', quality: 'heroic' }; // TBD - need 4th Fireworks model
      case 4:
        return { model: 'openai', quality: 'quick' }; // OpenAI gpt-image-1
      default:
        return { model: 'flux', quality: 'quick' };
    }
  };

  const { model: refineModel, quality: refineQuality } = getRefineModelAndQuality(refineQualityLevel);
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
  const [previewScale, setPreviewScale] = useState(1);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  // Cache previous background values by type to restore when switching back
  const backgroundCacheRef = useRef<{
    color?: string | { type: 'color'; value: string; opacity?: number };
    gradient?: { type: 'gradient'; value: object | string; opacity?: number };
    image?: { type: 'image'; value: object | string; opacity?: number };
  }>({});


  useEffect(() => {
    if (showImageModal) {
      void refreshImageLibrary();
    }
  }, [showImageModal, refreshImageLibrary]);

  // Callback to handle preview element ref and calculate scale
  const handlePreviewRef = useCallback((el: HTMLDivElement | null) => {
    // Clean up previous observer
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }

    // Set the ref
    imagePreviewRef.current = el;

    if (el) {
      // Calculate scale immediately
      const updateScale = () => {
        const previewWidth = el.offsetWidth;
        const scale = previewWidth / slideWidth;
        console.log('[Preview Scale] Updated:', { previewWidth, slideWidth, scale });
        setPreviewScale(scale);
      };

      // Use setTimeout to ensure element is fully laid out
      setTimeout(updateScale, 0);

      // Set up ResizeObserver for future changes
      resizeObserverRef.current = new ResizeObserver(updateScale);
      resizeObserverRef.current.observe(el);
    }
  }, [slideWidth]);

  // Cleanup ResizeObserver on unmount
  useEffect(() => {
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, []);

  // Sync backgroundType when slide changes and update cache
  useEffect(() => {
    if (!slide) return;
    const currentType = getBackgroundType(slide);
    setBackgroundType(currentType);
    
    // Update cache with current background value
    const currentBg = slide.background;
    if (currentBg) {
      if (currentType === 'color') {
        if (typeof currentBg === 'string') {
          backgroundCacheRef.current.color = currentBg;
        } else if (typeof currentBg === 'object' && currentBg.type === 'color') {
          backgroundCacheRef.current.color = currentBg as { type: 'color'; value: string; opacity?: number };
        }
      } else if (currentType === 'image' && typeof currentBg === 'object' && currentBg.type === 'image') {
        backgroundCacheRef.current.image = currentBg as { type: 'image'; value: object | string; opacity?: number };
      }
    }
  }, [selectedSlideId, slide?.background]);

  const updateImageBackground = useCallback((updates: Record<string, unknown>) => {
    if (!selectedSlideId || !slide) return;
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
  }, [editor, selectedSlideId, slide?.background]);

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

    // Trigger immediate save to extract large base64 image as asset
    // This prevents JSON.stringify errors on subsequent edits
    console.log('[SlideProperties] Triggering immediate save after image upload');
    setTimeout(() => {
      editor.saveDeck();
    }, 100);
  }, [updateImageBackground, addImageToLibrary, deckId, editor]);

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

  const handleGenerateImage = useCallback(async (prompt: string, mode: 'background' | 'element', model: 'openai' | 'flux' = 'flux', quality: 'quick' | 'polish' | 'heroic' = 'quick', polishEnabled?: boolean) => {
    console.log('[SlideProperties] handleGenerateImage called:', { mode, model, quality, polishEnabled });

    if (mode !== 'background') {
      // For image elements, we'd need to add to slide elements, but SlideProperties is only for backgrounds
      setImageStatus({ isGenerating: false, error: 'Image elements must be added from the toolbar.', success: null });
      return;
    }

    if (!deckId) {
      setImageStatus({ isGenerating: false, error: 'Deck ID is required.', success: null });
      return;
    }

    try {
      setImageStatus({ isGenerating: true, error: null, success: null });

      // Get slide dimensions from deck settings
      const slideWidth = deck?.settings?.slideSize?.width ?? 1280;
      const slideHeight = deck?.settings?.slideSize?.height ?? 720;

      console.log('[SlideProperties] Calling imageService.generateBackground with:', { model, quality });

      // Use service for image generation
      const imageService = getImageGenerationService();
      const result = await imageService.generateBackground({
        prompt,
        width: slideWidth,
        height: slideHeight,
        deckId,
        model,
        quality,
      });

      const imageDataResponse = result.imageData;
      const meta = result.meta;

      if (!imageDataResponse) {
        throw new Error('No image returned by generator.');
      }

      // Calculate qualityLevel for storage (0-4 scale)
      const getQualityLevel = (model: string, quality: string): number => {
        if (model === 'openai') return 4; // Ultimate
        if (model === 'flux') {
          if (quality === 'quick') return 0; // Fast
          if (quality === 'polish') return 1; // Good
          if (quality === 'heroic') return 2; // Great
        }
        return 0; // Default to Fast
      };

      const qualityLevel = getQualityLevel(model, quality);

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
          qualityLevel,
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
        qualityLevel,
        prompt,
        libraryItemId: libraryItem.id,
      });

      setImageStatus({ isGenerating: false, error: null, success: 'Generated background applied.' });
      setTimeout(() => setShowImageModal(false), 1200);

      // Trigger immediate save to extract large base64 image as asset
      // This prevents JSON.stringify errors on subsequent edits
      console.log('[SlideProperties] Triggering immediate save after AI image generation');
      setTimeout(() => {
        editor.saveDeck();
      }, 100);

      // If polish is enabled, generate polish version in background and swap when ready
      if (polishEnabled && model === 'flux') {
        console.log('[SlideProperties] Starting polish generation in background...');
        const imageService = getImageGenerationService();
        imageService.generatePolishAsync(
          {
            prompt,
            width: slideWidth,
            height: slideHeight,
            deckId,
            model: 'flux',
            quality: 'polish',
          },
          (polishResult) => {
            console.log('[SlideProperties] Polish generation completed, swapping image');
            const polishGeneratedAt = new Date().toISOString();

            // Update library item if it exists
            if (libraryItem.id) {
              updateLibraryItem(libraryItem.id, (existing) => ({
                ...existing,
                dataUrl: polishResult.imageData,
                thumbnailDataUrl: polishResult.imageData,
                updatedAt: polishGeneratedAt,
                metadata: {
                  ...existing.metadata,
                  quality: polishResult.meta?.quality ?? 'polish',
                  qualityLevel: 1, // Good (polish)
                  generatedAt: polishGeneratedAt,
                },
              }));
            }

            // Update slide background with polish version
            updateImageBackground({
              src: polishResult.imageData,
              offsetX: 0,
              offsetY: 0,
              scale: 100,
              generatedAt: polishGeneratedAt,
              source: 'ai',
              provider: polishResult.meta?.provider ?? 'fireworks',
              quality: polishResult.meta?.quality ?? 'polish',
              qualityLevel: 1, // Good (polish)
              prompt,
              libraryItemId: libraryItem.id,
            });
          },
          (error) => {
            console.error('[SlideProperties] Polish generation failed:', error);
            // Don't show error to user - quick version is already applied
          }
        );
      }
    } catch (error) {
      console.error('AI background generation failed:', error);
      setImageStatus({
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Image generation failed.',
        success: null,
      });
    }
  }, [updateImageBackground, addImageToLibrary, updateLibraryItem, deckId, deck, slide]);

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

      // Polish quality uses quick first, then upgrades in background
      const polishEnabled = refineQuality === 'polish';
      const finalQuality = refineQuality === 'polish' ? 'quick' : refineQuality;

      console.log('Refining image with:', {
        originalPrompt,
        refinement: refineRequest.trim(),
        width: slideWidth,
        height: slideHeight,
        model: refineModel,
        quality: finalQuality,
        polishEnabled,
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
          model: refineModel,
          quality: finalQuality,
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

      // Update with refined image
      // Use the refineRequest as the new prompt (user can edit the full prompt)
      const refinedPrompt = refineRequest.trim();
      const generatedAt = new Date().toISOString();
      const refinementEntry = {
        id: `ref-${Date.now()}`,
        prompt: refineRequest.trim(),
        previousPrompt: originalPrompt,
        createdAt: generatedAt,
      };

      // Calculate qualityLevel for storage (0-4 scale)
      const getQualityLevel = (model: string, quality: string): number => {
        if (model === 'openai') return 4; // Ultimate
        if (model === 'flux') {
          if (quality === 'quick') return 0; // Fast
          if (quality === 'polish') return 1; // Good
          if (quality === 'heroic') return 2; // Great
        }
        return 0; // Default to Fast
      };

      const refinedQualityLevel = getQualityLevel(refineModel, refineQuality);

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
            qualityLevel: refinedQualityLevel,
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
            qualityLevel: refinedQualityLevel,
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
        qualityLevel: refinedQualityLevel,
        prompt: refinedPrompt,
        refinement: refineRequest.trim(),
        libraryItemId,
      });

      setImageStatus({ isGenerating: false, error: null, success: 'Image refined successfully.' });
      setShowRefineModal(false);
      setRefineRequest('');
      setRefineQualityLevel(0);
      setTimeout(() => setImageStatus({ isGenerating: false, error: null, success: null }), 2000);

      // If polish is enabled, generate polish version in background and swap when ready
      if (polishEnabled && refineModel === 'flux' && libraryItemId) {
        console.log('[SlideProperties] Starting polish refinement in background...');
        const polishResponse = await fetch('/api/ai/refine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: imageDataResponse, // Use the quick refined version as input
            originalPrompt: refinedPrompt,
            refinement: 'enhanced quality',
            width: slideWidth,
            height: slideHeight,
            model: 'flux',
            quality: 'polish',
          }),
        }).catch((error) => {
          console.error('[SlideProperties] Polish refinement failed:', error);
          return null;
        });

        if (polishResponse && polishResponse.ok) {
          const polishData = await polishResponse.json();
          const polishImageData = polishData?.image;
          const polishMeta = polishData?.meta;

          if (polishImageData) {
            console.log('[SlideProperties] Polish refinement completed, swapping image');
            const polishGeneratedAt = new Date().toISOString();

            // Update library item
            updateLibraryItem(libraryItemId, (existing) => ({
              ...existing,
              dataUrl: polishImageData,
              thumbnailDataUrl: polishImageData,
              updatedAt: polishGeneratedAt,
              metadata: {
                ...existing.metadata,
                quality: polishMeta?.quality ?? 'polish',
                generatedAt: polishGeneratedAt,
              },
            }));

            // Update slide background with polish version
            updateImageBackground({
              src: polishImageData,
              offsetX: imageData.offsetX,
              offsetY: imageData.offsetY,
              scale: imageData.scale,
              generatedAt: polishGeneratedAt,
              source: 'ai',
              provider: polishMeta?.provider ?? 'fireworks',
              quality: polishMeta?.quality ?? 'polish',
              prompt: refinedPrompt,
              libraryItemId,
            });
          }
        }
      }
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
  }, [refineRequest, refineModel, refineQuality, imageData, deck, updateImageBackground, updateLibraryItem, addImageToLibrary, deckId, slide]);

  const handleImageDragStart = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!imageData.src) return;
    event.preventDefault();
    console.log('[Drag Start]', { offsetX: imageData.offsetX, offsetY: imageData.offsetY, previewScale });
    isDraggingImageRef.current = true;
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      offsetX: imageData.offsetX,
      offsetY: imageData.offsetY,
    };
  }, [imageData.offsetX, imageData.offsetY, imageData.src, previewScale]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isDraggingImageRef.current) return;
      const deltaX = event.clientX - dragStartRef.current.x;
      const deltaY = event.clientY - dragStartRef.current.y;

      // Convert preview pixel delta to slide pixel delta using the preview scale
      const nextOffsetX = Math.round(dragStartRef.current.offsetX + deltaX / previewScale);
      const nextOffsetY = Math.round(dragStartRef.current.offsetY + deltaY / previewScale);
      console.log('[Drag Move]', { deltaX, deltaY, previewScale, nextOffsetX, nextOffsetY });
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
  }, [updateImageBackground, previewScale]);

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

    // Trigger immediate save to extract large base64 image as asset
    // This prevents JSON.stringify errors on subsequent edits
    console.log('[SlideProperties] Triggering immediate save after selecting library image');
    setTimeout(() => {
      editor.saveDeck();
    }, 100);
  }, [updateImageBackground, editor]);

  const previewSlideTransition = useCallback(() => {
    if (!slide?.transitions?.in || !deck || isPreviewingTransition) return;
    setIsPreviewingTransition(true);

    // Preview by briefly navigating to next slide and back
    const nextSlideIndex = currentSlideIndex + 1;
    const totalSlides = deck.slides.length;
    
    if (nextSlideIndex < totalSlides) {
      // Navigate to next slide
      editor.setCurrentSlide(nextSlideIndex);
      
      // Then navigate back after transition completes
      const duration = slide.transitions.in.duration || 500;
      setTimeout(() => {
        editor.setCurrentSlide(currentSlideIndex);
        setTimeout(() => {
          setIsPreviewingTransition(false);
        }, 100);
      }, duration + 100);
    } else {
      // If no next slide, just briefly trigger a "slide change" effect and reset
      const duration = slide.transitions.in.duration || 500;
      // We can't actually trigger the transition without a second slide, so just indicate it completed
      setTimeout(() => {
        setIsPreviewingTransition(false);
      }, duration + 100);
    }
  }, [slide, deck, currentSlideIndex, editor, isPreviewingTransition]);

  // Early returns AFTER all hooks are declared
  if (!deck || !selectedSlideId || !slide) {
    return (
      <div className="text-sm italic text-muted-foreground">
        {!deck || !selectedSlideId ? 'No slide selected' : 'Slide not found'}
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

      {/* Master Slide Template */}
      {deck.settings?.theme?.masterSlides && deck.settings.theme.masterSlides.length > 0 && (
        <div className="space-y-2">
          <Label className={SECTION_HEADING}>Template</Label>
          <select
            value={slide.masterSlideId || ''}
            onChange={(e) => {
              const masterSlideId = e.target.value || null;
              editor.applyMasterSlideToSlide(selectedSlideId, masterSlideId);
            }}
            className="w-full px-3 py-1.5 text-sm border border-border/30 rounded-xl bg-card/98 text-foreground"
          >
            <option value="">None (Custom)</option>
            {deck.settings.theme.masterSlides.map((ms) => (
              <option key={ms.id} value={ms.id}>
                {ms.name}
              </option>
            ))}
          </select>
          {slide.masterSlideId && (
            <p className="text-xs text-muted-foreground">
              Using template &quot;{deck.settings.theme.masterSlides.find((ms) => ms.id === slide.masterSlideId)?.name}&quot;
            </p>
          )}
        </div>
      )}

      {/* Background */}
      <div className="space-y-3">
        <div>
          <Label className={SECTION_HEADING}>Background</Label>
        </div>
        <div className="w-full">
          <SegmentedControl
            items={[
              { value: 'color', label: 'Color' },
              { value: 'image', label: 'Image' },
            ]}
            value={backgroundType}
            className="w-full"
            onValueChange={(value) => {
            const newType = value as 'color' | 'image';
            const currentBg = slide.background;
            const currentType = getBackgroundType(slide);
            
            // Save current background to cache before switching
            if (currentBg) {
              if (currentType === 'color') {
                if (typeof currentBg === 'string') {
                  backgroundCacheRef.current.color = currentBg;
                } else if (typeof currentBg === 'object' && currentBg.type === 'color') {
                  backgroundCacheRef.current.color = currentBg as { type: 'color'; value: string; opacity?: number };
                } else if (typeof currentBg === 'object' && currentBg.type === 'gradient') {
                  // Also cache gradients under color since they're handled in Color tab
                  backgroundCacheRef.current.color = currentBg as any;
                }
              } else if (currentType === 'image' && typeof currentBg === 'object' && currentBg.type === 'image') {
                backgroundCacheRef.current.image = currentBg as { type: 'image'; value: object | string; opacity?: number };
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
        </div>

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

              {!imageData.src.startsWith('data:') && (
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
                    placeholder="https://..."
                    className="h-9"
                  />
                </div>
              )}
              
              {imageData.src && (() => {
                // Get slide dimensions and calculate aspect ratio for preview
                const slideWidth = deck?.settings?.slideSize?.width ?? 1280;
                const slideHeight = deck?.settings?.slideSize?.height ?? 720;

                // Scale offsets from slide space to preview space
                const scaledOffsetX = imageData.offsetX * previewScale;
                const scaledOffsetY = imageData.offsetY * previewScale;

                // Match EditorCanvas behavior: use 'center' when offsets are both 0
                const backgroundPosition = (imageData.offsetX !== 0 || imageData.offsetY !== 0)
                  ? `${scaledOffsetX}px ${scaledOffsetY}px`
                  : 'center';

                // Match EditorCanvas behavior: use cover when scale is 100, otherwise use scale percentage
                const backgroundSize = imageData.scale !== 100
                  ? `${imageData.scale}%`
                  : 'cover';

                console.log('[Preview Render]', {
                  offsetX: imageData.offsetX,
                  offsetY: imageData.offsetY,
                  previewScale,
                  scaledOffsetX,
                  scaledOffsetY,
                  scale: imageData.scale,
                  backgroundPosition,
                  backgroundSize
                });

                return (
                  <>
                    <div
                      ref={handlePreviewRef}
                      className="relative w-full overflow-hidden rounded-xl bg-muted/40 cursor-move"
                      style={{
                        aspectRatio: `${slideWidth} / ${slideHeight}`,
                        backgroundImage: `url(${imageData.src})`,
                        backgroundPosition,
                        backgroundSize,
                        backgroundRepeat: 'no-repeat',
                        border: '1px solid rgba(22, 194, 199, 0.4)',
                      }}
                      onMouseDown={handleImageDragStart}
                    >
                    <div className="absolute left-1/2 top-1/2 flex w-full -translate-x-1/2 -translate-y-1/2 justify-center pointer-events-none">
                      <span className="rounded-full bg-black/40 px-3 py-1 text-xs text-white">
                        Drag to reposition
                      </span>
                    </div>
                    
                    {/* Remove image button - top right corner */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Remove image background - set to default white
                        editor.updateSlide(selectedSlideId, {
                          background: '#ffffff',
                        });
                        setBackgroundType('color');
                      }}
                      className="absolute right-2 top-2 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                      aria-label="Remove background image"
                      title="Remove background image"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-3.5 w-3.5"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>

                  {/* Image Metadata Info */}
                  {(() => {
                    const meta = imageData.meta as any;
                    const provider = meta?.provider;
                    const quality = meta?.quality;
                    const source = meta?.source;

                    // Only show if we have metadata to display
                    if (!provider && !quality && !source) return null;

                    // Format the provider name for display
                    const formatProvider = (p: string) => {
                      if (p === 'openai') return 'OpenAI';
                      if (p === 'flux') return 'Flux';
                      return p;
                    };

                    // Format quality for display
                    const formatQuality = (q: string) => {
                      if (q === 'hd') return 'HD';
                      if (q === 'quick') return 'Quick';
                      if (q === 'polish') return 'Polish';
                      if (q === 'heroic') return 'Heroic';
                      return q;
                    };

                    return (
                      <div className="flex items-center justify-center gap-1.5 flex-wrap pt-2">
                        {provider && (
                          <Badge
                            variant="outline"
                            className="rounded-full bg-primary/5 text-primary border-gray-200/60 dark:border-gray-700/60 px-3 py-1 text-[0.7rem] font-medium shadow-sm"
                          >
                            {formatProvider(provider)}
                          </Badge>
                        )}
                        {quality && (
                          <Badge
                            variant="outline"
                            className="rounded-full bg-card text-foreground border-gray-200/60 dark:border-gray-700/60 px-3 py-1 text-[0.7rem] font-medium shadow-sm"
                          >
                            {formatQuality(quality)}
                          </Badge>
                        )}
                        {source && (
                          <Badge
                            variant="outline"
                            className="rounded-full bg-card text-muted-foreground border-gray-200/60 dark:border-gray-700/60 px-3 py-1 text-[0.7rem] font-medium shadow-sm"
                          >
                            {source === 'ai' ? 'AI' : 'Uploaded'}
                          </Badge>
                        )}
                      </div>
                    );
                  })()}

                  {/* Refine Image Button - Only show for AI-generated images */}
                  {(() => {
                    const hasPrompt = (imageData.meta as any)?.prompt;
                    console.log('Refine button check:', { hasPrompt, meta: imageData.meta, showRefineModal });
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

                          // Reset first to prevent appending
                          setRefineRequest('');
                          setRefineQualityLevel(0);

                          // Then set the original prompt and quality level
                          const originalPrompt = (imageData.meta as any)?.prompt || '';
                          const originalQuality = (imageData.meta as any)?.qualityLevel;

                          // Use setTimeout to ensure state is cleared before setting new values
                          setTimeout(() => {
                            setRefineRequest(originalPrompt);
                            if (typeof originalQuality === 'number') {
                              setRefineQualityLevel(originalQuality);
                            }
                            setShowRefineModal(true);
                          }, 0);
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
                    <Slider
                      value={[imageData.scale]}
                      min={50}
                      max={200}
                      step={1}
                      onValueChange={(value) => handleScaleChange(value[0] ?? imageData.scale)}
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

        {backgroundType === 'color' && (
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


      {/* Transitions */}
      <Separator className="bg-border/20" />
      <div className="space-y-3">
        <Label className={SECTION_HEADING}>Slide Transitions</Label>
        <div className="space-y-2">
          <div>
            <Label className={MICRO_HEADING} style={{ fontSize: '0.65rem' }}>Entry Transition</Label>
            <select
              value={slide.transitions?.in?.type || 'none'}
              onChange={(e) => {
                const type = e.target.value as SlideTransitionType | 'none';
                const currentTransitions = slide.transitions || {};
                if (type === 'none') {
                  editor.updateSlide(selectedSlideId, {
                    transitions: { ...currentTransitions, in: undefined },
                  });
                } else {
                  editor.updateSlide(selectedSlideId, {
                    transitions: {
                      ...currentTransitions,
                      in: {
                        type,
                        duration: 500,
                        easing: 'ease-in-out',
                      },
                    },
                  });
                }
              }}
              className="w-full px-3 py-1.5 text-sm border border-border/30 rounded-xl bg-card/98 text-foreground"
            >
              <option value="none">None</option>
              <optgroup label="Basic">
                <option value="fade">Fade</option>
                <option value="dissolve">Dissolve</option>
              </optgroup>
              <optgroup label="Push">
                <option value="push-left">Push Left</option>
                <option value="push-right">Push Right</option>
                <option value="push-up">Push Up</option>
                <option value="push-down">Push Down</option>
              </optgroup>
              <optgroup label="Wipe">
                <option value="wipe-left">Wipe Left</option>
                <option value="wipe-right">Wipe Right</option>
                <option value="wipe-up">Wipe Up</option>
                <option value="wipe-down">Wipe Down</option>
              </optgroup>
              <optgroup label="3D">
                <option value="cube-left">Cube Left</option>
                <option value="cube-right">Cube Right</option>
                <option value="flip-left">Flip Left</option>
                <option value="flip-right">Flip Right</option>
                <option value="rotate">Rotate</option>
              </optgroup>
            </select>
          </div>
          <div>
            <Label className={MICRO_HEADING} style={{ fontSize: '0.65rem' }}>Exit Transition</Label>
            <select
              value={slide.transitions?.out?.type || 'none'}
              onChange={(e) => {
                const type = e.target.value as SlideTransitionType | 'none';
                const currentTransitions = slide.transitions || {};
                if (type === 'none') {
                  editor.updateSlide(selectedSlideId, {
                    transitions: { ...currentTransitions, out: undefined },
                  });
                } else {
                  editor.updateSlide(selectedSlideId, {
                    transitions: {
                      ...currentTransitions,
                      out: {
                        type,
                        duration: 500,
                        easing: 'ease-in-out',
                      },
                    },
                  });
                }
              }}
              className="w-full px-3 py-1.5 text-sm border border-border/30 rounded-xl bg-card/98 text-foreground"
            >
              <option value="none">None</option>
              <optgroup label="Basic">
                <option value="fade">Fade</option>
                <option value="dissolve">Dissolve</option>
              </optgroup>
              <optgroup label="Push">
                <option value="push-left">Push Left</option>
                <option value="push-right">Push Right</option>
                <option value="push-up">Push Up</option>
                <option value="push-down">Push Down</option>
              </optgroup>
              <optgroup label="Wipe">
                <option value="wipe-left">Wipe Left</option>
                <option value="wipe-right">Wipe Right</option>
                <option value="wipe-up">Wipe Up</option>
                <option value="wipe-down">Wipe Down</option>
              </optgroup>
              <optgroup label="3D">
                <option value="cube-left">Cube Left</option>
                <option value="cube-right">Cube Right</option>
                <option value="flip-left">Flip Left</option>
                <option value="flip-right">Flip Right</option>
                <option value="rotate">Rotate</option>
              </optgroup>
            </select>
          </div>
          {(slide.transitions?.in?.type || slide.transitions?.out?.type) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className={MICRO_HEADING} style={{ fontSize: '0.65rem' }}>Duration (ms)</Label>
                <span className="text-xs text-foreground/60">
                  {slide.transitions?.in?.duration || slide.transitions?.out?.duration || 500}ms
                </span>
              </div>
              <Slider
                value={[slide.transitions?.in?.duration || slide.transitions?.out?.duration || 500]}
                min={100}
                max={2000}
                step={50}
                onValueChange={(value) => {
                  const duration = value[0] ?? 500;
                  const currentTransitions = slide.transitions || {};
                  const updates: any = {};
                  if (currentTransitions.in) updates.in = { ...currentTransitions.in, duration };
                  if (currentTransitions.out) updates.out = { ...currentTransitions.out, duration };
                  editor.updateSlide(selectedSlideId, {
                    transitions: { ...currentTransitions, ...updates },
                  });
                }}
                className="flex-1"
              />
            </div>
          )}
          {(slide.transitions?.in?.type || slide.transitions?.out?.type) && (
            <div className="mt-4">
              <Button
                onClick={previewSlideTransition}
                disabled={isPreviewingTransition || !slide.transitions?.in?.type}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {isPreviewingTransition ? 'Playing...' : '▶ Preview'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Hidden */}
      <div className="space-y-2">
        <label className="flex items-center gap-3 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={slide.hidden || false}
            onChange={(e) => editor.updateSlide(selectedSlideId, { hidden: e.target.checked })}
            className="h-4 w-4 rounded border bg-background text-primary focus:ring-primary focus:ring-offset-0"
            style={{ borderColor: 'rgba(148, 163, 184, 0.3)' }}
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
      <Modal
        open={showRefineModal}
        onClose={() => {
          setShowRefineModal(false);
          setRefineRequest('');
          setRefineQualityLevel(0);
        }}
        size="md"
        tone="brand"
      >
        <Modal.Header className="gap-3 bg-transparent">
          <Modal.Title>Refine Image</Modal.Title>
          <Modal.Description>
            Describe how you'd like to polish this background or element.
          </Modal.Description>
        </Modal.Header>

        <Modal.Body className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Refinement Prompt</Label>
            <textarea
              value={refineRequest}
              onChange={(e) => setRefineRequest(e.target.value)}
              placeholder="e.g., soften the lighting, add subtle depth of field, increase vibrancy..."
              className={cn(
                "w-full rounded-xl border border-border/60 bg-card/80 p-3 text-sm text-foreground",
                "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              )}
              rows={4}
              autoFocus
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm text-muted-foreground">Quality</Label>
            <QualitySlider
              value={[refineQualityLevel]}
              onValueChange={(value) => setRefineQualityLevel(value[0] ?? 0)}
              options={['Fast', 'Good', 'Great', 'Premium', 'Ultimate']}
            />
            <p className="text-xs text-muted-foreground text-center">
              {refineQualityLevel === 0 && 'Fireworks AI • Instant response'}
              {refineQualityLevel === 1 && 'Fireworks AI • Better quality, auto-swaps when ready'}
              {refineQualityLevel === 2 && 'Fireworks AI • Premium quality'}
              {refineQualityLevel === 3 && 'Fireworks AI • Professional grade'}
              {refineQualityLevel === 4 && 'OpenAI • Highest quality'}
            </p>
          </div>

          {imageStatus.isGenerating && (
            <div className="rounded-lg border border-primary/40 bg-primary/15 px-3 py-2 text-sm text-foreground">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="font-medium">Generating refined image... This may take 10-30 seconds.</span>
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
        </Modal.Body>

        <Modal.Footer className="gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setShowRefineModal(false);
              setRefineRequest('');
              setRefineQualityLevel(0);
              setImageStatus({ isGenerating: false, error: null, success: null });
            }}
            disabled={imageStatus.isGenerating}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleRefineImage}
            disabled={imageStatus.isGenerating || !refineRequest.trim()}
          >
            {imageStatus.isGenerating ? 'Refining...' : 'Refine'}
          </Button>
        </Modal.Footer>
      </Modal>
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



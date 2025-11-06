"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { ToolbarButton } from '@/components/ui/toolbar-button';
import { DropdownButton } from '@/components/ui/dropdown-button';
import { useEditor, useEditorInstance } from '../hooks/useEditor';
import { AlignmentTools } from './AlignmentTools';
import { ImageBackgroundModal } from './ImageBackgroundModal';
import { RefinePanel } from './RefinePanel';
import { FontPickerCompact } from './FontPicker';
import { extractFontId } from '@/lib/fonts';
import { useImageLibrary } from '../hooks/useImageLibrary';
import type { ImageLibraryItem } from '@/editor/types/imageLibrary';
import { getImageGenerationService } from '../services/ImageGenerationService';
import { getAlignmentService } from '../services/AlignmentService';
import { getRefineService } from '../services/RefineService';
import type { RefineMessage, RefineRequest } from '../services/RefineService';

interface ToolbarProps {
  deckId: string;
  onToggleTimeline: () => void;
}

export function Toolbar({ deckId, onToggleTimeline }: ToolbarProps) {
  const { data: session } = useSession();
  const state = useEditor();
  const editor = useEditorInstance();

  const {
    items: imageLibraryItems,
    addItem: addImageToLibrary,
    sync: syncImageLibrary,
    refreshFromServer: refreshImageLibrary,
    isSyncing: isLibrarySyncing,
    lastSyncError: imageLibraryError,
  } = useImageLibrary();

  const showGrid = state.showGrid;
  const deck = state.deck;
  const currentSlideIndex = state.currentSlideIndex;
  const selectedElementIds = state.selectedElementIds;
  const autosaveEnabled = state.autosaveEnabled;
  const lastShapeStyle = state.lastShapeStyle;
  // Ensure we have an active slide ID - prioritize selectedSlideId, fallback to current slide
  const activeSlideId = state.selectedSlideId ?? 
    (deck?.slides?.[currentSlideIndex]?.id) ?? 
    (deck?.slides?.[0]?.id) ?? 
    null;

  const [showAlignMenu, setShowAlignMenu] = useState(false);
  const alignMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backgroundFileInputRef = useRef<HTMLInputElement>(null);
  const [showBackgroundModal, setShowBackgroundModal] = useState(false);
  const [backgroundStatus, setBackgroundStatus] = useState<{ isGenerating: boolean; error: string | null; success: string | null }>(
    { isGenerating: false, error: null, success: null }
  );
  const [uploadMode, setUploadMode] = useState<'background' | 'element'>('background');
  const [isLibraryRefreshing, setIsLibraryRefreshing] = useState(false);
  const [showRefineModal, setShowRefineModal] = useState(false);
  const [refineStatus, setRefineStatus] = useState<{ isProcessing: boolean; error: string | null }>({
    isProcessing: false,
    error: null,
  });
  // Store messages per slide - keyed by slideId
  const [refineMessagesBySlide, setRefineMessagesBySlide] = useState<Map<string, RefineMessage[]>>(new Map());
  
  // Track which slides we've attempted to load (to avoid duplicate fetches)
  const loadedSlidesRef = useRef<Set<string>>(new Set());

  // Get messages for current slide
  const refineMessages = activeSlideId ? (refineMessagesBySlide.get(activeSlideId) || []) : [];

  // State for regeneration
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Check if deck was AI-generated (has aiGeneration metadata)
  const isAIGenerated = !!deck?.meta?.aiGeneration;
  
  // Load conversation history when opening refine panel for a slide
  useEffect(() => {
    if (showRefineModal && activeSlideId && deckId) {
      // Only load if we haven't already attempted to load for this slide
      if (!loadedSlidesRef.current.has(activeSlideId)) {
        loadedSlidesRef.current.add(activeSlideId);
        
        const refineService = getRefineService();
        refineService.loadConversationHistory(deckId, activeSlideId)
          .then(messages => {
            if (messages.length > 0) {
              setRefineMessagesBySlide(prev => {
                const newMap = new Map(prev);
                // Only set if we still don't have messages (avoid race conditions)
                if (!newMap.has(activeSlideId)) {
                  newMap.set(activeSlideId, messages);
                }
                return newMap;
              });
            }
          })
          .catch(err => {
            console.error('Failed to load conversation history:', err);
            // Silently fail - we'll just start with empty messages
            // Remove from loaded set so we can retry later
            loadedSlidesRef.current.delete(activeSlideId);
          });
      }
    }
  }, [showRefineModal, activeSlideId, deckId]);
  
  // Close align menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (alignMenuRef.current && !alignMenuRef.current.contains(event.target as Node)) {
        setShowAlignMenu(false);
      }
    };

    if (showAlignMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAlignMenu]);


  useEffect(() => {
    if (showBackgroundModal) {
      void refreshImageLibrary();
    }
  }, [showBackgroundModal, refreshImageLibrary]);

  // Process image files
  const processImageFiles = useCallback((files: File[]) => {
    files.forEach((file) => {
      if (!file || file.size === 0) {
        console.error('Invalid file:', { name: file?.name, size: file?.size });
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        console.error('File is not an image:', { name: file.name, type: file.type });
        return;
      }

      // Convert file to base64 data URL for persistence
      const reader = new FileReader();
      reader.onload = (e) => {
        const originalDataUrl = e.target?.result as string;
        if (!originalDataUrl || typeof originalDataUrl !== 'string') {
          console.error('Failed to read image file:', { 
            fileName: file.name, 
            fileType: file.type,
            hasResult: !!e.target?.result,
            resultType: typeof e.target?.result 
          });
          return;
        }

        // Validate data URL format
        if (!originalDataUrl.startsWith('data:image/')) {
          console.error('Invalid data URL format:', {
            fileName: file.name,
            prefix: originalDataUrl.substring(0, 20),
          });
          return;
        }
        
        // Use createObjectURL instead of data URL for loading the image
        // This avoids CSP/data URL issues and is more efficient
        // We'll still convert to data URL for storage after processing
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        let loadTimeout: ReturnType<typeof setTimeout> | null = null;
        
        img.onload = () => {
          // Clear timeout if image loads successfully
          if (loadTimeout) {
            clearTimeout(loadTimeout);
            loadTimeout = null;
          }
          
          try {
            // Validate image dimensions
            if (img.width === 0 || img.height === 0 || !isFinite(img.width) || !isFinite(img.height)) {
              console.error('Invalid image dimensions:', {
                fileName: file.name,
                width: img.width,
                height: img.height,
              });
              URL.revokeObjectURL(objectUrl);
              return;
            }

            // Calculate size maintaining aspect ratio, max 800px width or height for storage
            // (larger than display size to maintain quality, but small enough to fit in KV)
            const maxStorageSize = 800;
            let displayWidth = img.width;
            let displayHeight = img.height;
            let storageWidth = img.width;
            let storageHeight = img.height;
            
            // Calculate display size (max 400px)
            const maxDisplaySize = 400;
            if (displayWidth > maxDisplaySize || displayHeight > maxDisplaySize) {
              const ratio = Math.min(maxDisplaySize / displayWidth, maxDisplaySize / displayHeight);
              displayWidth = displayWidth * ratio;
              displayHeight = displayHeight * ratio;
            }
            
            // Calculate storage size (max 800px, but use display size if smaller)
            if (storageWidth > maxStorageSize || storageHeight > maxStorageSize) {
              const ratio = Math.min(maxStorageSize / storageWidth, maxStorageSize / storageHeight);
              storageWidth = storageWidth * ratio;
              storageHeight = storageHeight * ratio;
            }
            
            // Use display size for storage if it's smaller (save space)
            if (displayWidth < storageWidth) {
              storageWidth = displayWidth;
              storageHeight = displayHeight;
            }
            
            // Compress image by drawing to canvas at reduced size
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(storageWidth);
            canvas.height = Math.round(storageHeight);
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              console.error('Failed to get canvas context');
              URL.revokeObjectURL(objectUrl);
              return;
            }
            
            // Draw image to canvas (this resizes it)
            ctx.drawImage(img, 0, 0, storageWidth, storageHeight);
            
            // Convert to compressed base64 (JPEG with 0.85 quality)
            // Use JPEG for better compression, PNG only if original was PNG and is small
            const useJpeg = file.type !== 'image/png' || file.size > 100000; // Use JPEG for large PNGs too
            const mimeType = useJpeg ? 'image/jpeg' : 'image/png';
            const quality = useJpeg ? 0.85 : undefined;
            
            const compressedDataUrl = canvas.toDataURL(mimeType, quality);
            
            // Clean up object URL
            URL.revokeObjectURL(objectUrl);
            
            if (!compressedDataUrl || compressedDataUrl.length === 0) {
              console.error('Failed to compress image - canvas.toDataURL returned empty result');
              return;
            }
            
            // Center the image on canvas
            const x = (1280 - displayWidth) / 2;
            const y = (720 - displayHeight) / 2;
            
            const now = new Date().toISOString();
            const libraryItem = addImageToLibrary({
              dataUrl: compressedDataUrl,
              thumbnailDataUrl: compressedDataUrl,
              origin: 'upload',
              metadata: {
                usage: 'element',
                originalFileName: file.name,
                mimeType,
                width: Math.round(storageWidth),
                height: Math.round(storageHeight),
                sizeBytes: file.size,
                uploadedAt: now,
                deckId,
              },
            });

            const imageElement = {
              id: `image-${Date.now()}`,
              type: 'image' as const,
              src: compressedDataUrl, // Store as compressed base64 data URL
              alt: file.name,
              bounds: { x, y, width: displayWidth, height: displayHeight },
              objectFit: 'contain' as const,
              metadata: { libraryItemId: libraryItem.id },
            };
            
            editor.addElement(imageElement, currentSlideIndex);
          } catch (error) {
            URL.revokeObjectURL(objectUrl);
            console.error('Error processing image:', error, {
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
              imageWidth: img.width,
              imageHeight: img.height,
              errorMessage: error instanceof Error ? error.message : String(error),
            });
          }
        };
        img.onerror = (event) => {
          // Clear timeout on error
          if (loadTimeout) {
            clearTimeout(loadTimeout);
            loadTimeout = null;
          }
          
          URL.revokeObjectURL(objectUrl);
          console.error('Error loading image:', {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            dataUrlLength: originalDataUrl?.length,
            dataUrlPrefix: originalDataUrl?.substring(0, 50),
            event: event,
            errorEvent: event instanceof ErrorEvent ? {
              message: event.message,
              filename: event.filename,
              lineno: event.lineno,
              colno: event.colno,
            } : null,
          });
        };
        
        // Set a timeout to detect if image fails to load (10 seconds)
        loadTimeout = setTimeout(() => {
          URL.revokeObjectURL(objectUrl);
          console.error('Image load timeout:', {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
          });
        }, 10000);
        
        // Use object URL instead of data URL for loading
        img.src = objectUrl;
      };
      reader.onerror = (event) => {
        console.error('Error reading file:', {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          event: event,
          errorEvent: event instanceof ErrorEvent ? {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          } : null,
        });
      };
      reader.readAsDataURL(file);
    });
  }, [editor, currentSlideIndex, addImageToLibrary, deckId]);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(f => f && f.size > 0);
      if (files.length) {
        processImageFiles(files);
      }
      // Reset input so same file can be selected again
      e.target.value = '';
    }
  }, [processImageFiles]);

  // Open file picker - MUST be synchronous in click handler
  const handleInsertImageClick = useCallback(() => {
    // Try modern File System Access API first
    if ('showOpenFilePicker' in window) {
      const opts: any = {
        multiple: false,
        types: [{
          description: 'Images',
          accept: { 
            'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif', '.heic', '.heif'] 
          },
        }],
        excludeAcceptAllOption: false,
      };
      
      // This async call is okay - the picker itself can be awaited
      // but we must call it directly from the click handler
      (window as any).showOpenFilePicker(opts)
        .then((handles: any[]) => Promise.all(handles.map((h: any) => h.getFile())))
        .then((files: File[]) => {
          if (files.length) processImageFiles(files);
        })
        .catch((err: any) => {
          // User cancelled or not supported - fall through to input.click()
          if (err?.name !== 'AbortError') {
            // If not cancelled, fall back to input
            const el = fileInputRef.current;
            if (el) {
              el.value = '';
              el.click();
            }
          }
        });
      return;
    }

    // Fallback: hidden input (must be synchronous!)
    const el = fileInputRef.current;
    if (el) {
      el.value = ''; // Reset so selecting same file triggers onChange
      el.click(); // MUST be synchronous - no await/promise before this
    }
  }, [processImageFiles]);

  const setBackgroundFeedback = useCallback((partial: Partial<{ isGenerating: boolean; error: string | null; success: string | null }>) => {
    setBackgroundStatus((prev) => ({
      isGenerating: partial.isGenerating ?? prev.isGenerating,
      error: partial.error ?? null,
      success: partial.success ?? null,
    }));
  }, []);

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

  const compressBackgroundFile = useCallback(async (file: File) => {
    const loadImage = () =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        // Use object URL instead of data URL for better compatibility
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        
        img.onload = () => {
          URL.revokeObjectURL(objectUrl); // Clean up
          resolve(img);
        };
        
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl); // Clean up on error
          reject(new Error('Failed to load image'));
        };
        
        img.src = objectUrl;
      });

    const img = await loadImage();

    const maxWidth = 2560;
    const maxHeight = 1440;
    const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);

    const targetWidth = Math.max(1, Math.round(img.width * scale));
    const targetHeight = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to prepare image canvas');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const prefersPng = file.type === 'image/png' && file.size < 1_500_000;
    const mime = prefersPng ? 'image/png' : 'image/jpeg';
    const quality = mime === 'image/jpeg' ? 0.92 : undefined;

    const dataUrl = canvas.toDataURL(mime, quality);

    return {
      dataUrl,
      width: targetWidth,
      height: targetHeight,
      mime,
      originalWidth: img.width,
      originalHeight: img.height,
    };
  }, []);

  const handleBackgroundFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setBackgroundFeedback({ error: 'Please choose an image file.' });
      return;
    }

    const mode = uploadMode;

    if (mode === 'background') {
      if (!activeSlideId) {
        setBackgroundFeedback({ error: 'Select a slide before setting a background.' });
        return;
      }
    }

    try {
      setBackgroundFeedback({ isGenerating: true, error: null, success: null });
      const processed = await compressBackgroundFile(file);

      if (mode === 'background') {
        const now = new Date().toISOString();
        const libraryItem = addImageToLibrary({
          dataUrl: processed.dataUrl,
          thumbnailDataUrl: processed.dataUrl,
          origin: 'upload',
          metadata: {
            usage: 'background',
            originalFileName: file.name,
            mimeType: processed.mime,
            width: processed.width,
            height: processed.height,
            sizeBytes: file.size,
            uploadedAt: now,
            deckId,
          },
        });

        editor.updateSlide(activeSlideId!, {
          background: {
            type: 'image',
            value: {
              src: processed.dataUrl,
              width: processed.width,
              height: processed.height,
              mimeType: processed.mime,
              originalWidth: processed.originalWidth,
              originalHeight: processed.originalHeight,
              updatedAt: new Date().toISOString(),
              source: 'upload',
              name: file.name,
              offsetX: 0,
              offsetY: 0,
              scale: 100,
              libraryItemId: libraryItem.id,
            },
            opacity: 1,
          },
        });
        setBackgroundFeedback({ isGenerating: false, success: 'Background updated from upload.' });
      } else {
        // Add as image element
        const x = (1280 - 400) / 2;
        const y = (720 - 300) / 2;
        
        const now = new Date().toISOString();
        const libraryItem = addImageToLibrary({
          dataUrl: processed.dataUrl,
          thumbnailDataUrl: processed.dataUrl,
          origin: 'upload',
          metadata: {
            usage: 'element',
            originalFileName: file.name,
            mimeType: processed.mime,
            width: processed.width,
            height: processed.height,
            sizeBytes: file.size,
            uploadedAt: now,
            deckId,
          },
        });

        editor.addElement({
          id: `image-${Date.now()}`,
          type: 'image' as const,
          src: processed.dataUrl,
          alt: file.name,
          bounds: { x, y, width: 400, height: 300 },
          objectFit: 'contain' as const,
          metadata: { libraryItemId: libraryItem.id },
        }, currentSlideIndex);
        setBackgroundFeedback({ isGenerating: false, success: 'Image element added from upload.' });
      }

      setTimeout(() => setShowBackgroundModal(false), 1200);
    } catch (error) {
      console.error('Failed to process image upload:', error);
      setBackgroundFeedback({
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Failed to process image upload.',
      });
    }
  }, [activeSlideId, uploadMode, compressBackgroundFile, editor, setBackgroundFeedback, currentSlideIndex, addImageToLibrary, deckId]);

  const triggerBackgroundUpload = useCallback((mode: 'background' | 'element') => {
    if (mode === 'background') {
      if (!activeSlideId) {
        setBackgroundFeedback({ error: 'Select a slide before setting a background.' });
        return;
      }
    }
    setUploadMode(mode);
    setBackgroundStatus({ isGenerating: false, error: null, success: null });
    const el = backgroundFileInputRef.current;
    if (el) {
      el.value = '';
      el.click();
    }
  }, [activeSlideId, setBackgroundFeedback]);

  const handleGenerateImage = useCallback(async (prompt: string, mode: 'background' | 'element', model: 'openai' | 'flux' = 'flux', quality: 'quick' | 'polish' | 'heroic' = 'quick', polishEnabled: boolean = false) => {
    console.log('[Toolbar] handleGenerateImage called:', { mode, model, quality, polishEnabled });

    if (mode === 'background') {
      if (!activeSlideId) {
        setBackgroundFeedback({ error: 'Select a slide before generating a background.' });
        return;
      }
    }

    if (!deckId) {
      setBackgroundFeedback({ error: 'Deck ID is required.' });
      return;
    }

    try {
      setBackgroundFeedback({ isGenerating: true, error: null, success: null });

      // Get slide dimensions from deck settings
      const slideWidth = deck?.settings?.slideSize?.width ?? 1280;
      const slideHeight = deck?.settings?.slideSize?.height ?? 720;

      console.log('[Toolbar] Calling imageService.generateBackground with:', { model, quality });

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

      const generatedAt = new Date().toISOString();

      if (mode === 'background') {
        const libraryItem = addImageToLibrary({
          dataUrl: result.imageData,
          thumbnailDataUrl: result.imageData,
          origin: 'ai',
          metadata: {
            usage: 'background',
            prompt,
            provider: result.meta?.provider ?? 'openai',
            quality: result.meta?.quality ?? 'hd',
            generatedAt,
            width: slideWidth,
            height: slideHeight,
            deckId,
          },
        });

        editor.updateSlide(activeSlideId!, {
          background: {
            type: 'image',
            value: {
              src: result.imageData,
              offsetX: 0,
              offsetY: 0,
              scale: 100,
              prompt,
              generatedAt,
              source: 'ai',
              provider: result.meta?.provider ?? 'openai',
              quality: result.meta?.quality ?? 'hd',
              libraryItemId: libraryItem.id,
            },
            opacity: 1,
          },
        });

        setBackgroundFeedback({ isGenerating: false, success: 'AI background applied to slide.' });

        // If polish is enabled, generate polish version in background and swap when ready
        if (quality === 'quick' && polishEnabled && activeSlideId) {
          setBackgroundFeedback({ isGenerating: true, error: null, success: 'Generating polished version...' });
          
          imageService.generatePolishAsync(
            {
              prompt,
              width: slideWidth,
              height: slideHeight,
              deckId,
            },
            (polishResult) => {
              // Update slide with polished version
              const polishLibraryItem = addImageToLibrary({
                dataUrl: polishResult.imageData,
                thumbnailDataUrl: polishResult.imageData,
                origin: 'ai',
                metadata: {
                  usage: 'background',
                  prompt,
                  provider: polishResult.meta?.provider ?? 'fireworks',
                  quality: polishResult.meta?.quality ?? 'polish',
                  generatedAt: new Date().toISOString(),
                  width: slideWidth,
                  height: slideHeight,
                  deckId,
                },
              });

              editor.updateSlide(activeSlideId, {
                background: {
                  type: 'image',
                  value: {
                    src: polishResult.imageData,
                    offsetX: 0,
                    offsetY: 0,
                    scale: 100,
                    prompt,
                    generatedAt: new Date().toISOString(),
                    source: 'ai',
                    provider: polishResult.meta?.provider ?? 'fireworks',
                    quality: polishResult.meta?.quality ?? 'polish',
                    libraryItemId: polishLibraryItem.id,
                  },
                  opacity: 1,
                },
              });

              setBackgroundFeedback({ 
                isGenerating: false, 
                success: 'Polished version applied!',
                error: null 
              });
            },
            (error) => {
              console.error('Polish generation failed:', error);
              setBackgroundFeedback({ 
                isGenerating: false, 
                error: null,
                success: 'Quick version applied. Polish generation failed.' 
              });
            }
          );
        }
      } else {
        // Add as image element
        const x = (1280 - 400) / 2;
        const y = (720 - 300) / 2;

        const libraryItem = addImageToLibrary({
          dataUrl: result.imageData,
          thumbnailDataUrl: result.imageData,
          origin: 'ai',
          metadata: {
            usage: 'element',
            prompt,
            provider: result.meta?.provider ?? 'openai',
            quality: result.meta?.quality ?? 'hd',
            generatedAt,
            deckId,
          },
        });

        editor.addElement({
          id: `image-${Date.now()}`,
          type: 'image' as const,
          src: result.imageData,
          alt: prompt.substring(0, 50),
          bounds: { x, y, width: 400, height: 300 },
          objectFit: 'contain' as const,
          metadata: { libraryItemId: libraryItem.id },
        }, currentSlideIndex);

        setBackgroundFeedback({ isGenerating: false, success: 'AI image element added to slide.' });
      }

      setTimeout(() => setShowBackgroundModal(false), 1500);
    } catch (error) {
      console.error('AI image generation failed:', error);
      setBackgroundFeedback({
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Image generation failed.',
      });
    }
  }, [activeSlideId, editor, setBackgroundFeedback, currentSlideIndex, addImageToLibrary, deckId, deck]);

  const applyFunctionCall = useCallback(async (functionName: string, args: any) => {
    console.log('[AI Function Call] applyFunctionCall called:', {
      functionName,
      args,
      timestamp: new Date().toISOString(),
    });
    const currentSlide = deck?.slides[currentSlideIndex];
    if (!currentSlide) {
      console.error('[AI Function Call] No current slide found:', {
        currentSlideIndex,
        totalSlides: deck?.slides.length,
      });
      return;
    }

    try {
      console.log('[AI Function Call] Executing switch case:', functionName);
      switch (functionName) {
        case 'update_slide_content':
          console.log('[AI Function Call] update_slide_content:', args);
          if (args.slideId === currentSlide.id && args.changes) {
            const updates: any = {};
            if (args.changes.title) updates.title = args.changes.title;
            if (args.changes.notes) updates.notes = args.changes.notes;
            if (Object.keys(updates).length > 0) {
              editor.updateSlide(currentSlide.id, updates);
              console.log('[AI Function Call] update_slide_content: Applied updates:', updates);
            }
          }
          break;

        case 'add_element':
          if (args.slideId === currentSlide.id && args.element) {
            // Ensure shape elements have required properties
            const element = { ...args.element };
            if (element.type === 'shape') {
              // Ensure shapeType is set (default to 'rect' if missing)
              if (!element.shapeType) {
                element.shapeType = 'rect';
              }
              // Ensure style.fill is set for visibility (default to a visible color if missing)
              if (!element.style) {
                element.style = {};
              }
              if (!element.style.fill || typeof element.style.fill !== 'string') {
                // Default to a visible color if none provided or invalid
                element.style.fill = '#16C2C7'; // Default teal
              }
            }
            editor.addElement(element, currentSlideIndex);
          }
          break;

        case 'update_element': {
          console.log('[AI Function Call] update_element called:', {
            args,
            currentSlideId: currentSlide.id,
            slideIdMatch: args.slideId === currentSlide.id,
            hasElementId: !!args.elementId,
            hasChanges: !!args.changes,
            changesKeys: args.changes ? Object.keys(args.changes) : [],
            timestamp: new Date().toISOString(),
          });
          
          // Verify element exists before attempting update
          const allElements = [
            ...(currentSlide.elements || []),
            ...(currentSlide.layers?.flatMap(l => l.elements) || []),
          ];
          const elementExists = allElements.some(el => el.id === args.elementId);
          
          console.log('[AI Function Call] Element verification:', {
            elementId: args.elementId,
            elementExists,
            totalElements: allElements.length,
            elementIds: allElements.map(el => ({ id: el.id, type: el.type })),
          });
          
          if (args.slideId === currentSlide.id && args.elementId && args.changes) {
            if (!elementExists) {
              console.error('[AI Function Call] update_element FAILED - element not found:', {
                elementId: args.elementId,
                availableElementIds: allElements.map(el => el.id),
              });
              // Still try to update in case element is in a group
            }
            
            try {
              console.log('[AI Function Call] Applying update_element:', {
                elementId: args.elementId,
                changes: args.changes,
                boundsUpdate: args.changes.bounds,
              });
              editor.updateElement(args.elementId, args.changes);
              console.log('[AI Function Call] update_element completed successfully');
              
              // Verify the update was applied
              const updatedElements = [
                ...(deck?.slides[currentSlideIndex]?.elements || []),
                ...(deck?.slides[currentSlideIndex]?.layers?.flatMap(l => l.elements) || []),
              ];
              const updatedElement = updatedElements.find(el => el.id === args.elementId);
              if (updatedElement) {
                console.log('[AI Function Call] Update verification - element after update:', {
                  elementId: args.elementId,
                  bounds: updatedElement.bounds,
                  style: updatedElement.style,
                });
              } else {
                console.warn('[AI Function Call] Update verification - element not found after update');
              }
            } catch (updateError) {
              console.error('[AI Function Call] update_element ERROR:', {
                elementId: args.elementId,
                error: updateError instanceof Error ? updateError.message : String(updateError),
                stack: updateError instanceof Error ? updateError.stack : undefined,
              });
            }
          } else {
            console.warn('[AI Function Call] update_element skipped:', {
              reason: !args.slideId ? 'no slideId' : 
                       args.slideId !== currentSlide.id ? 'slideId mismatch' :
                       !args.elementId ? 'no elementId' :
                       !args.changes ? 'no changes' : 'unknown',
              argsSlideId: args.slideId,
              currentSlideId: currentSlide.id,
            });
          }
          break;
        }

        case 'remove_element':
          if (args.slideId === currentSlide.id && args.elementId) {
            editor.deleteElement(args.elementId);
          }
          break;

        case 'update_layout':
          if (args.slideId === currentSlide.id) {
            const updates: any = {};
            if (args.layout) updates.layout = args.layout;
            if (args.background) updates.background = args.background;
            if (Object.keys(updates).length > 0) {
              editor.updateSlide(currentSlide.id, updates);
            }
          }
          break;

        case 'group_elements':
          if (args.slideId === currentSlide.id && args.elementIds && args.elementIds.length >= 2) {
            editor.groupElements(args.elementIds);
          }
          break;

        case 'ungroup_elements':
          if (args.slideId === currentSlide.id && args.groupId) {
            editor.ungroupElements(args.groupId);
          }
          break;

        case 'duplicate_element':
          if (args.slideId === currentSlide.id && args.elementId) {
            editor.duplicateElement(args.elementId);
          }
          break;

        case 'toggle_element_lock':
          if (args.slideId === currentSlide.id && args.elementId) {
            editor.toggleElementLock(args.elementId);
          }
          break;

        case 'toggle_element_visibility':
          if (args.slideId === currentSlide.id && args.elementId) {
            editor.toggleElementVisibility(args.elementId);
          }
          break;

        case 'bring_to_front':
          if (args.slideId === currentSlide.id && args.elementId) {
            editor.bringToFront(args.elementId);
          }
          break;

        case 'send_to_back':
          if (args.slideId === currentSlide.id && args.elementId) {
            editor.sendToBack(args.elementId);
          }
          break;

        case 'bring_forward':
          if (args.slideId === currentSlide.id && args.elementId) {
            editor.bringForward(args.elementId);
          }
          break;

        case 'send_backward':
          if (args.slideId === currentSlide.id && args.elementId) {
            editor.sendBackward(args.elementId);
          }
          break;

        case 'align_elements':
          if (args.slideId === currentSlide.id && args.elementIds && args.elementIds.length >= 2 && args.alignment) {
            const alignmentService = getAlignmentService();
            const slideSize = deck?.settings?.slideSize;
            if (slideSize) {
              alignmentService.setArtboardBounds(slideSize.width || 1280, slideSize.height || 720);
            }
            
            const allElements = [
              ...(currentSlide.elements || []),
              ...(currentSlide.layers?.flatMap(l => l.elements) || []),
            ];
            const selectedElements = allElements.filter(el => args.elementIds.includes(el.id));
            
            if (selectedElements.length >= 2) {
              const edgeMap: Record<string, 'left' | 'right' | 'top' | 'bottom' | 'hCenter' | 'vCenter'> = {
                'left': 'left',
                'right': 'right',
                'top': 'top',
                'bottom': 'bottom',
                'centerX': 'hCenter',
                'centerY': 'vCenter',
              };
              
              const edge = edgeMap[args.alignment];
              if (edge) {
                const updates = alignmentService.align(selectedElements, {
                  edge,
                  target: 'selection',
                });
                
                updates.forEach(update => {
                  editor.updateElement(update.id, { bounds: update.bounds as any });
                });
              }
            }
          }
          break;

        case 'distribute_elements':
          console.log('[AI Function Call] distribute_elements called:', {
            args,
            currentSlideId: currentSlide.id,
            slideIdMatch: args.slideId === currentSlide.id,
            hasElementIds: !!args.elementIds,
            elementIdsCount: args.elementIds?.length || 0,
            hasAxis: !!args.axis,
            axis: args.axis,
            timestamp: new Date().toISOString(),
          });
          if (args.slideId === currentSlide.id && args.elementIds && args.elementIds.length >= 3 && args.axis) {
            const alignmentService = getAlignmentService();
            const slideSize = deck?.settings?.slideSize;
            if (slideSize) {
              alignmentService.setArtboardBounds(slideSize.width || 1280, slideSize.height || 720);
            }
            
            const allElements = [
              ...(currentSlide.elements || []),
              ...(currentSlide.layers?.flatMap(l => l.elements) || []),
            ];
            const selectedElements = allElements.filter(el => args.elementIds.includes(el.id));
            
            console.log('[AI Function Call] distribute_elements processing:', {
              selectedElementsCount: selectedElements.length,
              elementIds: selectedElements.map(el => el.id),
            });
            
            if (selectedElements.length >= 3) {
              const updates = alignmentService.distribute(selectedElements, {
                axis: args.axis,
                mode: 'edges',
                target: 'selection',
              });
              
              console.log('[AI Function Call] distribute_elements updates:', {
                updatesCount: updates.length,
                updates: updates.map(u => ({ id: u.id, bounds: u.bounds })),
              });
              
              updates.forEach(update => {
                editor.updateElement(update.id, { bounds: update.bounds as any });
              });
              
              console.log('[AI Function Call] distribute_elements completed successfully');
            } else {
              console.warn('[AI Function Call] distribute_elements skipped - insufficient elements:', {
                selectedElementsCount: selectedElements.length,
                required: 3,
              });
            }
          } else {
            console.warn('[AI Function Call] distribute_elements skipped:', {
              reason: !args.slideId ? 'no slideId' : 
                       args.slideId !== currentSlide.id ? 'slideId mismatch' :
                       !args.elementIds ? 'no elementIds' :
                       (args.elementIds?.length || 0) < 3 ? 'insufficient elementIds' :
                       !args.axis ? 'no axis' : 'unknown',
              argsSlideId: args.slideId,
              currentSlideId: currentSlide.id,
              elementIdsCount: args.elementIds?.length || 0,
            });
          }
          break;

        // Add other function handlers as needed
      }
    } catch (error) {
      console.error('[AI Function Call] Error applying function call:', {
        functionName,
        args,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
    }
  }, [deck, currentSlideIndex, editor, selectedElementIds]);

  const handleRefine = useCallback(async (message: string) => {
    console.log('[Toolbar] Refine request started:', {
      message,
      activeSlideId,
      timestamp: new Date().toISOString(),
    });
    
    if (!activeSlideId || !deck) {
      setRefineStatus({ isProcessing: false, error: 'No slide selected' });
      return;
    }

    try {
      setRefineStatus({ isProcessing: true, error: null });

      // Get current slide data
      const currentSlide = deck.slides[currentSlideIndex];
      if (!currentSlide) {
        setRefineStatus({ isProcessing: false, error: 'Current slide not found' });
        return;
      }

      // Collect all elements from the current slide
      const allElements = [
        ...(currentSlide.elements || []),
        ...(currentSlide.layers?.flatMap(l => l.elements) || []),
      ];

      // Get slide dimensions from deck settings
      const slideWidth = deck?.settings?.slideSize?.width ?? 1280;
      const slideHeight = deck?.settings?.slideSize?.height ?? 720;
      const slideRatio = slideWidth / slideHeight;
      
      // Prepare slide context with detailed element information
      const slideContext = {
        slideId: currentSlide.id,
        title: currentSlide.title,
        notes: typeof currentSlide.notes === 'string' ? currentSlide.notes : (currentSlide.notes ? JSON.stringify(currentSlide.notes) : undefined),
        background: currentSlide.background,
        layout: currentSlide.layout,
        // Slide dimensions and ratio for AI calculations
        slideSize: {
          width: slideWidth,
          height: slideHeight,
          ratio: slideRatio,
          aspectRatio: `${slideWidth}:${slideHeight}`,
        },
        elements: allElements.map(el => {
          const elementInfo: any = {
            id: el.id,
            type: el.type,
            bounds: el.bounds,
            style: el.style,
            metadata: el.metadata,
          };
          
          // Add type-specific information
          if (el.type === 'text') {
            elementInfo.content = el.content;
          } else if (el.type === 'shape') {
            elementInfo.shapeType = el.shapeType;
            // Explicitly include fill color for shapes
            elementInfo.fillColor = (el.style as any)?.fill;
            elementInfo.strokeColor = (el.style as any)?.stroke;
          } else if (el.type === 'image') {
            elementInfo.src = el.src;
            elementInfo.alt = el.alt;
          }
          
          return elementInfo;
        }),
        selectedElementIds: Array.from(selectedElementIds),
      };
      
      console.log('[Toolbar] Slide context prepared:', {
        slideId: slideContext.slideId,
        elementCount: slideContext.elements.length,
        elements: slideContext.elements.map(el => ({
          id: el.id,
          type: el.type,
          shapeType: el.shapeType,
          fillColor: el.fillColor,
        })),
      });

      // Optional: Capture screenshot of the canvas
      let screenshot: string | null = null;
      try {
        const canvas = document.querySelector('[data-canvas]') as HTMLElement;
        if (canvas) {
          // Use html2canvas or similar - for now, we'll skip screenshot and add it later
          // screenshot = await captureScreenshot(canvas);
        }
      } catch (screenshotError) {
        console.warn('Failed to capture screenshot:', screenshotError);
        // Continue without screenshot
      }

      // Use RefineService to handle the request
      const refineService = getRefineService();
      const request: RefineRequest = {
        message,
        deckId,
        slideId: activeSlideId,
        slideContext,
        screenshot,
      };

      await refineService.refineSlide(request, {
        onMessage: (content) => {
          if (activeSlideId) {
            setRefineMessagesBySlide(prev => {
              const newMap = new Map(prev);
              const currentMessages = newMap.get(activeSlideId) || [];
              
              // Check if the last message is an assistant message (meaning we're streaming)
              const lastMessage = currentMessages[currentMessages.length - 1];
              const isStreaming = lastMessage && lastMessage.role === 'assistant';
              
              if (isStreaming) {
                // Append to existing assistant message
                const updatedMessages = [...currentMessages];
                updatedMessages[updatedMessages.length - 1] = {
                  ...lastMessage,
                  content: lastMessage.content + content,
                };
                newMap.set(activeSlideId, updatedMessages);
              } else {
                // Create new assistant message (first delta)
                newMap.set(activeSlideId, [...currentMessages, { role: 'assistant', content, timestamp: new Date() }]);
              }
              
              return newMap;
            });
          }
        },
        onFunctionCall: (name, args) => {
          console.log('[Toolbar] Function call received:', { name, args });
        },
        onFunctionResult: async (name, result) => {
          console.log('[Toolbar] Function result received:', { name, result });
          // Skip introspection functions - they're just queries, not actions
          const introspectionFunctions = ['get_deck_info', 'get_slide_info', 'get_element_info', 'list_slides'];
          if (!introspectionFunctions.includes(name)) {
            await applyFunctionCall(name, result);
          }
        },
        onDone: () => {
          setRefineStatus({ isProcessing: false, error: null });
          // Keep panel open so user can see the conversation and results
        },
        onError: (error) => {
          console.error('[Toolbar] Refine error:', error);
          setRefineStatus({
            isProcessing: false,
            error: error,
          });
        },
      });
    } catch (error) {
      console.error('[Toolbar] Refine error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      setRefineStatus({
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Failed to refine slide',
      });
    }
  }, [activeSlideId, deck, deckId, currentSlideIndex, selectedElementIds, applyFunctionCall]);

  const handleRegenerate = useCallback(async () => {
    if (!deck?.meta?.aiGeneration || !deckId) {
      alert('This presentation was not generated with AI or is missing generation data.');
      return;
    }

    const confirmed = window.confirm(
      'This will regenerate the entire presentation using the original conversation. Current slides will be replaced. Continue?'
    );

    if (!confirmed) return;

    setIsRegenerating(true);

    try {
      const { outline, originalTitle, stylisticNotes } = deck.meta.aiGeneration;

      // Call the generation API
      const response = await fetch('/api/ai/generate-deck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outline,
          title: originalTitle,
          stylisticNotes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate presentation');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let newDeckId = '';

      // Read the stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('event: deck_created')) {
            const dataLine = lines[lines.indexOf(line) + 1];
            if (dataLine?.startsWith('data: ')) {
              const data = JSON.parse(dataLine.substring(6));
              newDeckId = data.deckId;
            }
          }
        }
      }

      if (newDeckId) {
        // Redirect to the new deck
        window.location.href = `/editor/${newDeckId}`;
      } else {
        throw new Error('Failed to get new deck ID');
      }
    } catch (error) {
      console.error('Regeneration error:', error);
      alert('Failed to regenerate presentation: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsRegenerating(false);
    }
  }, [deck, deckId]);

  const handleSelectLibraryImage = useCallback((item: ImageLibraryItem, mode: 'background' | 'element') => {
    if (mode === 'background') {
      if (!activeSlideId) {
        setBackgroundFeedback({ error: 'Select a slide before applying a background.' });
        return;
      }

      editor.updateSlide(activeSlideId, {
        background: {
          type: 'image',
          value: {
            src: item.dataUrl,
            offsetX: 0,
            offsetY: 0,
            scale: 100,
            prompt: item.metadata?.prompt,
            generatedAt: item.metadata?.generatedAt ?? item.metadata?.uploadedAt ?? new Date().toISOString(),
            source: item.origin === 'ai' ? 'ai' : 'upload',
            provider: item.metadata?.provider,
            quality: item.metadata?.quality,
            name: item.metadata?.originalFileName,
            libraryItemId: item.id,
          },
          opacity: 1,
        },
      });

      setBackgroundFeedback({ isGenerating: false, success: 'Background applied from library.' });
      setTimeout(() => setShowBackgroundModal(false), 200);
      return;
    }

    const rawWidth = item.metadata?.width && item.metadata.width > 0 ? item.metadata.width : 400;
    const rawHeight = item.metadata?.height && item.metadata.height > 0 ? item.metadata.height : 300;
    const maxWidth = 640;
    const maxHeight = 480;
    const ratio = Math.min(maxWidth / rawWidth, maxHeight / rawHeight, 1);
    const elementWidth = Math.round(rawWidth * ratio);
    const elementHeight = Math.round(rawHeight * ratio);
    const x = (1280 - elementWidth) / 2;
    const y = (720 - elementHeight) / 2;

    editor.addElement({
      id: `image-${Date.now()}`,
      type: 'image' as const,
      src: item.dataUrl,
      alt: item.metadata?.prompt || item.metadata?.originalFileName || 'Library image',
      bounds: { x, y, width: elementWidth, height: elementHeight },
      objectFit: 'contain' as const,
      metadata: { libraryItemId: item.id },
    }, currentSlideIndex);

    setBackgroundFeedback({ isGenerating: false, success: 'Image element added from library.' });
    setTimeout(() => setShowBackgroundModal(false), 200);
  }, [activeSlideId, currentSlideIndex, editor, setBackgroundFeedback]);

  // Helper function to open presentation at specific slide
  const openPresentation = useCallback((slideIndex: number = 0) => {
    const username = session?.user?.username
      || session?.user?.email?.split('@')[0]?.toLowerCase()
      || session?.user?.name?.toLowerCase().replace(/\s+/g, '-')
      || session?.user?.id?.replace('user:', '')?.split('-')[0]
      || 'user';
    const presentationSlug = deck?.meta?.slug || deckId;
    // Presentation uses 1-based indexing, editor uses 0-based, so add 1
    const url = `/present/${username}/${presentationSlug}?slide=${slideIndex + 1}`;
    window.open(url, '_blank');
  }, [session, deck, deckId]);
  return (
    <div className="flex h-14 items-center gap-3 border-b bg-card/80 px-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/60 relative z-50" style={{ borderBottomColor: 'rgba(148, 163, 184, 0.25)' }}>
      {/* Undo/Redo Tools */}
      <div className="flex items-center gap-2 pr-4 mr-2 border-r" style={{ borderRightColor: 'rgba(148, 163, 184, 0.2)' }}>
        <ToolbarButton 
          title="Undo (Cmd/Ctrl+Z)" 
          onClick={() => editor.undo()}
          disabled={!state.undoStack || state.undoStack.length === 0}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
          </svg>
        </ToolbarButton>
        <ToolbarButton 
          title="Redo (Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y)" 
          onClick={() => editor.redo()}
          disabled={!state.redoStack || state.redoStack.length === 0}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M21 7v6h-6" />
            <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
          </svg>
        </ToolbarButton>
      </div>

      {/* Insert Tools */}
      <div className="flex items-center gap-2 pr-4 mr-2 border-r" style={{ borderRightColor: 'rgba(148, 163, 184, 0.2)' }}>
        <ToolbarButton 
          title="Insert Text"
          onClick={() => {
            editor.addElement({
              id: `text-${Date.now()}`,
              type: 'text',
              content: 'New Text',
              bounds: { x: 100, y: 100, width: 200, height: 50 },
              style: {
                fontSize: '24px',
                color: '#000000',
                fontFamily: 'inter', // Default to Inter font
              },
            }, currentSlideIndex);
          }}
          disabled={!activeSlideId}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M4 20h16" />
            <path d="M6 4v16" />
            <path d="M18 4v16" />
          </svg>
        </ToolbarButton>
        <ToolbarButton 
          title="Insert Image" 
          onClick={() => {
            setBackgroundStatus({ isGenerating: false, error: null, success: null });
            setUploadMode('element');
            setShowBackgroundModal(true);
          }}
          disabled={!activeSlideId}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </ToolbarButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="absolute w-px h-px p-0 -m-px overflow-hidden clip-[rect(0,0,0,0)] whitespace-nowrap border-0"
          tabIndex={-1}
        />
        <input
          ref={backgroundFileInputRef}
          type="file"
          accept="image/*"
          onChange={handleBackgroundFileChange}
          className="absolute w-px h-px p-0 -m-px overflow-hidden clip-[rect(0,0,0,0)] whitespace-nowrap border-0"
          tabIndex={-1}
        />
        <ToolbarButton 
          title="Insert Rectangle" 
          onClick={() => {
            editor.addElement({
              id: `shape-${Date.now()}`,
              type: 'shape',
              shapeType: 'rect',
              bounds: { x: 150, y: 150, width: 150, height: 100 },
              style: lastShapeStyle || {
                fill: '#16C2C7',
                stroke: '#0B1022',
                strokeWidth: 2,
                borderRadius: 4,
              },
            }, currentSlideIndex);
          }}
          disabled={!activeSlideId}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          </svg>
        </ToolbarButton>
        <ToolbarButton 
          title="Insert Circle" 
          onClick={() => {
            editor.addElement({
              id: `shape-${Date.now()}`,
              type: 'shape',
              shapeType: 'ellipse',
              bounds: { x: 200, y: 200, width: 120, height: 120 },
              style: lastShapeStyle || {
                fill: '#C84BD2',
                stroke: '#0B1022',
                strokeWidth: 2,
              },
            }, currentSlideIndex);
          }}
          disabled={!activeSlideId}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <circle cx="12" cy="12" r="10" />
          </svg>
        </ToolbarButton>
      </div>

      {/* Format Tools */}
      {selectedElementIds.size > 0 && (
        <div className="flex items-center gap-2 pr-4 mr-2 border-r" style={{ borderRightColor: 'rgba(148, 163, 184, 0.2)' }}>
          {/* Font Picker */}
          {(() => {
            const deck = state.deck;
            const currentSlide = deck?.slides[currentSlideIndex];
            if (!currentSlide) return null;

            const allElements = [
              ...(currentSlide.elements || []),
              ...(currentSlide.layers?.flatMap(l => l.elements) || []),
            ];

            // Get the first selected text element's font
            const firstTextElement = Array.from(selectedElementIds)
              .map(id => allElements.find(el => el.id === id))
              .find(el => el && el.type === 'text');

            const currentFontFamily = firstTextElement?.style?.fontFamily as string | undefined;
            const currentFont = extractFontId(currentFontFamily);

            return (
              <FontPickerCompact
                value={currentFont}
                onChange={(fontId) => {
                  selectedElementIds.forEach((id) => {
                    const element = allElements.find(el => el.id === id);
                    if (element && element.type === 'text') {
                      editor.updateElement(id, {
                        style: { ...element.style, fontFamily: fontId },
                      });
                    }
                  });
                }}
              />
            );
          })()}

          {(() => {
            const deck = state.deck;
            const currentSlide = deck?.slides[currentSlideIndex];
            if (!currentSlide) return null;

            const allElements = [
              ...(currentSlide.elements || []),
              ...(currentSlide.layers?.flatMap(l => l.elements) || []),
            ];

            // Get first selected text element to determine button states
            const firstTextElement = Array.from(selectedElementIds)
              .map(id => allElements.find(el => el.id === id))
              .find(el => el && el.type === 'text');

            const isBold = firstTextElement?.style?.fontWeight === 'bold' || firstTextElement?.style?.fontWeight === 700;
            const isItalic = firstTextElement?.style?.fontStyle === 'italic';

            return (
              <>
                <ToolbarButton
                  title="Bold"
                  pressed={isBold}
                  onClick={() => {
                    selectedElementIds.forEach((id) => {
                      const element = allElements.find(el => el.id === id);
                      if (element && element.type === 'text') {
                        const currentWeight = (element.style as any)?.fontWeight || 'normal';
                        const newWeight = (currentWeight === 'bold' || currentWeight === 700) ? 'normal' : 'bold';
                        editor.updateElement(id, {
                          style: { ...element.style, fontWeight: newWeight },
                        });
                      }
                    });
                  }}
                >
                  <strong style={{ fontSize: '14px' }}>B</strong>
                </ToolbarButton>
                <ToolbarButton
                  title="Italic"
                  pressed={isItalic}
                  onClick={() => {
                    selectedElementIds.forEach((id) => {
                      const element = allElements.find(el => el.id === id);
                      if (element && element.type === 'text') {
                        const currentStyle = (element.style as any)?.fontStyle || 'normal';
                        const newStyle = currentStyle === 'italic' ? 'normal' : 'italic';
                        editor.updateElement(id, {
                          style: { ...element.style, fontStyle: newStyle },
                        });
                      }
                    });
                  }}
                >
                  <em style={{ fontSize: '14px' }}>I</em>
                </ToolbarButton>
                <ToolbarButton
                  title="Underline"
                  pressed={(() => {
                    const deck = state.deck;
                    const currentSlide = deck?.slides[currentSlideIndex];
                    if (!currentSlide) return false;

                    const allElements = [
                      ...(currentSlide.elements || []),
                      ...(currentSlide.layers?.flatMap(l => l.elements) || []),
                    ];

                    const firstTextElement = Array.from(selectedElementIds)
                      .map(id => allElements.find(el => el.id === id))
                      .find(el => el && el.type === 'text');

                    const decoration = String(firstTextElement?.style?.textDecoration || firstTextElement?.style?.textDecorationLine || '');
                    return decoration.includes('underline');
                  })()}
                  onClick={() => {
                    const deck = state.deck;
                    const currentSlide = deck?.slides[currentSlideIndex];
                    if (!currentSlide) return;

                    const allElements = [
                      ...(currentSlide.elements || []),
                      ...(currentSlide.layers?.flatMap(l => l.elements) || []),
                    ];

                    selectedElementIds.forEach((id) => {
                      const element = allElements.find(el => el.id === id);
                      if (element && element.type === 'text') {
                        const currentDecoration = (element.style as any)?.textDecoration || (element.style as any)?.textDecorationLine || '';
                        const decorations = new Set(currentDecoration.split(/\s+/).filter(Boolean));

                        if (decorations.has('underline')) {
                          decorations.delete('underline');
                        } else {
                          decorations.add('underline');
                        }

                        const newDecoration = Array.from(decorations).join(' ') || 'none';
                        // Remove old textDecoration property to avoid conflicts
                        const newStyle = { ...element.style };
                        delete newStyle.textDecoration;
                        newStyle.textDecorationLine = newDecoration;
                        editor.updateElement(id, { style: newStyle });
                      }
                    });
                  }}
                >
                  <span style={{ fontSize: '14px', textDecoration: 'underline' }}>U</span>
                </ToolbarButton>
                <ToolbarButton
                  title="Strikethrough"
                  pressed={(() => {
                    const deck = state.deck;
                    const currentSlide = deck?.slides[currentSlideIndex];
                    if (!currentSlide) return false;

                    const allElements = [
                      ...(currentSlide.elements || []),
                      ...(currentSlide.layers?.flatMap(l => l.elements) || []),
                    ];

                    const firstTextElement = Array.from(selectedElementIds)
                      .map(id => allElements.find(el => el.id === id))
                      .find(el => el && el.type === 'text');

                    const decoration = String(firstTextElement?.style?.textDecoration || firstTextElement?.style?.textDecorationLine || '');
                    return decoration.includes('line-through');
                  })()}
                  onClick={() => {
                    const deck = state.deck;
                    const currentSlide = deck?.slides[currentSlideIndex];
                    if (!currentSlide) return;

                    const allElements = [
                      ...(currentSlide.elements || []),
                      ...(currentSlide.layers?.flatMap(l => l.elements) || []),
                    ];

                    selectedElementIds.forEach((id) => {
                      const element = allElements.find(el => el.id === id);
                      if (element && element.type === 'text') {
                        const currentDecoration = (element.style as any)?.textDecoration || (element.style as any)?.textDecorationLine || '';
                        const decorations = new Set(currentDecoration.split(/\s+/).filter(Boolean));

                        if (decorations.has('line-through')) {
                          decorations.delete('line-through');
                        } else {
                          decorations.add('line-through');
                        }

                        const newDecoration = Array.from(decorations).join(' ') || 'none';
                        // Remove old textDecoration property to avoid conflicts
                        const newStyle = { ...element.style };
                        delete newStyle.textDecoration;
                        newStyle.textDecorationLine = newDecoration;
                        editor.updateElement(id, { style: newStyle });
                      }
                    });
                  }}
                >
                  <span style={{ fontSize: '14px', textDecoration: 'line-through' }}>S</span>
                </ToolbarButton>
              </>
            );
          })()}
        </div>
      )}

      {/* Text Alignment Tools */}
      {selectedElementIds.size > 0 && (
        <div className="flex items-center gap-2 pr-4 mr-2 border-r" style={{ borderRightColor: 'rgba(148, 163, 184, 0.2)' }}>
          <ToolbarButton title="Align Left" onClick={() => {
          const deck = state.deck;
          const currentSlide = deck?.slides[currentSlideIndex];
          if (!currentSlide) return;
          
          const allElements = [
            ...(currentSlide.elements || []),
            ...(currentSlide.layers?.flatMap(l => l.elements) || []),
          ];
          
          selectedElementIds.forEach((id) => {
            const element = allElements.find(el => el.id === id);
            if (element && element.type === 'text') {
              editor.updateElement(id, {
                style: { ...element.style, textAlign: 'left' },
              });
            }
          });
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <line x1="21" y1="10" x2="7" y2="10" />
            <line x1="21" y1="6" x2="3" y2="6" />
            <line x1="21" y1="14" x2="3" y2="14" />
            <line x1="21" y1="18" x2="7" y2="18" />
          </svg>
        </ToolbarButton>
        </div>
      )}

      {/* Layout Tools */}
      <div className="mr-2 flex items-center gap-1.5 border-r pr-4" style={{ borderRightColor: 'rgba(148, 163, 184, 0.2)' }}>
        <ToolbarButton 
          title="Group (Cmd/Ctrl+G)" 
          onClick={() => {
            if (selectedElementIds.size >= 2) {
              editor.groupElements(Array.from(selectedElementIds));
            }
          }}
          disabled={selectedElementIds.size < 2}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
        </ToolbarButton>
        <div className="relative" ref={alignMenuRef}>
          <ToolbarButton 
            title="Align" 
            onClick={() => setShowAlignMenu(!showAlignMenu)}
            pressed={showAlignMenu}
            aria-pressed={showAlignMenu}
            disabled={selectedElementIds.size < 2}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </ToolbarButton>
          {showAlignMenu && selectedElementIds.size >= 2 && (
            <div className="absolute top-full left-0 mt-2 z-[1000]">
              <AlignmentTools />
            </div>
          )}
        </div>
      </div>

      {/* Layer Ordering Tools */}
      {selectedElementIds.size > 0 && (
        <div className="flex items-center gap-2 pr-4 mr-2 border-r" style={{ borderRightColor: 'rgba(148, 163, 184, 0.2)' }}>
          <ToolbarButton 
            title="Bring to Front" 
            onClick={() => {
              selectedElementIds.forEach(id => editor.bringToFront(id));
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <path d="M8 12h8" />
              <path d="M12 8v8" />
            </svg>
          </ToolbarButton>
          <ToolbarButton 
            title="Bring Forward" 
            onClick={() => {
              selectedElementIds.forEach(id => editor.bringForward(id));
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <path d="M8 12h8" />
              <path d="M12 8v8" />
              <circle cx="16" cy="8" r="1" fill="currentColor" />
            </svg>
          </ToolbarButton>
          <ToolbarButton 
            title="Send Backward" 
            onClick={() => {
              selectedElementIds.forEach(id => editor.sendBackward(id));
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <path d="M8 12h8" />
              <path d="M12 8v8" />
              <circle cx="8" cy="16" r="1" fill="currentColor" />
            </svg>
          </ToolbarButton>
          <ToolbarButton 
            title="Send to Back" 
            onClick={() => {
              selectedElementIds.forEach(id => editor.sendToBack(id));
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <path d="M8 12h8" />
            </svg>
          </ToolbarButton>
        </div>
      )}

      {/* Right Side Actions */}
      <div className="flex items-center gap-2 pr-4 ml-auto border-r" style={{ borderRightColor: 'rgba(148, 163, 184, 0.2)' }}>
        {/* Play Button with Dropdown - Before Autosave */}
        <DropdownButton
          mainButton={{
            title: "Play from current slide",
            icon: (
              <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            ),
            onClick: () => openPresentation(currentSlideIndex),
          }}
          dropdownItems={[
            {
              label: "From beginning",
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              ),
              onClick: () => openPresentation(0),
            },
            {
              label: "From current slide",
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <circle cx="12" cy="12" r="1" fill="currentColor" />
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              ),
              onClick: () => openPresentation(currentSlideIndex),
              separator: true,
            },
          ]}
          variant="ghost"
          size="icon"
        />
        {/* Save Button */}
        <ToolbarButton
          title={autosaveEnabled ? "Autosave ON - Click to disable (Cmd/Ctrl+S to save)" : "Autosave OFF - Click to enable (Cmd/Ctrl+S to save)"}
          onClick={() => editor.toggleAutosave()}
          pressed={autosaveEnabled}
          aria-pressed={autosaveEnabled}
        >
          {autosaveEnabled ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
              <circle cx="18" cy="8" r="1" fill="currentColor"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
              <line x1="18" y1="6" x2="18" y2="10" strokeWidth="2"/>
            </svg>
          )}
        </ToolbarButton>

        {/* Regenerate Button (only show if AI-generated) */}
        {isAIGenerated && (
          <ToolbarButton
            title="Regenerate presentation using original conversation"
            onClick={handleRegenerate}
            disabled={isRegenerating}
          >
            {isRegenerating ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 animate-spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
            )}
          </ToolbarButton>
        )}
      </div>

      {/* Refine Button */}
      <div className="flex items-center gap-2 pr-4 mr-2 border-r" style={{ borderRightColor: 'rgba(148, 163, 184, 0.2)' }}>
        <ToolbarButton 
          title="Refine Slide with AI" 
          onClick={() => setShowRefineModal(true)}
          disabled={!activeSlideId}
        >
          <span className="text-lg">✨</span>
        </ToolbarButton>
      </div>

      {/* View Tools */}
      <div className="flex items-center gap-2">
        <ToolbarButton 
          title="Toggle Grid" 
          onClick={() => editor.toggleGrid()}
          pressed={showGrid}
          aria-pressed={showGrid}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
        </ToolbarButton>
        <ToolbarButton title="Toggle Timeline" onClick={onToggleTimeline}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </ToolbarButton>
      </div>

      {showBackgroundModal && (
        <ImageBackgroundModal
          open={showBackgroundModal}
          onClose={() => {
            setShowBackgroundModal(false);
            setBackgroundStatus({ isGenerating: false, error: null, success: null });
          }}
          onGenerate={handleGenerateImage}
          onUpload={(mode) => {
            setBackgroundFeedback({ error: null, success: null });
            triggerBackgroundUpload(mode);
          }}
          status={backgroundStatus}
          libraryItems={imageLibraryItems}
          onSelectFromLibrary={handleSelectLibraryImage}
          onRefreshLibrary={handleLibraryRefresh}
          libraryStatus={{
            isLoading: isLibraryRefreshing,
            isSyncing: isLibrarySyncing,
            error: imageLibraryError,
          }}
          initialPrompt={(() => {
            // Extract prompt from current slide's background if it exists
            const currentSlide = deck?.slides?.[currentSlideIndex];
            if (currentSlide?.background && typeof currentSlide.background === 'object' && currentSlide.background.type === 'image') {
              // Check for prompt at background level (new format)
              if ('prompt' in currentSlide.background && typeof currentSlide.background.prompt === 'string') {
                return currentSlide.background.prompt;
              }
              // Also check in background.value for backwards compatibility
              const bgValue = currentSlide.background.value;
              if (bgValue && typeof bgValue === 'object' && 'prompt' in bgValue && typeof bgValue.prompt === 'string') {
                return bgValue.prompt;
              }
            }
            return undefined;
          })()}
        />
      )}

      {showRefineModal && (
        <RefinePanel
          open={showRefineModal}
          onClose={() => {
            setShowRefineModal(false);
            setRefineStatus({ isProcessing: false, error: null });
          }}
          onRefine={handleRefine}
          isProcessing={refineStatus.isProcessing}
          error={refineStatus.error}
          messages={refineMessages}
          onMessageUpdate={(messages) => {
            if (activeSlideId) {
              setRefineMessagesBySlide(prev => {
                const newMap = new Map(prev);
                newMap.set(activeSlideId, messages);
                return newMap;
              });
            }
          }}
        />
      )}
    </div>
  );
}

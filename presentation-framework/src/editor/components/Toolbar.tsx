"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ToolbarButton } from '@/components/ui/toolbar-button';
import { useEditor, useEditorInstance } from '../hooks/useEditor';
import { AlignmentTools } from './AlignmentTools';
import { ImageBackgroundModal } from './ImageBackgroundModal';
import { useImageLibrary } from '../hooks/useImageLibrary';
import type { ImageLibraryItem } from '@/editor/types/imageLibrary';

interface ToolbarProps {
  deckId: string;
  onToggleTimeline: () => void;
}

export function Toolbar({ deckId, onToggleTimeline }: ToolbarProps) {
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
  const activeSlideId = state.selectedSlideId ?? deck?.slides?.[currentSlideIndex]?.id ?? null;

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
              libraryItemId: libraryItem.id,
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
          libraryItemId: libraryItem.id,
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

  const handleGenerateImage = useCallback(async (prompt: string, mode: 'background' | 'element') => {
    if (mode === 'background') {
      if (!activeSlideId) {
        setBackgroundFeedback({ error: 'Select a slide before generating a background.' });
        return;
      }
    }

    try {
      setBackgroundFeedback({ isGenerating: true, error: null, success: null });
      
      // Get slide dimensions from deck settings
      const slideWidth = deck?.settings?.slideSize?.width ?? 1280;
      const slideHeight = deck?.settings?.slideSize?.height ?? 720;
      
      const response = await fetch('/api/ai/background', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      const imageData: string | undefined = data?.image;
      const meta = data?.meta;

      if (!imageData) {
        throw new Error('No image returned by generator.');
      }

      const generatedAt = new Date().toISOString();

      if (mode === 'background') {
        const libraryItem = addImageToLibrary({
          dataUrl: imageData,
          thumbnailDataUrl: imageData,
          origin: 'ai',
          metadata: {
            usage: 'background',
            prompt,
            provider: meta?.provider ?? 'openai',
            quality: meta?.quality ?? 'hd',
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
              src: imageData,
              offsetX: 0,
              offsetY: 0,
              scale: 100,
              prompt,
              generatedAt,
              source: 'ai',
              provider: meta?.provider ?? 'openai',
              quality: meta?.quality ?? 'hd',
              libraryItemId: libraryItem.id,
            },
            opacity: 1,
          },
        });

        setBackgroundFeedback({ isGenerating: false, success: 'AI background applied to slide.' });
      } else {
        // Add as image element
        const x = (1280 - 400) / 2;
        const y = (720 - 300) / 2;

        const libraryItem = addImageToLibrary({
          dataUrl: imageData,
          thumbnailDataUrl: imageData,
          origin: 'ai',
          metadata: {
            usage: 'element',
            prompt,
            provider: meta?.provider ?? 'openai',
            quality: meta?.quality ?? 'hd',
            generatedAt,
            deckId,
          },
        });

        editor.addElement({
          id: `image-${Date.now()}`,
          type: 'image' as const,
          src: imageData,
          alt: prompt.substring(0, 50),
          bounds: { x, y, width: 400, height: 300 },
          objectFit: 'contain' as const,
          libraryItemId: libraryItem.id,
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
  }, [activeSlideId, editor, setBackgroundFeedback, currentSlideIndex, addImageToLibrary, deckId]);

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
      libraryItemId: item.id,
    }, currentSlideIndex);

    setBackgroundFeedback({ isGenerating: false, success: 'Image element added from library.' });
    setTimeout(() => setShowBackgroundModal(false), 200);
  }, [activeSlideId, currentSlideIndex, editor, setBackgroundFeedback]);
  return (
    <div className="flex h-14 items-center gap-3 border-b border-border/70 bg-card/80 px-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/60">
      {/* Insert Tools */}
      <div className="flex items-center gap-2 pr-4 mr-2 border-r border-border/60">
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
                fontFamily: 'inherit',
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
        <div className="flex items-center gap-2 pr-4 mr-2 border-r border-border/60">
          <ToolbarButton title="Bold" onClick={() => {
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
                const currentWeight = (element.style as any)?.fontWeight || 'normal';
                editor.updateElement(id, {
                  style: { ...element.style, fontWeight: currentWeight === 'bold' ? 'normal' : 'bold' },
                });
              }
            });
          }}>
            <strong style={{ fontSize: '14px' }}>B</strong>
          </ToolbarButton>
          <ToolbarButton title="Italic" onClick={() => {
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
                const currentStyle = (element.style as any)?.fontStyle || 'normal';
                editor.updateElement(id, {
                  style: { ...element.style, fontStyle: currentStyle === 'italic' ? 'normal' : 'italic' },
                });
              }
            });
          }}>
            <em style={{ fontSize: '14px' }}>I</em>
          </ToolbarButton>
        </div>
      )}
      
      {/* Text Alignment Tools */}
      {selectedElementIds.size > 0 && (
        <div className="flex items-center gap-2 pr-4 mr-2 border-r border-border/60">
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
      <div className="mr-2 flex items-center gap-1.5 border-r border-border/60 pr-4">
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
        <div className="flex items-center gap-2 pr-4 mr-2 border-r border-border/60">
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
      <div className="flex items-center gap-2 ml-auto pr-4 border-r border-border/60">
        {/* Play Button - Before Autosave */}
        <ToolbarButton 
          title="Play Presentation" 
          onClick={async () => {
            // Auto-authenticate when coming from editor
            // Check if deck has a presenter password set
            const deckPasswordHash = deck?.meta?.presenterPasswordHash;
            
            // Check if we have a presenter token, if not try to auto-authenticate
            let token = localStorage.getItem('lume-presenter-token');
            if (!token && deckPasswordHash) {
              // Deck has a password set, but we can't auto-authenticate without the password
              // The user will need to enter it in the presentation view
              console.log('⚠️ Deck has presenter password set. User will need to enter password in presentation view.');
            } else if (!token) {
              // No deck password and no token - try global fallback for backwards compatibility
              try {
                // @ts-ignore - process.env types don't include custom env vars
                const nextPublicSecret = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_LUME_CONTROL_SECRET;
                
                if (nextPublicSecret) {
                  console.log('Attempting auto-authentication with global secret...');
                  const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: nextPublicSecret, deckId }),
                  });
                  if (response.ok) {
                    const data = await response.json();
                    if (data.token) {
                      localStorage.setItem('lume-presenter-token', data.token);
                      token = data.token;
                      console.log('✅ Auto-authenticated successfully');
                      // Trigger a storage event so AuthService in new window picks it up
                      window.dispatchEvent(new StorageEvent('storage', {
                        key: 'lume-presenter-token',
                        newValue: data.token,
                        storageArea: localStorage,
                      }));
                    }
                  } else {
                    const errorData = await response.json().catch(() => ({}));
                    console.warn('Auto-authentication failed:', response.status, errorData);
                  }
                }
              } catch (err) {
                console.warn('Auto-authentication error:', err);
              }
            } else {
              console.log('✅ Already authenticated with existing token');
            }
            // Small delay to ensure localStorage is synced across windows
            await new Promise(resolve => setTimeout(resolve, 100));
            // Navigate to presentation mode with deckId and autoAuth parameters
            // The token is set in localStorage, which is shared across windows on the same origin
            window.open(`/present/${deckId}?deckId=${deckId}&autoAuth=true`, '_blank');
          }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </ToolbarButton>
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
      />
    </div>
  );
}

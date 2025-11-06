/**
 * ImageGenerationService handles AI image generation, refinement, and file processing.
 * 
 * This service provides methods for:
 * - Generating background images via AI
 * - Generating image elements via AI
 * - Refining existing images via AI
 * - Processing uploaded image files
 * - Compressing and resizing images
 */

export interface ImageGenerationOptions {
  prompt: string;
  width: number;
  height: number;
  deckId: string;
  model?: 'openai' | 'flux';
  quality?: 'quick' | 'polish' | 'heroic';
}

export interface ImageGenerationResult {
  imageData: string; // base64 data URL
  meta?: {
    provider?: string;
    quality?: string;
    revisedPrompt?: string;
    model?: string;
  };
}

export interface ImageRefinementOptions {
  imageDataUrl: string; // Full image data
  originalPrompt: string;
  refinement: string;
  width: number;
  height: number;
}

export interface ImageRefinementResult {
  imageData: string; // base64 data URL
  meta?: {
    provider?: string;
    model?: string;
  };
}

export interface ProcessedImage {
  dataUrl: string;
  thumbnailDataUrl: string;
  metadata: {
    usage: 'background' | 'element';
    originalFileName?: string;
    mimeType: string;
    width: number;
    height: number;
    sizeBytes: number;
    uploadedAt: string;
    deckId: string;
  };
}

class ImageGenerationService {
  private maxDisplaySize = 400; // pixels
  private maxStorageSize = 800; // pixels
  private jpegQuality = 0.85;

  /**
   * Generate a new background image using AI.
   * 
   * @param options Generation options
   * @returns Generated image data and metadata
   */
  async generateBackground(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
    const response = await fetch('/api/ai/background', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: options.prompt,
        width: options.width,
        height: options.height,
        model: options.model || 'flux',
        quality: options.quality || 'quick',
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

    return {
      imageData,
      meta,
    };
  }

  /**
   * Generate a polished version of an image in the background (async).
   * This is used for the "Polish" feature where we generate quick first, then upgrade.
   * 
   * @param options Generation options (should use same prompt/width/height as quick version)
   * @param onComplete Callback when polish generation completes successfully
   * @param onError Callback if polish generation fails
   */
  generatePolishAsync(
    options: ImageGenerationOptions,
    onComplete: (result: ImageGenerationResult) => void,
    onError: (error: Error) => void
  ): void {
    // Generate polish version asynchronously (don't await)
    this.generateBackground({
      ...options,
      quality: 'polish',
      model: 'flux',
    })
      .then((result) => {
        onComplete(result);
      })
      .catch((error) => {
        onError(error instanceof Error ? error : new Error(String(error)));
      });
  }

  /**
   * Generate a new image element using AI.
   * 
   * @param options Generation options
   * @returns Generated image data and metadata
   */
  async generateElement(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
    // Same API endpoint, just different usage context
    return this.generateBackground(options);
  }

  /**
   * Refine an existing image using AI.
   * 
   * @param options Refinement options
   * @returns Refined image data and metadata
   */
  async refineImage(options: ImageRefinementOptions): Promise<ImageRefinementResult> {
    const response = await fetch('/api/ai/refine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: options.imageDataUrl, // Full image data
        originalPrompt: options.originalPrompt,
        refinement: options.refinement.trim(),
        width: options.width,
        height: options.height,
      }),
    });

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

    return {
      imageData: imageDataResponse,
      meta,
    };
  }

  /**
   * Process an uploaded image file.
   * 
   * This function:
   * - Validates the file
   * - Reads it as base64
   * - Resizes it to display and storage sizes
   * - Compresses it
   * - Returns processed image data
   * 
   * @param file File object from input
   * @param deckId Deck ID for metadata
   * @param usage Whether this is for background or element
   * @returns Processed image with data URLs and metadata
   */
  async processUploadedFile(
    file: File,
    deckId: string,
    usage: 'background' | 'element' = 'element'
  ): Promise<ProcessedImage> {
    // Validate file
    if (!file || file.size === 0) {
      throw new Error('Invalid file: file is empty or missing');
    }

    if (!file.type.startsWith('image/')) {
      throw new Error(`File is not an image: ${file.type}`);
    }

    // Convert file to base64 data URL
    const originalDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (!result || typeof result !== 'string') {
          reject(new Error('Failed to read image file'));
          return;
        }
        if (!result.startsWith('data:image/')) {
          reject(new Error('Invalid data URL format'));
          return;
        }
        resolve(result);
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });

    // Load image to get dimensions
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        // Validate dimensions
        if (image.width === 0 || image.height === 0 || !isFinite(image.width) || !isFinite(image.height)) {
          reject(new Error('Invalid image dimensions'));
          return;
        }
        resolve(image);
      };
      image.onerror = () => reject(new Error('Failed to load image'));
      image.src = originalDataUrl;
    });

    // Calculate sizes
    let displayWidth = img.width;
    let displayHeight = img.height;
    let storageWidth = img.width;
    let storageHeight = img.height;

    // Calculate display size (max 400px)
    if (displayWidth > this.maxDisplaySize || displayHeight > this.maxDisplaySize) {
      const ratio = Math.min(
        this.maxDisplaySize / displayWidth,
        this.maxDisplaySize / displayHeight
      );
      displayWidth = displayWidth * ratio;
      displayHeight = displayHeight * ratio;
    }

    // Calculate storage size (max 800px)
    if (storageWidth > this.maxStorageSize || storageHeight > this.maxStorageSize) {
      const ratio = Math.min(
        this.maxStorageSize / storageWidth,
        this.maxStorageSize / storageHeight
      );
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
      throw new Error('Failed to get canvas context');
    }

    // Draw image to canvas (this resizes it)
    ctx.drawImage(img, 0, 0, storageWidth, storageHeight);

    // Convert to compressed base64 (JPEG with quality, or PNG if small)
    const useJpeg = file.type !== 'image/png' || file.size > 100000;
    const mimeType = useJpeg ? 'image/jpeg' : 'image/png';
    const quality = useJpeg ? this.jpegQuality : undefined;

    const compressedDataUrl = canvas.toDataURL(mimeType, quality);

    if (!compressedDataUrl || compressedDataUrl.length === 0) {
      throw new Error('Failed to compress image');
    }

    const now = new Date().toISOString();

    return {
      dataUrl: compressedDataUrl,
      thumbnailDataUrl: compressedDataUrl, // Same for now, can be optimized later
      metadata: {
        usage,
        originalFileName: file.name,
        mimeType,
        width: Math.round(storageWidth),
        height: Math.round(storageHeight),
        sizeBytes: file.size,
        uploadedAt: now,
        deckId,
      },
    };
  }

  /**
   * Compress an image element (for further optimization if needed).
   * 
   * @param imageElement Image element (HTMLImageElement or data URL)
   * @param maxWidth Maximum width
   * @param maxHeight Maximum height
   * @param quality Optional JPEG quality (0-1)
   * @returns Compressed base64 data URL
   */
  async compressImage(
    imageElement: HTMLImageElement | string,
    maxWidth: number,
    maxHeight: number,
    quality?: number
  ): Promise<string> {
    let img: HTMLImageElement;

    if (typeof imageElement === 'string') {
      // Load from data URL
      img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Failed to load image'));
        image.src = imageElement;
      });
    } else {
      img = imageElement;
    }

    // Calculate new size maintaining aspect ratio
    let newWidth = img.width;
    let newHeight = img.height;

    if (newWidth > maxWidth || newHeight > maxHeight) {
      const ratio = Math.min(maxWidth / newWidth, maxHeight / newHeight);
      newWidth = newWidth * ratio;
      newHeight = newHeight * ratio;
    }

    // Draw to canvas
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(newWidth);
    canvas.height = Math.round(newHeight);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    ctx.drawImage(img, 0, 0, newWidth, newHeight);

    // Convert to data URL
    const mimeType = 'image/jpeg';
    const jpegQuality = quality ?? this.jpegQuality;

    return canvas.toDataURL(mimeType, jpegQuality);
  }
}

let imageGenerationServiceInstance: ImageGenerationService | null = null;

export function getImageGenerationService(): ImageGenerationService {
  if (!imageGenerationServiceInstance) {
    imageGenerationServiceInstance = new ImageGenerationService();
  }
  return imageGenerationServiceInstance;
}

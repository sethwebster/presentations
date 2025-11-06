export type ImageLibraryOrigin = 'upload' | 'ai';

export type ImageLibraryUsageContext = 'element' | 'background';

export interface ImageLibraryRefinement {
  id: string;
  prompt: string;
  createdAt: string;
  notes?: string;
}

export interface ImageLibraryMetadata {
  prompt?: string;
  provider?: string;
  quality?: string;
  qualityLevel?: number;
  usage?: ImageLibraryUsageContext;
  originalFileName?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
  deckId?: string;
  uploadedAt?: string;
  generatedAt?: string;
  refinementHistory?: ImageLibraryRefinement[];
  derivedFromId?: string;
  tags?: string[];
}

export interface ImageLibraryItem {
  id: string;
  dataUrl: string;
  thumbnailDataUrl?: string;
  createdAt: string;
  updatedAt: string;
  origin: ImageLibraryOrigin;
  metadata: ImageLibraryMetadata;
  hash?: string;
  syncedAt?: string | null;
  pendingAction?: 'create' | 'update' | 'delete' | null;
}

export interface ImageLibraryState {
  items: ImageLibraryItem[];
  isSyncing: boolean;
  lastSyncAt: string | null;
  lastSyncError: string | null;
}



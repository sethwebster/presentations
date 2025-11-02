import type { DeckDefinition, SlideDefinition, ElementDefinition } from '@/rsc/types';

export interface EditorState {
  // Deck data
  deck: DeckDefinition | null;
  deckId: string | null;
  
  // Current slide
  currentSlideIndex: number;
  
  // Selection
  selectedElementIds: Set<string>;
  
  // Clipboard
  clipboard: ElementDefinition[];
  
  // Undo/Redo stacks
  undoStack: EditorCommand[];
  redoStack: EditorCommand[];
  
  // UI state
  zoom: number;
  pan: { x: number; y: number };
  showGrid: boolean;
  showGuides: boolean;
  autosaveEnabled: boolean;
  draggingElementId: string | null;
  draggingBounds: { x: number; y: number; width: number; height: number } | null;
  lastShapeStyle: Record<string, unknown> | null;
  
  // Loading state
  isLoading: boolean;
  error: string | null;
}

export interface EditorCommand {
  type: string;
  target?: string | string[];
  params: Record<string, unknown>;
  timestamp: number;
  metadata?: {
    userId?: string;
    aiModel?: string;
    reasoning?: string;
  };
}

export interface EditorActions {
  // Deck operations
  loadDeck: (deckId: string) => Promise<void>;
  saveDeck: () => Promise<void>;
  setDeck: (deck: DeckDefinition) => void;
  updateDeckSettings: (settings: Partial<import('@/rsc/types').DeckSettings>) => void;
  updateDeckMeta: (meta: Partial<import('@/rsc/types').DeckMeta>) => void;
  updateDeckId: (newDeckId: string) => void;
  updateDeckSlug: (newSlug: string) => Promise<void>;
  
  // Slide operations
  setCurrentSlide: (index: number) => void;
  addSlide: (slide?: Partial<SlideDefinition>) => void;
  deleteSlide: (index: number) => void;
  duplicateSlide: (index: number) => void;
  reorderSlides: (fromIndex: number, toIndex: number) => void;
  updateSlideId: (oldSlideId: string, newSlideId: string) => void;
  
  // Selection operations
  selectElement: (elementId: string, addToSelection?: boolean) => void;
  selectElements: (elementIds: string[]) => void;
  deselectElement: (elementId: string) => void;
  clearSelection: () => void;
  
  // Element operations
  addElement: (element: ElementDefinition, slideIndex?: number) => void;
  updateElement: (elementId: string, updates: Partial<ElementDefinition>) => void;
  deleteElement: (elementId: string) => void;
  duplicateElement: (elementId: string) => void;
  reorderElement: (elementId: string, newIndex: number) => void;
  toggleElementLock: (elementId: string) => void;
  
  // Group operations
  groupElements: (elementIds: string[]) => void;
  ungroupElements: (groupId: string) => void;
  
  // Clipboard operations
  copy: () => void;
  paste: (slideIndex?: number) => void;
  cut: () => void;
  
  // Undo/Redo
  undo: () => void;
  redo: () => void;
  executeCommand: (command: EditorCommand) => void;
  
  // UI state
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  toggleGrid: () => void;
  toggleGuides: () => void;
  toggleAutosave: () => void;
  setDraggingElement: (elementId: string | null, bounds: { x: number; y: number; width: number; height: number } | null) => void;
  
  // Utility
  reset: () => void;
}

export type EditorStore = EditorState & EditorActions;


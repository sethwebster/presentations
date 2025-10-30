import { create } from 'zustand';
import type { DeckDefinition, SlideDefinition, ElementDefinition } from '@/rsc/types';
import type { EditorStore, EditorCommand } from './types';

const MAX_UNDO_STACK_SIZE = 50;

const initialState = {
  deck: null,
  deckId: null,
  currentSlideIndex: 0,
  selectedElementIds: new Set<string>(),
  clipboard: [],
  undoStack: [],
  redoStack: [],
  zoom: 1,
  pan: { x: 0, y: 0 },
  showGrid: false,
  showGuides: true,
  isLoading: false,
  error: null,
};

export const useEditorStore = create<EditorStore>((set, get) => ({
  ...initialState,

  // Deck operations
  loadDeck: async (deckId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/editor/${deckId}`);
      if (!response.ok) {
        throw new Error(`Failed to load deck: ${response.statusText}`);
      }
      const deck = await response.json() as DeckDefinition;
      set({
        deck,
        deckId,
        currentSlideIndex: 0,
        selectedElementIds: new Set(),
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load deck',
        isLoading: false,
      });
    }
  },

  saveDeck: async () => {
    const { deck, deckId } = get();
    if (!deck || !deckId) return;

    try {
      const response = await fetch(`/api/editor/${deckId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deck),
      });
      if (!response.ok) {
        throw new Error(`Failed to save deck: ${response.statusText}`);
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to save deck',
      });
    }
  },

  setDeck: (deck: DeckDefinition) => {
    set({ deck });
  },

  // Slide operations
  setCurrentSlide: (index: number) => {
    const { deck } = get();
    if (!deck || index < 0 || index >= deck.slides.length) return;
    set({ currentSlideIndex: index, selectedElementIds: new Set() });
  },

  addSlide: (slide?: Partial<SlideDefinition>) => {
    const { deck } = get();
    if (!deck) return;

    const newSlide: SlideDefinition = {
      id: `slide-${Date.now()}`,
      ...slide,
      layers: slide?.layers || [],
      elements: slide?.elements || [],
    };

    const updatedDeck: DeckDefinition = {
      ...deck,
      slides: [...deck.slides, newSlide],
    };

    set({ deck: updatedDeck });
    get().executeCommand({
      type: 'addSlide',
      params: { slide: newSlide },
      timestamp: Date.now(),
    });
  },

  deleteSlide: (index: number) => {
    const { deck } = get();
    if (!deck || index < 0 || index >= deck.slides.length) return;

    const updatedDeck: DeckDefinition = {
      ...deck,
      slides: deck.slides.filter((_, i) => i !== index),
    };

    const newIndex = Math.min(index, updatedDeck.slides.length - 1);
    set({
      deck: updatedDeck,
      currentSlideIndex: Math.max(0, newIndex),
      selectedElementIds: new Set(),
    });

    get().executeCommand({
      type: 'deleteSlide',
      params: { index },
      timestamp: Date.now(),
    });
  },

  duplicateSlide: (index: number) => {
    const { deck } = get();
    if (!deck || index < 0 || index >= deck.slides.length) return;

    const slideToDuplicate = deck.slides[index];
    const duplicatedSlide: SlideDefinition = {
      ...slideToDuplicate,
      id: `slide-${Date.now()}`,
      // Deep clone layers and elements
      layers: slideToDuplicate.layers?.map(layer => ({
        ...layer,
        elements: layer.elements.map(el => ({ ...el, id: `${el.id}-copy-${Date.now()}` })),
      })),
      elements: slideToDuplicate.elements?.map(el => ({
        ...el,
        id: `${el.id}-copy-${Date.now()}`,
      })),
    };

    const updatedDeck: DeckDefinition = {
      ...deck,
      slides: [
        ...deck.slides.slice(0, index + 1),
        duplicatedSlide,
        ...deck.slides.slice(index + 1),
      ],
    };

    set({ deck: updatedDeck });
    get().executeCommand({
      type: 'duplicateSlide',
      params: { index },
      timestamp: Date.now(),
    });
  },

  reorderSlides: (fromIndex: number, toIndex: number) => {
    const { deck } = get();
    if (!deck) return;

    const slides = [...deck.slides];
    const [removed] = slides.splice(fromIndex, 1);
    slides.splice(toIndex, 0, removed);

    const updatedDeck: DeckDefinition = {
      ...deck,
      slides,
    };

    set({ deck: updatedDeck, currentSlideIndex: toIndex });
    get().executeCommand({
      type: 'reorderSlides',
      params: { fromIndex, toIndex },
      timestamp: Date.now(),
    });
  },

  // Selection operations
  selectElement: (elementId: string, addToSelection = false) => {
    const { selectedElementIds } = get();
    const newSelection = addToSelection
      ? new Set([...selectedElementIds, elementId])
      : new Set([elementId]);
    set({ selectedElementIds: newSelection });
  },

  selectElements: (elementIds: string[]) => {
    set({ selectedElementIds: new Set(elementIds) });
  },

  deselectElement: (elementId: string) => {
    const { selectedElementIds } = get();
    const newSelection = new Set(selectedElementIds);
    newSelection.delete(elementId);
    set({ selectedElementIds: newSelection });
  },

  clearSelection: () => {
    set({ selectedElementIds: new Set() });
  },

  // Element operations
  addElement: (element: ElementDefinition, slideIndex?: number) => {
    const { deck, currentSlideIndex } = get();
    if (!deck) return;

    const targetIndex = slideIndex ?? currentSlideIndex;
    const slide = deck.slides[targetIndex];
    if (!slide) return;

    const updatedSlide: SlideDefinition = {
      ...slide,
      elements: [...(slide.elements || []), element],
    };

    const updatedDeck: DeckDefinition = {
      ...deck,
      slides: deck.slides.map((s, i) => (i === targetIndex ? updatedSlide : s)),
    };

    set({ deck: updatedDeck });
    get().executeCommand({
      type: 'addElement',
      target: slide.id,
      params: { element },
      timestamp: Date.now(),
    });
  },

  updateElement: (elementId: string, updates: Partial<ElementDefinition>) => {
    const { deck } = get();
    if (!deck) return;

    const updatedDeck: DeckDefinition = {
      ...deck,
      slides: deck.slides.map(slide => ({
        ...slide,
        elements: slide.elements?.map(el =>
          el.id === elementId ? { ...el, ...updates, bounds: updates.bounds || el.bounds } : el
        ),
        layers: slide.layers?.map(layer => ({
          ...layer,
          elements: layer.elements.map(el =>
            el.id === elementId ? { ...el, ...updates, bounds: updates.bounds || el.bounds } : el
          ),
        })),
      })),
    };

    set({ deck: updatedDeck });
    get().executeCommand({
      type: 'updateElement',
      target: elementId,
      params: { updates },
      timestamp: Date.now(),
    });
  },

  deleteElement: (elementId: string) => {
    const { deck } = get();
    if (!deck) return;

    const updatedDeck: DeckDefinition = {
      ...deck,
      slides: deck.slides.map(slide => ({
        ...slide,
        elements: slide.elements?.filter(el => el.id !== elementId),
        layers: slide.layers?.map(layer => ({
          ...layer,
          elements: layer.elements.filter(el => el.id !== elementId),
        })),
      })),
    };

    set({ deck: updatedDeck });
    get().clearSelection();
    get().executeCommand({
      type: 'deleteElement',
      target: elementId,
      params: {},
      timestamp: Date.now(),
    });
  },

  duplicateElement: (elementId: string) => {
    const { deck, currentSlideIndex } = get();
    if (!deck) return;

    const slide = deck.slides[currentSlideIndex];
    if (!slide) return;

    // Find element in elements or layers
    let elementToDuplicate: ElementDefinition | undefined;
    const allElements = [
      ...(slide.elements || []),
      ...(slide.layers?.flatMap(l => l.elements) || []),
    ];
    elementToDuplicate = allElements.find(el => el.id === elementId);

    if (!elementToDuplicate) return;

    const duplicated: ElementDefinition = {
      ...elementToDuplicate,
      id: `${elementId}-copy-${Date.now()}`,
      bounds: elementToDuplicate.bounds
        ? {
            ...elementToDuplicate.bounds,
            x: (elementToDuplicate.bounds.x || 0) + 20,
            y: (elementToDuplicate.bounds.y || 0) + 20,
          }
        : undefined,
    };

    get().addElement(duplicated, currentSlideIndex);
  },

  reorderElement: (elementId: string, newIndex: number) => {
    const { deck, currentSlideIndex } = get();
    if (!deck) return;

    const slide = deck.slides[currentSlideIndex];
    if (!slide) return;

    // Collect all elements (from both elements array and layers)
    const allElements: ElementDefinition[] = [
      ...(slide.elements || []),
      ...(slide.layers?.flatMap(l => l.elements) || []),
    ];

    const currentIndex = allElements.findIndex(el => el.id === elementId);
    if (currentIndex === -1 || currentIndex === newIndex) return;

    // Remove element from current position
    const [movedElement] = allElements.splice(currentIndex, 1);
    // Insert at new position
    allElements.splice(newIndex, 0, movedElement);

    // Rebuild slide structure (for now, put all in elements array)
    // TODO: Maintain layer structure when reordering
    const updatedSlide: SlideDefinition = {
      ...slide,
      elements: allElements,
      layers: slide.layers?.map(layer => ({
        ...layer,
        elements: [],
      })),
    };

    const updatedDeck: DeckDefinition = {
      ...deck,
      slides: deck.slides.map((s, i) => (i === currentSlideIndex ? updatedSlide : s)),
    };

    set({ deck: updatedDeck });
    get().executeCommand({
      type: 'reorderElement',
      target: elementId,
      params: { newIndex },
      timestamp: Date.now(),
    });
  },

  toggleElementLock: (elementId: string) => {
    const { deck } = get();
    if (!deck) return;

    let isLocked = false;
    let currentElement: ElementDefinition | undefined;

    // Find element and check current lock state
    for (const slide of deck.slides) {
      const allElements = [
        ...(slide.elements || []),
        ...(slide.layers?.flatMap(l => l.elements) || []),
      ];
      const element = allElements.find(el => el.id === elementId);
      if (element) {
        currentElement = element;
        isLocked = (element.metadata as any)?.locked === true;
        break;
      }
    }

    if (!currentElement) return;

    // Toggle lock state
    const updatedMetadata = {
      ...currentElement.metadata,
      locked: !isLocked,
    };

    get().updateElement(elementId, { metadata: updatedMetadata });
  },

  // Group operations
  groupElements: (elementIds: string[]) => {
    // TODO: Implement grouping
    console.log('Group elements:', elementIds);
  },

  ungroupElements: (groupId: string) => {
    // TODO: Implement ungrouping
    console.log('Ungroup element:', groupId);
  },

  // Clipboard operations
  copy: () => {
    const { deck, currentSlideIndex, selectedElementIds } = get();
    if (!deck || selectedElementIds.size === 0) return;

    const slide = deck.slides[currentSlideIndex];
    if (!slide) return;

    const allElements = [
      ...(slide.elements || []),
      ...(slide.layers?.flatMap(l => l.elements) || []),
    ];

    const elementsToCopy = allElements.filter(el => selectedElementIds.has(el.id));
    set({ clipboard: elementsToCopy });
  },

  paste: (slideIndex?: number) => {
    const { clipboard, currentSlideIndex } = get();
    if (clipboard.length === 0) return;

    const targetIndex = slideIndex ?? currentSlideIndex;
    const pasted = clipboard.map(el => ({
      ...el,
      id: `${el.id}-paste-${Date.now()}`,
      bounds: el.bounds
        ? {
            ...el.bounds,
            x: (el.bounds.x || 0) + 20,
            y: (el.bounds.y || 0) + 20,
          }
        : undefined,
    }));

    pasted.forEach(el => get().addElement(el, targetIndex));
    get().selectElements(pasted.map(el => el.id));
  },

  cut: () => {
    get().copy();
    const { selectedElementIds } = get();
    selectedElementIds.forEach(id => get().deleteElement(id));
  },

  // Undo/Redo
  undo: () => {
    const { undoStack } = get();
    if (undoStack.length === 0) return;

    const command = undoStack[undoStack.length - 1];
    // TODO: Implement undo logic based on command type
    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...get().redoStack, command],
    });
  },

  redo: () => {
    const { redoStack } = get();
    if (redoStack.length === 0) return;

    const command = redoStack[redoStack.length - 1];
    // TODO: Implement redo logic
    set({
      redoStack: redoStack.slice(0, -1),
      undoStack: [...get().undoStack, command],
    });
  },

  executeCommand: (command: EditorCommand) => {
    const { undoStack } = get();
    const newUndoStack = [...undoStack, command].slice(-MAX_UNDO_STACK_SIZE);
    set({
      undoStack: newUndoStack,
      redoStack: [], // Clear redo stack on new command
    });
  },

  // UI state
  setZoom: (zoom: number) => {
    set({ zoom: Math.max(0.25, Math.min(2, zoom)) });
  },

  setPan: (pan: { x: number; y: number }) => {
    set({ pan });
  },

  toggleGrid: () => {
    set(state => ({ showGrid: !state.showGrid }));
  },

  toggleGuides: () => {
    set(state => ({ showGuides: !state.showGuides }));
  },

  // Utility
  reset: () => {
    set(initialState);
  },
}));


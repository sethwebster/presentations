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
  autosaveEnabled: true,
  draggingElementId: null,
  draggingBounds: null,
  lastShapeStyle: {
    fill: '#16C2C7',
    stroke: '#0B1022',
    strokeWidth: 2,
    borderRadius: 4,
  },
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
    if (!deck || !deckId) {
      console.warn('Cannot save: missing deck or deckId', { deck: !!deck, deckId });
      return;
    }

    try {
      // Update the updatedAt timestamp
      const deckToSave: DeckDefinition = {
        ...deck,
        meta: {
          ...deck.meta,
          updatedAt: new Date().toISOString(),
        },
      };

      const response = await fetch(`/api/editor/${deckId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deckToSave),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save deck: ${response.statusText} - ${errorText}`);
      }
      
      // Update the deck in store with the new timestamp
      set({ deck: deckToSave });
    } catch (error) {
      console.error('Error saving deck:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to save deck',
      });
    }
  },

  setDeck: (deck: DeckDefinition) => {
    set({ deck });
  },

  updateDeckSettings: (settingsUpdate: Partial<import('@/rsc/types').DeckSettings>) => {
    const { deck } = get();
    if (!deck) return;

    // Deep merge settings to avoid creating new object references unnecessarily
    const deepMerge = (target: any, source: any): any => {
      if (!source || typeof source !== 'object') return source;
      if (!target || typeof target !== 'object') return source;
      
      const result = { ...target };
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) && source[key].constructor === Object) {
          result[key] = deepMerge(target[key], source[key]);
        } else {
          result[key] = source[key];
        }
      }
      return result;
    };

    const updatedDeck: DeckDefinition = {
      ...deck,
      settings: deepMerge(deck.settings || {}, settingsUpdate),
    };

    set({ deck: updatedDeck });
    get().executeCommand({
      type: 'updateDeckSettings',
      params: { settings: settingsUpdate },
      timestamp: Date.now(),
    });
  },

  updateDeckMeta: (metaUpdate: Partial<import('@/rsc/types').DeckMeta>) => {
    const { deck } = get();
    if (!deck) return;

    const updatedDeck: DeckDefinition = {
      ...deck,
      meta: {
        ...deck.meta,
        ...metaUpdate,
      },
    };

    set({ deck: updatedDeck });
    get().executeCommand({
      type: 'updateDeckMeta',
      params: { meta: metaUpdate },
      timestamp: Date.now(),
    });
  },

  updateDeckId: (newDeckId: string) => {
    const { deck } = get();
    if (!deck) return;

    const oldDeckId = deck.meta.id;

    const updatedDeck: DeckDefinition = {
      ...deck,
      meta: {
        ...deck.meta,
        id: newDeckId,
      },
    };

    set({ deck: updatedDeck, deckId: newDeckId });
    get().executeCommand({
      type: 'updateDeckId',
      params: { oldDeckId, newDeckId },
      timestamp: Date.now(),
    });
  },

  updateDeckSlug: async (newSlug: string) => {
    const { deck, deckId } = get();
    if (!deck || !deckId) return;

    // Check if slug is unique
    try {
      const response = await fetch(`/api/editor/check-slug?slug=${encodeURIComponent(newSlug)}&deckId=${encodeURIComponent(deckId)}`);
      if (!response.ok) {
        throw new Error('Failed to check slug uniqueness');
      }
      const data = await response.json() as { available: boolean };
      if (!data.available) {
        console.warn(`Slug "${newSlug}" is already taken`);
        alert(`The slug "${newSlug}" is already in use. Please choose a different slug.`);
        return;
      }
    } catch (error) {
      console.error('Error checking slug uniqueness:', error);
      alert('Failed to check slug uniqueness. Please try again.');
      return;
    }

    const oldSlug = deck.meta.slug;

    const updatedDeck: DeckDefinition = {
      ...deck,
      meta: {
        ...deck.meta,
        slug: newSlug,
      },
    };

    set({ deck: updatedDeck });
    get().executeCommand({
      type: 'updateDeckSlug',
      params: { oldSlug, newSlug },
      timestamp: Date.now(),
    });
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

  updateSlideId: (oldSlideId: string, newSlideId: string) => {
    const { deck, selectedSlideId } = get();
    if (!deck) return;

    // Check if new ID already exists
    const idExists = deck.slides.some(s => s.id === newSlideId);
    if (idExists) {
      console.warn(`Slide ID ${newSlideId} already exists. Cannot rename.`);
      return;
    }

    const updatedDeck: DeckDefinition = {
      ...deck,
      slides: deck.slides.map((slide) => {
        if (slide.id === oldSlideId) {
          return { ...slide, id: newSlideId };
        }
        return slide;
      }),
    };

    // Update selected slide ID if it's the one being renamed
    const currentSelectedSlideId = selectedSlideId === oldSlideId ? newSlideId : selectedSlideId;

    set({ deck: updatedDeck, selectedSlideId: currentSelectedSlideId });
    get().executeCommand({
      type: 'updateSlideId',
      params: { oldSlideId, newSlideId },
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

    // Update lastShapeStyle if this is a shape element
    if (element.type === 'shape' && element.style) {
      set({ lastShapeStyle: { ...element.style } });
    }

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

    // Find current element state for undo
    let previousElement: ElementDefinition | undefined;
    let currentElement: ElementDefinition | undefined;
    for (const slide of deck.slides) {
      const allElements = [
        ...(slide.elements || []),
        ...(slide.layers?.flatMap(l => l.elements) || []),
      ];
      const element = allElements.find(el => el.id === elementId);
      if (element) {
        previousElement = element;
        currentElement = element;
        break;
      }
    }

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

    // Update lastShapeStyle if this is a shape element and style was updated
    if (currentElement?.type === 'shape' && updates.style) {
      const updatedStyle = { ...currentElement.style, ...updates.style };
      set({ lastShapeStyle: updatedStyle });
    }

    set({ deck: updatedDeck });
    get().executeCommand({
      type: 'updateElement',
      target: elementId,
      params: { 
        updates,
        previousElement: previousElement ? JSON.parse(JSON.stringify(previousElement)) : undefined,
      },
      timestamp: Date.now(),
    });
  },

  deleteElement: (elementId: string) => {
    const { deck } = get();
    if (!deck) return;

    // Find element to delete for undo
    let deletedElement: ElementDefinition | undefined;
    let slideId: string | undefined;
    for (const slide of deck.slides) {
      const allElements = [
        ...(slide.elements || []),
        ...(slide.layers?.flatMap(l => l.elements) || []),
      ];
      const element = allElements.find(el => el.id === elementId);
      if (element) {
        deletedElement = element;
        slideId = slide.id;
        break;
      }
    }

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
      params: { 
        deletedElement: deletedElement ? JSON.parse(JSON.stringify(deletedElement)) : undefined,
        slideId,
      },
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
    const { undoStack, deck } = get();
    if (undoStack.length === 0 || !deck) return;

    const command = undoStack[undoStack.length - 1];
    let updatedDeck: DeckDefinition | undefined;

    // Apply inverse operation based on command type
    switch (command.type) {
      case 'addElement': {
        // Undo add = delete
        const elementId = (command.params.element as ElementDefinition)?.id;
        if (elementId) {
          updatedDeck = {
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
        }
        break;
      }
      case 'deleteElement': {
        // Undo delete = add back
        const deletedElement = command.params.deletedElement as ElementDefinition | undefined;
        const slideId = command.params.slideId as string | undefined;
        if (deletedElement && slideId) {
          const slideIndex = deck.slides.findIndex(s => s.id === slideId);
          if (slideIndex >= 0) {
            const slide = deck.slides[slideIndex];
            updatedDeck = {
              ...deck,
              slides: deck.slides.map((s, i) => 
                i === slideIndex 
                  ? { ...s, elements: [...(s.elements || []), deletedElement] }
                  : s
              ),
            };
          }
        }
        break;
      }
      case 'updateElement': {
        // Undo update = restore previous state
        const elementId = command.target as string;
        const previousElement = command.params.previousElement as ElementDefinition | undefined;
        if (previousElement) {
          updatedDeck = {
            ...deck,
            slides: deck.slides.map(slide => ({
              ...slide,
              elements: slide.elements?.map(el =>
                el.id === elementId ? previousElement : el
              ),
              layers: slide.layers?.map(layer => ({
                ...layer,
                elements: layer.elements.map(el =>
                  el.id === elementId ? previousElement : el
                ),
              })),
            })),
          };
        }
        break;
      }
    }

    if (updatedDeck) {
      set({
        deck: updatedDeck,
        undoStack: undoStack.slice(0, -1),
        redoStack: [...get().redoStack, command],
      });
    }
  },

  redo: () => {
    const { redoStack, deck } = get();
    if (redoStack.length === 0 || !deck) return;

    const command = redoStack[redoStack.length - 1];
    let updatedDeck: DeckDefinition | undefined;

    // Re-apply the original operation
    switch (command.type) {
      case 'addElement': {
        const element = command.params.element as ElementDefinition;
        const slideId = command.target as string;
        if (element && slideId) {
          const slideIndex = deck.slides.findIndex(s => s.id === slideId);
          if (slideIndex >= 0) {
            const slide = deck.slides[slideIndex];
            updatedDeck = {
              ...deck,
              slides: deck.slides.map((s, i) => 
                i === slideIndex 
                  ? { ...s, elements: [...(s.elements || []), element] }
                  : s
              ),
            };
          }
        }
        break;
      }
      case 'deleteElement': {
        const elementId = command.target as string;
        if (elementId) {
          updatedDeck = {
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
        }
        break;
      }
      case 'updateElement': {
        const elementId = command.target as string;
        const updates = command.params.updates as Partial<ElementDefinition>;
        if (elementId && updates) {
          updatedDeck = {
            ...deck,
            slides: deck.slides.map(slide => ({
              ...slide,
              elements: slide.elements?.map(el =>
                el.id === elementId ? { ...el, ...updates } : el
              ),
              layers: slide.layers?.map(layer => ({
                ...layer,
                elements: layer.elements.map(el =>
                  el.id === elementId ? { ...el, ...updates } : el
                ),
              })),
            })),
          };
        }
        break;
      }
    }

    if (updatedDeck) {
      set({
        deck: updatedDeck,
        redoStack: redoStack.slice(0, -1),
        undoStack: [...get().undoStack, command],
      });
    }
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

  toggleAutosave: () => {
    set(state => ({ autosaveEnabled: !state.autosaveEnabled }));
  },

  setDraggingElement: (elementId: string | null, bounds: { x: number; y: number; width: number; height: number } | null) => {
    set({ draggingElementId: elementId, draggingBounds: bounds });
  },

  // Utility
  reset: () => {
    set(initialState);
  },
}));


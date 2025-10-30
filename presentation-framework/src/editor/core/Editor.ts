import type { DeckDefinition, SlideDefinition, ElementDefinition, DeckSettings, DeckMeta } from '@/rsc/types';

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

export interface EditorState {
  deck: DeckDefinition | null;
  deckId: string | null;
  currentSlideIndex: number;
  selectedElementIds: Set<string>;
  clipboard: ElementDefinition[];
  undoStack: EditorCommand[];
  redoStack: EditorCommand[];
  zoom: number;
  pan: { x: number; y: number };
  showGrid: boolean;
  showGuides: boolean;
  autosaveEnabled: boolean;
  draggingElementId: string | null;
  draggingBounds: { x: number; y: number; width: number; height: number } | null;
  lastShapeStyle: Record<string, unknown> | null;
  isLoading: boolean;
  error: string | null;
}

type EditorStateListener = (state: EditorState) => void;

const MAX_UNDO_STACK_SIZE = 50;

export class Editor {
  private state: EditorState;
  private listeners: Set<EditorStateListener> = new Set();
  private saveDebounceTimer: NodeJS.Timeout | null = null;
  private isSaving: boolean = false;

  constructor() {
    this.state = {
      deck: null,
      deckId: null,
      currentSlideIndex: 0,
      selectedElementIds: new Set(),
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
  }

  // State subscription
  subscribe(listener: EditorStateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): EditorState {
    return { ...this.state };
  }

  private notify(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  private setState(updates: Partial<EditorState>): void {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  // Deep merge helper
  private deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
    if (!source || typeof source !== 'object') return source as T;
    if (!target || typeof target !== 'object') return source as T;
    
    const result = { ...target };
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) && source[key].constructor === Object) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  // Command execution
  private executeCommand(command: EditorCommand): void {
    const { undoStack } = this.state;
    const newStack = [...undoStack, command].slice(-MAX_UNDO_STACK_SIZE);
    this.setState({
      undoStack: newStack,
      redoStack: [], // Clear redo stack on new command
    });
  }

  // Deck operations
  async loadDeck(deckId: string): Promise<void> {
    this.setState({ isLoading: true, error: null });
    try {
      console.log('Loading deck:', deckId);
      const response = await fetch(`/api/editor/${deckId}`);
      if (!response.ok) {
        throw new Error(`Failed to load deck: ${response.statusText}`);
      }
      const deck = await response.json() as DeckDefinition;
      console.log('Deck loaded:', deckId, { slides: deck.slides.length, title: deck.meta.title });
      this.setState({
        deck,
        deckId,
        currentSlideIndex: 0,
        selectedElementIds: new Set(),
        isLoading: false,
      });
    } catch (error) {
      console.error('Error loading deck:', error);
      this.setState({
        error: error instanceof Error ? error.message : 'Failed to load deck',
        isLoading: false,
      });
    }
  }

  async saveDeck(): Promise<void> {
    const { deck, deckId } = this.state;
    if (!deck || !deckId) {
      console.warn('Cannot save: missing deck or deckId', { deck: !!deck, deckId });
      return Promise.reject(new Error('Missing deck or deckId'));
    }

    // If already saving, queue this save for after the current one completes
    if (this.isSaving) {
      console.log('Save already in progress, queuing save...');
      return new Promise<void>((resolve) => {
        // Wait a bit and retry
        setTimeout(async () => {
          await this.saveDeck();
          resolve();
        }, 500);
      });
    }

    // Clear any pending debounced save
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = null;
    }

    return new Promise<void>((resolve, reject) => {
      this.saveDebounceTimer = setTimeout(async () => {
        this.isSaving = true;
        this.saveDebounceTimer = null;
        
        try {
          const deckToSave: DeckDefinition = {
            ...deck,
            meta: {
              ...deck.meta,
              updatedAt: new Date().toISOString(),
            },
          };

          console.log('Saving deck:', deckId, { slides: deckToSave.slides.length });
          
          const response = await fetch(`/api/editor/${deckId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(deckToSave),
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to save deck: ${response.statusText} - ${errorText}`);
          }
          
          const result = await response.json();
          console.log('Save successful:', result);
          
          // Update deck and notify subscribers (needed for StatusBar to see the update)
          // The deck reference changes, but this is necessary for change detection
          this.setState({ deck: deckToSave });
          this.isSaving = false;
          resolve();
        } catch (error) {
          console.error('Error saving deck:', error);
          this.isSaving = false;
          this.setState({
            error: error instanceof Error ? error.message : 'Failed to save deck',
          });
          reject(error);
        }
      }, 300); // Small debounce to batch rapid saves
    });
  }

  setDeck(deck: DeckDefinition): void {
    this.setState({ deck });
  }

  updateDeckSettings(settingsUpdate: Partial<DeckSettings>): void {
    const { deck } = this.state;
    if (!deck) return;

    const updatedDeck: DeckDefinition = {
      ...deck,
      settings: this.deepMerge(deck.settings || {}, settingsUpdate),
    };

    this.setState({ deck: updatedDeck });
    this.executeCommand({
      type: 'updateDeckSettings',
      params: { settings: settingsUpdate },
      timestamp: Date.now(),
    });
  }

  updateDeckMeta(metaUpdate: Partial<DeckMeta>): void {
    const { deck } = this.state;
    if (!deck) return;

    const updatedDeck: DeckDefinition = {
      ...deck,
      meta: {
        ...deck.meta,
        ...metaUpdate,
      },
    };

    this.setState({ deck: updatedDeck });
    this.executeCommand({
      type: 'updateDeckMeta',
      params: { meta: metaUpdate },
      timestamp: Date.now(),
    });
  }

  // Slide operations
  setCurrentSlide(index: number): void {
    const { deck } = this.state;
    if (!deck || index < 0 || index >= deck.slides.length) return;
    this.setState({ currentSlideIndex: index, selectedElementIds: new Set() });
  }

  addSlide(slide?: Partial<SlideDefinition>): void {
    const { deck } = this.state;
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

    this.setState({ deck: updatedDeck });
    this.executeCommand({
      type: 'addSlide',
      params: { slide: newSlide },
      timestamp: Date.now(),
    });
  }

  deleteSlide(index: number): void {
    const { deck } = this.state;
    if (!deck || index < 0 || index >= deck.slides.length) return;

    const updatedDeck: DeckDefinition = {
      ...deck,
      slides: deck.slides.filter((_, i) => i !== index),
    };

    const newIndex = Math.min(index, updatedDeck.slides.length - 1);
    this.setState({
      deck: updatedDeck,
      currentSlideIndex: Math.max(0, newIndex),
      selectedElementIds: new Set(),
    });

    this.executeCommand({
      type: 'deleteSlide',
      params: { index },
      timestamp: Date.now(),
    });
  }

  // Selection operations
  selectElement(elementId: string, addToSelection = false): void {
    const { selectedElementIds } = this.state;
    const newSelection = addToSelection 
      ? new Set([...selectedElementIds, elementId])
      : new Set([elementId]);
    this.setState({ selectedElementIds: newSelection });
  }

  selectElements(elementIds: string[]): void {
    this.setState({ selectedElementIds: new Set(elementIds) });
  }

  deselectElement(elementId: string): void {
    const { selectedElementIds } = this.state;
    const newSelection = new Set(selectedElementIds);
    newSelection.delete(elementId);
    this.setState({ selectedElementIds: newSelection });
  }

  clearSelection(): void {
    this.setState({ selectedElementIds: new Set() });
  }

  // Element operations
  addElement(element: ElementDefinition, slideIndex?: number): void {
    const { deck, currentSlideIndex } = this.state;
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

    // Update lastShapeStyle if this is a shape
    if (element.type === 'shape' && element.style) {
      this.setState({ 
        deck: updatedDeck,
        lastShapeStyle: element.style,
      });
    } else {
      this.setState({ deck: updatedDeck });
    }

    this.executeCommand({
      type: 'addElement',
      target: element.id,
      params: { element, slideIndex: targetIndex },
      timestamp: Date.now(),
    });
  }

  updateElement(elementId: string, updates: Partial<ElementDefinition>): void {
    const { deck } = this.state;
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

    if (!currentElement) return;

    // Update element in deck
    const updatedDeck: DeckDefinition = {
      ...deck,
      slides: deck.slides.map(slide => {
        const elements = slide.elements || [];
        const elementIndex = elements.findIndex(el => el.id === elementId);
        
        if (elementIndex !== -1) {
          return {
            ...slide,
            elements: elements.map((el, i) => 
              i === elementIndex ? { ...el, ...updates } : el
            ),
          };
        }

        // Check layers
        if (slide.layers) {
          const updatedLayers = slide.layers.map(layer => {
            const layerElementIndex = layer.elements.findIndex(el => el.id === elementId);
            if (layerElementIndex !== -1) {
              return {
                ...layer,
                elements: layer.elements.map((el, i) =>
                  i === layerElementIndex ? { ...el, ...updates } : el
                ),
              };
            }
            return layer;
          });
          
          if (updatedLayers.some((layer, i) => layer !== slide.layers![i])) {
            return { ...slide, layers: updatedLayers };
          }
        }

        return slide;
      }),
    };

    // Update lastShapeStyle if this is a shape element and style was updated
    if (currentElement.type === 'shape' && updates.style) {
      const updatedStyle = { ...currentElement.style, ...updates.style };
      this.setState({ 
        deck: updatedDeck,
        lastShapeStyle: updatedStyle,
      });
    } else {
      this.setState({ deck: updatedDeck });
    }

    this.executeCommand({
      type: 'updateElement',
      target: elementId,
      params: { 
        updates,
        previousElement: previousElement ? JSON.parse(JSON.stringify(previousElement)) : undefined,
      },
      timestamp: Date.now(),
    });
  }

  deleteElement(elementId: string): void {
    const { deck, currentSlideIndex } = this.state;
    if (!deck) return;

    const slide = deck.slides[currentSlideIndex];
    if (!slide) return;

    let deletedElement: ElementDefinition | undefined;

    const updatedSlide: SlideDefinition = {
      ...slide,
      elements: (slide.elements || []).filter(el => {
        if (el.id === elementId) {
          deletedElement = el;
          return false;
        }
        return true;
      }),
      layers: slide.layers?.map(layer => ({
        ...layer,
        elements: layer.elements.filter(el => {
          if (el.id === elementId) {
            deletedElement = el;
            return false;
          }
          return true;
        }),
      })),
    };

    const updatedDeck: DeckDefinition = {
      ...deck,
      slides: deck.slides.map((s, i) => (i === currentSlideIndex ? updatedSlide : s)),
    };

    const newSelection = new Set(this.state.selectedElementIds);
    newSelection.delete(elementId);
    this.setState({ 
      deck: updatedDeck,
      selectedElementIds: newSelection,
    });

    if (deletedElement) {
      this.executeCommand({
        type: 'deleteElement',
        target: elementId,
        params: { element: deletedElement },
        timestamp: Date.now(),
      });
    }
  }

  // UI state operations
  setZoom(zoom: number): void {
    this.setState({ zoom });
  }

  setPan(pan: { x: number; y: number }): void {
    this.setState({ pan });
  }

  toggleGrid(): void {
    this.setState({ showGrid: !this.state.showGrid });
  }

  toggleGuides(): void {
    this.setState({ showGuides: !this.state.showGuides });
  }

  toggleAutosave(): void {
    this.setState({ autosaveEnabled: !this.state.autosaveEnabled });
  }

  setDraggingElement(elementId: string | null, bounds: { x: number; y: number; width: number; height: number } | null): void {
    this.setState({ draggingElementId: elementId, draggingBounds: bounds });
  }

  // Undo/Redo
  undo(): void {
    const { undoStack, redoStack } = this.state;
    if (undoStack.length === 0) return;

    const command = undoStack[undoStack.length - 1];
    // TODO: Implement undo logic based on command type
    this.setState({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, command],
    });
  }

  redo(): void {
    const { undoStack, redoStack } = this.state;
    if (redoStack.length === 0) return;

    const command = redoStack[redoStack.length - 1];
    // TODO: Implement redo logic based on command type
    this.setState({
      undoStack: [...undoStack, command],
      redoStack: redoStack.slice(0, -1),
    });
  }

  // Utility
  reset(): void {
    this.state = {
      deck: null,
      deckId: null,
      currentSlideIndex: 0,
      selectedElementIds: new Set(),
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
    this.notify();
  }
}

// Singleton instance
let editorInstance: Editor | null = null;

export function getEditor(): Editor {
  if (!editorInstance) {
    editorInstance = new Editor();
  }
  return editorInstance;
}

import type { DeckDefinition, SlideDefinition, ElementDefinition, DeckSettings, DeckMeta, GroupElementDefinition } from '@/rsc/types';

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
  selectedSlideId: string | null; // ID of the slide selected for property editing
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
  openedGroupId: string | null; // ID of the group currently opened for editing
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type EditorStateListener = (state: EditorState) => void;

const MAX_UNDO_STACK_SIZE = 50;

export class Editor {
  private state: EditorState;
  private listeners: Set<EditorStateListener> = new Set();
  private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private isSaving: boolean = false;
  private saveAbortController: AbortController | null = null;
  private savedDeckSnapshot: DeckDefinition | null = null;

  constructor() {
    this.state = {
      deck: null,
      deckId: null,
      currentSlideIndex: 0,
      selectedElementIds: new Set(),
      selectedSlideId: null,
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
      openedGroupId: null,
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
    if (!source || typeof source !== 'object') return target;
    if (!target || typeof target !== 'object') return target;
    
    const result = { ...target };
    for (const key in source) {
      if (source[key] !== undefined) {
        const sourceValue = source[key];
        const targetValue = target[key];
        
        // Special handling for background: if types don't match (string vs object), replace entirely
        if (key === 'background') {
          result[key] = sourceValue as T[Extract<keyof T, string>];
        } else if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue) && sourceValue.constructor === Object) {
          // Only deep merge if target is also an object (not a string/primitive)
          if (targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue) && targetValue.constructor === Object) {
            result[key] = this.deepMerge(targetValue as T[Extract<keyof T, string>], sourceValue as Partial<T[Extract<keyof T, string>]>);
          } else {
            // Replace entirely if types don't match
            result[key] = sourceValue as T[Extract<keyof T, string>];
          }
        } else {
          result[key] = sourceValue as T[Extract<keyof T, string>];
        }
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
      const response = await fetch(`/api/editor/${deckId}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to load deck: ${response.statusText}`);
      }
      const deck = await response.json() as DeckDefinition;
      console.log('Deck loaded:', deckId, { slides: deck.slides.length, title: deck.meta.title });
      
      // Try to restore last selected slide from localStorage
      let selectedSlideId: string | null = null;
      let currentSlideIndex = 0;
      
      try {
        const savedSlideId = localStorage.getItem(`editor:${deckId}:lastSelectedSlideId`);
        if (savedSlideId) {
          // Check if the saved slide ID exists in the deck
          const slideIndex = deck.slides.findIndex(slide => slide.id === savedSlideId);
          if (slideIndex >= 0) {
            selectedSlideId = savedSlideId;
            currentSlideIndex = slideIndex;
          }
        }
      } catch (e) {
        // Ignore localStorage errors (e.g., private browsing mode)
        console.warn('Failed to load last selected slide from localStorage:', e);
      }
      
      // Fallback to first slide if no saved selection found
      if (!selectedSlideId && deck.slides.length > 0) {
        selectedSlideId = deck.slides[0]?.id || null;
        currentSlideIndex = 0;
      }
      
      this.setState({
        deck,
        deckId,
        currentSlideIndex,
        selectedSlideId,
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

    // Abort any in-flight save
    if (this.saveAbortController) {
      this.saveAbortController.abort();
      this.saveAbortController = null;
    }

    // If already saving (but not aborted), queue this save for after the current one completes
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

    // Create new AbortController for this save
    const abortController = new AbortController();
    this.saveAbortController = abortController;

    // Capture the deck snapshot we're about to save
    const deckSnapshot = deck;

    return new Promise<void>((resolve, reject) => {
      this.saveDebounceTimer = setTimeout(async () => {
        // Check if save was aborted before starting
        if (abortController.signal.aborted) {
          resolve(); // Resolve silently if aborted
          return;
        }

        this.isSaving = true;
        this.saveDebounceTimer = null;
        
        try {
          const deckToSave: DeckDefinition = {
            ...deckSnapshot,
            meta: {
              ...deckSnapshot.meta,
              updatedAt: new Date().toISOString(),
            },
          };

          console.log('Saving deck:', deckId, { slides: deckToSave.slides.length });
          
          const response = await fetch(`/api/editor/${deckId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(deckToSave),
            signal: abortController.signal, // Make fetch abortable
          });
          
          // Check if aborted during fetch
          if (abortController.signal.aborted) {
            console.log('Save aborted during fetch');
            this.isSaving = false;
            this.saveAbortController = null;
            resolve(); // Resolve silently if aborted
            return;
          }
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to save deck: ${response.statusText} - ${errorText}`);
          }
          
          const result = await response.json();
          console.log('Save successful:', result);
          
          // Only update deck state if:
          // 1. Save wasn't aborted
          // 2. We're not currently dragging (saveManager will check this)
          // 3. The deck we saved is still the current deck (not a newer version)
          if (!abortController.signal.aborted) {
            const currentState = this.getState();
            
            // Check if deck has changed since we started saving
            // We compare by creating a hash of content (excluding timestamp)
            const currentDeckHash = this.createDeckContentHash(currentState.deck);
            const savedDeckHash = this.createDeckContentHash(deckSnapshot);
            
            // Only update state if the deck we saved is still current (not been modified)
            if (currentDeckHash === savedDeckHash && currentState.draggingElementId === null) {
              this.savedDeckSnapshot = deckToSave;
              // Only update meta/timestamp, don't replace the entire deck which might overwrite newer changes
              if (currentState.deck) {
                this.setState({
                  deck: {
                    ...currentState.deck,
                    meta: deckToSave.meta,
                  },
                });
              }
            } else {
              console.log('Save completed but deck has changed, not updating state');
            }
          }
          
          this.isSaving = false;
          this.saveAbortController = null;
          resolve();
        } catch (error) {
          // Don't treat abort as an error
          if (abortController.signal.aborted) {
            console.log('Save aborted');
            this.isSaving = false;
            this.saveAbortController = null;
            resolve();
            return;
          }
          
          console.error('Error saving deck:', error);
          this.isSaving = false;
          this.saveAbortController = null;
          this.setState({
            error: error instanceof Error ? error.message : 'Failed to save deck',
          });
          reject(error);
        }
      }, 300); // Small debounce to batch rapid saves
    });
  }

  /**
   * Create a hash of deck content (excluding timestamp) for comparison
   */
  private createDeckContentHash(deck: DeckDefinition | null): string {
    if (!deck) return '';
    const deckForHash = {
      ...deck,
      meta: deck.meta ? { ...deck.meta, updatedAt: undefined } : undefined,
    };
    return JSON.stringify(deckForHash);
  }

  /**
   * Abort any in-flight save operation
   */
  abortSave(): void {
    if (this.saveAbortController) {
      this.saveAbortController.abort();
      this.saveAbortController = null;
    }
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = null;
    }
    this.isSaving = false;
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

  updateLayerName(slideIndex: number, layerId: string, name: string): void {
    const { deck } = this.state;
    if (!deck) return;

    const slide = deck.slides[slideIndex];
    if (!slide || !slide.layers) return;

    const updatedLayers = slide.layers.map(layer =>
      layer.id === layerId ? { ...layer, name: name || undefined } : layer
    );

    const updatedSlide: SlideDefinition = {
      ...slide,
      layers: updatedLayers,
    };

    const updatedDeck: DeckDefinition = {
      ...deck,
      slides: deck.slides.map((s, i) => (i === slideIndex ? updatedSlide : s)),
    };

    this.setState({ deck: updatedDeck });
    this.executeCommand({
      type: 'updateLayerName',
      target: layerId,
      params: { name },
      timestamp: Date.now(),
    });
  }

  // Slide operations
  setCurrentSlide(index: number): void {
    const { deck, deckId } = this.state;
    if (!deck || index < 0 || index >= deck.slides.length) return;
    const slide = deck.slides[index];
    const slideId = slide?.id || null;
    
    // Save last selected slide to localStorage
    if (deckId && slideId) {
      try {
        localStorage.setItem(`editor:${deckId}:lastSelectedSlideId`, slideId);
      } catch (e) {
        // Ignore localStorage errors (e.g., quota exceeded, private browsing)
        console.warn('Failed to save last selected slide to localStorage:', e);
      }
    }
    
    this.setState({ 
      currentSlideIndex: index, 
      selectedElementIds: new Set(),
      selectedSlideId: slideId,
    });
  }

  setSelectedSlide(slideId: string | null): void {
    const { deckId } = this.state;
    
    // Save last selected slide to localStorage
    if (deckId && slideId) {
      try {
        localStorage.setItem(`editor:${deckId}:lastSelectedSlideId`, slideId);
      } catch (e) {
        // Ignore localStorage errors (e.g., quota exceeded, private browsing)
        console.warn('Failed to save last selected slide to localStorage:', e);
      }
    }
    
    this.setState({ 
      selectedSlideId: slideId,
      selectedElementIds: new Set(), // Clear element selection when selecting a slide
    });
  }

  clearSelection(): void {
    this.setState({
      selectedElementIds: new Set(),
      selectedSlideId: null,
    });
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
    const { deck, currentSlideIndex, openedGroupId } = this.state;
    
    // If a group is opened, allow selecting individual elements within it
    if (openedGroupId && deck) {
      const slide = deck.slides[currentSlideIndex];
      if (slide) {
        const allElements = [
          ...(slide.elements || []),
          ...(slide.layers?.flatMap(l => l.elements) || []),
        ];
        const groupElement = allElements.find(el => el.id === openedGroupId);
        if (groupElement && groupElement.type === 'group') {
          const group = groupElement as GroupElementDefinition;
          // Check if the clicked element is a child of the opened group
          if (group.children?.some(child => child.id === elementId)) {
            // Allow selecting the child element
            const newSelection = addToSelection 
              ? new Set([...this.state.selectedElementIds, elementId])
              : new Set([elementId]);
            this.setState({ 
              selectedElementIds: newSelection,
              selectedSlideId: slide.id, // Select the slide when an element is selected
            });
            return;
          }
        }
      }
    }
    
    // Check if element is part of a group (and group is not opened)
    if (deck) {
      const slide = deck.slides[currentSlideIndex];
      if (slide) {
        const containingGroup = this.findGroupContainingElement(elementId, slide);
        if (containingGroup && containingGroup.id !== openedGroupId) {
          // Select the group instead of the individual element
          const newSelection = addToSelection 
            ? new Set([...this.state.selectedElementIds, containingGroup.id])
            : new Set([containingGroup.id]);
          this.setState({ 
            selectedElementIds: newSelection,
            selectedSlideId: slide.id, // Select the slide when an element is selected
          });
          return;
        }
      }
    }
    
    // Normal selection
    const newSelection = addToSelection 
      ? new Set([...this.state.selectedElementIds, elementId])
      : new Set([elementId]);
    
    // When an element is selected, also select the slide it belongs to
    const currentSlide = deck?.slides[currentSlideIndex];
    const selectedSlideId = currentSlide?.id ?? null;
    
    this.setState({ 
      selectedElementIds: newSelection,
      selectedSlideId, // Select the slide when an element is selected
    });
  }

  selectElements(elementIds: string[]): void {
    const { deck, currentSlideIndex } = this.state;
    
    // When elements are selected, also select the slide they belong to
    const currentSlide = deck?.slides[currentSlideIndex];
    const selectedSlideId = currentSlide?.id ?? null;
    
    this.setState({ 
      selectedElementIds: new Set(elementIds),
      selectedSlideId, // Select the slide when elements are selected
    });
  }

  deselectElement(elementId: string): void {
    const { selectedElementIds } = this.state;
    const newSelection = new Set(selectedElementIds);
    newSelection.delete(elementId);
    this.setState({ selectedElementIds: newSelection });
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
    const { deck, currentSlideIndex, openedGroupId } = this.state;
    if (!deck) return;

    const currentSlide = deck.slides[currentSlideIndex];
    if (!currentSlide) return;

    // Check if element is a child of an opened group
    if (openedGroupId) {
      const allElements = [
        ...(currentSlide.elements || []),
        ...(currentSlide.layers?.flatMap(l => l.elements) || []),
      ];
      const groupElement = allElements.find(el => el.id === openedGroupId);
      if (groupElement && groupElement.type === 'group') {
        const group = groupElement as GroupElementDefinition;
        const childIndex = group.children?.findIndex(child => child.id === elementId);
        
        if (childIndex !== undefined && childIndex !== -1) {
          // Update child in group's children array
          // CRITICAL: Children have absolute positions - no conversion needed
          const updatedChildren: ElementDefinition[] = group.children.map((child, i) =>
            i === childIndex ? { ...child, ...updates } as ElementDefinition : child
          );
          
          // Recalculate group bounds from children's absolute positions
          let minX = Infinity;
          let minY = Infinity;
          let maxX = -Infinity;
          let maxY = -Infinity;
          
          for (const child of updatedChildren) {
            if (!child.bounds) continue;
            const absX = child.bounds.x || 0;
            const absY = child.bounds.y || 0;
            const width = child.bounds.width || 0;
            const height = child.bounds.height || 0;
            
            minX = Math.min(minX, absX);
            minY = Math.min(minY, absY);
            maxX = Math.max(maxX, absX + width);
            maxY = Math.max(maxY, absY + height);
          }
          
          // Only update if we have valid bounds
          if (minX !== Infinity) {
            // Calculate new group bounds from absolute positions
            const newWidth = maxX - minX;
            const newHeight = maxY - minY;
            
            // CRITICAL: Keep children at absolute positions - don't normalize
            // Group bounds are only for visual feedback, not positioning
            const newGroupBounds = {
              x: minX,
              y: minY,
              width: newWidth,
              height: newHeight,
            };
            
            const updatedGroup: GroupElementDefinition = {
              ...group,
              children: updatedChildren, // Children have absolute positions
              bounds: newGroupBounds, // Visual bounds only
            };
            
            // Update the group in the slide
            const updatedDeck: DeckDefinition = {
              ...deck,
              slides: deck.slides.map((slide, i): SlideDefinition => {
                if (i !== currentSlideIndex) return slide;
                
                const elements = slide.elements || [];
                const groupIndex = elements.findIndex(el => el.id === openedGroupId);
                
                if (groupIndex !== -1) {
                  return {
                    ...slide,
                    elements: elements.map((el, idx) =>
                      idx === groupIndex ? updatedGroup : el
                    ) as ElementDefinition[],
                  };
                }
                
                // Check layers
                if (slide.layers) {
                  const updatedLayers = slide.layers.map(layer => {
                    const layerGroupIndex = layer.elements.findIndex(el => el.id === openedGroupId);
                    if (layerGroupIndex !== -1) {
                      return {
                        ...layer,
                        elements: layer.elements.map((el, idx) =>
                          idx === layerGroupIndex ? updatedGroup : el
                        ) as ElementDefinition[],
                      };
                    }
                    return layer;
                  });
                  
                  if (updatedLayers.some((layer, idx) => layer !== slide.layers![idx])) {
                    return { ...slide, layers: updatedLayers };
                  }
                }
                
                return slide;
              }),
            };
            
            this.setState({ deck: updatedDeck });
            
            this.executeCommand({
              type: 'updateElement',
              target: elementId,
              params: { updates },
              timestamp: Date.now(),
            });
            
            return;
          }
          
          // Fallback: if bounds calculation failed, just update children without recalculating bounds
          const updatedGroup: GroupElementDefinition = {
            ...group,
            children: updatedChildren,
            bounds: group.bounds,
          };
          
          // Update the group in the slide
          const updatedDeck: DeckDefinition = {
            ...deck,
            slides: deck.slides.map((slide, i): SlideDefinition => {
              if (i !== currentSlideIndex) return slide;
              
              const elements = slide.elements || [];
              const groupIndex = elements.findIndex(el => el.id === openedGroupId);
              
              if (groupIndex !== -1) {
                return {
                  ...slide,
                  elements: elements.map((el, idx) =>
                    idx === groupIndex ? updatedGroup : el
                  ) as ElementDefinition[],
                };
              }
              
              // Check layers
              if (slide.layers) {
                const updatedLayers = slide.layers.map(layer => {
                  const layerGroupIndex = layer.elements.findIndex(el => el.id === openedGroupId);
                  if (layerGroupIndex !== -1) {
                    return {
                      ...layer,
                      elements: layer.elements.map((el, idx) =>
                        idx === layerGroupIndex ? updatedGroup : el
                      ) as ElementDefinition[],
                    };
                  }
                  return layer;
                });
                
                if (updatedLayers.some((layer, idx) => layer !== slide.layers![idx])) {
                  return { ...slide, layers: updatedLayers };
                }
              }
              
              return slide;
            }),
          };
          
          this.setState({ deck: updatedDeck });
          
          this.executeCommand({
            type: 'updateElement',
            target: elementId,
            params: { updates },
            timestamp: Date.now(),
          });
          
          return;
        }
      }
    }

    // Check if element is a child of any group (even if not opened) and update group bounds
    const containingGroup = this.findGroupContainingElement(elementId, currentSlide);
    if (containingGroup && containingGroup.id !== openedGroupId) {
      // Update the child in the group and recalculate group bounds
      const group = containingGroup as GroupElementDefinition;
      const childIndex = group.children?.findIndex(child => child.id === elementId);
      
      if (childIndex !== undefined && childIndex !== -1 && group.children) {
        const updatedChildren: ElementDefinition[] = group.children.map((child, i) =>
          i === childIndex ? { ...child, ...updates } as ElementDefinition : child
        );
        
        // Recalculate group bounds from absolute positions
        const newGroupBounds = this.calculateGroupBounds(updatedChildren);
        if (newGroupBounds) {
          const updatedGroup: GroupElementDefinition = {
            ...group,
            children: updatedChildren,
            bounds: newGroupBounds,
          };
          
          // Update the group in the slide
          const updatedDeck: DeckDefinition = {
            ...deck,
            slides: deck.slides.map((slide): SlideDefinition => {
              const elements = slide.elements || [];
              const groupIndex = elements.findIndex(el => el.id === containingGroup.id);
              
              if (groupIndex !== -1) {
                return {
                  ...slide,
                  elements: elements.map((el, idx) =>
                    idx === groupIndex ? updatedGroup : el
                  ) as ElementDefinition[],
                };
              }
              
              // Check layers
              if (slide.layers) {
                const updatedLayers = slide.layers.map(layer => {
                  const layerGroupIndex = layer.elements.findIndex(el => el.id === containingGroup.id);
                  if (layerGroupIndex !== -1) {
                    return {
                      ...layer,
                      elements: layer.elements.map((el, idx) =>
                        idx === layerGroupIndex ? updatedGroup : el
                      ) as ElementDefinition[],
                    };
                  }
                  return layer;
                });
                
                if (updatedLayers.some((layer, idx) => layer !== slide.layers![idx])) {
                  return { ...slide, layers: updatedLayers };
                }
              }
              
              return slide;
            }),
          };
          
          this.setState({ deck: updatedDeck });
          
          this.executeCommand({
            type: 'updateElement',
            target: elementId,
            params: { updates },
            timestamp: Date.now(),
          });
          
          return;
        }
      }
    }

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

    // If updating a group element's children, recalculate bounds
    let finalUpdates = { ...updates };
    if (currentElement.type === 'group' && 'children' in updates && updates.children) {
      const group = currentElement as GroupElementDefinition;
      const updatedGroup = { ...group, ...updates } as GroupElementDefinition;
      
      // Recalculate group bounds from updated children
      const newGroupBounds = this.calculateGroupBounds(updatedGroup.children || []);
      if (newGroupBounds) {
        finalUpdates = {
          ...updates,
          bounds: newGroupBounds,
        };
      }
    }

    // Update element in deck
    const updatedDeck: DeckDefinition = {
      ...deck,
      slides: deck.slides.map((slide): SlideDefinition => {
        const elements = slide.elements || [];
        const elementIndex = elements.findIndex(el => el.id === elementId);
        
        if (elementIndex !== -1) {
          return {
            ...slide,
            elements: elements.map((el, i) => 
              i === elementIndex ? { ...el, ...finalUpdates } as ElementDefinition : el
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
                  i === layerElementIndex ? { ...el, ...finalUpdates } as ElementDefinition : el
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
        updates: finalUpdates,
        previousElement: previousElement ? JSON.parse(JSON.stringify(previousElement)) : undefined,
      },
      timestamp: Date.now(),
    });
  }

  /**
   * Batch update multiple elements in a single setState call.
   * This is much more efficient than calling updateElement multiple times,
   * especially during drag operations.
   */
  batchUpdateElements(updates: Map<string, Partial<ElementDefinition>>): void {
    const { deck, currentSlideIndex, openedGroupId } = this.state;
    if (!deck || updates.size === 0) return;

    const currentSlide = deck.slides[currentSlideIndex];
    if (!currentSlide) return;

    // Build a map of all elements for quick lookup
    const allElements = [
      ...(currentSlide.elements || []),
      ...(currentSlide.layers?.flatMap(l => l.elements) || []),
    ];

    // Collect all elements that need updating, preserving previous state for undo
    const previousElements = new Map<string, ElementDefinition>();
    updates.forEach((_, elementId) => {
      const element = allElements.find(el => el.id === elementId);
      if (element) {
        previousElements.set(elementId, element);
      }
    });

    // Process updates based on opened group state
    let updatedDeck: DeckDefinition;

    if (openedGroupId) {
      // Handle group children updates
      const groupElement = allElements.find(el => el.id === openedGroupId);
      if (groupElement && groupElement.type === 'group') {
        const group = groupElement as GroupElementDefinition;
        const updatedChildren = group.children?.map(child => {
          const elementUpdates = updates.get(child.id);
          return elementUpdates ? { ...child, ...elementUpdates } as ElementDefinition : child;
        }) || [];

        // Recalculate group bounds
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const child of updatedChildren) {
          if (child.bounds) {
            const x = child.bounds.x || 0;
            const y = child.bounds.y || 0;
            const w = child.bounds.width || 0;
            const h = child.bounds.height || 0;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + w);
            maxY = Math.max(maxY, y + h);
          }
        }

        const updatedGroup: GroupElementDefinition = {
          ...group,
          children: updatedChildren,
          bounds: minX !== Infinity ? {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
          } : group.bounds,
        };

        updatedDeck = {
          ...deck,
          slides: deck.slides.map((slide, i) => {
            if (i !== currentSlideIndex) return slide;
            
            const elements = slide.elements || [];
            const groupIndex = elements.findIndex(el => el.id === openedGroupId);
            
            if (groupIndex !== -1) {
              return {
                ...slide,
                elements: elements.map((el, idx) => idx === groupIndex ? updatedGroup : el) as ElementDefinition[],
              };
            }

            if (slide.layers) {
              const updatedLayers = slide.layers.map(layer => {
                const layerGroupIndex = layer.elements.findIndex(el => el.id === openedGroupId);
                if (layerGroupIndex !== -1) {
                  return {
                    ...layer,
                    elements: layer.elements.map((el, idx) => idx === layerGroupIndex ? updatedGroup : el) as ElementDefinition[],
                  };
                }
                return layer;
              });
              
              if (updatedLayers.some((layer, idx) => layer !== slide.layers![idx])) {
                return { ...slide, layers: updatedLayers };
              }
            }
            
            return slide;
          }),
        };
      } else {
        // Fallback to regular update if group not found
        updatedDeck = deck;
      }
    } else {
      // Regular element updates (not in group)
      updatedDeck = {
        ...deck,
        slides: deck.slides.map((slide, i) => {
          if (i !== currentSlideIndex) return slide;

          // Update elements array
          const updatedElements = (slide.elements || []).map(el => {
            const elementUpdates = updates.get(el.id);
            return elementUpdates ? { ...el, ...elementUpdates } as ElementDefinition : el;
          });

          // Update layers
          let updatedLayers = slide.layers;
          if (slide.layers) {
            updatedLayers = slide.layers.map(layer => ({
              ...layer,
              elements: layer.elements.map(el => {
                const elementUpdates = updates.get(el.id);
                return elementUpdates ? { ...el, ...elementUpdates } as ElementDefinition : el;
              }),
            }));
          }

          return {
            ...slide,
            elements: updatedElements,
            layers: updatedLayers,
          };
        }),
      };
    }

    // Single setState call for all updates
    this.setState({ deck: updatedDeck });

    // Execute commands for undo/redo (one per element)
    updates.forEach((updatesForElement, elementId) => {
      const previousElement = previousElements.get(elementId);
      this.executeCommand({
        type: 'updateElement',
        target: elementId,
        params: {
          updates: updatesForElement,
          previousElement: previousElement ? JSON.parse(JSON.stringify(previousElement)) : undefined,
        },
        timestamp: Date.now(),
      });
    });
  }

  deleteElement(elementId: string): void {
    const { deck, currentSlideIndex } = this.state;
    if (!deck) return;

    const slide = deck.slides[currentSlideIndex];
    if (!slide) return;

    let deletedElement: ElementDefinition | undefined;

    // Helper to remove element from group children recursively
    const removeFromGroup = (group: GroupElementDefinition): GroupElementDefinition | null => {
      if (!group.children) return null;
      
      const updatedChildren = group.children.filter(child => {
        if (child.id === elementId) {
          deletedElement = child;
          return false;
        }
        // If child is a group, recursively check its children
        if (child.type === 'group') {
          const updatedChildGroup = removeFromGroup(child as GroupElementDefinition);
          if (updatedChildGroup === null) {
            // Child group was deleted entirely
            return false;
          }
          return updatedChildGroup;
        }
        return true;
      });

      // If no children left, return null to indicate group should be deleted
      if (updatedChildren.length === 0) {
        return null;
      }

      // Recalculate group bounds
      const newBounds = this.calculateGroupBounds(updatedChildren);
      
      return {
        ...group,
        children: updatedChildren,
        bounds: newBounds || group.bounds,
      };
    };

    const updatedSlide: SlideDefinition = {
      ...slide,
      elements: (slide.elements || []).map(el => {
        if (el.id === elementId) {
          deletedElement = el;
          return null; // Mark for removal
        }
        // If element is a group, check its children
        if (el.type === 'group') {
          const updatedGroup = removeFromGroup(el as GroupElementDefinition);
          if (updatedGroup === null) {
            // Group should be deleted (no children left)
            return null;
          }
          return updatedGroup;
        }
        return el;
      }).filter((el): el is ElementDefinition => el !== null),
      layers: slide.layers?.map(layer => ({
        ...layer,
        elements: layer.elements.map(el => {
          if (el.id === elementId) {
            deletedElement = el;
            return null; // Mark for removal
          }
          // If element is a group, check its children
          if (el.type === 'group') {
            const updatedGroup = removeFromGroup(el as GroupElementDefinition);
            if (updatedGroup === null) {
              // Group should be deleted (no children left)
              return null;
            }
            return updatedGroup;
          }
          return el;
        }).filter((el): el is ElementDefinition => el !== null),
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

  reorderElement(elementId: string, newIndex: number): void {
    const { deck, currentSlideIndex } = this.state;
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

    this.setState({ deck: updatedDeck });

    this.executeCommand({
      type: 'reorderElement',
      target: elementId,
      params: { newIndex },
      timestamp: Date.now(),
    });
  }

  toggleElementLock(elementId: string): void {
    const { deck } = this.state;
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

    this.updateElement(elementId, { metadata: updatedMetadata });
  }

  // Helper to get all elements in rendering order (for layer operations)
  private getAllElementsInOrder(slide: SlideDefinition): ElementDefinition[] {
    const allElements: ElementDefinition[] = [];
    
    // First add elements from slide.elements (rendered first, so bottom)
    if (slide.elements) {
      allElements.push(...slide.elements);
    }
    
    // Then add elements from layers, sorted by order (lower order = bottom, higher order = top)
    if (slide.layers) {
      const sortedLayers = [...slide.layers].sort((a, b) => a.order - b.order);
      sortedLayers.forEach(layer => {
        if (layer.elements) {
          allElements.push(...layer.elements);
        }
      });
    }
    
    return allElements;
  }

  // Helper to find element location and rebuild slide structure
  private rebuildSlideWithElementOrder(
    slide: SlideDefinition,
    elementOrder: ElementDefinition[]
  ): SlideDefinition {
    // For simplicity, put all elements in slide.elements and clear layers
    // This matches the current reorderElement behavior
    return {
      ...slide,
      elements: elementOrder,
      layers: slide.layers?.map(layer => ({
        ...layer,
        elements: [],
      })),
    };
  }

  bringToFront(elementId: string): void {
    const { deck, currentSlideIndex } = this.state;
    if (!deck) return;

    const slide = deck.slides[currentSlideIndex];
    if (!slide) return;

    const allElements = this.getAllElementsInOrder(slide);
    const currentIndex = allElements.findIndex(el => el.id === elementId);
    
    if (currentIndex === -1) return;
    
    // If already at the front, do nothing
    if (currentIndex === allElements.length - 1) return;

    // Remove element and add to end
    const [movedElement] = allElements.splice(currentIndex, 1);
    allElements.push(movedElement);

    const updatedSlide = this.rebuildSlideWithElementOrder(slide, allElements);
    const updatedDeck: DeckDefinition = {
      ...deck,
      slides: deck.slides.map((s, i) => (i === currentSlideIndex ? updatedSlide : s)),
    };

    this.setState({ deck: updatedDeck });

    this.executeCommand({
      type: 'bringToFront',
      target: elementId,
      params: {},
      timestamp: Date.now(),
    });
  }

  sendToBack(elementId: string): void {
    const { deck, currentSlideIndex } = this.state;
    if (!deck) return;

    const slide = deck.slides[currentSlideIndex];
    if (!slide) return;

    const allElements = this.getAllElementsInOrder(slide);
    const currentIndex = allElements.findIndex(el => el.id === elementId);
    
    if (currentIndex === -1) return;
    
    // If already at the back, do nothing
    if (currentIndex === 0) return;

    // Remove element and add to beginning
    const [movedElement] = allElements.splice(currentIndex, 1);
    allElements.unshift(movedElement);

    const updatedSlide = this.rebuildSlideWithElementOrder(slide, allElements);
    const updatedDeck: DeckDefinition = {
      ...deck,
      slides: deck.slides.map((s, i) => (i === currentSlideIndex ? updatedSlide : s)),
    };

    this.setState({ deck: updatedDeck });

    this.executeCommand({
      type: 'sendToBack',
      target: elementId,
      params: {},
      timestamp: Date.now(),
    });
  }

  bringForward(elementId: string): void {
    const { deck, currentSlideIndex } = this.state;
    if (!deck) return;

    const slide = deck.slides[currentSlideIndex];
    if (!slide) return;

    const allElements = this.getAllElementsInOrder(slide);
    const currentIndex = allElements.findIndex(el => el.id === elementId);
    
    if (currentIndex === -1) return;
    
    // If already at the front, do nothing
    if (currentIndex === allElements.length - 1) return;

    // Swap with next element
    [allElements[currentIndex], allElements[currentIndex + 1]] = 
      [allElements[currentIndex + 1], allElements[currentIndex]];

    const updatedSlide = this.rebuildSlideWithElementOrder(slide, allElements);
    const updatedDeck: DeckDefinition = {
      ...deck,
      slides: deck.slides.map((s, i) => (i === currentSlideIndex ? updatedSlide : s)),
    };

    this.setState({ deck: updatedDeck });

    this.executeCommand({
      type: 'bringForward',
      target: elementId,
      params: {},
      timestamp: Date.now(),
    });
  }

  sendBackward(elementId: string): void {
    const { deck, currentSlideIndex } = this.state;
    if (!deck) return;

    const slide = deck.slides[currentSlideIndex];
    if (!slide) return;

    const allElements = this.getAllElementsInOrder(slide);
    const currentIndex = allElements.findIndex(el => el.id === elementId);
    
    if (currentIndex === -1) return;
    
    // If already at the back, do nothing
    if (currentIndex === 0) return;

    // Swap with previous element
    [allElements[currentIndex], allElements[currentIndex - 1]] = 
      [allElements[currentIndex - 1], allElements[currentIndex]];

    const updatedSlide = this.rebuildSlideWithElementOrder(slide, allElements);
    const updatedDeck: DeckDefinition = {
      ...deck,
      slides: deck.slides.map((s, i) => (i === currentSlideIndex ? updatedSlide : s)),
    };

    this.setState({ deck: updatedDeck });

    this.executeCommand({
      type: 'sendBackward',
      target: elementId,
      params: {},
      timestamp: Date.now(),
    });
  }

  // Clipboard operations
  copy(): void {
    const { deck, currentSlideIndex, selectedElementIds } = this.state;
    if (!deck || selectedElementIds.size === 0) return;

    const slide = deck.slides[currentSlideIndex];
    if (!slide) return;

    const allElements = [
      ...(slide.elements || []),
      ...(slide.layers?.flatMap(l => l.elements) || []),
    ];

    const elementsToCopy = allElements.filter(el => selectedElementIds.has(el.id));
    this.setState({ clipboard: elementsToCopy });
  }

  paste(slideIndex?: number): void {
    const { clipboard, currentSlideIndex } = this.state;
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

    pasted.forEach(el => this.addElement(el, targetIndex));
    this.selectElements(pasted.map(el => el.id));
  }

  cut(): void {
    this.copy();
    const { selectedElementIds } = this.state;
    selectedElementIds.forEach(id => this.deleteElement(id));
  }

  duplicateElement(elementId: string): void {
    const { deck, currentSlideIndex } = this.state;
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

    this.addElement(duplicated, currentSlideIndex);
  }

  // Helper to find which group contains an element (if any)
  private findGroupContainingElement(elementId: string, slide: SlideDefinition): ElementDefinition | null {
    const allElements = [
      ...(slide.elements || []),
      ...(slide.layers?.flatMap(l => l.elements) || []),
    ];

    for (const element of allElements) {
      if (element.type === 'group') {
        const groupElement = element as GroupElementDefinition;
        if (groupElement.children?.some(child => child.id === elementId)) {
          return element;
        }
      }
    }
    return null;
  }

  // Helper to calculate bounding box for a group from its children
  private calculateGroupBounds(children: ElementDefinition[]): { x: number; y: number; width: number; height: number } | undefined {
    if (children.length === 0) return undefined;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const child of children) {
      if (!child.bounds) continue;
      const x = child.bounds.x || 0;
      const y = child.bounds.y || 0;
      const width = child.bounds.width || 0;
      const height = child.bounds.height || 0;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    }

    if (minX === Infinity) return undefined;

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  groupElements(elementIds: string[]): void {
    // CRITICAL: Get fresh state snapshot to ensure we're reading current bounds
    const currentState = this.getState();
    const { deck, currentSlideIndex, openedGroupId } = currentState;
    if (!deck || elementIds.length < 2) return;

    const slide = deck.slides[currentSlideIndex];
    if (!slide) return;

    // CRITICAL: Read elements from current deck state to get the most up-to-date bounds
    const allElements = [
      ...(slide.elements || []),
      ...(slide.layers?.flatMap(l => l.elements) || []),
    ];

    // Helper to find an element by ID, checking both top-level elements and children of opened groups
    const findElementWithAbsoluteBounds = (id: string): { element: ElementDefinition; absoluteBounds: { x: number; y: number; width: number; height: number } } | null => {
      // First check top-level elements
      let el = allElements.find(e => e.id === id);
      let isChildOfOpenedGroup = false;
      
      // If not found and there's an opened group, check its children
      if (!el && openedGroupId) {
        const parentGroup = allElements.find(pg => pg.id === openedGroupId && pg.type === 'group');
        if (parentGroup && parentGroup.type === 'group') {
          const group = parentGroup as GroupElementDefinition;
          el = group.children?.find(child => child.id === id);
          isChildOfOpenedGroup = !!el;
        }
      }
      
      if (!el || !el.bounds) return null;
      
      // Calculate absolute bounds
      let absoluteBounds: { x: number; y: number; width: number; height: number };
      
      if (isChildOfOpenedGroup && openedGroupId) {
        // Element is a child of opened group - convert relative to absolute
        const parentGroup = allElements.find(pg => pg.id === openedGroupId && pg.type === 'group') as GroupElementDefinition | undefined;
        if (parentGroup && parentGroup.bounds) {
          absoluteBounds = {
            x: (el.bounds.x || 0) + (parentGroup.bounds.x || 0),
            y: (el.bounds.y || 0) + (parentGroup.bounds.y || 0),
            width: el.bounds.width || 100,
            height: el.bounds.height || 100,
          };
        } else {
          // Fallback - shouldn't happen
          absoluteBounds = {
            x: el.bounds.x || 0,
            y: el.bounds.y || 0,
            width: el.bounds.width || 100,
            height: el.bounds.height || 100,
          };
        }
      } else {
        // Element is not a child of an opened group, bounds are already absolute
        // Read bounds directly from the element's bounds property - ensure we get exact values
        absoluteBounds = {
          x: el.bounds.x ?? 0,
          y: el.bounds.y ?? 0,
          width: el.bounds.width ?? 100,
          height: el.bounds.height ?? 100,
        };
      }
      
      return { element: el, absoluteBounds };
    };

    // Find elements to group - preserve their original order
    // CRITICAL: Read bounds and convert to absolute if element is child of opened group
    const elementsToGroup: Array<{ element: ElementDefinition; originalBounds: { x: number; y: number; width: number; height: number } }> = [];
    let existingGroup: GroupElementDefinition | null = null;
    
    for (const id of elementIds) {
      const result = findElementWithAbsoluteBounds(id);
      if (!result) continue;
      
      // Check if this element is already a group
      if (result.element.type === 'group' && !existingGroup) {
        existingGroup = result.element as GroupElementDefinition;
        // If we found an existing group, we'll add other elements to it instead of creating a new group
        continue;
      }
      
      elementsToGroup.push({ 
        element: result.element, 
        originalBounds: result.absoluteBounds 
      });
    }
    
    // If we found an existing group, add elements to it instead of creating a new group
    if (existingGroup) {
      // First, get the existing group's current bounds (need absolute positions)
      const existingGroupResult = findElementWithAbsoluteBounds(existingGroup.id);
      if (!existingGroupResult) return; // Shouldn't happen, but safety check
      
      // Collect all elements to add (including children from other groups if any)
      const elementsToAdd: ElementDefinition[] = [];
      
      for (const { element, originalBounds } of elementsToGroup) {
        // If element is a group, add its children individually (they already have absolute bounds)
        if (element.type === 'group') {
          const groupToMerge = element as GroupElementDefinition;
          if (groupToMerge.children) {
            // Children of the group being merged already have absolute bounds
            elementsToAdd.push(...groupToMerge.children);
          }
        } else {
          // Regular element - add it with absolute bounds
          elementsToAdd.push({
            ...element,
            bounds: {
              x: originalBounds.x,
              y: originalBounds.y,
              width: originalBounds.width,
              height: originalBounds.height,
            },
          });
        }
      }
      
      // Add existing group's children to the list (they already have absolute bounds)
      if (existingGroup.children) {
        elementsToAdd.push(...existingGroup.children);
      }
      
      // Calculate new group bounds
      const newGroupBounds = this.calculateGroupBounds(elementsToAdd);
      if (!newGroupBounds) return;
      
      // Update the existing group
      const updatedGroup: GroupElementDefinition = {
        ...existingGroup,
        children: elementsToAdd,
        bounds: newGroupBounds,
      };
      
      // Remove elements that were added to the group from the slide
      let updatedSlide: SlideDefinition = { ...slide };
      
      // Remove elements being added (except the existing group itself)
      const idsToRemove = elementIds.filter(id => id !== existingGroup!.id);
      updatedSlide = {
        ...updatedSlide,
        elements: (updatedSlide.elements || []).filter(el => !idsToRemove.includes(el.id)),
        layers: updatedSlide.layers?.map(layer => ({
          ...layer,
          elements: layer.elements.filter(el => !idsToRemove.includes(el.id)),
        })),
      };
      
      // Update the existing group in the slide
      updatedSlide = {
        ...updatedSlide,
        elements: (updatedSlide.elements || []).map(el => 
          el.id === existingGroup!.id ? updatedGroup : el
        ) as ElementDefinition[],
        layers: updatedSlide.layers?.map(layer => ({
          ...layer,
          elements: layer.elements.map(el => 
            el.id === existingGroup!.id ? updatedGroup : el
          ) as ElementDefinition[],
        })),
      };
      
      const updatedDeck: DeckDefinition = {
        ...deck,
        slides: deck.slides.map((s, i) => (i === currentSlideIndex ? updatedSlide : s)),
      };
      
      this.setState({ 
        deck: updatedDeck,
        selectedElementIds: new Set([existingGroup.id]),
      });
      
      this.executeCommand({
        type: 'groupElements',
        target: elementIds,
        params: { groupId: existingGroup.id },
        timestamp: Date.now(),
      });
      
      return;
    }
    
    // No existing group found - create a new group
    if (elementsToGroup.length < 2) return;

    // Calculate group bounds from ORIGINAL absolute positions
    // Use originalBounds directly to ensure we're calculating from the exact current positions
    const tempElements = elementsToGroup.map(({ originalBounds }) => ({
      id: 'temp',
      type: 'shape',
      shapeType: 'rect',
      bounds: originalBounds,
    } as ElementDefinition));
    
    const groupBounds = this.calculateGroupBounds(tempElements);
    if (!groupBounds) return;

    // CRITICAL: Keep children at their ABSOLUTE positions - groups are logical only
    // Children should NOT be converted to relative positions
    // All elements remain positioned absolutely relative to the slide
    const adjustedChildren = elementsToGroup.map(({ element, originalBounds }) => {
      // Keep absolute bounds - groups don't affect positioning
      return {
        ...element,
        bounds: {
          x: originalBounds.x,
          y: originalBounds.y,
          width: originalBounds.width,
          height: originalBounds.height,
        },
      } as ElementDefinition;
    });

    // Create group element - bounds are only for visual feedback/selection, not positioning
    // Children maintain their absolute positions
    const groupElement: GroupElementDefinition = {
      id: `group-${Date.now()}`,
      type: 'group',
      bounds: groupBounds, // Used for selection bounds visualization only
      children: adjustedChildren, // Children have absolute bounds
    };

    // Remove grouped elements from slide (preserve elements not being grouped)
    // If elements are children of an opened group, remove them from the parent group instead
    let updatedSlide: SlideDefinition = { ...slide };
    
    // Check if any elements being grouped are children of an opened group
    if (openedGroupId) {
      const parentGroup = allElements.find(el => el.id === openedGroupId && el.type === 'group');
      if (parentGroup && parentGroup.type === 'group') {
        const group = parentGroup as GroupElementDefinition;
        const childrenBeingGrouped = group.children?.filter(child => elementIds.includes(child.id));
        
        if (childrenBeingGrouped && childrenBeingGrouped.length > 0) {
          // Remove children from parent group
          const updatedParentGroup: GroupElementDefinition = {
            ...group,
            children: group.children?.filter(child => !elementIds.includes(child.id)) || [],
          };
          
          // Recalculate parent group bounds if it still has children
          if (updatedParentGroup.children && updatedParentGroup.children.length > 0) {
            const parentGroupBounds = this.calculateGroupBounds(updatedParentGroup.children);
            if (parentGroupBounds) {
              // CRITICAL: Children have absolute positions - don't normalize
              // Group bounds are calculated from absolute positions
              updatedParentGroup.bounds = parentGroupBounds;
            }
          } else {
            // Parent group has no children left - remove it entirely
            updatedSlide = {
              ...updatedSlide,
              elements: (updatedSlide.elements || []).filter(el => el.id !== openedGroupId),
              layers: updatedSlide.layers?.map(layer => ({
                ...layer,
                elements: layer.elements.filter(el => el.id !== openedGroupId),
              })),
            };
          }
          
          // Update the parent group in the slide
          updatedSlide = {
            ...updatedSlide,
            elements: (updatedSlide.elements || []).map(el => 
              el.id === openedGroupId ? updatedParentGroup : el
            ) as ElementDefinition[],
            layers: updatedSlide.layers?.map(layer => ({
              ...layer,
              elements: layer.elements.map(el => 
                el.id === openedGroupId ? updatedParentGroup : el
              ) as ElementDefinition[],
            })),
          };
        }
      }
    }
    
    // Remove grouped elements from slide elements and layers (if not already removed from parent group)
    updatedSlide = {
      ...updatedSlide,
      elements: (updatedSlide.elements || []).filter(el => !elementIds.includes(el.id)),
      layers: updatedSlide.layers?.map(layer => ({
        ...layer,
        elements: layer.elements.filter(el => !elementIds.includes(el.id)),
      })),
    };

    // Add group to slide at the end (preserves relative rendering order)
    updatedSlide.elements = [...(updatedSlide.elements || []), groupElement];

    const updatedDeck: DeckDefinition = {
      ...deck,
      slides: deck.slides.map((s, i) => (i === currentSlideIndex ? updatedSlide : s)),
    };

    this.setState({ 
      deck: updatedDeck,
      selectedElementIds: new Set([groupElement.id]),
    });

    this.executeCommand({
      type: 'groupElements',
      target: elementIds,
      params: { groupId: groupElement.id },
      timestamp: Date.now(),
    });
  }

  ungroupElements(groupId: string): void {
    const { deck, currentSlideIndex } = this.state;
    if (!deck) return;

    const slide = deck.slides[currentSlideIndex];
    if (!slide) return;

    const allElements = [
      ...(slide.elements || []),
      ...(slide.layers?.flatMap(l => l.elements) || []),
    ];

    const groupElement = allElements.find(el => el.id === groupId);
    if (!groupElement || groupElement.type !== 'group') return;

    const group = groupElement as GroupElementDefinition;
    if (!group.bounds) return;

    // Restore children with absolute positions
    const restoredChildren = group.children.map(child => ({
      ...child,
      bounds: child.bounds ? {
        ...child.bounds,
        x: (child.bounds.x || 0) + (group.bounds?.x || 0),
        y: (child.bounds.y || 0) + (group.bounds?.y || 0),
      } : undefined,
    }));

    // Remove group and add children back
    const updatedSlide: SlideDefinition = {
      ...slide,
      elements: [
        ...(slide.elements || []).filter(el => el.id !== groupId),
        ...restoredChildren,
      ],
      layers: slide.layers?.map(layer => ({
        ...layer,
        elements: layer.elements.filter(el => el.id !== groupId),
      })),
    };

    const updatedDeck: DeckDefinition = {
      ...deck,
      slides: deck.slides.map((s, i) => (i === currentSlideIndex ? updatedSlide : s)),
    };

    this.setState({ 
      deck: updatedDeck,
      selectedElementIds: new Set(restoredChildren.map(c => c.id)),
      openedGroupId: null, // Close group if it was opened
    });

    this.executeCommand({
      type: 'ungroupElements',
      target: groupId,
      params: { childrenIds: restoredChildren.map(c => c.id) },
      timestamp: Date.now(),
    });
  }

  openGroup(groupId: string): void {
    this.setState({ openedGroupId: groupId });
  }

  closeGroup(): void {
    this.setState({ openedGroupId: null });
  }

  toggleGroup(groupId: string): void {
    if (this.state.openedGroupId === groupId) {
      this.closeGroup();
    } else {
      this.openGroup(groupId);
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

  setShowGrid(show: boolean): void {
    this.setState({ showGrid: show });
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

  updateSlide(slideId: string, updates: Partial<SlideDefinition>): void {
    const { deck } = this.state;
    if (!deck) return;

    const updatedDeck: DeckDefinition = {
      ...deck,
      slides: deck.slides.map((slide) => {
        if (slide.id === slideId) {
          // Deep merge to handle nested properties like background, style, etc.
          return this.deepMerge(slide, updates);
        }
        return slide;
      }),
    };

    this.setState({ deck: updatedDeck });

    this.executeCommand({
      type: 'updateSlide',
      params: { slideId, updates },
      timestamp: Date.now(),
    });
  }

  // Timeline operations
  updateSlideTimeline(slideId: string, timeline: import('@/rsc/types').TimelineDefinition): void {
    const { deck } = this.state;
    if (!deck) return;

    const updatedDeck: DeckDefinition = {
      ...deck,
      slides: deck.slides.map(slide =>
        slide.id === slideId ? { ...slide, timeline } : slide
      ),
    };

    this.setState({ deck: updatedDeck });
    this.executeCommand({
      type: 'updateTimeline',
      target: slideId,
      params: { timeline },
      timestamp: Date.now(),
    });
  }

  addTimelineSegment(slideId: string, trackId: string, segment: import('@/rsc/types').TimelineSegmentDefinition): void {
    const { deck } = this.state;
    if (!deck) return;

    const slide = deck.slides.find(s => s.id === slideId);
    if (!slide) return;

    const timeline = slide.timeline || { tracks: [] };
    const track = timeline.tracks.find(t => t.id === trackId) || {
      id: trackId,
      trackType: 'animation' as const,
      segments: [],
    };

    const updatedTrack = {
      ...track,
      segments: [...track.segments, segment],
    };

    const updatedTracks = timeline.tracks.some(t => t.id === trackId)
      ? timeline.tracks.map(t => t.id === trackId ? updatedTrack : t)
      : [...timeline.tracks, updatedTrack];

    this.updateSlideTimeline(slideId, { tracks: updatedTracks });
  }

  removeTimelineSegment(slideId: string, trackId: string, segmentId: string): void {
    const { deck } = this.state;
    if (!deck) return;

    const slide = deck.slides.find(s => s.id === slideId);
    if (!slide?.timeline) return;

    const updatedTracks = slide.timeline.tracks.map(track => {
      if (track.id === trackId) {
        return {
          ...track,
          segments: track.segments.filter(s => s.id !== segmentId),
        };
      }
      return track;
    });

    this.updateSlideTimeline(slideId, { tracks: updatedTracks });
  }

  // Master slide operations
  addMasterSlide(masterSlide: import('@/rsc/types').MasterSlide): void {
    const { deck } = this.state;
    if (!deck) return;

    const updatedDeck: DeckDefinition = {
      ...deck,
      settings: {
        ...deck.settings,
        theme: {
          ...deck.settings?.theme,
          masterSlides: [...(deck.settings?.theme?.masterSlides || []), masterSlide],
        },
      },
    };

    this.setState({ deck: updatedDeck });
    this.executeCommand({
      type: 'addMasterSlide',
      target: masterSlide.id,
      params: { masterSlide },
      timestamp: Date.now(),
    });
  }

  updateMasterSlide(masterSlideId: string, updates: Partial<import('@/rsc/types').MasterSlide>): void {
    const { deck } = this.state;
    if (!deck?.settings?.theme?.masterSlides) return;

    const updatedMasterSlides = deck.settings.theme.masterSlides.map(ms =>
      ms.id === masterSlideId ? { ...ms, ...updates } : ms
    );

    const updatedDeck: DeckDefinition = {
      ...deck,
      settings: {
        ...deck.settings,
        theme: {
          ...deck.settings.theme,
          masterSlides: updatedMasterSlides,
        },
      },
    };

    this.setState({ deck: updatedDeck });
    this.executeCommand({
      type: 'updateMasterSlide',
      target: masterSlideId,
      params: { updates },
      timestamp: Date.now(),
    });
  }

  deleteMasterSlide(masterSlideId: string): void {
    const { deck } = this.state;
    if (!deck?.settings?.theme?.masterSlides) return;

    const updatedMasterSlides = deck.settings.theme.masterSlides.filter(ms => ms.id !== masterSlideId);
    
    // Remove master slide reference from slides using it
    const updatedSlides = deck.slides.map(slide =>
      slide.masterSlideId === masterSlideId ? { ...slide, masterSlideId: undefined } : slide
    );

    const updatedDeck: DeckDefinition = {
      ...deck,
      settings: {
        ...deck.settings,
        theme: {
          ...deck.settings.theme,
          masterSlides: updatedMasterSlides,
        },
      },
      slides: updatedSlides,
    };

    this.setState({ deck: updatedDeck });
    this.executeCommand({
      type: 'deleteMasterSlide',
      target: masterSlideId,
      params: {},
      timestamp: Date.now(),
    });
  }

  applyMasterSlideToSlide(slideId: string, masterSlideId: string | null): void {
    const { deck } = this.state;
    if (!deck) return;

    const updatedDeck: DeckDefinition = {
      ...deck,
      slides: deck.slides.map(slide =>
        slide.id === slideId ? { ...slide, masterSlideId: masterSlideId || undefined } : slide
      ),
    };

    this.setState({ deck: updatedDeck });
    this.executeCommand({
      type: 'applyMasterSlide',
      target: slideId,
      params: { masterSlideId },
      timestamp: Date.now(),
    });
  }

  // Utility
  reset(): void {
    this.state = {
      deck: null,
      deckId: null,
      currentSlideIndex: 0,
      selectedElementIds: new Set(),
      selectedSlideId: null,
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
      openedGroupId: null,
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

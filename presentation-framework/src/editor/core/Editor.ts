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

type EditorStateListener = (state: EditorState) => void;

const MAX_UNDO_STACK_SIZE = 50;

export class Editor {
  private state: EditorState;
  private listeners: Set<EditorStateListener> = new Set();
  private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
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
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) && source[key].constructor === Object) {
          result[key] = this.deepMerge((target[key] || {}) as T[Extract<keyof T, string>], source[key] as Partial<T[Extract<keyof T, string>]>);
        } else {
          result[key] = source[key] as T[Extract<keyof T, string>];
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
            this.setState({ selectedElementIds: newSelection });
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
          this.setState({ selectedElementIds: newSelection });
          return;
        }
      }
    }
    
    // Normal selection
    const newSelection = addToSelection 
      ? new Set([...this.state.selectedElementIds, elementId])
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
          // Convert absolute bounds (from dragging) back to relative bounds
          let relativeUpdates = { ...updates };
          
          if (updates.bounds && group.bounds) {
            // Convert absolute bounds to relative bounds
            relativeUpdates = {
              ...relativeUpdates,
              bounds: {
                ...updates.bounds,
                x: (updates.bounds.x || 0) - (group.bounds.x || 0),
                y: (updates.bounds.y || 0) - (group.bounds.y || 0),
              },
            };
          }
          
          const updatedChildren: ElementDefinition[] = group.children.map((child, i) =>
            i === childIndex ? { ...child, ...relativeUpdates } as ElementDefinition : child
          );
          
          // Recalculate group bounds from children's relative positions
          // We calculate the bounding box but preserve visual positions
          let minX = Infinity;
          let minY = Infinity;
          let maxX = -Infinity;
          let maxY = -Infinity;
          
          for (const child of updatedChildren) {
            if (!child.bounds) continue;
            const relX = child.bounds.x || 0;
            const relY = child.bounds.y || 0;
            const width = child.bounds.width || 0;
            const height = child.bounds.height || 0;
            
            minX = Math.min(minX, relX);
            minY = Math.min(minY, relY);
            maxX = Math.max(maxX, relX + width);
            maxY = Math.max(maxY, relY + height);
          }
          
          // Only update if we have valid bounds and group.bounds exists
          if (minX !== Infinity && group.bounds) {
            const currentGroupX = group.bounds.x || 0;
            const currentGroupY = group.bounds.y || 0;
            
            // Calculate new group bounds size
            const newWidth = maxX - minX;
            const newHeight = maxY - minY;
            
            // Normalize children to start at (0,0) relative to group
            // This requires adjusting group position to preserve visual positions
            const normalizedChildren = updatedChildren.map(child => {
              if (!child.bounds) return child;
              return {
                ...child,
                bounds: {
                  ...child.bounds,
                  x: (child.bounds.x || 0) - minX,
                  y: (child.bounds.y || 0) - minY,
                },
              };
            });
            
            // Adjust group position to preserve visual positions
            // Visual position of child = groupX + relX
            // After normalization: newGroupX + (relX - minX) = groupX + relX
            // So: newGroupX = groupX + minX
            const newGroupBounds = {
              x: currentGroupX + minX,
              y: currentGroupY + minY,
              width: newWidth,
              height: newHeight,
            };
            
            const updatedGroup: GroupElementDefinition = {
              ...group,
              children: normalizedChildren,
              bounds: newGroupBounds,
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
              params: { updates: relativeUpdates },
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
            params: { updates: relativeUpdates },
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
              i === elementIndex ? { ...el, ...updates } as ElementDefinition : el
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
                  i === layerElementIndex ? { ...el, ...updates } as ElementDefinition : el
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
    const { deck, currentSlideIndex } = this.state;
    if (!deck || elementIds.length < 2) return;

    const slide = deck.slides[currentSlideIndex];
    if (!slide) return;

    const allElements = [
      ...(slide.elements || []),
      ...(slide.layers?.flatMap(l => l.elements) || []),
    ];

    // Find elements to group - preserve their original order
    const elementsToGroup = elementIds
      .map(id => allElements.find(el => el.id === id))
      .filter((el): el is ElementDefinition => el !== undefined);
    
    if (elementsToGroup.length < 2) return;

    // Calculate group bounds from children's absolute positions
    // This finds the bounding box that contains all elements
    const groupBounds = this.calculateGroupBounds(elementsToGroup);
    if (!groupBounds) return;

    // Adjust children bounds to be relative to group origin (top-left of bounding box)
    // This preserves their visual positions: group at groupBounds + children at relative positions = same visual result
    const adjustedChildren = elementsToGroup.map(child => {
      if (!child.bounds) return child;
      
      return {
        ...child,
        bounds: {
          ...child.bounds,
          x: (child.bounds.x || 0) - groupBounds.x,
          y: (child.bounds.y || 0) - groupBounds.y,
          // Preserve width and height
          width: child.bounds.width,
          height: child.bounds.height,
        },
      };
    });

    // Create group element with bounds at the calculated position
    const groupElement: GroupElementDefinition = {
      id: `group-${Date.now()}`,
      type: 'group',
      bounds: groupBounds,
      children: adjustedChildren,
    };

    // Remove grouped elements from slide (preserve elements not being grouped)
    const updatedSlide: SlideDefinition = {
      ...slide,
      elements: (slide.elements || []).filter(el => !elementIds.includes(el.id)),
      layers: slide.layers?.map(layer => ({
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

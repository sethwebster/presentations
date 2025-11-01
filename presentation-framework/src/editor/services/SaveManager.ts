import type { DeckDefinition } from '@/rsc/types';

export type SaveStatus = 'saved' | 'saving' | 'unsaved';

export interface SaveManagerState {
  status: SaveStatus;
  lastSaved: Date | null;
}

type SaveManagerListener = (state: SaveManagerState) => void;

/**
 * SaveManager handles all autosave logic outside of React.
 * React components subscribe to observe save status, but don't control it.
 */
export class SaveManager {
  private state: SaveManagerState = {
    status: 'saved',
    lastSaved: null,
  };

  private listeners = new Set<SaveManagerListener>();
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private previousDeckHash = '';
  private pendingSaveHash = '';
  private isDragging = false;
  private autosaveEnabled = true;
  private editorInstance: { saveDeck: () => Promise<void>; abortSave?: () => void } | null = null;

  constructor() {
    // No React dependencies - pure TypeScript service
  }

  /**
   * Initialize the save manager with editor instance and settings
   */
  initialize(editor: { saveDeck: () => Promise<void>; abortSave?: () => void }, autosaveEnabled: boolean = true): void {
    this.editorInstance = editor;
    this.autosaveEnabled = autosaveEnabled;
  }

  /**
   * Subscribe to save status changes
   */
  subscribe(listener: SaveManagerListener): () => void {
    this.listeners.add(listener);
    // Immediately call with current state
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get current state snapshot (for server-side rendering)
   */
  getSnapshot(): SaveManagerState {
    return this.state;
  }

  /**
   * Update autosave enabled state
   */
  setAutosaveEnabled(enabled: boolean): void {
    this.autosaveEnabled = enabled;
  }

  /**
   * Update dragging state (prevents autosave during drag)
   */
  setDragging(isDragging: boolean): void {
    const wasDragging = this.isDragging;
    this.isDragging = isDragging;

    // If dragging starts, abort any in-flight saves
    if (!wasDragging && isDragging) {
      this.abortCurrentSave();
    }

    // If drag just completed and we have pending changes, save them
    if (wasDragging && !isDragging && this.pendingSaveHash && this.pendingSaveHash !== this.previousDeckHash) {
      this.scheduleSave(this.pendingSaveHash, 500); // Shorter debounce after drag
    }
  }

  /**
   * Process deck changes (called when deck state changes)
   */
  onDeckChange(deck: DeckDefinition | null): void {
    if (!deck) {
      this.setState({ status: 'saved', lastSaved: this.state.lastSaved });
      this.previousDeckHash = '';
      this.pendingSaveHash = '';
      this.cancelPendingSave();
      return;
    }

    // Create hash of deck content (excluding timestamp)
    const deckHash = this.createDeckHash(deck);

    // Initialize on first load
    if (this.previousDeckHash === '') {
      this.previousDeckHash = deckHash;
      return;
    }

    // If content hasn't changed, do nothing
    if (deckHash === this.previousDeckHash) {
      return;
    }

    // Mark as unsaved
    this.setState({ status: 'unsaved', lastSaved: this.state.lastSaved });

    // If dragging, store hash for later save
    if (this.isDragging) {
      this.pendingSaveHash = deckHash;
      return;
    }

    // Schedule autosave if enabled
    if (this.autosaveEnabled) {
      this.scheduleSave(deckHash, 1000);
    }
  }

  /**
   * Create a hash of deck content (excluding updatedAt timestamp)
   */
  private createDeckHash(deck: DeckDefinition): string {
    const deckForHash = {
      ...deck,
      meta: deck.meta ? { ...deck.meta, updatedAt: undefined } : undefined,
    };
    return JSON.stringify(deckForHash);
  }

  /**
   * Schedule an autosave with debounce
   */
  private scheduleSave(deckHash: string, debounceMs: number): void {
    // Cancel any existing pending save
    this.cancelPendingSave();

    this.saveTimeout = setTimeout(async () => {
      if (!this.editorInstance) {
        console.warn('SaveManager: Editor instance not initialized');
        return;
      }

      this.setState({ status: 'saving', lastSaved: this.state.lastSaved });

      try {
        await this.editorInstance.saveDeck();
        this.setState({ status: 'saved', lastSaved: new Date() });
        this.previousDeckHash = deckHash;
        this.pendingSaveHash = '';
      } catch (error) {
        console.error('SaveManager: Save failed', error);
        this.setState({ status: 'unsaved', lastSaved: this.state.lastSaved });
      }
    }, debounceMs);
  }

  /**
   * Cancel any pending save (debounced timeout)
   */
  private cancelPendingSave(): void {
    if (this.saveTimeout !== null) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
  }

  /**
   * Abort the current in-flight save operation
   */
  private abortCurrentSave(): void {
    // Cancel pending debounced save
    this.cancelPendingSave();
    
    // Abort in-flight save if editor supports it
    if (this.editorInstance?.abortSave) {
      this.editorInstance.abortSave();
    }
    
    // Reset state to unsaved if we aborted
    if (this.state.status === 'saving') {
      this.setState({ status: 'unsaved', lastSaved: this.state.lastSaved });
    }
  }

  /**
   * Update internal state and notify listeners
   */
  private setState(updates: Partial<SaveManagerState>): void {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  /**
   * Notify all subscribers of state changes
   */
  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('SaveManager: Listener error', error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.cancelPendingSave();
    this.listeners.clear();
  }
}

// Singleton instance
let saveManagerInstance: SaveManager | null = null;

export function getSaveManager(): SaveManager {
  if (!saveManagerInstance) {
    saveManagerInstance = new SaveManager();
  }
  return saveManagerInstance;
}


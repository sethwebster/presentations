import type { EditorCommand } from './Editor';

/**
 * CommandHistory manages unlimited undo/redo stacks for the editor.
 * Each command stores enough data to reverse its operation.
 */
export class CommandHistory {
  private undoStack: EditorCommand[] = [];
  private redoStack: EditorCommand[] = [];
  private maxSize: number | null = null; // null means unlimited

  /**
   * Create a new command history
   * @param maxSize Maximum number of commands to keep (null for unlimited)
   */
  constructor(maxSize: number | null = null) {
    this.maxSize = maxSize;
  }

  /**
   * Add a new command to the undo stack
   * Clears the redo stack when a new command is added
   */
  pushCommand(command: EditorCommand): void {
    this.undoStack.push(command);
    
    // If maxSize is set, trim old commands
    if (this.maxSize !== null && this.undoStack.length > this.maxSize) {
      this.undoStack = this.undoStack.slice(-this.maxSize);
    }
    
    // Clear redo stack when new command is added
    this.redoStack = [];
  }

  /**
   * Remove the last command from undo stack and add it to redo stack
   * @returns The command that was undone, or null if nothing to undo
   */
  undo(): EditorCommand | null {
    if (this.undoStack.length === 0) {
      return null;
    }
    
    const command = this.undoStack.pop()!;
    this.redoStack.push(command);
    return command;
  }

  /**
   * Remove the last command from redo stack and add it back to undo stack
   * @returns The command that was redone, or null if nothing to redo
   */
  redo(): EditorCommand | null {
    if (this.redoStack.length === 0) {
      return null;
    }
    
    const command = this.redoStack.pop()!;
    this.undoStack.push(command);
    return command;
  }

  /**
   * Get the current undo stack (read-only)
   */
  getUndoStack(): readonly EditorCommand[] {
    return [...this.undoStack];
  }

  /**
   * Get the current redo stack (read-only)
   */
  getRedoStack(): readonly EditorCommand[] {
    return [...this.redoStack];
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Replace history with new stacks (e.g., when loading from server)
   */
  setHistory(undoStack: EditorCommand[], redoStack: EditorCommand[]): void {
    this.undoStack = [...undoStack];
    this.redoStack = [...redoStack];
    
    // Apply maxSize if set
    if (this.maxSize !== null && this.undoStack.length > this.maxSize) {
      this.undoStack = this.undoStack.slice(-this.maxSize);
    }
  }

  /**
   * Get history as serializable object
   */
  toJSON(): { undoStack: EditorCommand[]; redoStack: EditorCommand[] } {
    return {
      undoStack: [...this.undoStack],
      redoStack: [...this.redoStack],
    };
  }

  /**
   * Get the number of commands in undo stack
   */
  getUndoCount(): number {
    return this.undoStack.length;
  }

  /**
   * Get the number of commands in redo stack
   */
  getRedoCount(): number {
    return this.redoStack.length;
  }
}


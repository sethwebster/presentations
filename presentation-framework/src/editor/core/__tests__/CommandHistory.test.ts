import { describe, it, expect, beforeEach } from 'vitest';
import { CommandHistory } from '../CommandHistory';
import type { EditorCommand } from '../Editor';

describe('CommandHistory', () => {
  let history: CommandHistory;

  beforeEach(() => {
    history = new CommandHistory(null); // Unlimited history
  });

  describe('pushCommand', () => {
    it('should add commands to undo stack', () => {
      const command: EditorCommand = {
        type: 'addElement',
        params: { element: { id: 'el1', type: 'text' } },
        timestamp: Date.now(),
      };

      history.pushCommand(command);

      expect(history.getUndoCount()).toBe(1);
      expect(history.canUndo()).toBe(true);
      expect(history.canRedo()).toBe(false);
    });

    it('should clear redo stack when new command is added', () => {
      const cmd1: EditorCommand = {
        type: 'addElement',
        params: {},
        timestamp: Date.now(),
      };
      const cmd2: EditorCommand = {
        type: 'updateElement',
        params: {},
        timestamp: Date.now(),
      };

      history.pushCommand(cmd1);
      history.undo(); // Move to redo stack
      expect(history.canRedo()).toBe(true);

      history.pushCommand(cmd2);
      expect(history.canRedo()).toBe(false);
    });

    it('should respect maxSize when set', () => {
      const limitedHistory = new CommandHistory(3);

      for (let i = 0; i < 5; i++) {
        limitedHistory.pushCommand({
          type: 'addElement',
          params: { index: i },
          timestamp: Date.now(),
        });
      }

      expect(limitedHistory.getUndoCount()).toBe(3);
    });
  });

  describe('undo/redo', () => {
    it('should move commands between stacks correctly', () => {
      const cmd1: EditorCommand = {
        type: 'addElement',
        params: { element: { id: 'el1', type: 'text' } },
        timestamp: Date.now(),
      };
      const cmd2: EditorCommand = {
        type: 'updateElement',
        params: { updates: {} },
        timestamp: Date.now(),
      };

      history.pushCommand(cmd1);
      history.pushCommand(cmd2);

      expect(history.getUndoCount()).toBe(2);
      expect(history.getRedoCount()).toBe(0);

      const undone = history.undo();
      expect(undone).toEqual(cmd2);
      expect(history.getUndoCount()).toBe(1);
      expect(history.getRedoCount()).toBe(1);

      const redone = history.redo();
      expect(redone).toEqual(cmd2);
      expect(history.getUndoCount()).toBe(2);
      expect(history.getRedoCount()).toBe(0);
    });

    it('should return null when no commands to undo', () => {
      expect(history.undo()).toBeNull();
      expect(history.canUndo()).toBe(false);
    });

    it('should return null when no commands to redo', () => {
      expect(history.redo()).toBeNull();
      expect(history.canRedo()).toBe(false);
    });
  });

  describe('setHistory', () => {
    it('should replace history with provided stacks', () => {
      const undoStack: EditorCommand[] = [
        { type: 'addElement', params: {}, timestamp: 1 },
        { type: 'updateElement', params: {}, timestamp: 2 },
      ];
      const redoStack: EditorCommand[] = [
        { type: 'deleteElement', params: {}, timestamp: 3 },
      ];

      history.setHistory(undoStack, redoStack);

      expect(history.getUndoCount()).toBe(2);
      expect(history.getRedoCount()).toBe(1);
      expect(history.getUndoStack()).toEqual(undoStack);
      expect(history.getRedoStack()).toEqual(redoStack);
    });

    it('should apply maxSize when setting history', () => {
      const limitedHistory = new CommandHistory(2);
      const undoStack: EditorCommand[] = [
        { type: 'cmd1', params: {}, timestamp: 1 },
        { type: 'cmd2', params: {}, timestamp: 2 },
        { type: 'cmd3', params: {}, timestamp: 3 },
      ];

      limitedHistory.setHistory(undoStack, []);

      expect(limitedHistory.getUndoCount()).toBe(2);
    });
  });

  describe('toJSON', () => {
    it('should serialize history correctly', () => {
      const cmd1: EditorCommand = {
        type: 'addElement',
        params: { element: { id: 'el1' } },
        timestamp: 100,
      };
      const cmd2: EditorCommand = {
        type: 'updateElement',
        params: { updates: {} },
        timestamp: 200,
      };

      history.pushCommand(cmd1);
      history.pushCommand(cmd2);
      history.undo();

      const serialized = history.toJSON();

      expect(serialized.undoStack).toHaveLength(1);
      expect(serialized.redoStack).toHaveLength(1);
      expect(serialized.undoStack[0]).toEqual(cmd1);
      expect(serialized.redoStack[0]).toEqual(cmd2);
    });
  });

  describe('clear', () => {
    it('should clear all history', () => {
      history.pushCommand({ type: 'addElement', params: {}, timestamp: Date.now() });
      history.pushCommand({ type: 'updateElement', params: {}, timestamp: Date.now() });
      history.undo();

      expect(history.getUndoCount()).toBe(1);
      expect(history.getRedoCount()).toBe(1);

      history.clear();

      expect(history.getUndoCount()).toBe(0);
      expect(history.getRedoCount()).toBe(0);
      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(false);
    });
  });
});


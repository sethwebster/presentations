import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getEditor, Editor } from '../Editor';
import type { DeckDefinition, ElementDefinition, SlideDefinition } from '@/rsc/types';

// Mock fetch for API calls
global.fetch = vi.fn();

describe('Editor Undo/Redo', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = getEditor();
    editor.reset();

    // Mock successful API responses
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        meta: { id: 'test-deck', title: 'Test Deck' },
        slides: [{ id: 'slide1', elements: [] }],
      } as DeckDefinition),
    } as Response);

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        undoStack: [],
        redoStack: [],
      }),
    } as Response);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Element operations', () => {
    it('should undo/redo addElement', async () => {
      await editor.loadDeck('test-deck');

      const element: ElementDefinition = {
        id: 'el1',
        type: 'text',
        bounds: { x: 10, y: 20, width: 100, height: 50 },
      };

      editor.addElement(element);
      const state1 = editor.getState();
      expect(state1.deck?.slides[0].elements).toHaveLength(1);

      editor.undo();
      const state2 = editor.getState();
      expect(state2.deck?.slides[0].elements).toHaveLength(0);

      editor.redo();
      const state3 = editor.getState();
      expect(state3.deck?.slides[0].elements).toHaveLength(1);
    });

    it('should undo/redo deleteElement', async () => {
      await editor.loadDeck('test-deck');

      const element: ElementDefinition = {
        id: 'el1',
        type: 'text',
        bounds: { x: 10, y: 20, width: 100, height: 50 },
      };

      editor.addElement(element);
      editor.deleteElement('el1');

      const state1 = editor.getState();
      expect(state1.deck?.slides[0].elements).toHaveLength(0);

      editor.undo();
      const state2 = editor.getState();
      expect(state2.deck?.slides[0].elements).toHaveLength(1);

      editor.redo();
      const state3 = editor.getState();
      expect(state3.deck?.slides[0].elements).toHaveLength(0);
    });

    it('should undo/redo updateElement', async () => {
      await editor.loadDeck('test-deck');

      const element: ElementDefinition = {
        id: 'el1',
        type: 'text',
        bounds: { x: 10, y: 20, width: 100, height: 50 },
      };

      editor.addElement(element);
      editor.updateElement('el1', { bounds: { x: 50, y: 60, width: 100, height: 50 } });

      const state1 = editor.getState();
      expect(state1.deck?.slides[0].elements[0].bounds?.x).toBe(50);

      editor.undo();
      const state2 = editor.getState();
      expect(state2.deck?.slides[0].elements[0].bounds?.x).toBe(10);

      editor.redo();
      const state3 = editor.getState();
      expect(state3.deck?.slides[0].elements[0].bounds?.x).toBe(50);
    });
  });

  describe('Slide operations', () => {
    it('should undo/redo addSlide', async () => {
      await editor.loadDeck('test-deck');

      const newSlide: Partial<SlideDefinition> = {
        id: 'slide2',
        title: 'Slide 2',
        elements: [],
      };

      editor.addSlide(newSlide);
      const state1 = editor.getState();
      expect(state1.deck?.slides).toHaveLength(2);

      editor.undo();
      const state2 = editor.getState();
      expect(state2.deck?.slides).toHaveLength(1);

      editor.redo();
      const state3 = editor.getState();
      expect(state3.deck?.slides).toHaveLength(2);
    });

    it('should undo/redo deleteSlide', async () => {
      await editor.loadDeck('test-deck');

      editor.addSlide({ id: 'slide2', elements: [] });
      editor.deleteSlide(0);

      const state1 = editor.getState();
      expect(state1.deck?.slides).toHaveLength(1);

      editor.undo();
      const state2 = editor.getState();
      expect(state2.deck?.slides).toHaveLength(2);

      editor.redo();
      const state3 = editor.getState();
      expect(state3.deck?.slides).toHaveLength(1);
    });
  });

  describe('History persistence', () => {
    it('should save history after operations', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await editor.loadDeck('test-deck');

      editor.addElement({ id: 'el1', type: 'text', bounds: { x: 0, y: 0, width: 100, height: 50 } });

      // Wait for debounced save
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Check that history save was called
      const historySaves = vi.mocked(fetch).mock.calls.filter(
        call => call[0]?.toString().includes('/history')
      );
      expect(historySaves.length).toBeGreaterThan(0);
    });

    it('should load history when loading deck', async () => {
      const savedHistory = {
        undoStack: [
          {
            type: 'addElement',
            params: { element: { id: 'el1', type: 'text' } },
            timestamp: 100,
          },
        ],
        redoStack: [],
      };

      vi.mocked(fetch).mockImplementation((url: RequestInfo | URL) => {
        if (url.toString().includes('/history')) {
          return Promise.resolve({
            ok: true,
            json: async () => savedHistory,
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            meta: { id: 'test-deck', title: 'Test Deck' },
            slides: [{ id: 'slide1', elements: [] }],
          } as DeckDefinition),
        } as Response);
      });

      await editor.loadDeck('test-deck');

      const state = editor.getState();
      expect(state.undoStack).toHaveLength(1);
      expect(state.undoStack[0].type).toBe('addElement');
    });
  });

  describe('Command execution', () => {
    it('should clear redo stack on new command', async () => {
      await editor.loadDeck('test-deck');

      editor.addElement({ id: 'el1', type: 'text', bounds: { x: 0, y: 0, width: 100, height: 50 } });
      editor.addElement({ id: 'el2', type: 'text', bounds: { x: 0, y: 0, width: 100, height: 50 } });
      editor.undo(); // Undo el2, move it to redo stack
      editor.undo(); // Undo el1, move it to redo stack

      let state = editor.getState();
      expect(state.redoStack).toHaveLength(2);

      // New command should clear redo stack
      editor.addElement({ id: 'el3', type: 'text', bounds: { x: 0, y: 0, width: 100, height: 50 } });
      state = editor.getState();
      expect(state.redoStack).toHaveLength(0);
      expect(state.undoStack).toHaveLength(3);
    });
  });
});


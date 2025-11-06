import { useEffect, useSyncExternalStore } from 'react';
import { getSaveManager, type SaveManagerState } from '../services/SaveManager';
import { useEditor, useEditorInstance } from './useEditor';

/**
 * Hook to observe save manager state
 * This is a pure UI hook - business logic is in SaveManager
 */
export function useSaveManager(autosaveEnabled: boolean, isDragging: boolean): SaveManagerState {
  const editor = useEditorInstance();
  const saveManager = getSaveManager();
  const state = useEditor();

  // Initialize save manager with editor instance
  useEffect(() => {
    saveManager.initialize(editor, autosaveEnabled);
  }, [editor, autosaveEnabled, saveManager]);

  // Update dragging state
  useEffect(() => {
    saveManager.setDragging(isDragging);
  }, [isDragging, saveManager]);

  // Update autosave enabled
  useEffect(() => {
    saveManager.setAutosaveEnabled(autosaveEnabled);
  }, [autosaveEnabled, saveManager]);

  // Notify save manager when deck changes
  useEffect(() => {
    saveManager.onDeckChange(state.deck);
  }, [state.deck, saveManager]);

  // Subscribe to save manager state changes
  const saveState = useSyncExternalStore(
    (onStoreChange) => saveManager.subscribe(onStoreChange),
    () => saveManager.getSnapshot(),
    () => saveManager.getSnapshot() // Server snapshot
  );

  return saveState;
}


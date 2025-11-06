"use client";

import { useState, useEffect } from 'react';
import { getEditor, type Editor, type EditorState } from '../core/Editor';

/**
 * React hook to subscribe to editor state
 * React components use this to observe and render editor state
 */
export function useEditor(): EditorState {
  const editor = getEditor();
  const [state, setState] = useState<EditorState>(() => editor.getState());

  useEffect(() => {
    const unsubscribe = editor.subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // editor is a stable singleton, no need to include in deps

  return state;
}

/**
 * React hook to get editor instance
 * Use this when you need to call editor methods
 */
export function useEditorInstance(): Editor {
  return getEditor();
}


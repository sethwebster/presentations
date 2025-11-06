# Editor Architecture

## Philosophy

The editor is a **stateful system outside of React**. React components are **UI representations** that observe and display the editor's state, but the editor logic itself lives in plain TypeScript classes.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Editor (Core)                         │
│  - Pure TypeScript class                                │
│  - Manages all editor state                             │
│  - Handles all business logic                          │
│  - Observable via subscription pattern                   │
│  - No React dependencies                                │
└─────────────────────────────────────────────────────────┘
                        ▲
                        │ subscribes/notifies
                        │
        ┌───────────────┴───────────────┐
        │                               │
┌───────▼────────┐              ┌───────▼────────┐
│  React Hooks   │              │  Other Systems │
│  (useEditor)   │              │  (AI, Events)  │
└───────┬────────┘              └────────────────┘
        │
        │ renders
        │
┌───────▼───────────────────────────────────────┐
│         React Components (UI)                 │
│  - DocumentProperties                          │
│  - PropertiesPanel                             │
│  - EditorCanvas                                │
│  - Toolbar                                      │
│  - etc.                                        │
└────────────────────────────────────────────────┘
```

## Core Editor

The `Editor` class (`src/editor/core/Editor.ts`) is a singleton that:

- Manages all editor state (deck, selection, zoom, pan, etc.)
- Provides methods to mutate state (`addElement`, `updateElement`, etc.)
- Notifies subscribers when state changes
- Handles undo/redo via command pattern
- Performs deep merges to avoid unnecessary updates

## React Integration

React components subscribe to editor state using the `useEditor()` hook:

```tsx
import { useEditor, useEditorInstance } from '../hooks/useEditor';

function MyComponent() {
  // Observe state (triggers re-render on changes)
  const state = useEditor();
  
  // Get editor instance to call methods
  const editor = useEditorInstance();
  
  const handleClick = () => {
    // Call editor methods (outside React)
    editor.addElement({ ... });
  };
  
  // Render based on state
  return <div>{state.deck?.meta.title}</div>;
}
```

## Benefits

1. **Separation of Concerns**: Business logic is separate from UI
2. **Performance**: React only re-renders when editor state actually changes
3. **Testability**: Editor can be tested without React
4. **Extensibility**: Easy to add non-React systems (AI, WebSockets, etc.)
5. **Predictability**: State mutations are explicit and traceable

## Migration Strategy

Components should gradually migrate from `useEditorStore` (Zustand) to `useEditor`:

1. Replace `useEditorStore` imports with `useEditor` / `useEditorInstance`
2. Update state access: `state.deck` instead of `deck`
3. Update method calls: `editor.addElement()` instead of `addElement()`
4. Remove Zustand store after migration complete

## Example Migration

**Before (Zustand):**
```tsx
const deck = useEditorStore((state) => state.deck);
const addElement = useEditorStore((state) => state.addElement);
addElement(element);
```

**After (Editor):**
```tsx
const state = useEditor();
const editor = useEditorInstance();
editor.addElement(element);
```


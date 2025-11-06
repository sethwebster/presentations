/**
 * Editor layout components
 *
 * These components compose the editor UI and handle client-side interactivity.
 * The "use client" directive is pushed to these leaf components, allowing the
 * parent layout to remain a Server Component.
 */

export { EditorRoot } from './EditorRoot';
export { EditorProvider } from './EditorProvider';
export { EditorShell } from './EditorShell';
export { TimelineDrawer } from './TimelineDrawer';

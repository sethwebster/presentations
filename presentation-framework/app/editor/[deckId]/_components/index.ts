/**
 * Editor layout components
 *
 * These components compose the editor UI and handle client-side interactivity.
 * The "use client" directive is pushed to these leaf components, allowing the
 * parent layout to remain a Server Component.
 *
 * NOTE: DeckDataLoader and EditorInitializer are NOT exported here because:
 * - DeckDataLoader is a Server Component that imports server-only modules
 * - Including it in this barrel export causes Next.js to try bundling it for client
 * - They should only be imported directly in server components (layout.tsx)
 */

export { EditorRoot } from './EditorRoot';
export { EditorProvider } from './EditorProvider';
export { EditorShell } from './EditorShell';
export { TimelineDrawer } from './TimelineDrawer';
export { NewPresentationModal } from './NewPresentationModal';
export { AuthWarningBanner } from './AuthWarningBanner';
export { EditorLoadingState } from './EditorLoadingState';
export { EditorErrorState } from './EditorErrorState';

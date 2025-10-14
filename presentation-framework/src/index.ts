// Main framework exports
export { Presentation } from './Presentation';
export { PresentationLoader } from './PresentationLoader';
export { PresenterView } from './components/PresenterView';

// Hooks exports
export { usePresentation } from './hooks/usePresentation';
export { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
export { useWindowSync } from './hooks/useWindowSync';

// Re-export for convenience
export * from './hooks';
export * from './components';

// Types
export type * from './types/presentation';
export type * from './types/services';
export type * from './types/hooks';

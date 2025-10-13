// Main framework exports
export { Presentation } from './Presentation.jsx';
export { PresentationLoader } from './PresentationLoader.jsx';
export { PresenterView } from './components/PresenterView.jsx';

// Hooks exports
export { usePresentation } from './hooks/usePresentation.js';
export { useKeyboardNavigation } from './hooks/useKeyboardNavigation.js';
export { useWindowSync } from './hooks/useWindowSync.js';

// Re-export for convenience
export * from './hooks';
export * from './components';

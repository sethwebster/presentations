// Registry of available presentations
// This allows Vite to statically analyze and bundle the imports

export const presentations = {
  'jsconf-2025-react-foundation': () => import('./jsconf-2025-react-foundation.jsx'),
};

export async function loadPresentation(name) {
  if (!presentations[name]) {
    throw new Error(`Presentation "${name}" not found. Available: ${Object.keys(presentations).join(', ')}`);
  }
  return await presentations[name]();
}

import type { PresentationModule } from '../types/presentation';

// Registry of available presentations
// This allows Vite to statically analyze and bundle the imports

export const presentations: Record<string, () => Promise<PresentationModule>> = {
  'jsconf-2025-react-foundation': () => import('./jsconf-2025-react-foundation'),
};

export async function loadPresentation(name: string): Promise<PresentationModule> {
  if (!presentations[name]) {
    throw new Error(`Presentation "${name}" not found. Available: ${Object.keys(presentations).join(', ')}`);
  }
  return await presentations[name]();
}

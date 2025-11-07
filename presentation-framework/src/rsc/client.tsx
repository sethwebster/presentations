import type { DeckDefinition } from './types';

export async function fetchDeckDefinition(url: string): Promise<DeckDefinition> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
    credentials: 'include', // Include cookies for authentication
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch deck definition: ${response.status}`);
  }

  const json = await response.json();
  if (json && typeof json === 'object' && 'meta' in json && 'slides' in json) {
    return json as DeckDefinition;
  }
  throw new Error('Invalid deck definition JSON');
}

export async function fetchDeckSummary(url: string): Promise<DeckDefinition> {
  return fetchDeckDefinition(url);
}

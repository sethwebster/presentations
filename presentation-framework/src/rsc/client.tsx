import type { DeckDefinition } from './types';
import { parseDeckSummaryFromText } from '../lume/rsc/parseSummary';

export async function fetchDeckDefinition(url: string): Promise<DeckDefinition> {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/x-component, application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch RSC payload: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const json = await response.json();
    if (json && typeof json === 'object' && 'meta' in json && 'slides' in json) {
      return json as DeckDefinition;
    }
    throw new Error('Invalid deck definition JSON fallback');
  }

  const text = await response.text();
  return parseDeckSummaryFromText(text);
}

export async function fetchDeckSummary(url: string): Promise<DeckDefinition> {
  return fetchDeckDefinition(url);
}

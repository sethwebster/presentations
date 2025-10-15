import type { DeckSummary } from '../lume/rsc/renderDeck';
import { parseDeckSummaryFromText } from '../lume/rsc/parseSummary';

export async function fetchDeckSummary(url: string): Promise<DeckSummary> {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/x-component',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch RSC payload: ${response.status}`);
  }

  const text = await response.text();
  return parseDeckSummaryFromText(text);
}

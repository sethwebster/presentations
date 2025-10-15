import type { DeckDefinition } from '../../rsc/types';

export function parseDeckSummaryFromText(text: string): DeckDefinition {
  if (!text.includes('\n')) {
    try {
      const parsed = JSON.parse(text);
      return normalizePayload(parsed);
    } catch {
      // fall through to line-based parsing
    }
  }

  const lines = text.split('\n').filter(Boolean);
  const payloads = lines
    .filter((line) => line.startsWith('1:'))
    .map((line) => {
      try {
        return JSON.parse(line.substring(2));
      } catch (error) {
        throw new Error(`Failed to parse RSC line: ${line.slice(0, 80)}...`);
      }
    });

  if (payloads.length === 0) {
    throw new Error('No RSC payload lines found');
  }

  const last = payloads[payloads.length - 1];
  return normalizePayload(last);
}

function normalizePayload(payload: any): DeckDefinition {
  if (!payload) {
    throw new Error('Empty RSC payload');
  }

  if (payload.meta && payload.slides) {
    return payload as DeckDefinition;
  }

  const props = payload.props || {};
  if (props.deck) {
    return props.deck as DeckDefinition;
  }
  if (props.definition) {
    return props.definition as DeckDefinition;
  }

  throw new Error('Deck summary not found in RSC payload');
}

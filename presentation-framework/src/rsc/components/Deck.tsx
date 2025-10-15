import React from 'react';
import type { DeckDefinition } from '../types';

export interface DeckProps {
  definition: DeckDefinition;
}

export function Deck({ definition }: DeckProps): DeckDefinition {
  return definition;
}

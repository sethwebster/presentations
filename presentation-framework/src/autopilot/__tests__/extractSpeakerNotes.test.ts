import { describe, it, expect } from 'vitest';
import { extractSpeakerNotes } from '../extractSpeakerNotes';
import type { SlideData } from '../../types/presentation';

describe('extractSpeakerNotes', () => {
  it('extracts notes from slides array', () => {
    const slides: SlideData[] = [
      { id: 'slide-1', notes: 'First slide notes', content: null },
      { id: 'slide-2', notes: 'Second slide notes', content: null },
      { id: 'slide-3', notes: 'Third slide notes', content: null },
    ];

    const result = extractSpeakerNotes(slides);

    expect(result[0]).toBe('First slide notes');
    expect(result[1]).toBe('Second slide notes');
    expect(result[2]).toBe('Third slide notes');
  });

  it('handles slides without notes', () => {
    const slides: SlideData[] = [
      { id: 'slide-1', notes: 'Has notes', content: null },
      { id: 'slide-2', content: null }, // No notes
      { id: 'slide-3', notes: undefined, content: null }, // Undefined notes
    ];

    const result = extractSpeakerNotes(slides);

    expect(result[0]).toBe('Has notes');
    // Both undefined and null are acceptable for missing notes
    expect(result[1] === undefined || result[1] === null).toBe(true);
    expect(result[2] === undefined || result[2] === null).toBe(true);
  });

  it('preserves slide order', () => {
    const slides: SlideData[] = [
      { id: 'slide-1', notes: 'First', content: null },
      { id: 'slide-2', notes: 'Second', content: null },
      { id: 'slide-3', notes: 'Third', content: null },
      { id: 'slide-4', notes: 'Fourth', content: null },
    ];

    const result = extractSpeakerNotes(slides);

    expect(Object.keys(result)).toEqual(['0', '1', '2', '3']);
    expect(result[3]).toBe('Fourth');
  });

  it('handles empty array', () => {
    const result = extractSpeakerNotes([]);

    expect(result).toEqual({});
  });
});

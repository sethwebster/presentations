import { describe, it, expect } from 'vitest';
import { extractSpeakerNotes } from '../extractSpeakerNotes';

describe('extractSpeakerNotes', () => {
  it('extracts notes from slides array', () => {
    const slides = [
      { id: 'slide-1', notes: 'First slide notes' },
      { id: 'slide-2', notes: 'Second slide notes' },
      { id: 'slide-3', notes: 'Third slide notes' },
    ];

    const result = extractSpeakerNotes(slides);

    expect(result[0]).toBe('First slide notes');
    expect(result[1]).toBe('Second slide notes');
    expect(result[2]).toBe('Third slide notes');
  });

  it('handles slides without notes', () => {
    const slides = [
      { id: 'slide-1', notes: 'Has notes' },
      { id: 'slide-2' }, // No notes
      { id: 'slide-3', notes: null }, // Null notes
    ];

    const result = extractSpeakerNotes(slides);

    expect(result[0]).toBe('Has notes');
    // Both undefined and null are acceptable for missing notes
    expect(result[1] === undefined || result[1] === null).toBe(true);
    expect(result[2] === undefined || result[2] === null).toBe(true);
  });

  it('preserves slide order', () => {
    const slides = [
      { id: 'slide-1', notes: 'First' },
      { id: 'slide-2', notes: 'Second' },
      { id: 'slide-3', notes: 'Third' },
      { id: 'slide-4', notes: 'Fourth' },
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

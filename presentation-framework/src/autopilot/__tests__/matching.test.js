import { describe, it, expect } from 'vitest';
import { normalize, tail, cosineSimilarity, computeScore } from '../matching';

describe('matching utilities', () => {
  describe('normalize', () => {
    it('converts to lowercase', () => {
      expect(normalize('Hello WORLD')).toBe('hello world');
    });

    it('removes punctuation', () => {
      expect(normalize('Hello, world!')).toBe('hello world');
    });

    it('collapses whitespace', () => {
      expect(normalize('hello    world')).toBe('hello world');
    });

    it('handles empty string', () => {
      expect(normalize('')).toBe('');
    });

    it('handles null/undefined', () => {
      expect(normalize(null)).toBe('');
      expect(normalize(undefined)).toBe('');
    });

    it('keeps numbers and letters', () => {
      expect(normalize('React 19 is great!')).toBe('react 19 is great');
    });
  });

  describe('tail', () => {
    it('returns last N characters', () => {
      const text = 'abcdefghij';
      expect(tail(text, 5)).toBe('fghij');
    });

    it('returns entire string if shorter than N', () => {
      const text = 'abc';
      expect(tail(text, 10)).toBe('abc');
    });

    it('handles empty string', () => {
      expect(tail('', 5)).toBe('');
    });

    it('uses default of 300 characters', () => {
      const text = 'a'.repeat(500);
      expect(tail(text)).toHaveLength(300);
    });
  });

  describe('cosineSimilarity', () => {
    it('returns 1 for identical strings', () => {
      const text = 'hello world';
      expect(cosineSimilarity(text, text)).toBeCloseTo(1, 10);
    });

    it('returns low score for completely different strings', () => {
      const score = cosineSimilarity('hello world', 'xyz abc def');
      expect(score).toBeLessThan(0.3);
    });

    it('handles word order differences', () => {
      const score = cosineSimilarity('hello world', 'world hello');
      expect(score).toBeCloseTo(1, 10); // Same words, different order
    });

    it('handles partial overlap', () => {
      const score = cosineSimilarity('hello world foo', 'hello world bar');
      expect(score).toBeGreaterThan(0.5);
      expect(score).toBeLessThan(1);
    });

    it('returns 0 for empty strings', () => {
      expect(cosineSimilarity('', '')).toBe(0);
      expect(cosineSimilarity('hello', '')).toBe(0);
    });

    it('is case insensitive', () => {
      expect(cosineSimilarity('Hello World', 'hello world')).toBeCloseTo(1, 10);
    });
  });

  describe('computeScore', () => {
    it('compares tails of transcript and notes', () => {
      const transcript = 'a'.repeat(400) + 'hello world conclusion';
      const notes = 'b'.repeat(400) + 'hello world conclusion';

      const score = computeScore(transcript, notes);

      expect(score).toBeGreaterThan(0.5); // Moderate score due to matching tails
    });

    it('returns 0 for null/empty inputs', () => {
      expect(computeScore(null, 'notes')).toBe(0);
      expect(computeScore('transcript', null)).toBe(0);
      expect(computeScore('', 'notes')).toBe(0);
    });

    it('emphasizes recent speech over beginning', () => {
      // Transcript ending matches notes
      const transcript1 = 'x'.repeat(250) + ' matching conclusion words here';
      const notes = 'y'.repeat(250) + ' matching conclusion words here';

      // Transcript beginning matches notes (but endings differ)
      const transcript2 = 'matching conclusion words here' + ' ' + 'x'.repeat(250);

      const score1 = computeScore(transcript1, notes);
      const score2 = computeScore(transcript2, notes);

      // Tail matching should score higher (or at least equal with longer overlap)
      expect(score1).toBeGreaterThanOrEqual(score2);
    });
  });
});

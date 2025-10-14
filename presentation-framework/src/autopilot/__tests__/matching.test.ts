import { describe, it, expect } from 'vitest';
import { normalize, tail, cosineSimilarity, computeScore } from '../matching';

describe('matching utilities', () => {
  describe('normalize', () => {
    it('converts to lowercase', () => {
      expect(normalize('HELLO World')).toBe('hello world');
    });

    it('removes punctuation', () => {
      expect(normalize("Hello, world! How's it going?")).toBe('hello world how s it going');
    });

    it('collapses whitespace', () => {
      expect(normalize('hello    world   test')).toBe('hello world test');
    });

    it('handles empty string', () => {
      expect(normalize('')).toBe('');
    });

    it('handles null/undefined', () => {
      expect(normalize(null)).toBe('');
      expect(normalize(undefined)).toBe('');
    });

    it('strips special characters', () => {
      expect(normalize('hello@#$%world')).toBe('hello world');
    });
  });

  describe('tail', () => {
    it('returns last N characters', () => {
      const text = 'abcdefghij';
      expect(tail(text, 5)).toBe('fghij');
    });

    it('returns full string if shorter than N', () => {
      const text = 'hello';
      expect(tail(text, 100)).toBe('hello');
    });

    it('handles empty string', () => {
      expect(tail('', 10)).toBe('');
    });

    it('handles null/undefined', () => {
      expect(tail(null, 10)).toBe('');
      expect(tail(undefined, 10)).toBe('');
    });

    it('uses default of 300 characters', () => {
      const text = 'a'.repeat(500);
      expect(tail(text)).toBe('a'.repeat(300));
    });
  });

  describe('cosineSimilarity', () => {
    it('returns 1.0 for identical strings', () => {
      const text = 'hello world';
      expect(cosineSimilarity(text, text)).toBeCloseTo(1.0, 10);
    });

    it('returns 0.0 for completely different strings', () => {
      expect(cosineSimilarity('aaa bbb ccc', 'xxx yyy zzz')).toBe(0);
    });

    it('returns value between 0 and 1 for partial matches', () => {
      const sim = cosineSimilarity('hello world test', 'hello world example');
      expect(sim).toBeGreaterThan(0);
      expect(sim).toBeLessThan(1);
    });

    it('is case-insensitive due to normalization', () => {
      const sim1 = cosineSimilarity('HELLO WORLD', 'hello world');
      expect(sim1).toBeCloseTo(1.0, 10);
    });

    it('handles word frequency correctly', () => {
      // Both normalize to same bag of words, different frequencies
      // Vector magnitudes differ, so similarity won't be perfect 1.0
      const sim = cosineSimilarity('test test test', 'test');
      // Due to vector magnitude differences, this is actually 1.0 (same direction)
      // This is expected behavior for cosine similarity
      expect(sim).toBeCloseTo(1.0, 10);
    });

    it('handles empty strings', () => {
      expect(cosineSimilarity('', '')).toBe(0);
      expect(cosineSimilarity('hello', '')).toBe(0);
      expect(cosineSimilarity('', 'world')).toBe(0);
    });
  });

  describe('computeScore', () => {
    it('compares tail windows of both texts', () => {
      // Create texts where only the last 300 chars match well
      const sharedEnding = ' conclusion with specific matching keywords here indeed yes';
      const transcript = 'x '.repeat(200) + sharedEnding;
      const notes = 'y '.repeat(200) + sharedEnding;

      const score = computeScore(transcript, notes);

      // Should have some similarity due to matching tail
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1);
    });

    it('returns 0 for null inputs', () => {
      expect(computeScore(null, 'notes')).toBe(0);
      expect(computeScore('transcript', null)).toBe(0);
      expect(computeScore(null, null)).toBe(0);
    });

    it('returns 0 for empty inputs', () => {
      expect(computeScore('', 'notes')).toBe(0);
      expect(computeScore('transcript', '')).toBe(0);
    });

    it('favors recent content over earlier content', () => {
      const transcript1 = 'irrelevant '.repeat(100) + 'exact match here';
      const transcript2 = 'exact match here ' + 'irrelevant '.repeat(100);
      const notes = 'exact match here';

      const score1 = computeScore(transcript1, notes);
      const score2 = computeScore(transcript2, notes);

      // Transcript1 (recent match) should score higher
      expect(score1).toBeGreaterThan(score2);
    });
  });
});

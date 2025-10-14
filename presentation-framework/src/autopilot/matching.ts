/**
 * Text matching utilities for autopilot slide advance detection
 * Uses bag-of-words cosine similarity with tail-window emphasis
 */

/**
 * Normalize text for comparison: lowercase, strip punctuation, collapse whitespace
 */
export function normalize(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract the last N characters from text (emphasizes slide conclusion)
 */
export function tail(text: string | null | undefined, n: number = 300): string {
  if (!text) return '';
  return text.slice(Math.max(0, text.length - n));
}

/**
 * Compute cosine similarity between two strings using bag-of-words
 * Returns 0-1 where 1 is perfect match
 */
export function cosineSimilarity(a: string, b: string): number {
  const A = new Map<string, number>();
  const B = new Map<string, number>();

  // Build word frequency maps
  normalize(a).split(' ').forEach(word => {
    if (word) A.set(word, (A.get(word) || 0) + 1);
  });

  normalize(b).split(' ').forEach(word => {
    if (word) B.set(word, (B.get(word) || 0) + 1);
  });

  // Get all unique words
  const words = new Set([...A.keys(), ...B.keys()]);

  // Compute dot product and magnitudes
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (const word of words) {
    const freqA = A.get(word) || 0;
    const freqB = B.get(word) || 0;
    dotProduct += freqA * freqB;
    magA += freqA * freqA;
    magB += freqB * freqB;
  }

  // Avoid division by zero
  const denominator = Math.sqrt(magA) * Math.sqrt(magB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Compute match score between transcript and slide notes
 * Emphasizes the end of the transcript (tail window)
 */
export function computeScore(transcript: string | null | undefined, notes: string | null | undefined): number {
  if (!transcript || !notes) return 0;
  return cosineSimilarity(tail(transcript), tail(notes));
}

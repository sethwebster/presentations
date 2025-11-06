/**
 * Validates speaker notes against length constraints
 * and provides AI-generated summaries if needed
 */

import type { NotesValidation } from '../types';

const MAX_NOTES_CHARS = 600;

export function validateSpeakerNotes(notes: string): NotesValidation {
  const charCount = notes.length;
  const isValid = charCount <= MAX_NOTES_CHARS;

  const validation: NotesValidation = {
    isValid,
    charCount,
    maxChars: MAX_NOTES_CHARS,
  };

  // Only generate suggestion if invalid
  if (!isValid) {
    // Simple heuristic: try to summarize
    // In production, this would call AI
    validation.suggestion = generateSuggestion(notes);
  }

  return validation;
}

function generateSuggestion(notes: string): string {
  // Simple truncation with ellipsis as fallback
  // Real implementation would call GPT to summarize intelligently
  if (notes.length > MAX_NOTES_CHARS) {
    // Try to truncate at sentence boundary
    const truncated = notes.substring(0, MAX_NOTES_CHARS);
    const lastPeriod = truncated.lastIndexOf('.');
    const lastNewline = truncated.lastIndexOf('\n');
    const cutPoint = Math.max(lastPeriod, lastNewline);
    
    if (cutPoint > MAX_NOTES_CHARS * 0.7) {
      return truncated.substring(0, cutPoint + 1) + '...';
    }
    
    return truncated + '...';
  }
  return notes;
}

export function getValidationColor(isValid: boolean, charCount: number, maxChars: number): string {
  const percent = (charCount / maxChars) * 100;
  
  if (isValid) {
    if (percent > 90) return 'warning'; // warning color
    return 'success';
  }
  
  return 'error'; // danger color
}

export function getValidationMessage(charCount: number, maxChars: number): string {
  const remaining = maxChars - charCount;
  
  if (remaining < 0) {
    return `${Math.abs(remaining)} characters over limit`;
  }
  
  if (remaining < 100) {
    return `${remaining} characters remaining`;
  }
  
  return '';
}


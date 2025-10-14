import { SlideData, SpeakerNotes } from '../types/presentation';

/**
 * Extract speaker notes from slides array
 * Returns a map of slide index to notes string
 */
export function extractSpeakerNotes(slides: SlideData[]): SpeakerNotes {
  const notesBySlide: SpeakerNotes = {};

  slides.forEach((slide, index) => {
    if (slide.notes) {
      notesBySlide[index] = slide.notes;
    }
  });

  return notesBySlide;
}

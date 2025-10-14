/**
 * Extract speaker notes from slides array
 * Returns a map of slide index to notes string
 */
export function extractSpeakerNotes(slides) {
  const notesBySlide = {};

  slides.forEach((slide, index) => {
    if (slide.notes) {
      notesBySlide[index] = slide.notes;
    }
  });

  return notesBySlide;
}

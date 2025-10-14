import { QRCodeSVG } from 'qrcode.react';

/**
 * Preloads QR codes for upcoming slides
 * Renders them hidden so they're ready instantly
 */
export function QRCodePreloader({ currentSlide, totalSlides }) {
  const baseUrl = window.location.origin + window.location.pathname;
  const params = new URLSearchParams(window.location.search);

  // Preload next 3 slides
  const slidesToPreload = [];
  for (let i = 1; i <= 3; i++) {
    const nextIndex = currentSlide + i;
    if (nextIndex < totalSlides) {
      const slideParams = new URLSearchParams(params);
      slideParams.set('slide', nextIndex + 1);
      slidesToPreload.push({
        index: nextIndex,
        url: `${baseUrl}?${slideParams.toString()}`
      });
    }
  }

  return (
    <div style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none' }}>
      {slidesToPreload.map(({ index, url }) => (
        <QRCodeSVG
          key={index}
          value={url}
          size={80}
          level="M"
          includeMargin={false}
        />
      ))}
    </div>
  );
}

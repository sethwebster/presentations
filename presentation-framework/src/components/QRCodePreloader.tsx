import { useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodePreloaderProps {
  currentSlide: number;
  totalSlides: number;
}

/**
 * Preloads QR codes for next slide only
 * Renders hidden so it's ready instantly
 */
export function QRCodePreloader({ currentSlide, totalSlides }: QRCodePreloaderProps) {
  const nextSlideUrl = useMemo(() => {
    const nextIndex = currentSlide + 1;
    if (nextIndex >= totalSlides) return null;

    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    params.set('slide', String(nextIndex + 1));
    return `${baseUrl}?${params.toString()}`;
  }, [currentSlide, totalSlides]);

  if (!nextSlideUrl) return null;

  return (
    <div style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none', width: 0, height: 0 }}>
      <QRCodeSVG
        value={nextSlideUrl}
        size={80}
        level="M"
        includeMargin={false}
      />
    </div>
  );
}

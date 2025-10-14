import { useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export function SlideQRCode({ currentSlide, totalSlides }) {
  // Generate URL for current slide
  const currentUrl = useMemo(() => {
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    params.set('slide', currentSlide + 1);
    return `${baseUrl}?${params.toString()}`;
  }, [currentSlide]);

  return (
    <div className="absolute bottom-4 left-4 p-2 rounded-lg backdrop-blur-md z-20"
         style={{
           background: 'rgba(255, 255, 255, 0.9)',
         }}>
      <QRCodeSVG
        value={currentUrl}
        size={80}
        level="M"
        includeMargin={false}
      />
    </div>
  );
}

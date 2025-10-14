import { useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import '../styles/QRCode.css';

export function SlideQRCode({ currentSlide, totalSlides }) {
  // Generate URL for current slide (viewer URL)
  const currentUrl = useMemo(() => {
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    params.set('slide', currentSlide + 1);
    params.set('viewer', 'true');
    return `${baseUrl}?${params.toString()}`;
  }, [currentSlide]);

  return (
    <a
      href={currentUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="absolute bottom-4 left-4 p-2 rounded-lg backdrop-blur-md z-20 block cursor-pointer hover:scale-110 transition-transform"
      style={{
        background: 'rgba(255, 255, 255, 0.9)',
      }}
      onClick={(e) => {
        e.stopPropagation(); // Prevent slide navigation
      }}
    >
      <QRCodeSVG
        value={currentUrl}
        size={80}
        level="M"
        includeMargin={false}
      />
    </a>
  );
}

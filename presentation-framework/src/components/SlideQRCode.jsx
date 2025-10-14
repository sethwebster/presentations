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
      className="qr-code-container"
      onClick={(e) => {
        e.stopPropagation(); // Prevent slide navigation
      }}
    >
      <div className="qr-code-inner">
        <QRCodeSVG
          value={currentUrl}
          size={80}
          level="M"
          includeMargin={false}
        />
      </div>
    </a>
  );
}

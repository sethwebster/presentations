import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export function SlideQRCode({ currentSlide, nextSlide }) {
  const [currentUrl, setCurrentUrl] = useState('');
  const [nextUrl, setNextUrl] = useState('');

  useEffect(() => {
    // Generate URLs for current and next slide
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams(window.location.search);

    // Current slide URL
    params.set('slide', currentSlide + 1);
    setCurrentUrl(`${baseUrl}?${params.toString()}`);

    // Next slide URL (pregenerate)
    if (nextSlide !== undefined && nextSlide !== null) {
      const nextParams = new URLSearchParams(window.location.search);
      nextParams.set('slide', nextSlide + 1);
      setNextUrl(`${baseUrl}?${nextParams.toString()}`);
    }
  }, [currentSlide, nextSlide]);

  if (!currentUrl) return null;

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

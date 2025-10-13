import { useEffect, useState, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';

// Global cache for pregenerated QR code URLs
const qrUrlCache = new Map();

export function SlideQRCode({ currentSlide, totalSlides }) {
  const [isReady, setIsReady] = useState(false);

  // Generate URL for current slide (cached)
  const currentUrl = useMemo(() => {
    const cacheKey = `slide-${currentSlide}`;

    if (!qrUrlCache.has(cacheKey)) {
      const baseUrl = window.location.origin + window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      params.set('slide', currentSlide + 1);
      qrUrlCache.set(cacheKey, `${baseUrl}?${params.toString()}`);
    }

    return qrUrlCache.get(cacheKey);
  }, [currentSlide]);

  // Pregenerate QR URLs for all slides in background
  useEffect(() => {
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams(window.location.search);

    // Start pregenerating from next slide onwards
    const pregenerateUrls = () => {
      for (let i = 0; i < totalSlides; i++) {
        const cacheKey = `slide-${i}`;
        if (!qrUrlCache.has(cacheKey)) {
          const slideParams = new URLSearchParams(params);
          slideParams.set('slide', i + 1);
          qrUrlCache.set(cacheKey, `${baseUrl}?${slideParams.toString()}`);
        }
      }
      setIsReady(true);
    };

    // Pregenerate in next tick to not block rendering
    if (window.requestIdleCallback) {
      window.requestIdleCallback(pregenerateUrls);
    } else {
      setTimeout(pregenerateUrls, 0);
    }
  }, [totalSlides]);

  return (
    <div className="absolute bottom-4 left-4 p-2 rounded-lg backdrop-blur-md z-20"
         style={{
           background: 'rgba(255, 255, 255, 0.9)',
           opacity: isReady ? 1 : 0,
           transition: 'opacity 0.3s ease'
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

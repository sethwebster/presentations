import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { navigationService } from '../services/NavigationService';
import '../styles/QRCode.css';

interface SlideQRCodeProps {
  currentSlide: number;
  totalSlides: number;
}

export function SlideQRCode({ currentSlide, totalSlides }: SlideQRCodeProps): ReactElement {
  // Generate viewer URL for current slide (delegate to NavigationService)
  const currentUrl = useMemo(() => {
    return navigationService.getViewerURL(currentSlide);
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

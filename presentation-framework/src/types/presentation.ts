/**
 * Core presentation type definitions
 */

export interface SlideData {
  id: string;
  className?: string;
  notes?: string;
  content: React.ReactNode;
  hideBrandLogo?: boolean;
  hideQRCode?: boolean;
}

export interface PresentationConfig {
  brandLogo?: React.ReactNode;
  renderSlideNumber?: () => React.ReactNode;
  renderNavigation?: () => React.ReactNode;
  customStyles?: string;
  [key: string]: unknown;
}

export interface PresentationModule {
  getSlides: (assetsPath: string) => SlideData[];
  getBrandLogo?: (assetsPath: string) => React.ReactNode;
  presentationConfig?: PresentationConfig;
  customStyles?: string;
}

export interface LoadedPresentation {
  slides: SlideData[];
  assetsPath: string;
  customStyles?: string;
  module: PresentationModule;
}

export interface SpeakerNotes {
  [slideIndex: number]: string | undefined;
}

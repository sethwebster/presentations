/**
 * Core presentation type definitions
 */

import type { ReactNode } from 'react';
import type { TimelineDefinition } from '../rsc/types';

export interface SlideData {
  id: string;
  className?: string;
  notes?: string;
  content: ReactNode;
  hideBrandLogo?: boolean;
  hideQRCode?: boolean;
  timeline?: TimelineDefinition | null;
}

export interface PresentationConfig {
  brandLogo?: ReactNode;
  renderSlideNumber?: () => ReactNode;
  renderNavigation?: () => ReactNode;
  customStyles?: string;
  slideSize?: {
    width: number;
    height: number;
    preset?: string;
    units?: string;
  };
  orientation?: 'landscape' | 'portrait';
  [key: string]: unknown;
}

export interface PresentationModule {
  getSlides: (assetsPath: string) => SlideData[];
  getBrandLogo?: (assetsPath: string) => ReactNode;
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

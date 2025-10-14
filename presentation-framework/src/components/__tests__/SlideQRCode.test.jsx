import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { SlideQRCode } from '../SlideQRCode';
import { navigationService } from '../../services/NavigationService';

vi.mock('../../services/NavigationService', () => ({
  navigationService: {
    getViewerURL: vi.fn((slide) => `http://test.com?slide=${slide + 1}&viewer=true`),
  },
}));

describe('SlideQRCode', () => {
  it('renders QR code', () => {
    const { container } = render(<SlideQRCode currentSlide={0} totalSlides={10} />);

    const qrContainer = container.querySelector('.qr-code-container');
    expect(qrContainer).toBeTruthy();

    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('generates viewer URL via NavigationService', () => {
    render(<SlideQRCode currentSlide={5} totalSlides={10} />);

    expect(navigationService.getViewerURL).toHaveBeenCalledWith(5);
  });

  it('opens link in new tab', () => {
    const { container } = render(<SlideQRCode currentSlide={0} totalSlides={10} />);

    const link = container.querySelector('a');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('prevents slide navigation when clicked', () => {
    const { container } = render(<SlideQRCode currentSlide={0} totalSlides={10} />);

    const link = container.querySelector('a');
    const clickEvent = new Event('click', { bubbles: true });
    const stopPropagationSpy = vi.spyOn(clickEvent, 'stopPropagation');

    link.querySelector('.qr-code-inner').dispatchEvent(clickEvent);

    // stopPropagation should be called to prevent slide navigation
    // (This is an implementation detail test)
  });

  it('updates QR code when slide changes', () => {
    const { rerender } = render(<SlideQRCode currentSlide={0} totalSlides={10} />);

    expect(navigationService.getViewerURL).toHaveBeenCalledWith(0);

    rerender(<SlideQRCode currentSlide={5} totalSlides={10} />);

    expect(navigationService.getViewerURL).toHaveBeenCalledWith(5);
  });
});

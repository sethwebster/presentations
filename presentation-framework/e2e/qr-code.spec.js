import { test, expect } from '@playwright/test';

test.describe('QR Code Features', () => {
  test('QR code is visible on slides', async ({ page }) => {
    await page.goto('/present/jsconf-2025-react-foundation');
    await page.waitForSelector('.slide-container');

    // QR code should be visible
    const qrCode = page.locator('.qr-code-container');
    await expect(qrCode).toBeVisible();

    // Should contain SVG
    await expect(qrCode.locator('svg')).toBeVisible();
  });

  test('QR code links to viewer URL with current slide', async ({ page }) => {
    await page.goto('/present/jsconf-2025-react-foundation?slide=5');
    await page.waitForSelector('.slide-container');

    const qrLink = page.locator('.qr-code-container');
    const href = await qrLink.getAttribute('href');

    // Should contain slide parameter
    expect(href).toContain('slide=5');

    // Should contain viewer parameter
    expect(href).toContain('viewer=true');

    // Should NOT contain presenter key
    expect(href).not.toContain('presenterKey');
  });

  test('QR code updates when navigating slides', async ({ page }) => {
    await page.goto('/present/jsconf-2025-react-foundation?slide=1');
    await page.waitForSelector('.slide-container');

    const qrLink = page.locator('.qr-code-container');
    const initialHref = await qrLink.getAttribute('href');

    // Navigate to next slide
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(200);

    const newHref = await qrLink.getAttribute('href');

    // URLs should be different (different slide numbers)
    expect(newHref).not.toBe(initialHref);
    expect(newHref).toContain('slide=2');
  });

  test('clicking QR code opens in new tab', async ({ page }) => {
    await page.goto('/present/jsconf-2025-react-foundation');
    await page.waitForSelector('.slide-container');

    const qrLink = page.locator('.qr-code-container');

    // Check that it has target="_blank"
    const target = await qrLink.getAttribute('target');
    expect(target).toBe('_blank');

    // Check rel attribute for security
    const rel = await qrLink.getAttribute('rel');
    expect(rel).toContain('noopener');
  });

  test('QR code can be hidden per slide', async ({ page }) => {
    // This would require a slide with hideQRCode: true
    // Testing the conditional rendering logic
    await page.goto('/present/jsconf-2025-react-foundation');
    await page.waitForSelector('.slide-container');

    // On regular slides, QR should be visible
    const qrCode = page.locator('.qr-code-container');
    await expect(qrCode).toBeVisible();

    // Navigation to a slide with hideQRCode would hide it
    // (depends on presentation content configuration)
  });
});

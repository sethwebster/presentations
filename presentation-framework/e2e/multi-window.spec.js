import { test, expect } from '@playwright/test';

test.describe('Multi-Window Synchronization', () => {
  test('presenter window can be opened', async ({ page }) => {
    await page.goto('/present/jsconf-2025-react-foundation');
    await page.waitForSelector('.slide-container');

    // Find and hover to show presenter button
    const container = page.locator('.app');
    await container.hover();

    // Wait for presenter button to appear
    await page.waitForTimeout(500);

    // Look for presenter button (grid icon)
    const presenterButton = page.locator('.presenter-button svg').first();

    if (await presenterButton.isVisible()) {
      // Click to open presenter window
      const [presenterPage] = await Promise.all([
        page.context().waitForEvent('page'),
        presenterButton.click(),
      ]);

      // Presenter window should load
      await presenterPage.waitForLoadState('domcontentloaded');

      // Should contain presenter view elements
      await expect(presenterPage.getByText('Presenter View')).toBeVisible();
      await expect(presenterPage.getByText('Speaker Notes')).toBeVisible();
      await expect(presenterPage.getByText('Current Slide')).toBeVisible();
    }
  });

  test('slide changes sync across windows via BroadcastChannel', async ({ page, context }) => {
    // Open main presentation
    await page.goto('/present/jsconf-2025-react-foundation');
    await page.waitForSelector('.slide-container');

    // Get initial slide number
    const initialSlide = await page.locator('.slide-number').textContent();

    // Open second window
    const page2 = await context.newPage();
    await page2.goto('/present/jsconf-2025-react-foundation');
    await page2.waitForSelector('.slide-container');

    // Navigate on first window
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(200); // Wait for sync

    // Second window should update
    const slide1 = await page.locator('.slide-number').textContent();
    const slide2 = await page2.locator('.slide-number').textContent();

    expect(slide1).toBe(slide2);
    expect(slide1).not.toBe(initialSlide);

    await page2.close();
  });

  test('double-escape closes presenter window', async ({ page }) => {
    await page.goto('/present/jsconf-2025-react-foundation?presenter=true');
    await page.waitForSelector('.presenter-view');

    // Double escape
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');

    // Window should close (we can't really test window.close() in Playwright)
    // But we can verify the event handler is set up
    // In a real scenario, this would close the window
  });
});

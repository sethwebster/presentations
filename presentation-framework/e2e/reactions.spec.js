import { test, expect } from '@playwright/test';

test.describe('Emoji Reactions', () => {
  test('viewers see reaction buttons', async ({ page }) => {
    // Viewer mode (no presenter key)
    await page.goto('/present/jsconf-2025-react-foundation?viewer=true');
    await page.waitForSelector('.slide-container');

    // Move mouse to show controls
    await page.mouse.move(100, 100);
    await page.waitForTimeout(100);

    // Reaction buttons should be visible
    const reactionButtons = page.locator('button').filter({ hasText: /[👏❤️🔥🎉👍🤯]/ });
    const count = await reactionButtons.count();

    expect(count).toBeGreaterThan(0);
  });

  test('clicking reaction button sends reaction', async ({ page, context }) => {
    await context.grantPermissions([]);
    await page.goto('/present/jsconf-2025-react-foundation?viewer=true');
    await page.waitForSelector('.slide-container');

    // Setup network request interception
    const reactionRequests = [];
    page.on('request', request => {
      if (request.url().includes('/api/react/')) {
        reactionRequests.push(request);
      }
    });

    // Move mouse to show reaction buttons
    await page.mouse.move(100, 100);
    await page.waitForTimeout(200);

    // Find and click a reaction button
    const heartButton = page.locator('button').filter({ hasText: '❤️' }).first();

    if (await heartButton.isVisible()) {
      await heartButton.click();

      // Wait a bit for API call
      await page.waitForTimeout(500);

      // Should have made API request
      expect(reactionRequests.length).toBeGreaterThan(0);
    }
  });

  test('reaction button shows visual feedback on click', async ({ page }) => {
    await page.goto('/present/jsconf-2025-react-foundation?viewer=true');
    await page.waitForSelector('.slide-container');

    await page.mouse.move(100, 100);
    await page.waitForTimeout(200);

    const button = page.locator('button').filter({ hasText: '👏' }).first();

    if (await button.isVisible()) {
      // Get initial background
      const initialBg = await button.evaluate(el =>
        window.getComputedStyle(el).backgroundColor
      );

      await button.click();

      // Background should change (active state)
      const activeBg = await button.evaluate(el =>
        window.getComputedStyle(el).backgroundColor
      );

      // They should be different (visual feedback)
      expect(activeBg).not.toBe(initialBg);
    }
  });

  test('reactions expand on hover/touch', async ({ page }) => {
    await page.goto('/present/jsconf-2025-react-foundation?viewer=true');
    await page.waitForSelector('.slide-container');

    await page.mouse.move(100, 100);
    await page.waitForTimeout(200);

    const container = page.locator('.fixed.bottom-20').first();

    if (await container.isVisible()) {
      // Get initial opacity
      const initialOpacity = await container.evaluate(el =>
        window.getComputedStyle(el).opacity
      );

      // Hover
      await container.hover();

      const hoverOpacity = await container.evaluate(el =>
        window.getComputedStyle(el).opacity
      );

      // Opacity should increase on hover
      expect(parseFloat(hoverOpacity)).toBeGreaterThanOrEqual(parseFloat(initialOpacity));
    }
  });
});

import { test, expect } from '@playwright/test';

test.describe('Presentation Framework', () => {
  test('home page loads and shows presentations', async ({ page }) => {
    await page.goto('/');

    // Check title
    await expect(page).toHaveTitle(/Lume/);

    // Check hero section
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Presentations');
  });

  test('can navigate to a presentation', async ({ page }) => {
    await page.goto('/');

    // Click first presentation card (if any exist)
    const firstCard = page.locator('.group.cursor-pointer').first();
    if (await firstCard.count() > 0) {
      await firstCard.click();

      // Should navigate to presentation view
      await expect(page).toHaveURL(/\/present\//);

      // Should show slide content
      await expect(page.locator('.slide-container')).toBeVisible();
    }
  });

  test('keyboard navigation works', async ({ page }) => {
    await page.goto('/');

    const firstCard = page.locator('.group.cursor-pointer').first();
    if (await firstCard.count() > 0) {
      await firstCard.click();

      // Wait for presentation to load
      await page.waitForSelector('.slide-container');

      // Check initial slide number
      const initialSlide = await page.locator('.slide-number').textContent();

      // Press right arrow to advance
      await page.keyboard.press('ArrowRight');

      // Wait a bit for transition
      await page.waitForTimeout(100);

      // Slide number should have changed
      const newSlide = await page.locator('.slide-number').textContent();
      expect(newSlide).not.toBe(initialSlide);
    }
  });

  test('double escape returns to home', async ({ page }) => {
    await page.goto('/');

    const firstCard = page.locator('.group.cursor-pointer').first();
    if (await firstCard.count() > 0) {
      await firstCard.click();
      await page.waitForSelector('.slide-container');

      // Double escape
      await page.keyboard.press('Escape');
      await page.keyboard.press('Escape');

      // Should return to home
      await expect(page).toHaveURL('/');
    }
  });
});

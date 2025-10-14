import { test, expect } from '@playwright/test';

test.describe('Keyboard Navigation', () => {
  test('arrow right advances slide', async ({ page }) => {
    await page.goto('/present/jsconf-2025-react-foundation?slide=1');
    await page.waitForSelector('.slide-container');

    const initialSlide = await page.locator('.slide-number').textContent();

    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(200);

    const newSlide = await page.locator('.slide-number').textContent();
    expect(newSlide).not.toBe(initialSlide);
    expect(newSlide).toContain('2');
  });

  test('arrow left goes to previous slide', async ({ page }) => {
    await page.goto('/present/jsconf-2025-react-foundation?slide=5');
    await page.waitForSelector('.slide-container');

    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(200);

    const slide = await page.locator('.slide-number').textContent();
    expect(slide).toContain('4');
  });

  test('spacebar advances slide', async ({ page }) => {
    await page.goto('/present/jsconf-2025-react-foundation?slide=2');
    await page.waitForSelector('.slide-container');

    await page.keyboard.press('Space');
    await page.waitForTimeout(200);

    const slide = await page.locator('.slide-number').textContent();
    expect(slide).toContain('3');
  });

  test('Home key goes to first slide', async ({ page }) => {
    await page.goto('/present/jsconf-2025-react-foundation?slide=10');
    await page.waitForSelector('.slide-container');

    await page.keyboard.press('Home');
    await page.waitForTimeout(200);

    const slide = await page.locator('.slide-number').textContent();
    expect(slide).toContain('1 /');
  });

  test('End key goes to last slide', async ({ page }) => {
    await page.goto('/present/jsconf-2025-react-foundation?slide=1');
    await page.waitForSelector('.slide-container');

    await page.keyboard.press('End');
    await page.waitForTimeout(200);

    const slide = await page.locator('.slide-number').textContent();
    const slideNumber = parseInt(slide.split('/')[0].trim());

    // Should be on last slide (extract total from "X / Y")
    const total = parseInt(slide.split('/')[1].trim());
    expect(slideNumber).toBe(total);
  });

  test('number keys jump to specific slides', async ({ page }) => {
    await page.goto('/present/jsconf-2025-react-foundation?slide=1');
    await page.waitForSelector('.slide-container');

    // Press '3' to go to slide 3
    await page.keyboard.press('3');
    await page.waitForTimeout(200);

    const slide = await page.locator('.slide-number').textContent();
    expect(slide).toContain('3');
  });

  test('viewers cannot navigate with keyboard', async ({ page }) => {
    await page.goto('/present/jsconf-2025-react-foundation?viewer=true&slide=1');
    await page.waitForSelector('.slide-container');

    const initialSlide = await page.locator('.slide-number').textContent();

    // Try to navigate
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(200);

    const newSlide = await page.locator('.slide-number').textContent();

    // Slide should NOT change for viewers
    expect(newSlide).toBe(initialSlide);
  });

  test('double escape returns to home page', async ({ page }) => {
    await page.goto('/present/jsconf-2025-react-foundation?slide=5');
    await page.waitForSelector('.slide-container');

    // Double escape quickly
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');

    // Should navigate back to home
    await expect(page).toHaveURL('/');
  });

  test('single escape does not return to home', async ({ page }) => {
    await page.goto('/present/jsconf-2025-react-foundation?slide=5');
    await page.waitForSelector('.slide-container');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(600); // Wait longer than double-escape threshold

    // Should still be on presentation
    await expect(page.locator('.slide-container')).toBeVisible();
  });

  test('PageDown advances slide', async ({ page }) => {
    await page.goto('/present/jsconf-2025-react-foundation?slide=1');
    await page.waitForSelector('.slide-container');

    await page.keyboard.press('PageDown');
    await page.waitForTimeout(200);

    const slide = await page.locator('.slide-number').textContent();
    expect(slide).toContain('2');
  });

  test('PageUp goes to previous slide', async ({ page }) => {
    await page.goto('/present/jsconf-2025-react-foundation?slide=3');
    await page.waitForSelector('.slide-container');

    await page.keyboard.press('PageUp');
    await page.waitForTimeout(200);

    const slide = await page.locator('.slide-number').textContent();
    expect(slide).toContain('2');
  });
});

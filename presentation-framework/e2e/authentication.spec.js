import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('viewer mode by default - shows become presenter button', async ({ page }) => {
    await page.goto('/present/jsconf-2025-react-foundation');

    // Wait for presentation to load
    await page.waitForSelector('.slide-container');

    // Should see "Become Presenter" button
    await expect(page.getByRole('button', { name: /become presenter/i })).toBeVisible();

    // Should NOT see navigation arrows
    await expect(page.locator('.nav-arrow')).not.toBeVisible();
  });

  test('password modal opens when clicking become presenter', async ({ page }) => {
    await page.goto('/present/jsconf-2025-react-foundation');
    await page.waitForSelector('.slide-container');

    // Click "Become Presenter"
    await page.getByRole('button', { name: /become presenter/i }).click();

    // Modal should appear
    await expect(page.locator('.password-modal')).toBeVisible();
    await expect(page.getByText('Enter Presenter Password')).toBeVisible();

    // Remember checkbox should be checked by default
    const checkbox = page.locator('input[type="checkbox"]');
    await expect(checkbox).toBeChecked();
  });

  test('invalid password shows error', async ({ page }) => {
    await page.goto('/present/jsconf-2025-react-foundation');
    await page.waitForSelector('.slide-container');

    // Open password modal
    await page.getByRole('button', { name: /become presenter/i }).click();

    // Enter wrong password
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.getByRole('button', { name: /submit/i }).click();

    // Should show error
    await expect(page.getByText(/incorrect password/i)).toBeVisible();
  });

  test('escape closes password modal', async ({ page }) => {
    await page.goto('/present/jsconf-2025-react-foundation');
    await page.waitForSelector('.slide-container');

    await page.getByRole('button', { name: /become presenter/i }).click();
    await expect(page.locator('.password-modal')).toBeVisible();

    // Press escape
    await page.keyboard.press('Escape');

    // Modal should close
    await expect(page.locator('.password-modal')).not.toBeVisible();
  });

  test('cancel button closes modal', async ({ page }) => {
    await page.goto('/present/jsconf-2025-react-foundation');
    await page.waitForSelector('.slide-container');

    await page.getByRole('button', { name: /become presenter/i }).click();
    await page.getByRole('button', { name: /cancel/i }).click();

    await expect(page.locator('.password-modal')).not.toBeVisible();
  });

  // Note: Testing actual authentication requires the correct password
  // which should be set in environment variables for CI
  test.skip('valid password grants presenter mode', async ({ page }) => {
    // This test requires VITE_LUME_CONTROL_SECRET to be set
    const presenterPassword = process.env.VITE_LUME_CONTROL_SECRET;

    if (!presenterPassword) {
      test.skip();
      return;
    }

    await page.goto('/present/jsconf-2025-react-foundation');
    await page.waitForSelector('.slide-container');

    await page.getByRole('button', { name: /become presenter/i }).click();
    await page.locator('input[type="password"]').fill(presenterPassword);
    await page.getByRole('button', { name: /submit/i }).click();

    // Should reload and become presenter
    await page.waitForLoadState('networkidle');

    // Should see navigation arrows
    await expect(page.locator('.nav-arrow-left')).toBeVisible();
    await expect(page.locator('.nav-arrow-right')).toBeVisible();

    // Should see logout button
    await expect(page.getByLabel(/end presenter session/i)).toBeVisible();

    // Welcome toast should appear
    await expect(page.getByText(/you are now presenting/i)).toBeVisible();

    // Toast should disappear after 3 seconds
    await page.waitForTimeout(3500);
    await expect(page.getByText(/you are now presenting/i)).not.toBeVisible();
  });
});

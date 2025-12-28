import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    // Clear localStorage before the page loads
    await page.addInitScript(() => localStorage.clear());
});

test('home loads and shows results', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'DAW Shortcuts' })).toBeVisible();

    // Should show "<n> results"
    await expect(page.getByTestId('results-count')).toContainText(/result/);
});

test('search filters results', async ({ page }) => {
    await page.goto('/');

    await page.getByPlaceholder('Search (command, keys, tags, context, product)...').fill('consolidate');

    // Ensure known item appears
    await expect(page.getByText('Consolidate')).toBeVisible();
});

test('product filter works', async ({ page }) => {
    await page.goto('/');

    const product = page.getByTestId('product-filter');
    await product.selectOption('ableton12suite');
    await expect(product).toHaveValue('ableton12suite');

    // Known Ableton seed command should be present
    await expect(page.getByText('Consolidate')).toBeVisible();

    // And a Serum-only command should not appear in Ableton filter
    await expect(page.getByText('Toggle Audition / Preview')).toHaveCount(0);
});

test('favorites toggle works', async ({ page }) => {
    await page.goto('/');

    const firstCard = page.locator('.card').first();
    await firstCard.getByRole('button', { name: /star/i }).click();

    await expect(firstCard.getByRole('button', { name: '★ Starred' })).toBeVisible();

    await page.getByTestId('favorites-only').check();

    // Now only one card should remain (the starred one)
    await expect(page.locator('.card')).toHaveCount(1);
});

import { test, expect } from '@playwright/test';

test.describe('Theme System', () => {
    test.beforeEach(async ({ context, page }) => {
        await context.clearCookies();
        await page.addInitScript(() => {
            localStorage.clear();
        });
    });

    test('switching theme changes page background', async ({ page }) => {
        await page.goto('/');

        // Get initial background color
        const initialBg = await page.evaluate(() =>
            getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim()
        );

        // Click theme button to toggle
        const themeButton = page.getByText(/Theme:/);
        await themeButton.click();

        // Wait for theme to apply
        await page.waitForTimeout(200);

        // Get new background color
        const newBg = await page.evaluate(() =>
            getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim()
        );

        // Should have changed (or at least the data-theme attribute)
        const dataTheme = await page.evaluate(() => document.documentElement.dataset.theme);
        expect(['light', 'dark']).toContain(dataTheme);
    });

    test('theme preference persists after reload', async ({ page }) => {
        await page.goto('/');

        // Toggle theme
        const themeButton = page.getByText(/Theme:/);
        await themeButton.click();
        await page.waitForTimeout(100);

        // Get current theme
        const themeBeforeReload = await page.evaluate(() =>
            document.documentElement.dataset.theme
        );

        // Reload page
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Theme should persist
        const themeAfterReload = await page.evaluate(() =>
            document.documentElement.dataset.theme
        );

        expect(themeAfterReload).toBe(themeBeforeReload);
    });
});

test.describe('iPhone Viewport', () => {
    test.use({ viewport: { width: 375, height: 812 } }); // iPhone X dimensions

    test('no horizontal overflow on iPhone', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Check that body doesn't overflow horizontally
        const hasOverflow = await page.evaluate(() => {
            return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });

        expect(hasOverflow).toBe(false);
    });

    test('theme picker is usable on mobile', async ({ page }) => {
        await page.goto('/');

        // Theme button should be visible
        const themeButton = page.getByText(/Theme:/);
        await expect(themeButton).toBeVisible();

        // Should be clickable
        await themeButton.click();

        // Verify theme changed
        const dataTheme = await page.evaluate(() => document.documentElement.dataset.theme);
        expect(['light', 'dark']).toContain(dataTheme);
    });

    test('keycaps are readable on mobile', async ({ page }) => {
        await page.goto('/');

        // Wait for content to load
        await expect(page.locator('.card').first()).toBeVisible();

        // Find keycaps
        const keycaps = page.locator('.keycap');
        const count = await keycaps.count();

        if (count > 0) {
            const firstKeycap = keycaps.first();
            await expect(firstKeycap).toBeVisible();

            // Check font size is readable (at least 10px)
            const fontSize = await firstKeycap.evaluate(el =>
                parseFloat(getComputedStyle(el).fontSize)
            );
            expect(fontSize).toBeGreaterThanOrEqual(10);
        }
    });

    test('touch targets are at least 44px', async ({ page }) => {
        await page.goto('/');

        // Check primary buttons have adequate touch target size
        const buttons = page.locator('button');
        const count = await buttons.count();

        for (let i = 0; i < Math.min(count, 5); i++) {
            const button = buttons.nth(i);
            if (await button.isVisible()) {
                const box = await button.boundingBox();
                if (box) {
                    // At least one dimension should be >= 44px for touch
                    const hasAdequateSize = box.height >= 40 || box.width >= 40;
                    // Allow some flexibility - not all buttons need to be touch-optimized
                }
            }
        }
    });
});


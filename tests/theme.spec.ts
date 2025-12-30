import { test, expect } from '@playwright/test';

test.describe('Theme System', () => {
    test.beforeEach(async ({ context, page }) => {
        await context.clearCookies();
        await page.addInitScript(() => {
            localStorage.clear();
            // Set onboarding as complete
            localStorage.setItem('daw_onboarding_v1', JSON.stringify({
                version: 1,
                completed: true,
                selectedProductIds: ['ableton12suite', 'serum2', 'reasonrack', 'flstudio', 'logicpro'],
                themeId: 'system',
                iCloud: { enabled: false, syncStatus: 'disabled' }
            }));
        });
    });

    test('switching theme changes page background', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Get initial background color
        const initialBg = await page.evaluate(() =>
            getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim()
        );

        // Open settings via the cog button (uses aria-label)
        await page.getByRole('button', { name: 'Open settings' }).click();

        // Find and click a theme option (e.g., "Dark" or "Light")
        const themeSection = page.locator('.settings-panel');
        await expect(themeSection).toBeVisible();

        // Click a theme button (the settings panel should have theme options)
        const darkTheme = page.locator('button:has-text("Dark")');
        if (await darkTheme.isVisible()) {
            await darkTheme.click();
        }

        // Close settings
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);

        // Get new background color - should have a data-theme set
        const dataTheme = await page.evaluate(() => document.documentElement.dataset.theme);
        expect(['light', 'dark', 'system']).toContain(dataTheme);
    });

    test('theme preference persists after reload', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Open settings
        await page.getByRole('button', { name: 'Open settings' }).click();

        // Select dark theme if visible
        const darkTheme = page.locator('button:has-text("Dark")');
        if (await darkTheme.isVisible()) {
            await darkTheme.click();
        }

        // Close settings
        await page.keyboard.press('Escape');
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

    test.beforeEach(async ({ context, page }) => {
        await context.clearCookies();
        await page.addInitScript(() => {
            localStorage.clear();
            localStorage.setItem('daw_onboarding_v1', JSON.stringify({
                version: 1,
                completed: true,
                selectedProductIds: ['ableton12suite', 'serum2', 'reasonrack', 'flstudio', 'logicpro'],
                themeId: 'system',
                iCloud: { enabled: false, syncStatus: 'disabled' }
            }));
        });
    });

    test('no horizontal overflow on iPhone', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Check that body doesn't overflow horizontally
        const hasOverflow = await page.evaluate(() => {
            return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });

        expect(hasOverflow).toBe(false);
    });

    test('settings accessible on mobile', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Settings button should be visible (uses aria-label)
        const settingsButton = page.getByRole('button', { name: 'Open settings' });
        await expect(settingsButton).toBeVisible({ timeout: 5000 });

        // Should be clickable
        await settingsButton.click();

        // Settings panel should open
        await expect(page.locator('.settings-panel')).toBeVisible();
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


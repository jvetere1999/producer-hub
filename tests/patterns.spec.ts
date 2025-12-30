import { test, expect } from '@playwright/test';

test.describe('Arrange Page', () => {
    test.beforeEach(async ({ context, page }) => {
        await context.clearCookies();
        await page.addInitScript(() => {
            localStorage.clear();
            localStorage.setItem('daw_onboarding_v1', JSON.stringify({
                version: 1,
                completed: true,
                selectedProductIds: ['ableton12suite'],
                themeId: 'system',
                iCloud: { enabled: false, syncStatus: 'disabled' }
            }));
        });
    });

    test('arrange page loads correctly', async ({ page }) => {
        await page.goto('/arrange');
        await page.waitForLoadState('networkidle');

        // Check header
        await expect(page.getByRole('heading', { name: 'Arrange' })).toBeVisible();

        // Check transport
        await expect(page.locator('.transport-bar')).toBeVisible();

        // Check lane sidebar
        await expect(page.locator('.lane-sidebar')).toBeVisible();

        // Check device rack
        await expect(page.locator('.device-rack')).toBeVisible();
    });

    test('can add and select lanes', async ({ page }) => {
        await page.goto('/arrange');
        await page.waitForLoadState('networkidle');

        // Click add melody lane
        await page.click('.add-lane-btn:has-text("+ Melody")');

        // Should have another lane
        const lanes = page.locator('.lane-header');
        await expect(lanes).toHaveCount(3);

        // Click add drums lane
        await page.click('.add-lane-btn:has-text("+ Drums")');

        // Should have 4 lanes now
        await expect(lanes).toHaveCount(4);
    });

    test('transport controls work', async ({ page }) => {
        await page.goto('/arrange');
        await page.waitForLoadState('networkidle');

        const playBtn = page.locator('.play-btn');
        await expect(playBtn).toBeVisible();

        await playBtn.click();
        await expect(playBtn).toHaveClass(/playing/);

        await playBtn.click();
        await expect(playBtn).not.toHaveClass(/playing/);
    });

    test('device tabs switch content', async ({ page }) => {
        await page.goto('/arrange');
        await page.waitForLoadState('networkidle');

        await page.click('.device-tab:has-text("Humanize")');
        await expect(page.locator('.humanize-controls')).toBeVisible();

        await page.click('.device-tab:has-text("Scale")');
        await expect(page.locator('.scale-selector')).toBeVisible();
    });
});

test.describe('Arrange - Mobile', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test.beforeEach(async ({ context, page }) => {
        await context.clearCookies();
        await page.addInitScript(() => {
            localStorage.clear();
            localStorage.setItem('daw_onboarding_v1', JSON.stringify({
                version: 1,
                completed: true,
                selectedProductIds: ['ableton12suite'],
                themeId: 'system',
                iCloud: { enabled: false, syncStatus: 'disabled' }
            }));
        });
    });

    test('mobile layout loads correctly', async ({ page }) => {
        await page.goto('/arrange');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('.arrange-page')).toBeVisible();
        await expect(page.locator('.midi-roll')).toBeVisible({ timeout: 5000 });
    });

    test('no horizontal overflow', async ({ page }) => {
        await page.goto('/arrange');
        await page.waitForLoadState('networkidle');

        const hasOverflow = await page.evaluate(() => {
            return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });

        expect(hasOverflow).toBe(false);
    });
});


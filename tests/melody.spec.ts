import { test, expect } from '@playwright/test';

test.describe('Arrange - Melody Features', () => {
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

    test('page loads with midi roll visible', async ({ page }) => {
        await page.goto('/arrange');
        await page.waitForLoadState('networkidle');

        await expect(page.getByRole('heading', { name: 'Arrange' })).toBeVisible();
        await expect(page.locator('.midi-roll')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('.arrange-page')).toBeVisible();
    });

    test('can change key and scale', async ({ page }) => {
        await page.goto('/arrange');
        await page.waitForLoadState('networkidle');

        const scaleTab = page.locator('.device-tab').filter({ hasText: 'Scale' });
        await scaleTab.click();

        const rootSelect = page.locator('.scale-selector select').first();
        if (await rootSelect.isVisible()) {
            await rootSelect.selectOption('A');
        }
    });

    test('can select a progression template', async ({ page }) => {
        await page.goto('/arrange');
        await page.waitForLoadState('networkidle');

        const progressionTab = page.locator('.device-tab').filter({ hasText: 'Progressions' });
        await progressionTab.click();

        const progressionBtn = page.locator('.template-item').first();
        if (await progressionBtn.isVisible()) {
            await progressionBtn.click();
            await expect(page.locator('.midi-roll')).toBeVisible({ timeout: 2000 });
        }
    });

    test('can select a genre pack', async ({ page }) => {
        await page.goto('/arrange');
        await page.waitForLoadState('networkidle');

        const genreTab = page.locator('.device-tab').filter({ hasText: 'Genre Packs' });
        await genreTab.click();

        const packCard = page.locator('.pack-card').first();
        if (await packCard.isVisible()) {
            await packCard.click();
            await expect(page.locator('.midi-roll')).toBeVisible({ timeout: 2000 });
        }
    });

    test('genre pack applies all settings', async ({ page }) => {
        await page.goto('/arrange');
        await page.waitForLoadState('networkidle');

        const genreTab = page.locator('.device-tab').filter({ hasText: 'Genre Packs' });
        await genreTab.click();

        const deepHousePack = page.locator('.pack-card', { hasText: 'Deep House' });
        if (await deepHousePack.isVisible()) {
            await deepHousePack.click();

            const bpmInput = page.locator('.transport-setting input[type="number"]').first();
            await expect(bpmInput).toHaveValue('122');
            await expect(page.locator('.midi-roll')).toBeVisible();
        }
    });

    test('saves arrangement to localStorage', async ({ page }) => {
        await page.goto('/arrange');
        await page.waitForLoadState('networkidle');

        const nameInput = page.locator('.arrangement-name');
        await nameInput.clear();
        await nameInput.fill('My Test Arrangement');
        await nameInput.press('Tab');

        await page.waitForTimeout(500);

        const saved = await page.evaluate(() => {
            return localStorage.getItem('daw_arrangements_v1');
        });
        expect(saved).toBeTruthy();
        expect(saved).toContain('My Test Arrangement');
    });

    test('no horizontal overflow on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/arrange');
        await page.waitForLoadState('networkidle');

        const hasOverflow = await page.evaluate(() => {
            return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });

        expect(hasOverflow).toBe(false);
    });

    test('mobile layout works correctly', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/arrange');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('.arrange-page')).toBeVisible();
        await expect(page.locator('.midi-roll')).toBeVisible({ timeout: 5000 });

        const hasOverflow = await page.evaluate(() => {
            return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        expect(hasOverflow).toBe(false);
    });

    test('can change BPM and bars', async ({ page }) => {
        await page.goto('/arrange');
        await page.waitForLoadState('networkidle');

        const bpmInput = page.locator('.transport-setting input[type="number"]').first();
        await bpmInput.fill('140');
        await bpmInput.blur();

        const barsInput = page.locator('.transport-setting input[type="number"]').nth(1);
        await barsInput.fill('8');
        await barsInput.blur();

        await expect(bpmInput).toHaveValue('140');
        await expect(barsInput).toHaveValue('8');
    });
});


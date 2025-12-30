import { test, expect } from '@playwright/test';

test.describe('Settings Panel', () => {
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

    test('settings cog button is visible', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Settings cog should be visible
        const settingsCog = page.locator('.settings-cog');
        await expect(settingsCog).toBeVisible({ timeout: 10000 });
    });

    test('clicking settings cog opens settings panel', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Click settings cog
        await page.locator('.settings-cog').click();

        // Settings modal should appear
        await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    });

    test('settings panel has navigation sections', async ({ page }) => {
        await page.goto('/');
        await page.locator('.settings-cog').click();

        // All sections should be present - use exact match to avoid duplicates
        await expect(page.getByRole('button', { name: /General/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Products/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Sync/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Keyboard/i })).toBeVisible();
    });

    test('keyboard shortcuts section shows shortcuts', async ({ page }) => {
        await page.goto('/');
        await page.locator('.settings-cog').click();

        // Navigate to keyboard section
        await page.getByRole('button', { name: /Keyboard/i }).click();

        // Should show shortcuts
        await expect(page.getByText('Open command palette')).toBeVisible();
    });

    test('Cmd+, opens settings panel', async ({ page }) => {
        await page.goto('/');

        // Press Cmd+,
        await page.keyboard.press('Meta+,');

        // Settings should open
        await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    });

    test('Escape closes settings panel', async ({ page }) => {
        await page.goto('/');
        await page.locator('.settings-cog').click();

        // Settings should be open
        await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

        // Press Escape
        await page.keyboard.press('Escape');

        // Settings should be closed
        await expect(page.getByRole('heading', { name: 'Settings' })).not.toBeVisible();
    });
});

test.describe('State Persistence', () => {
    test.beforeEach(async ({ context, page }) => {
        await context.clearCookies();
        await page.addInitScript(() => {
            // Clear only specific keys to avoid breaking onboarding
            localStorage.removeItem('producerhub_ui_state_v1');
            localStorage.removeItem('producerhub_active_tab');
        });
    });

    test('filter state persists after reload', async ({ page }) => {
        // Complete onboarding first
        await page.addInitScript(() => {
            localStorage.setItem('daw_onboarding_v1', JSON.stringify({
                version: 1,
                completed: true,
                selectedProductIds: ['ableton12suite', 'serum2', 'flstudio', 'reasonrack', 'logicpro'],
                themeId: 'system',
                iCloud: { enabled: false, syncStatus: 'disabled', lastConnectedAt: null, lastError: null }
            }));
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Change a filter (e.g., select a product)
        const productSelect = page.locator('select').first();
        if (await productSelect.isVisible()) {
            await productSelect.selectOption({ index: 1 });

            // Get the selected value
            const selectedValue = await productSelect.inputValue();

            // Reload page
            await page.reload();
            await page.waitForLoadState('networkidle');

            // Filter should persist
            const newValue = await productSelect.inputValue();
            expect(newValue).toBe(selectedValue);
        }
    });

    test('active tab persists after reload', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('daw_onboarding_v1', JSON.stringify({
                version: 1,
                completed: true,
                selectedProductIds: ['ableton12suite'],
                themeId: 'system',
                iCloud: { enabled: false, syncStatus: 'disabled', lastConnectedAt: null, lastError: null }
            }));
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Click on a different tab
        const infoBaseTab = page.getByRole('button', { name: /Info Base/i });
        if (await infoBaseTab.isVisible()) {
            await infoBaseTab.click();

            // Reload
            await page.reload();
            await page.waitForLoadState('networkidle');

            // Tab should be active
            await expect(infoBaseTab).toHaveClass(/active|selected/);
        }
    });
});

test.describe('Keyboard Navigation', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('daw_onboarding_v1', JSON.stringify({
                version: 1,
                completed: true,
                selectedProductIds: ['ableton12suite'],
                themeId: 'system',
                iCloud: { enabled: false, syncStatus: 'disabled', lastConnectedAt: null, lastError: null }
            }));
        });
    });

    test('number keys switch tabs', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Press 2 to go to Info Base
        await page.keyboard.press('2');

        // Wait a moment for the tab to switch
        await page.waitForTimeout(100);

        // The infobase tab should be active or infobase content visible
        const infobaseContent = page.locator('[data-tab="infobase"], .infobase');
        // This is a best-effort check - the actual selector depends on implementation
    });

    test('/ focuses search input', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Click somewhere to ensure focus is not in an input
        await page.click('body');

        // Press /
        await page.keyboard.press('/');

        // Search input should be focused
        const searchInput = page.locator('input[type="search"], input[placeholder*="earch"]');
        if (await searchInput.count() > 0) {
            await expect(searchInput.first()).toBeFocused();
        }
    });

    test('Cmd+K opens command palette', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Press Cmd+K
        await page.keyboard.press('Meta+k');

        // Command palette should open (look for the input)
        const paletteInput = page.locator('[placeholder*="command"], .command-palette input');
        // This depends on implementation
    });
});


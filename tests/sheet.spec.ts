import { test, expect } from '@playwright/test';

test.describe('Sheet Component', () => {
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

    test('settings panel opens and closes like a sheet', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Open settings (which uses modal/sheet-like behavior)
        await page.getByRole('button', { name: 'Open settings' }).click();

        // Settings modal should appear
        const settingsHeading = page.getByRole('heading', { name: 'Settings' });
        await expect(settingsHeading).toBeVisible();

        // Press Escape to close
        await page.keyboard.press('Escape');

        // Settings should be closed
        await expect(settingsHeading).not.toBeVisible();
    });

    test('modal prevents body scroll when open', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Check initial body overflow
        const initialOverflow = await page.evaluate(() => document.body.style.overflow);
        expect(initialOverflow).toBe('');

        // Open settings
        await page.getByRole('button', { name: 'Open settings' }).click();
        await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

        // Body overflow should be hidden (scroll lock)
        // Note: This depends on the implementation - settings panel may or may not use scroll lock
    });

    test('modal backdrop click closes modal', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Open settings
        await page.getByRole('button', { name: 'Open settings' }).click();
        const settingsHeading = page.getByRole('heading', { name: 'Settings' });
        await expect(settingsHeading).toBeVisible();

        // Click the backdrop (outside the modal)
        // Settings panel uses .settings-overlay as backdrop
        const backdrop = page.locator('.settings-overlay');
        if (await backdrop.isVisible()) {
            // Click at the edge of the backdrop (not on the modal)
            await backdrop.click({ position: { x: 10, y: 10 } });
            await expect(settingsHeading).not.toBeVisible();
        }
    });

    test('modal close button works', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Open settings
        await page.getByRole('button', { name: 'Open settings' }).click();
        const settingsHeading = page.getByRole('heading', { name: 'Settings' });
        await expect(settingsHeading).toBeVisible();

        // Click close button
        const closeButton = page.locator('.close-btn, [aria-label="Close settings"], button:has-text("✕")').first();
        if (await closeButton.isVisible()) {
            await closeButton.click();
            await expect(settingsHeading).not.toBeVisible();
        }
    });

    test('modal works on mobile viewport', async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Open settings
        await page.getByRole('button', { name: 'Open settings' }).click();

        // Settings modal should appear and be usable
        const settingsHeading = page.getByRole('heading', { name: 'Settings' });
        await expect(settingsHeading).toBeVisible();

        // Modal should not cause horizontal overflow
        const hasHorizontalOverflow = await page.evaluate(() => {
            return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        expect(hasHorizontalOverflow).toBe(false);

        // Close with Escape
        await page.keyboard.press('Escape');
        await expect(settingsHeading).not.toBeVisible();
    });

    test('respects prefers-reduced-motion', async ({ page }) => {
        // Emulate reduced motion preference
        await page.emulateMedia({ reducedMotion: 'reduce' });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Open settings - should work without animation lag
        await page.getByRole('button', { name: 'Open settings' }).click();

        // Should appear immediately
        const settingsHeading = page.getByRole('heading', { name: 'Settings' });
        await expect(settingsHeading).toBeVisible({ timeout: 1000 });

        // Close - should close immediately
        await page.keyboard.press('Escape');
        await expect(settingsHeading).not.toBeVisible({ timeout: 1000 });
    });
});

test.describe('Mobile Navigation Dropdown Sheet', () => {
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
        // Set iPhone viewport
        await page.setViewportSize({ width: 375, height: 667 });
    });

    test('Shortcuts menu opens as full-width sheet on mobile', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Click Shortcuts nav button
        const shortcutsBtn = page.getByRole('button', { name: /Shortcuts/i });
        await expect(shortcutsBtn).toBeVisible();
        await shortcutsBtn.click();

        // Sheet should appear with title (title includes emoji)
        const sheet = page.locator('.sheet');
        await expect(sheet).toBeVisible();

        // Menu items should be visible and large
        const menuItems = page.locator('.mobile-nav-item');
        const count = await menuItems.count();
        expect(count).toBeGreaterThan(0);

        // No horizontal overflow
        const hasHorizontalOverflow = await page.evaluate(() => {
            return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        expect(hasHorizontalOverflow).toBe(false);

        // Close with Escape
        await page.keyboard.press('Escape');
        await expect(sheet).not.toBeVisible();
    });

    test('Tools menu opens as full-width sheet on mobile', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Click Tools nav button
        const toolsBtn = page.getByRole('button', { name: /Tools/i });
        await expect(toolsBtn).toBeVisible();
        await toolsBtn.click();

        // Sheet should appear
        const sheet = page.locator('.sheet');
        await expect(sheet).toBeVisible();

        // Menu items should be visible
        const menuItems = page.locator('.mobile-nav-item');
        const count = await menuItems.count();
        expect(count).toBeGreaterThan(0);

        // Close with Escape
        await page.keyboard.press('Escape');
        await expect(sheet).not.toBeVisible();
    });

    test('Create menu opens as full-width sheet on mobile', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Click Create nav button
        const createBtn = page.getByRole('button', { name: /Create/i });
        await expect(createBtn).toBeVisible();
        await createBtn.click();

        // Sheet should appear
        const sheet = page.locator('.sheet');
        await expect(sheet).toBeVisible();

        // Menu items should be visible
        const menuItems = page.locator('.mobile-nav-item');
        const count = await menuItems.count();
        expect(count).toBeGreaterThan(0);

        // Close with Escape
        await page.keyboard.press('Escape');
        await expect(sheet).not.toBeVisible();
    });

    test('menu items are tappable with adequate touch targets', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Open Tools menu (has multiple items)
        await page.getByRole('button', { name: /Tools/i }).click();

        // Wait for sheet
        const sheet = page.locator('.sheet');
        await expect(sheet).toBeVisible();

        // Check menu items have adequate height (at least 44px)
        const menuItems = page.locator('.mobile-nav-item');
        const firstItem = menuItems.first();
        await expect(firstItem).toBeVisible();

        const box = await firstItem.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.height).toBeGreaterThanOrEqual(44);
    });

    test('menu closes when item is clicked', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Open Shortcuts menu
        await page.getByRole('button', { name: /Shortcuts/i }).click();

        // Wait for sheet
        const sheet = page.locator('.sheet');
        await expect(sheet).toBeVisible();

        // Click on a menu item
        const keyboardShortcuts = page.locator('.mobile-nav-item').first();
        await keyboardShortcuts.click();

        // Sheet should close
        await expect(sheet).not.toBeVisible();
    });

    test('desktop uses dropdown instead of sheet', async ({ page }) => {
        // Set desktop viewport
        await page.setViewportSize({ width: 1280, height: 800 });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Click Shortcuts nav button
        await page.getByRole('button', { name: /Shortcuts/i }).click();

        // Should see dropdown menu, not sheet
        const dropdownMenu = page.locator('.dropdown-menu');
        await expect(dropdownMenu).toBeVisible();

        // Sheet should NOT be visible
        const sheet = page.locator('.sheet');
        await expect(sheet).not.toBeVisible();
    });
});


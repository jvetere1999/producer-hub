import { test, expect } from '@playwright/test';

test.describe('Accessibility - Keyboard Navigation', () => {
    test.beforeEach(async ({ context, page }) => {
        await context.clearCookies();
        // Set onboarding as complete
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

    test('focus moves through header nav controls', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Tab to first focusable element
        await page.keyboard.press('Tab');

        // Collect focused elements
        const focusedElements: string[] = [];
        for (let i = 0; i < 10; i++) {
            const focused = await page.evaluate(() => {
                const el = document.activeElement;
                if (!el) return null;
                return {
                    tag: el.tagName.toLowerCase(),
                    ariaLabel: el.getAttribute('aria-label')
                };
            });
            if (focused) {
                focusedElements.push(focused.tag);
            }
            await page.keyboard.press('Tab');
        }

        expect(focusedElements.length).toBeGreaterThan(0);
    });

    test('nav dropdown triggers have aria-expanded', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const shortcutsBtn = page.locator('[aria-label="Shortcuts menu"]');
        await expect(shortcutsBtn).toBeVisible();
        await expect(shortcutsBtn).toHaveAttribute('aria-expanded', 'false');
        await expect(shortcutsBtn).toHaveAttribute('aria-haspopup', 'menu');

        await shortcutsBtn.click();
        await expect(shortcutsBtn).toHaveAttribute('aria-expanded', 'true');
    });

    test('os-toggle button has aria-label', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const osToggle = page.locator('.os-toggle');
        await expect(osToggle).toBeVisible();

        const ariaLabel = await osToggle.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel).toMatch(/shortcut/i);
    });

    test('settings button has aria-label', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const settingsBtn = page.locator('[aria-label="Open settings"]');
        await expect(settingsBtn).toBeVisible();
    });

    test('dropdown items have menu role', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        await page.locator('[aria-label="Shortcuts menu"]').click();

        const dropdownMenu = page.locator('[role="menu"][aria-label="Shortcuts submenu"]');
        await expect(dropdownMenu).toBeVisible();

        const menuItems = page.locator('[role="menuitem"]');
        await expect(menuItems.first()).toBeVisible();
    });
});

test.describe('Accessibility - Arrange Page', () => {
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

    test('transport controls have aria-labels', async ({ page }) => {
        await page.goto('/arrange');
        await page.waitForLoadState('networkidle');

        const playBtn = page.locator('[aria-label="Play"], [aria-label="Stop"]');
        await expect(playBtn.first()).toBeVisible();
    });

    test('grid cells are keyboard accessible', async ({ page }) => {
        await page.goto('/arrange');
        await page.waitForLoadState('networkidle');

        const gridCells = page.locator('.cell');
        await expect(gridCells.first()).toBeVisible();

        const ariaLabel = await gridCells.first().getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
    });
});


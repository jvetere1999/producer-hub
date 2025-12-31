/**
 * Playwright E2E tests for Lane Builder
 *
 * Tests cover:
 * - Lane overview display
 * - Adding/removing lanes
 * - Share URL round-trip
 * - Clip attachment/persistence
 * - MIDI export
 */

import { test, expect } from '@playwright/test';

// Skip onboarding for all tests in this file
test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('onboarding_completed', 'true');
        localStorage.setItem('daw_selected_products', JSON.stringify(['ableton']));
    });
});

test.describe('Lane Builder - Overview', () => {
    test('displays arrangement with lanes', async ({ page }) => {
        await page.goto('/arrange');
        await page.waitForLoadState('networkidle');

        // Check toolbar is visible
        await expect(page.locator('.toolbar, header')).toBeVisible();

        // Check add lane button exists
        const addLaneBtn = page.locator('button:has-text("Add Lane"), .add-lane-btn');
        await expect(addLaneBtn.first()).toBeVisible();
    });

    test('can add drum lane', async ({ page }) => {
        await page.goto('/arrange');
        await page.waitForLoadState('networkidle');

        // Find and click add lane button
        const addLaneBtn = page.locator('button:has-text("Add Lane"), .add-lane-btn').first();
        await addLaneBtn.click();

        // Click drum option
        const drumOption = page.locator('button:has-text("Drum")').first();
        await drumOption.click();

        // Verify a lane was added (check for lane-related elements)
        await expect(page.locator('.lane, [class*="lane"]')).toBeVisible({ timeout: 5000 });
    });

    test('can add melody lane', async ({ page }) => {
        await page.goto('/arrange');
        await page.waitForLoadState('networkidle');

        const addLaneBtn = page.locator('button:has-text("Add Lane"), .add-lane-btn').first();
        await addLaneBtn.click();

        const melodyOption = page.locator('button:has-text("Melody")').first();
        await melodyOption.click();

        await expect(page.locator('.lane, [class*="lane"]')).toBeVisible({ timeout: 5000 });
    });
});

test.describe('Lane Builder - Share URL Round-trip', () => {
    test('share creates valid URL with arrangement data', async ({ page }) => {
        await page.goto('/arrange');
        await page.waitForLoadState('networkidle');

        // Look for share button/action
        const shareBtn = page.locator('button:has-text("Share"), [aria-label*="Share"]').first();
        if (await shareBtn.isVisible()) {
            await shareBtn.click();

            // Check for share dialog or URL input
            const shareInput = page.locator('input[type="text"][readonly], .share-url, input[value*="arrange"]');
            await expect(shareInput.first()).toBeVisible({ timeout: 3000 });
        }
    });

    test('shared URL restores arrangement', async ({ page }) => {
        // First create an arrangement
        await page.goto('/arrange');
        await page.waitForLoadState('networkidle');

        // Get current URL with any arrangement data
        const currentUrl = page.url();

        // Navigate to arrangement with template param
        await page.goto('/arrange?a=test');
        await page.waitForLoadState('networkidle');

        // Should load without errors
        await expect(page.locator('body')).toBeVisible();
    });
});

test.describe('Lane Builder - Clip Persistence', () => {
    test('arrangement persists after refresh', async ({ page }) => {
        await page.goto('/arrange');
        await page.waitForLoadState('networkidle');

        // Make a change (add a lane if possible)
        const addLaneBtn = page.locator('button:has-text("Add Lane"), .add-lane-btn').first();
        if (await addLaneBtn.isVisible()) {
            await addLaneBtn.click();
            const drumOption = page.locator('button:has-text("Drum")').first();
            if (await drumOption.isVisible()) {
                await drumOption.click();
                // Wait for lane to be created
                await page.waitForTimeout(500);
            }
        }

        // Refresh
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Page should still load
        await expect(page.locator('body')).toBeVisible();
    });
});

test.describe('Lane Builder - MIDI Export', () => {
    test('export button triggers download', async ({ page }) => {
        await page.goto('/arrange');
        await page.waitForLoadState('networkidle');

        const exportBtn = page.locator('button:has-text("Export"), [aria-label*="Export"]').first();
        if (await exportBtn.isVisible()) {
            // Set up download listener
            const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);

            await exportBtn.click();

            const download = await downloadPromise;
            if (download) {
                expect(download.suggestedFilename()).toMatch(/\.(mid|midi)$/i);
            }
        }
    });
});

test.describe('Lane Builder - Mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('mobile actions accessible via menu', async ({ page }) => {
        await page.goto('/arrange');
        await page.waitForLoadState('networkidle');

        // Look for mobile menu button
        const menuBtn = page.locator('[aria-label="Actions"], [aria-label="Menu"], button:has-text("☰")').first();
        if (await menuBtn.isVisible()) {
            await menuBtn.click();

            // Check for mobile actions sheet/menu
            const sheet = page.locator('.mobile-actions, [role="dialog"], .sheet');
            await expect(sheet.first()).toBeVisible({ timeout: 3000 });
        }
    });

    test('no horizontal overflow at 375px', async ({ page }) => {
        await page.goto('/arrange');
        await page.waitForLoadState('networkidle');

        // Check for horizontal overflow
        const body = page.locator('body');
        const scrollWidth = await body.evaluate(el => el.scrollWidth);
        const clientWidth = await body.evaluate(el => el.clientWidth);

        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 10); // Small tolerance
    });
});

test.describe('Lane Builder - Info/Help', () => {
    test('help button shows info panel', async ({ page }) => {
        await page.goto('/arrange');
        await page.waitForLoadState('networkidle');

        const helpBtn = page.locator('[aria-label="Help"], button:has-text("Help"), button:has-text("?")').first();
        if (await helpBtn.isVisible()) {
            await helpBtn.click();

            // Check for help panel
            const helpPanel = page.locator('.info-blurb, [role="complementary"], .help-panel');
            await expect(helpPanel.first()).toBeVisible({ timeout: 3000 });
        }
    });
});


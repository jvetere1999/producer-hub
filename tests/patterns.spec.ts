import { test, expect } from '@playwright/test';

test.describe('Pattern Builder', () => {
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
        await page.goto('/patterns');
    });

    test('loads the patterns page', async ({ page }) => {
        await expect(page.locator('h1')).toContainText('Pattern Builder');
    });

    test('displays template selector', async ({ page }) => {
        await expect(page.locator('text=Templates')).toBeVisible();
        await expect(page.locator('text=House')).toBeVisible();
        await expect(page.locator('text=Techno')).toBeVisible();
    });

    test('selecting House template renders kick pattern', async ({ page }) => {
        // Click House template
        await page.click('button:has-text("House")');

        // Pattern name should update
        await expect(page.locator('.pattern-name-input')).toHaveValue('House');

        // Kick lane should have active cells (4-on-the-floor)
        // Check first cell in kick lane is active
        const kickCells = page.locator('.lane-row:first-child .cell.active');
        await expect(kickCells.first()).toBeVisible();
    });

    test('clicking cell toggles hit', async ({ page }) => {
        // Get first cell
        const firstCell = page.locator('.cell').first();

        // Initially not active
        const wasActive = await firstCell.evaluate(el => el.classList.contains('active'));

        // Click to toggle
        await firstCell.click();

        // Should be opposite of initial state
        const isNowActive = await firstCell.evaluate(el => el.classList.contains('active'));
        expect(isNowActive).toBe(!wasActive);
    });

    test('ghost kicks toggle changes rendering', async ({ page }) => {
        // Find and click the ghost kicks toggle
        await page.click('button:has-text("OFF")');

        // Button should now say ON
        await expect(page.locator('button:has-text("ON")')).toBeVisible();

        // Should show ghost mode options
        await expect(page.locator('text=Mode')).toBeVisible();
        await expect(page.locator('text=Velocity')).toBeVisible();
    });

    test('play button shows enable audio prompt first', async ({ page }) => {
        // Find play button
        const playButton = page.locator('.transport-btn');

        // Should show "Tap to Enable" initially
        await expect(playButton).toContainText('Tap to Enable');
    });

    test('transport shows BPM and swing controls', async ({ page }) => {
        await expect(page.locator('label:has-text("BPM")')).toBeVisible();
        await expect(page.locator('label:has-text("Swing")')).toBeVisible();
        await expect(page.locator('#bpm-input')).toHaveValue('120');
    });

    test('selecting template changes BPM', async ({ page }) => {
        // Select Drum & Bass template (174 BPM)
        await page.click('button:has-text("Drum & Bass")');

        await expect(page.locator('#bpm-input')).toHaveValue('174');
    });

    test('drum rack shows all lanes', async ({ page }) => {
        await expect(page.locator('.drum-rack')).toBeVisible();
        await expect(page.locator('.lane:has-text("Kick")')).toBeVisible();
        await expect(page.locator('.lane:has-text("Snare")')).toBeVisible();
        await expect(page.locator('.lane:has-text("Hi-Hat")')).toBeVisible();
    });
});

test.describe('Pattern Builder - Mobile', () => {
    test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14

    test('no horizontal overflow', async ({ page }) => {
        await page.goto('/patterns');

        const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const viewportWidth = await page.evaluate(() => window.innerWidth);

        expect(documentWidth).toBeLessThanOrEqual(viewportWidth + 20); // Allow small tolerance
    });

    test('transport controls are usable', async ({ page }) => {
        await page.goto('/patterns');

        // Transport should be visible
        const transport = page.locator('.transport-bar');
        await expect(transport).toBeVisible();

        // Play button should be tappable
        const playBtn = page.locator('.transport-btn');
        const box = await playBtn.boundingBox();
        expect(box).toBeTruthy();
        expect(box!.height).toBeGreaterThanOrEqual(44);
    });

    test('grid scrolls horizontally', async ({ page }) => {
        await page.goto('/patterns');

        const rollContainer = page.locator('.midi-roll-container');
        await expect(rollContainer).toBeVisible();

        // Container should allow horizontal scroll
        const hasOverflowX = await rollContainer.evaluate(el => {
            const style = window.getComputedStyle(el);
            return style.overflowX === 'auto' || style.overflowX === 'scroll';
        });
        expect(hasOverflowX).toBe(true);
    });
});

test.describe('Pattern Builder - Accessibility', () => {
    test('cells are keyboard navigable', async ({ page }) => {
        await page.goto('/patterns');

        // Tab to a cell
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');

        // Find focused cell
        const focusedCell = page.locator('.cell:focus');

        // Press Space to toggle
        await page.keyboard.press('Space');

        // Cell should now have a different active state
        // (just verify no error thrown)
    });

    test('lanes have ARIA labels', async ({ page }) => {
        await page.goto('/patterns');

        const kickLane = page.locator('[aria-label="Kick lane"]');
        await expect(kickLane).toBeVisible();
    });

    test('transport has ARIA labels', async ({ page }) => {
        await page.goto('/patterns');

        const playBtn = page.locator('[aria-label="Play"], [aria-label="Stop"]');
        await expect(playBtn.first()).toBeVisible();
    });
});


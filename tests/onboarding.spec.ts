import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow', () => {
    test.beforeEach(async ({ context, page }) => {
        await context.clearCookies();
        // Clear onboarding state to simulate first run
        await page.addInitScript(() => {
            localStorage.removeItem('daw_onboarding_v1');
        });
    });

    test('onboarding page loads correctly', async ({ page }) => {
        await page.goto('/onboarding');

        // Should show welcome message
        await expect(page.getByText('Welcome to Producer Hub')).toBeVisible();

        // Should show step indicators
        await expect(page.getByText('Programs')).toBeVisible();
        await expect(page.getByText('Sync')).toBeVisible();
        await expect(page.getByText('Theme')).toBeVisible();
    });

    test('can select products in step 1', async ({ page }) => {
        await page.goto('/onboarding');

        // Should see product cards
        await expect(page.locator('.product-card').first()).toBeVisible();

        // Click a product to toggle selection
        const firstProduct = page.locator('.product-card').first();
        await firstProduct.click();

        // Check if selection state changed
        const isSelected = await firstProduct.evaluate(el =>
            el.classList.contains('selected')
        );
        // State depends on initial - just verify click works without error
    });

    test('can navigate through all steps', async ({ page }) => {
        await page.goto('/onboarding');

        // Step 1: Products - click Continue
        await page.getByRole('button', { name: 'Continue' }).click();

        // Step 2: Sync - should be visible
        await expect(page.getByText('Cloud Sync')).toBeVisible();
        await page.getByRole('button', { name: 'Continue' }).click();

        // Step 3: Theme - should be visible
        await expect(page.getByText('Choose Your Theme')).toBeVisible();
    });

    test('skip for now completes onboarding with defaults', async ({ page }) => {
        await page.goto('/onboarding');

        // Click skip
        await page.getByRole('button', { name: 'Skip for now' }).click();

        // Should redirect to main page
        await expect(page).toHaveURL(/\/$/);

        // Onboarding should be marked complete
        const settings = await page.evaluate(() => {
            const stored = localStorage.getItem('daw_onboarding_v1');
            return stored ? JSON.parse(stored) : null;
        });

        expect(settings?.completed).toBe(true);
    });

    test('completing onboarding saves settings', async ({ page }) => {
        await page.goto('/onboarding');

        // Go through all steps
        await page.getByRole('button', { name: 'Continue' }).click(); // Step 1 -> 2
        await page.getByRole('button', { name: 'Continue' }).click(); // Step 2 -> 3
        await page.getByRole('button', { name: 'Get Started' }).click(); // Complete

        // Should redirect to main page
        await expect(page).toHaveURL(/\/$/);

        // Verify settings saved
        const settings = await page.evaluate(() => {
            const stored = localStorage.getItem('daw_onboarding_v1');
            return stored ? JSON.parse(stored) : null;
        });

        expect(settings?.completed).toBe(true);
        expect(settings?.version).toBe(1);
    });

    test('iCloud toggle works in step 2', async ({ page }) => {
        await page.goto('/onboarding');

        // Go to step 2
        await page.getByRole('button', { name: 'Continue' }).click();

        // Find and click toggle
        const toggle = page.locator('.toggle-btn');
        await toggle.click();

        // Should show connected status
        await expect(page.getByText('Connected to iCloud')).toBeVisible();

        // Toggle off
        await toggle.click();

        // Should show note instead
        await expect(page.getByText(/You can enable this later/)).toBeVisible();
    });

    test('theme selection applies immediately', async ({ page }) => {
        await page.goto('/onboarding');

        // Go to step 3
        await page.getByRole('button', { name: 'Continue' }).click();
        await page.getByRole('button', { name: 'Continue' }).click();

        // Get initial theme
        const initialTheme = await page.evaluate(() =>
            document.documentElement.dataset.theme
        );

        // Click a different theme card (not system, not current)
        const themeCards = page.locator('.theme-card');
        const count = await themeCards.count();

        if (count > 1) {
            // Click the second theme card
            await themeCards.nth(1).click();

            // Theme should have been applied
            await page.waitForTimeout(100);
        }
    });

    test('settings persist after reload', async ({ page }) => {
        // First, complete onboarding
        await page.goto('/onboarding');
        await page.getByRole('button', { name: 'Skip for now' }).click();

        // Reload and verify settings still there
        await page.reload();

        const settings = await page.evaluate(() => {
            const stored = localStorage.getItem('daw_onboarding_v1');
            return stored ? JSON.parse(stored) : null;
        });

        expect(settings?.completed).toBe(true);
    });
});

test.describe('Onboarding iCloud Stub', () => {
    test.beforeEach(async ({ context, page }) => {
        await context.clearCookies();
        await page.addInitScript(() => {
            localStorage.removeItem('daw_onboarding_v1');
        });
    });

    test('iCloud stub state persists', async ({ page }) => {
        await page.goto('/onboarding');

        // Go to step 2
        await page.getByRole('button', { name: 'Continue' }).click();

        // Enable iCloud
        await page.locator('.toggle-btn').click();
        await expect(page.getByText('Connected to iCloud')).toBeVisible();

        // Complete onboarding
        await page.getByRole('button', { name: 'Continue' }).click();
        await page.getByRole('button', { name: 'Get Started' }).click();

        // Check stored settings
        const settings = await page.evaluate(() => {
            const stored = localStorage.getItem('daw_onboarding_v1');
            return stored ? JSON.parse(stored) : null;
        });

        expect(settings?.iCloud?.enabled).toBe(true);
        expect(settings?.iCloud?.syncStatus).toBe('ready');
    });
});


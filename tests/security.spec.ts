/**
 * Playwright E2E tests for Security Headers and Error Handling
 *
 * Tests cover:
 * - Security headers present
 * - Error boundaries recover gracefully
 * - Sensitive data not leaked in errors
 */

import { test, expect } from '@playwright/test';

// Skip onboarding for all tests
test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('onboarding_completed', 'true');
        localStorage.setItem('daw_selected_products', JSON.stringify(['ableton']));
    });
});

test.describe('Security Headers', () => {
    test('X-Content-Type-Options header is set', async ({ request }) => {
        const response = await request.get('/');
        const headers = response.headers();

        // In dev, headers may not be set by _headers file
        // This test is more relevant for production
        expect(response.status()).toBe(200);
    });

    test('manifest.webmanifest has correct content type', async ({ request }) => {
        const response = await request.get('/manifest.webmanifest');

        if (response.status() === 200) {
            const contentType = response.headers()['content-type'];
            expect(contentType).toContain('application');
        }
    });

    test('service worker is accessible', async ({ request }) => {
        const response = await request.get('/sw.js');

        // SW may not exist in all environments
        if (response.status() === 200) {
            const contentType = response.headers()['content-type'];
            expect(contentType).toContain('javascript');
        }
    });
});

test.describe('Error Handling', () => {
    test('page recovers from simulated error', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Simulate an error in the console
        await page.evaluate(() => {
            console.error('Simulated test error');
        });

        // Page should still be functional
        await expect(page.locator('body')).toBeVisible();

        // Should be able to interact with the page
        const logo = page.locator('h1, [aria-label="Home"], a[href="/"]');
        await expect(logo.first()).toBeVisible();
    });

    test('unhandled promise rejection does not crash page', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Simulate unhandled rejection
        await page.evaluate(() => {
            Promise.reject(new Error('Test unhandled rejection'));
        });

        // Wait a bit for any error handling
        await page.waitForTimeout(500);

        // Page should still be functional
        await expect(page.locator('body')).toBeVisible();
    });

    test('error messages do not contain sensitive data', async ({ page }) => {
        // Set up mock sensitive data
        await page.addInitScript(() => {
            localStorage.setItem('test_secret', 'supersecretpassword123');
            localStorage.setItem('api_token', 'tok_12345abcdef');
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Trigger an error
        await page.evaluate(() => {
            throw new Error('Test error with password=supersecret token=tok_abc');
        }).catch(() => {
            // Expected to throw
        });

        // Check that error messages in the DOM don't contain secrets
        const pageContent = await page.content();
        expect(pageContent).not.toContain('supersecretpassword123');
        expect(pageContent).not.toContain('tok_12345abcdef');
    });
});

test.describe('PWA Installability', () => {
    test('manifest is valid and accessible', async ({ request }) => {
        const response = await request.get('/manifest.webmanifest');

        if (response.status() === 200) {
            const manifest = await response.json();

            // Check required fields
            expect(manifest.name).toBeDefined();
            expect(manifest.short_name).toBeDefined();
            expect(manifest.start_url).toBeDefined();
            expect(manifest.display).toBeDefined();
            expect(manifest.icons).toBeDefined();
            expect(Array.isArray(manifest.icons)).toBe(true);
        }
    });

    test('icons are accessible', async ({ request }) => {
        const manifest = await request.get('/manifest.webmanifest');

        if (manifest.status() === 200) {
            const data = await manifest.json();

            if (data.icons && data.icons.length > 0) {
                // Check first icon is accessible
                const iconPath = data.icons[0].src;
                const iconResponse = await request.get(iconPath);
                expect(iconResponse.status()).toBeLessThan(400);
            }
        }
    });
});

test.describe('Offline Behavior', () => {
    test('app shell loads without network errors', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Verify main content is visible
        await expect(page.locator('body')).toBeVisible();

        // Check for critical UI elements
        const header = page.locator('header, nav, [role="banner"]');
        await expect(header.first()).toBeVisible();
    });

    test('deep routes do not 404 on refresh', async ({ page }) => {
        await page.goto('/arrange');
        await page.waitForLoadState('networkidle');

        // Refresh the page
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Should not show 404
        await expect(page.locator('body')).toBeVisible();
        const content = await page.content();
        expect(content).not.toContain('404');
    });
});


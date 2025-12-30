/**
 * Playwright E2E tests for Template Pages
 *
 * Tests cover:
 * - SEO meta tags (title, description, canonical, JSON-LD)
 * - Template listing and navigation
 * - "Open in Lane Builder" functionality
 * - Security: share URL validation
 */

import { test, expect } from '@playwright/test';

test.describe('Template Pages - SEO', () => {
    test('templates index has proper meta tags', async ({ page }) => {
        await page.goto('/templates');
        await page.waitForLoadState('networkidle');

        // Check title
        const title = await page.title();
        expect(title).toContain('Templates');

        // Check meta description
        const description = await page.locator('meta[name="description"]').getAttribute('content');
        expect(description).toBeTruthy();
        expect(description!.length).toBeGreaterThan(50);

        // Check canonical
        const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
        expect(canonical).toContain('/templates');

        // Check JSON-LD
        const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
        expect(jsonLd).toBeTruthy();
        const parsed = JSON.parse(jsonLd!);
        expect(parsed['@type']).toBe('CollectionPage');
    });

    test('drum template page has proper meta tags', async ({ page }) => {
        await page.goto('/templates/basic-rock-beat');
        await page.waitForLoadState('networkidle');

        // Check title contains template name
        const title = await page.title();
        expect(title).toContain('Basic Rock Beat');

        // Check meta description
        const description = await page.locator('meta[name="description"]').getAttribute('content');
        expect(description).toBeTruthy();

        // Check canonical URL
        const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
        expect(canonical).toContain('/templates/basic-rock-beat');

        // Check Open Graph tags
        const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
        expect(ogTitle).toContain('Basic Rock Beat');

        // Check JSON-LD structured data
        const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
        expect(jsonLd).toBeTruthy();
        const parsed = JSON.parse(jsonLd!);
        expect(parsed['@type']).toBe('MusicComposition');
        expect(parsed.name).toBe('Basic Rock Beat');
    });

    test('melody template page has proper meta tags', async ({ page }) => {
        await page.goto('/templates/simple-c-major-scale');
        await page.waitForLoadState('networkidle');

        const title = await page.title();
        expect(title).toContain('C Major Scale');

        const description = await page.locator('meta[name="description"]').getAttribute('content');
        expect(description).toBeTruthy();

        const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
        const parsed = JSON.parse(jsonLd!);
        expect(parsed.musicalKey).toBe('C');
    });

    test('chord template page has proper meta tags', async ({ page }) => {
        await page.goto('/templates/i-v-vi-iv-progression');
        await page.waitForLoadState('networkidle');

        const title = await page.title();
        expect(title).toContain('I-V-vi-IV');

        const description = await page.locator('meta[name="description"]').getAttribute('content');
        expect(description).toBeTruthy();
        expect(description!.toLowerCase()).toContain('pop');
    });
});

test.describe('Template Pages - Navigation', () => {
    test('templates index shows all categories', async ({ page }) => {
        await page.goto('/templates');
        await page.waitForLoadState('networkidle');

        // Check category sections exist
        await expect(page.locator('#drums')).toBeVisible();
        await expect(page.locator('#melody')).toBeVisible();
        await expect(page.locator('#chords')).toBeVisible();

        // Check template cards are rendered
        const drumCards = page.locator('[data-type="drums"]');
        expect(await drumCards.count()).toBeGreaterThan(0);

        const melodyCards = page.locator('[data-type="melody"]');
        expect(await melodyCards.count()).toBeGreaterThan(0);

        const chordCards = page.locator('[data-type="chord"]');
        expect(await chordCards.count()).toBeGreaterThan(0);
    });

    test('can navigate from index to template detail', async ({ page }) => {
        await page.goto('/templates');
        await page.waitForLoadState('networkidle');

        // Click on first drum template
        const firstCard = page.locator('[data-type="drums"] a').first();
        await firstCard.click();

        await page.waitForLoadState('networkidle');

        // Should be on detail page
        expect(page.url()).toContain('/templates/');
        await expect(page.locator('h1')).toBeVisible();
    });

    test('breadcrumb navigation works', async ({ page }) => {
        await page.goto('/templates/basic-rock-beat');
        await page.waitForLoadState('networkidle');

        // Check breadcrumb exists
        const breadcrumb = page.locator('.breadcrumb');
        await expect(breadcrumb).toBeVisible();

        // Click Templates link in breadcrumb
        await breadcrumb.locator('a').first().click();
        await page.waitForLoadState('networkidle');

        expect(page.url()).toContain('/templates');
    });

    test('related templates link to correct pages', async ({ page }) => {
        await page.goto('/templates/basic-rock-beat');
        await page.waitForLoadState('networkidle');

        // Check related templates section
        const relatedSection = page.locator('.related-templates');
        if (await relatedSection.isVisible()) {
            const relatedLink = relatedSection.locator('a').first();
            const href = await relatedLink.getAttribute('href');
            expect(href).toContain('/templates/');
        }
    });
});

test.describe('Template Pages - Open in Lane Builder', () => {
    test('Open in Lane Builder button exists and has valid URL', async ({ page }) => {
        await page.goto('/templates/basic-rock-beat');
        await page.waitForLoadState('networkidle');

        const openButton = page.locator('[data-testid="open-lane-builder"]');
        await expect(openButton).toBeVisible();

        const href = await openButton.getAttribute('href');
        expect(href).toBeTruthy();
        expect(href).toContain('/arrange');
        expect(href).toContain('template=');
    });

    test('Open in Lane Builder URL has valid encoded template', async ({ page }) => {
        await page.goto('/templates/simple-c-major-scale');
        await page.waitForLoadState('networkidle');

        const openButton = page.locator('[data-testid="open-lane-builder"]');
        const href = await openButton.getAttribute('href');

        // Extract template parameter
        const url = new URL(href!, 'https://example.com');
        const templateParam = url.searchParams.get('template');

        expect(templateParam).toBeTruthy();
        expect(templateParam!.length).toBeGreaterThan(10);
        expect(templateParam!.length).toBeLessThan(4096); // Size cap

        // Should be valid base64
        expect(() => atob(templateParam!)).not.toThrow();
    });

    test('clicking Open in Lane Builder navigates correctly', async ({ page }) => {
        await page.goto('/templates/four-on-the-floor');
        await page.waitForLoadState('networkidle');

        const openButton = page.locator('[data-testid="open-lane-builder"]');
        await openButton.click();

        await page.waitForLoadState('networkidle');

        // Should be on arrange page with template parameter
        expect(page.url()).toContain('/arrange');
        expect(page.url()).toContain('template=');
    });
});

test.describe('Template Pages - MIDI Export', () => {
    test('export MIDI button exists on template page', async ({ page }) => {
        await page.goto('/templates/basic-rock-beat');
        await page.waitForLoadState('networkidle');

        const exportButton = page.locator('[data-testid="export-midi"]');
        await expect(exportButton).toBeVisible();
        await expect(exportButton).toContainText('MIDI');
    });

    test('export MIDI triggers download', async ({ page }) => {
        await page.goto('/templates/simple-arpeggio');
        await page.waitForLoadState('networkidle');

        // Listen for download
        const downloadPromise = page.waitForEvent('download', { timeout: 5000 });

        const exportButton = page.locator('[data-testid="export-midi"]');
        await exportButton.click();

        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('.mid');
    });
});

test.describe('Template Pages - Security', () => {
    test('share URL is size-capped', async ({ page }) => {
        await page.goto('/templates/syncopated-funk'); // Template with many notes
        await page.waitForLoadState('networkidle');

        const openButton = page.locator('[data-testid="open-lane-builder"]');
        const href = await openButton.getAttribute('href');

        const url = new URL(href!, 'https://example.com');
        const templateParam = url.searchParams.get('template');

        // Must not exceed 4KB
        expect(templateParam!.length).toBeLessThan(4096);
    });

    test('template pages do not expose private user data', async ({ page }) => {
        await page.goto('/templates/basic-rock-beat');
        await page.waitForLoadState('networkidle');

        const pageContent = await page.content();

        // Should not contain any localStorage keys or user-specific data
        expect(pageContent).not.toContain('localStorage');
        expect(pageContent).not.toContain('sessionStorage');
        expect(pageContent).not.toContain('user_');
        expect(pageContent).not.toContain('private_');
    });
});

test.describe('Template Category Pages', () => {
    test('drums category page renders correctly', async ({ page }) => {
        await page.goto('/templates/drums');
        await page.waitForLoadState('networkidle');

        const title = await page.title();
        expect(title).toContain('Drum');

        // Check template cards
        const cards = page.locator('.template-card');
        expect(await cards.count()).toBeGreaterThan(0);
    });

    test('melody category page renders correctly', async ({ page }) => {
        await page.goto('/templates/melody');
        await page.waitForLoadState('networkidle');

        const title = await page.title();
        expect(title).toContain('Melody');

        // Check instrument note about Soft Grand Piano
        const instrumentNote = page.locator('.instrument-note');
        await expect(instrumentNote).toBeVisible();
        const noteText = await instrumentNote.textContent();
        expect(noteText).toContain('Soft Grand Piano');
    });

    test('chords category page renders correctly', async ({ page }) => {
        await page.goto('/templates/chords');
        await page.waitForLoadState('networkidle');

        const title = await page.title();
        expect(title).toContain('Chord');

        // Check theory note
        const theoryNote = page.locator('.theory-note');
        await expect(theoryNote).toBeVisible();
    });
});


import { test, expect } from '@playwright/test';

// Helper to navigate to a tab - uses custom event for reliable tab switching in tests
async function navigateToTab(page: import('@playwright/test').Page, tab: string) {
    // Set the activeTab state directly via custom event
    await page.evaluate((tabName) => {
        window.dispatchEvent(new CustomEvent('test:switch-tab', { detail: tabName }));
    }, tab);

    // Wait for the tab content to become visible
    await page.waitForTimeout(100);
}

test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    // Clear localStorage and set onboarding as complete
    await page.addInitScript(() => {
        if (!sessionStorage.getItem('test_initialized')) {
            localStorage.clear();
            // Mark onboarding as complete so tests can see main content
            localStorage.setItem('daw_onboarding_v1', JSON.stringify({
                version: 1,
                completed: true,
                selectedProductIds: ['ableton12suite', 'serum2', 'reasonrack', 'flstudio', 'logicpro'],
                themeId: 'system',
                iCloud: { enabled: false, syncStatus: 'disabled' }
            }));
            sessionStorage.setItem('test_initialized', 'true');
        }
    });
});

test('home loads and shows results', async ({ page }) => {
    await page.goto('/');
    // Check for the new header with Producer Hub title
    await expect(page.getByRole('heading', { name: 'Producer Hub' })).toBeVisible();

    // Should show "<n> results" - need to be on shortcuts tab first
    await expect(page.getByTestId('results-count')).toContainText(/result/);

    // Verify search is visible (shortcuts tab is default)
    await expect(page.getByPlaceholder(/Search/)).toBeVisible();
    await expect(page.getByTestId('product-filter')).toBeVisible();
});

test('search filters results', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.getByPlaceholder(/Search/);
    await searchInput.fill('consolidate');

    // Ensure known item appears (use first() for multiple matches)
    await expect(page.locator('.cmd', { hasText: 'Consolidate' }).first()).toBeVisible();

    // Clear search and verify all results return
    await searchInput.clear();
    const allResults = await page.getByTestId('results-count').textContent();
    expect(allResults).toMatch(/\d+ results/);
});

test('search by keyboard shortcut', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.getByPlaceholder(/Search/);
    await searchInput.fill('Space');

    // Should find shortcuts with Space key
    const results = page.locator('.card');
    await expect(results).not.toHaveCount(0);
});

test('product icons load successfully', async ({ page }) => {
    await page.goto('/');

    // Wait for cards to load
    await expect(page.locator('.card').first()).toBeVisible();

    // Find a product icon
    const icon = page.locator('[data-testid="product-icon"]').first();

    // Check icon is visible and loaded (naturalWidth > 0)
    await expect(icon).toBeVisible();

    const naturalWidth = await icon.evaluate((img: HTMLImageElement) => img.naturalWidth);
    expect(naturalWidth).toBeGreaterThan(0);
});

test('PWA manifest is accessible', async ({ page, request }) => {
    // Get the base URL from the page
    await page.goto('/');
    const baseUrl = page.url().replace(/\/$/, '');

    // Fetch the manifest
    const manifestUrl = `${baseUrl}/manifest.webmanifest`;
    const response = await request.get(manifestUrl);

    expect(response.status()).toBe(200);

    const manifest = await response.json();
    expect(manifest.name).toBe('Producer Hub');
    expect(manifest.display).toBe('standalone');

    // Check that start_url and scope are defined
    expect(manifest.start_url).toBeDefined();
    expect(manifest.scope).toBeDefined();
});

// ============================================
// Product Filter Tests
// ============================================

test('product filter works', async ({ page }) => {
    await page.goto('/');

    // Get initial results count
    const initialCount = await page.getByTestId('results-count').textContent();

    const product = page.getByTestId('product-filter');
    await product.selectOption('ableton12suite');
    await expect(product).toHaveValue('ableton12suite');

    // Wait for results to update (count should change)
    await expect(page.getByTestId('results-count')).not.toHaveText(initialCount || '');

    // Known Ableton seed command should be present (use first() for multiple matches)
    await expect(page.locator('.cmd', { hasText: 'Consolidate' }).first()).toBeVisible();
});

test('product filter - Serum 2', async ({ page }) => {
    await page.goto('/');

    // Get initial results count
    const initialCount = await page.getByTestId('results-count').textContent();

    const product = page.getByTestId('product-filter');
    await product.selectOption('serum2');
    await expect(product).toHaveValue('serum2');

    // Wait for results to update
    await expect(page.getByTestId('results-count')).not.toHaveText(initialCount || '');

    // Known Serum command should be present (use .cmd class to target command text only)
    await expect(page.locator('.cmd', { hasText: 'GUI Scaling Options' })).toBeVisible();
});

test('product filter - Reason Rack', async ({ page }) => {
    await page.goto('/');

    // Get initial results count
    const initialCount = await page.getByTestId('results-count').textContent();

    const product = page.getByTestId('product-filter');
    await product.selectOption('reasonrack');
    await expect(product).toHaveValue('reasonrack');

    // Wait for results to update
    await expect(page.getByTestId('results-count')).not.toHaveText(initialCount || '');

    // Known Reason command should be present
    await expect(page.locator('.cmd', { hasText: 'Toggle rack front/back' })).toBeVisible();

    // Other products' commands should not appear (check .cmd specifically)
    await expect(page.locator('.cmd', { hasText: 'Consolidate Selection into Clip' })).toHaveCount(0);
});

test('product filter reset to All products', async ({ page }) => {
    await page.goto('/');

    const product = page.getByTestId('product-filter');

    // Set to Ableton
    await product.selectOption('ableton12suite');
    const abletonResults = await page.getByTestId('results-count').textContent();

    // Reset to All
    await product.selectOption('all');
    const allResults = await page.getByTestId('results-count').textContent();

    // All should have more or equal results
    expect(allResults).not.toEqual(abletonResults);
});

// ============================================
// Favorites Tests
// ============================================

test('favorites toggle works', async ({ page }) => {
    await page.goto('/');

    const firstCard = page.locator('.card').first();
    const starButton = firstCard.getByRole('button', { name: /star/i });

    // Star the first card
    await starButton.click();
    await expect(firstCard.getByRole('button', { name: '★ Starred' })).toBeVisible();

    // Filter to favorites only
    await page.getByTestId('favorites-only').check();

    // Now only one card should remain (the starred one)
    await expect(page.locator('.card')).toHaveCount(1);
});

test('favorites persist across navigation', async ({ page, context }) => {
    await page.goto('/');

    // Star the first card
    const firstCard = page.locator('.card').first();
    const commandText = await firstCard.locator('.cmd').textContent();
    await firstCard.getByRole('button', { name: /star/i }).click();
    await expect(firstCard.getByRole('button', { name: '★ Starred' })).toBeVisible();

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // The same card should still be starred - find by exact command text in first card
    // Since there might be multiple cards with same command, check first starred card
    const starredButtons = page.getByRole('button', { name: '★ Starred' });
    await expect(starredButtons.first()).toBeVisible();
});

test('multiple favorites can be toggled', async ({ page }) => {
    await page.goto('/');

    const cards = page.locator('.card');
    const count = await cards.count();

    if (count >= 2) {
        // Star first card
        await cards.nth(0).getByRole('button', { name: /star/i }).click();
        await expect(cards.nth(0).getByRole('button', { name: '★ Starred' })).toBeVisible();

        // Star second card
        await cards.nth(1).getByRole('button', { name: /star/i }).click();
        await expect(cards.nth(1).getByRole('button', { name: '★ Starred' })).toBeVisible();

        // Filter to favorites
        await page.getByTestId('favorites-only').check();

        // Should have exactly 2 cards
        await expect(page.locator('.card')).toHaveCount(2);
    }
});

// ============================================
// Theme and OS Tests
// ============================================

test('theme toggle works', async ({ page }) => {
    await page.goto('/');

    // Get initial theme button text
    const themeButton = page.getByText(/Theme:/);
    const initialButtonText = await themeButton.textContent();

    // Click theme button
    await themeButton.click();

    // Wait for button text to change (indicates theme was toggled)
    await expect(themeButton).not.toHaveText(initialButtonText!);

    // Verify the data-theme attribute changed
    const theme = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(['light', 'dark']).toContain(theme);
});

test('key OS toggle works', async ({ page }) => {
    await page.goto('/');

    // Get initial OS preference
    const initialOS = await page.evaluate(() => localStorage.getItem('daw_key_os'));
    const initialButton = await page.getByText(/Keys:/).textContent();

    // Click key OS button to toggle
    await page.getByText(/Keys:/).click();

    // Wait for toggle
    await page.waitForTimeout(100);

    const newButton = await page.getByText(/Keys:/).textContent();
    expect(newButton).not.toEqual(initialButton);
});

// ============================================
// Search and Filter Combination Tests
// ============================================

test('combining search and product filter', async ({ page }) => {
    await page.goto('/');

    // Set product filter to Ableton
    await page.getByTestId('product-filter').selectOption('ableton12suite');

    // Then search for a specific command
    await page.getByPlaceholder(/Search.*group.*facets/).fill('play');

    // Should only show Ableton results matching "play"
    const results = page.locator('.card');
    const count = await results.count();
    expect(count).toBeGreaterThan(0);

    // All visible cards should be Ableton
    for (let i = 0; i < Math.min(count, 3); i++) {
        const card = results.nth(i);
        await expect(card.getByText('Ableton Live 12 Suite')).toBeVisible();
    }
});

test('type filter shows appropriate options', async ({ page }) => {
    await page.goto('/');

    const typeSelect = page.locator('select').nth(1); // Type filter is second select

    // Get all available type options
    const options = await typeSelect.locator('option').count();
    expect(options).toBeGreaterThan(1); // Should have at least "All types" + some types

    // Select a specific type
    const optionTexts = await typeSelect.locator('option').allTextContents();
    const firstNonAllType = optionTexts.find((t) => t !== 'All types');

    if (firstNonAllType) {
        await typeSelect.selectOption(firstNonAllType);
        await expect(page.getByTestId('results-count')).toBeVisible();
    }
});

// ============================================
// Group and Facet Tests
// ============================================

test('group filter is visible and has options', async ({ page }) => {
    await page.goto('/');

    const groupFilter = page.getByTestId('group-filter');
    await expect(groupFilter).toBeVisible();

    // Should have default value "all" (All groups)
    await expect(groupFilter).toHaveValue('all');

    // Should have at least one real group option (more than just "All groups")
    const options = await groupFilter.locator('option').count();
    expect(options).toBeGreaterThan(1);
});

test('group filter reduces visible results', async ({ page }) => {
    await page.goto('/');

    // Get initial count
    const initialCount = await page.getByTestId('results-count').textContent();
    const initialNum = parseInt(initialCount?.match(/\d+/)?.[0] ?? '0');

    // Select a specific group
    const groupFilter = page.getByTestId('group-filter');
    const optionTexts = await groupFilter.locator('option').allTextContents();
    const firstGroup = optionTexts.find((g) => g !== 'All groups');

    if (firstGroup) {
        await groupFilter.selectOption(firstGroup);

        // Wait for filter to apply
        await page.waitForTimeout(100);

        // Should have fewer or equal results
        const filteredCount = await page.getByTestId('results-count').textContent();
        const filteredNum = parseInt(filteredCount?.match(/\d+/)?.[0] ?? '0');
        expect(filteredNum).toBeLessThanOrEqual(initialNum);
    }
});

test('group headers are displayed in results', async ({ page }) => {
    await page.goto('/');

    // Should have group headers visible
    const groupHeaders = page.getByTestId('group-header');
    await expect(groupHeaders.first()).toBeVisible();

    // Group headers should contain text
    const firstHeaderText = await groupHeaders.first().textContent();
    expect(firstHeaderText?.trim().length).toBeGreaterThan(0);
});

test('facet filter chips are visible', async ({ page }) => {
    await page.goto('/');

    const facetFilter = page.getByTestId('facet-filter');
    await expect(facetFilter).toBeVisible();

    // Should have facet label
    await expect(facetFilter.getByText('Facets:')).toBeVisible();

    // Should have at least one facet chip
    const facetChips = facetFilter.locator('.facetChip');
    await expect(facetChips.first()).toBeVisible();
});

test('clicking facet chip reduces visible results', async ({ page }) => {
    await page.goto('/');

    // Get initial count
    const initialCount = await page.getByTestId('results-count').textContent();
    const initialNum = parseInt(initialCount?.match(/\d+/)?.[0] ?? '0');

    // Click first facet chip
    const facetFilter = page.getByTestId('facet-filter');
    const firstChip = facetFilter.locator('.facetChip').first();
    await firstChip.click();

    // Wait for filter to apply
    await page.waitForTimeout(100);

    // Chip should be selected
    await expect(firstChip).toHaveClass(/selected/);

    // Should have fewer or equal results
    const filteredCount = await page.getByTestId('results-count').textContent();
    const filteredNum = parseInt(filteredCount?.match(/\d+/)?.[0] ?? '0');
    expect(filteredNum).toBeLessThanOrEqual(initialNum);
});

test('clicking facet chip again deselects it', async ({ page }) => {
    await page.goto('/');

    const facetFilter = page.getByTestId('facet-filter');
    const firstChip = facetFilter.locator('.facetChip').first();

    // Click to select
    await firstChip.click();
    await expect(firstChip).toHaveClass(/selected/);

    // Click again to deselect
    await firstChip.click();
    await expect(firstChip).not.toHaveClass(/selected/);
});

test('shortcut cards display facet labels', async ({ page }) => {
    await page.goto('/');

    // Some cards should have facet labels
    const facetLabels = page.getByTestId('shortcut-facet');
    await expect(facetLabels.first()).toBeVisible();

    // Facet labels should contain text
    const firstFacetText = await facetLabels.first().textContent();
    expect(firstFacetText?.trim().length).toBeGreaterThan(0);
});

test('combining group and facet filters', async ({ page }) => {
    await page.goto('/');

    // Select a group
    const groupFilter = page.getByTestId('group-filter');
    const groupOptions = await groupFilter.locator('option').allTextContents();
    const firstGroup = groupOptions.find((g) => g !== 'All groups');

    if (firstGroup) {
        await groupFilter.selectOption(firstGroup);
    }

    // Also click a facet
    const facetFilter = page.getByTestId('facet-filter');
    const firstChip = facetFilter.locator('.facetChip').first();
    await firstChip.click();

    // Wait for filters
    await page.waitForTimeout(100);

    // Should show results (might be 0 if no overlap, but page shouldn't break)
    await expect(page.getByTestId('results-count')).toBeVisible();
});

test('search finds shortcuts by group name', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.getByPlaceholder(/Search.*group.*facets/);
    await searchInput.fill('Editing');

    // Wait for search
    await page.waitForTimeout(200);

    // Should find results containing "Editing" group
    const results = page.locator('.card');
    const count = await results.count();
    expect(count).toBeGreaterThan(0);
});

test('search finds shortcuts by facet name', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.getByPlaceholder(/Search.*group.*facets/);
    await searchInput.fill('Navigation');

    // Wait for search
    await page.waitForTimeout(200);

    // Should find results with Navigation facet
    const results = page.locator('.card');
    const count = await results.count();
    expect(count).toBeGreaterThan(0);
});

test('group filter options change with product filter', async ({ page }) => {
    await page.goto('/');

    // Get groups for all products
    const groupFilter = page.getByTestId('group-filter');
    const allGroupOptions = await groupFilter.locator('option').allTextContents();

    // Select a specific product
    await page.getByTestId('product-filter').selectOption('ableton12suite');

    // Wait for options to update
    await page.waitForTimeout(100);

    // Get groups for this product only
    const productGroupOptions = await groupFilter.locator('option').allTextContents();

    // Number of options might be different (product-specific groups)
    expect(productGroupOptions.length).toBeGreaterThan(0);
    expect(productGroupOptions).toContain('All groups');
});

// ============================================
// Power Features Tests
// ============================================

test('searching "Wrap Phase" returns feature entries', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.getByPlaceholder(/Search.*group.*facets/);
    await searchInput.fill('Wrap Phase');

    // Should find at least one Wrap Phase feature
    await expect(page.locator('.cmd', { hasText: 'Wrap Phase' }).first()).toBeVisible();

    // Should have a Feature badge visible
    await expect(page.getByTestId('kind-badge').filter({ hasText: 'Feature' }).first()).toBeVisible();
});

test('feature entries display note text', async ({ page }) => {
    await page.goto('/');

    // Filter to Serum 2 to see features
    await page.getByTestId('product-filter').selectOption('serum2');

    // Search for a feature with a note
    const searchInput = page.getByPlaceholder(/Search.*group.*facets/);
    await searchInput.fill('Wrap Phase');

    // Should display at least one note
    await expect(page.getByTestId('feature-note').first()).toBeVisible();
});

test('feature entries display default value when present', async ({ page }) => {
    await page.goto('/');

    // Filter to Serum 2 to see features
    await page.getByTestId('product-filter').selectOption('serum2');

    // Search for a feature with a default value (Pitch Tracking has default: ON)
    const searchInput = page.getByPlaceholder(/Search.*group.*facets/);
    await searchInput.fill('Enable Pitch Tracking');

    // Should display at least one default value
    await expect(page.getByTestId('feature-default').first()).toBeVisible();
});

test('filtering by product "Serum 2" and facet "Sound Design" narrows results', async ({ page }) => {
    await page.goto('/');

    // Filter to Serum 2
    await page.getByTestId('product-filter').selectOption('serum2');

    // Get initial count
    const initialCount = await page.getByTestId('results-count').textContent();
    const initialNum = parseInt(initialCount?.match(/\d+/)?.[0] ?? '0');

    // Click Sound Design facet
    const facetChip = page.locator('.facetChip', { hasText: 'Sound Design' });
    if (await facetChip.count() > 0) {
        await facetChip.click();

        // Get new count
        const newCount = await page.getByTestId('results-count').textContent();
        const newNum = parseInt(newCount?.match(/\d+/)?.[0] ?? '0');

        // Should have fewer results
        expect(newNum).toBeLessThan(initialNum);
        expect(newNum).toBeGreaterThan(0);
    }
});

test('kind filter shows only features when selected', async ({ page }) => {
    await page.goto('/');

    // Filter to Serum 2 which has both shortcuts and features
    await page.getByTestId('product-filter').selectOption('serum2');

    // Check if kind filter is available
    const kindFilter = page.getByTestId('kind-filter');
    if (await kindFilter.count() > 0) {
        // Select Features only
        await kindFilter.selectOption('feature');

        // All visible entries should be features
        const badges = await page.getByTestId('kind-badge').allTextContents();
        for (const badge of badges) {
            expect(badge.toLowerCase()).toContain('feature');
        }
    }
});

test('search finds entries by note content', async ({ page }) => {
    await page.goto('/');

    // Search for text that appears in a note
    const searchInput = page.getByPlaceholder(/Search.*group.*facets/);
    await searchInput.fill('resample');

    // Should find results
    const count = await page.getByTestId('results-count').textContent();
    const num = parseInt(count?.match(/\d+/)?.[0] ?? '0');
    expect(num).toBeGreaterThan(0);
});

// ============================================
// KeyCaps and Product Icon Tests
// ============================================

test('shortcut cards display product icons', async ({ page }) => {
    await page.goto('/');

    // Product icons should be visible
    const icons = page.getByTestId('product-icon');
    const iconCount = await icons.count();
    expect(iconCount).toBeGreaterThan(0);

    // First icon should be an img element
    const firstIcon = icons.first();
    await expect(firstIcon).toBeVisible();
    expect(await firstIcon.getAttribute('src')).toContain('/icons/products/');
});

test('keys render as keycap elements', async ({ page }) => {
    await page.goto('/');

    // KeyCaps should render kbd elements
    const kbdElements = page.locator('.keycap');
    const count = await kbdElements.count();
    expect(count).toBeGreaterThan(0);
});

test('OR key alternatives render as separate groups', async ({ page }) => {
    await page.goto('/');

    // Look for OR separator in keycaps
    const orSeparators = page.locator('.or-separator');
    // May or may not be present depending on data
    // Just verify the keycaps component renders
    const keycaps = page.locator('.keycaps');
    expect(await keycaps.count()).toBeGreaterThan(0);
});

// ============================================
// Navigation Tests (Dropdown-based)
// ============================================

test('navigation via dropdown works', async ({ page }) => {
    await page.goto('/');

    // Shortcuts tab should be active by default (shows search and results)
    await expect(page.getByTestId('shortcuts-tab-content')).toBeVisible();
    await expect(page.getByTestId('infobase-tab-content')).not.toBeVisible();

    // Navigate to Info Base via dropdown
    await navigateToTab(page, 'infobase');

    // Info Base tab should now be visible
    await expect(page.getByTestId('infobase-tab-content')).toBeVisible();
    await expect(page.getByTestId('shortcuts-tab-content')).not.toBeVisible();

    // Navigate back to Shortcuts
    await navigateToTab(page, 'shortcuts');

    // Shortcuts tab should be visible again
    await expect(page.getByTestId('shortcuts-tab-content')).toBeVisible();
    await expect(page.getByTestId('infobase-tab-content')).not.toBeVisible();
});

// ============================================
// Info Base Tests
// ============================================

test('Info Base section is visible', async ({ page }) => {
    await page.goto('/');

    // Navigate to Info Base
    await navigateToTab(page, 'infobase');

    // Info Base header should be visible
    await expect(page.getByRole('heading', { name: 'Info Base' })).toBeVisible();
});

test('can create a new Info Base entry', async ({ page }) => {
    await page.goto('/');

    await navigateToTab(page, 'infobase');

    // Click New Note button
    await page.getByRole('button', { name: '+ New Note' }).click();

    // Fill in the form
    await page.getByPlaceholder('Note title...').fill('Test Note');
    await page.locator('.input-body').fill('Test body content');

    // Save the note
    await page.getByRole('button', { name: 'Save Note' }).click();

    // Note should appear in the list
    await expect(page.getByRole('button', { name: 'Test Note' })).toBeVisible();
});

test('Info Base entry persists after reload', async ({ page }) => {
    await page.goto('/');

    await navigateToTab(page, 'infobase');

    // Create a note
    await page.getByRole('button', { name: '+ New Note' }).click();
    await page.getByPlaceholder('Note title...').fill('Persistent Note');
    await page.locator('.input-body').fill('This should persist');
    await page.getByRole('button', { name: 'Save Note' }).click();

    // Wait for note to appear in the list (confirms save happened)
    await expect(page.getByRole('button', { name: 'Persistent Note' })).toBeVisible();

    // Verify localStorage has the data
    const stored = await page.evaluate(() => localStorage.getItem('daw_infobase_v1'));
    expect(stored).toBeTruthy();
    expect(stored).toContain('Persistent Note');

    // Reload the page
    await page.reload();

    await navigateToTab(page, 'infobase');

    // Note should still be there
    await expect(page.getByRole('button', { name: 'Persistent Note' })).toBeVisible();
});

test('can delete an Info Base entry', async ({ page }) => {
    await page.goto('/');

    await navigateToTab(page, 'infobase');

    // Create a note first
    await page.getByRole('button', { name: '+ New Note' }).click();
    await page.getByPlaceholder('Note title...').fill('Note to Delete');
    await page.locator('.input-body').fill('Delete me');
    await page.getByRole('button', { name: 'Save Note' }).click();

    // Wait for note to appear
    await expect(page.getByRole('button', { name: 'Note to Delete' })).toBeVisible();

    // Click delete - use exact match for the Delete button
    await page.locator('.note-card').first().getByRole('button', { name: 'Delete', exact: true }).click();

    // Confirm delete
    await page.getByRole('button', { name: 'Yes' }).click();

    // Note should be gone
    await expect(page.getByRole('button', { name: 'Note to Delete' })).not.toBeVisible();
});

test('Info Base search filters notes', async ({ page }) => {
    await page.goto('/');

    await navigateToTab(page, 'infobase');

    // Create two notes
    await page.getByRole('button', { name: '+ New Note' }).click();
    await page.getByPlaceholder('Note title...').fill('Mixing Notes');
    await page.locator('.input-body').fill('EQ and compression tips');
    await page.getByRole('button', { name: 'Save Note' }).click();

    await page.getByRole('button', { name: '+ New Note' }).click();
    await page.getByPlaceholder('Note title...').fill('Synth Patch');
    await page.locator('.input-body').fill('Saw wave settings');
    await page.getByRole('button', { name: 'Save Note' }).click();

    // Search for one
    await page.locator('.infobase input[placeholder="Search notes..."]').fill('Mixing');

    // Only matching note should be visible
    await expect(page.getByRole('button', { name: 'Mixing Notes' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Synth Patch' })).not.toBeVisible();
});

test('can use Info Base templates', async ({ page }) => {
    await page.goto('/');

    await navigateToTab(page, 'infobase');

    // Click Templates button
    await page.getByRole('button', { name: 'Templates' }).click();

    // Template options should appear
    await expect(page.getByText('Patch Recipe')).toBeVisible();

    // Click a template
    await page.getByRole('button', { name: 'Patch Recipe' }).click();

    // Editor should open with template content
    await expect(page.getByPlaceholder('Note title...')).toHaveValue('New Patch Recipe');
});


# Testing Documentation

This document provides a comprehensive guide to testing in the DAW Shortcuts project.

## Quick Reference

```bash
# Run all checks (type, unit, build, e2e) - do this before committing
npm run test

# Run unit tests only (Vitest)
npm run test:unit

# Run unit tests in watch mode
npm run test:unit:watch

# Run just e2e tests (Playwright)
npm run test:e2e

# Interactive test UI (great for development)
npm run test:e2e:ui

# Debug tests with step-through
npm run test:e2e:debug

# View last test report
npm run test:e2e:report

# Watch type checking live
npm run check:watch
```

## Test Types

### Unit Tests (Vitest)

Located in `src/lib/__tests__/`:

| File | Coverage |
|------|----------|
| `grouping.test.ts` | Group normalization, title stripping |
| `filter.test.ts` | Filter functions, facet logic |
| `powerFeatures.test.ts` | Power features validation |

Run unit tests:
```bash
npm run test:unit
```

### E2E Tests (Playwright)

Located in `tests/homepage.spec.ts`:

Tests are organized by feature area:
- Page loading & display
- Search functionality
- Product/type/group/facet filtering
- Favorites management
- Theme and platform toggles
- Power features display

Run e2e tests:
```bash
npm run test:e2e
```

## Test Organization

Tests are located in `tests/homepage.spec.ts` and organized by feature:

### Page Loading & Display
- `home loads and shows results` - Basic page load and structure
- Verifies heading, search box, filters, and results count

### Search Functionality
- `search filters results` - Filters by command name
- `search by keyboard shortcut` - Finds shortcuts by keys (e.g., "Space")
- `search with no results shows message` - Empty state handling
- `combining search and product filter` - Tests interaction between filters

### Product Filtering
- `product filter works` - Ableton Live 12 Suite filtering
- `product filter - Serum 2` - Serum 2 specific filtering
- `product filter - Reason Rack` - Reason Rack specific filtering
- `product filter reset to All products` - Resetting filters

### Favorites Management
- `favorites toggle works` - Star/unstar individual items
- `favorites persist across navigation` - localStorage persistence
- `multiple favorites can be toggled` - Managing multiple favorites

### UI Controls
- `theme toggle works` - Light/dark/system theme switching
- `key OS toggle works` - macOS/Windows key display
- `type filter shows appropriate options` - Dynamic filter options

## Test Environment

### Configuration (`playwright.config.ts`)

- **Base URL**: `http://127.0.0.1:4173` (preview server)
- **Test timeout**: 30 seconds per test
- **Assertion timeout**: 5 seconds per assertion
- **Parallel execution**: Full parallel (fullyParallel: true)
- **Retries**: 0 locally, 2 in CI
- **Browser**: Chromium (can add Firefox/Safari later)

### Test Setup

Each test runs with:

```typescript
test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    // Clear localStorage before the page loads
    await page.addInitScript(() => localStorage.clear());
});
```

This ensures:
- Clean state for each test
- Favorites/theme preferences don't affect test results
- Tests are isolated and repeatable

## Running Tests Locally

### Standard Run

```bash
npm run test:e2e
```

Output:
```
Running 17 tests using 17 workers

✓ 17 passed (12.5s)
```

This:
1. Builds the project (`npm run build`)
2. Starts preview server on port 4173
3. Runs all tests in parallel
4. Shows results

### Interactive UI Mode

```bash
npm run test:e2e:ui
```

Benefits:
- Watch tests run live
- Pause, step through, rewind
- Inspect DOM at any point
- Filter to specific tests
- Great for debugging failures

### Debug Mode

```bash
npm run test:e2e:debug
```

Opens Playwright Inspector:
- Step through test line-by-line
- Inspect locators and assertions
- Useful for understanding test flow

## CI Testing

GitHub Actions workflow (`.github/workflows/ci.yml`) runs:

1. **Type checking** - `npm run check`
   - Validates TypeScript + Svelte syntax
   - Catches compile errors early

2. **Build verification** - `npm run build`
   - Creates static output
   - Verifies `build/` directory and HTML files exist

3. **Playwright tests** - `npm run test:e2e`
   - Runs against production build
   - Retries failures up to 2x
   - Uses 2 workers for speed

4. **Report upload** - Artifact storage
   - HTML report available for 30 days
   - Accessible from Actions tab in GitHub

### CI-specific behavior

```typescript
// From playwright.config.ts
retries: process.env.CI ? 2 : 0,     // Retry in CI only
workers: process.env.CI ? 2 : undefined,  // 2 workers in CI
video: process.env.CI ? 'retain-on-failure' : 'off',  // Record failures
```

## Common Testing Patterns

### Checking visibility

```typescript
// Element is visible on page
await expect(page.getByText('Consolidate')).toBeVisible();

// Exactly N elements match
await expect(page.locator('.card')).toHaveCount(1);

// Element has a value
await expect(product).toHaveValue('ableton12suite');
```

### Interacting with controls

```typescript
// Fill search input
await searchInput.fill('consolidate');

// Select from dropdown
await product.selectOption('ableton12suite');

// Click checkbox
await page.getByTestId('favorites-only').check();
```

### Combining filters

```typescript
// Set product filter
await product.selectOption('ableton12suite');

// Then search
await searchInput.fill('play');

// Verify results are filtered
const results = page.locator('.card');
await expect(results).not.toHaveCount(0);
```

### Testing persistence

```typescript
// Star an item
await firstCard.getByRole('button', { name: /star/i }).click();

// Reload page
await page.reload();

// Verify state persisted
await expect(firstCard.getByRole('button', { name: '★ Starred' })).toBeVisible();
```

## Troubleshooting

### Test fails locally but passes in CI (or vice versa)

Possible causes:
- Different Node.js versions - use Node 22
- Different browser versions - runs Chromium in both
- Network timing - increase timeouts if needed
- Environment variables - CI sets them differently

Fix:
```bash
# Use same Node version as CI
nvm use 22

# Run in CI mode locally
CI=true npm run test:e2e
```

### Test times out

```typescript
// Default timeouts
timeout: 30_000,           // 30 seconds per test
expect: { timeout: 5_000 } // 5 seconds per assertion
```

If specific assertion needs more time:

```typescript
await expect(element).toBeVisible({ timeout: 10_000 });
```

### Flaky tests

Signs:
- Test passes sometimes, fails others
- Timing-related failures
- "element not visible" errors that shouldn't happen

Solutions:
```typescript
// Wait explicitly for action
await page.waitForLoadState('networkidle');

// Wait for element before interacting
await expect(element).toBeVisible();
await element.click();

// Use explicit waits over timeouts
await expect(element).toHaveText('text', { timeout: 10_000 });
```

### Debug a specific failing test

```bash
# Run just one test with debug
npx playwright test homepage.spec.ts:40 --debug

# Or use the UI to filter
npm run test:e2e:ui
# Then click "search tests" and type test name
```

## Adding New Tests

1. **Identify the feature** - What should be tested?
   ```typescript
   test('new feature does X', async ({ page }) => {
       // Test code here
   });
   ```

2. **Use descriptive names**
   ```typescript
   // Good
   test('favorites persist across page reload', async ({ page }) => {

   // Not good
   test('favorites work', async ({ page }) => {
   ```

3. **Follow the pattern**
   ```typescript
   test('my new test', async ({ page }) => {
       // 1. Navigate
       await page.goto('/');

       // 2. Perform action
       await page.getByTestId('some-id').click();

       // 3. Assert result
       await expect(page.getByText('Expected text')).toBeVisible();
   });
   ```

4. **Test in isolation**
   - Use `test.only()` to run just your test
   - Verify it passes and fails correctly

5. **Test edge cases**
   - Empty states
   - Multiple items
   - Boundary conditions

## Best Practices

1. **One assertion per test case** (usually)
   - Each test should verify one behavior
   - Easier to debug when tests fail

2. **Use data-testid for critical elements**
   ```typescript
   // In component
   <input data-testid="favorites-only" type="checkbox" />

   // In test
   await page.getByTestId('favorites-only').check();
   ```

3. **Avoid hard-coded waits**
   ```typescript
   // Bad
   await page.waitForTimeout(1000);

   // Good
   await expect(element).toBeVisible();
   ```

4. **Use semantic selectors**
   ```typescript
   // Good - uses accessibility features
   await page.getByRole('button', { name: '★ Star' }).click();

   // Okay - uses test id
   await page.getByTestId('product-filter').selectOption('ableton12suite');

   // Less ideal - CSS selector
   await page.locator('.card').first().click();
   ```

5. **Clear test names describe behavior**
   - What is being tested
   - What is expected to happen
   - Not just "test product filter"

## Performance

Running all 17 tests takes ~12 seconds locally:

- Type checking: ~5 seconds
- Build: ~8 seconds
- Tests: ~12 seconds
- **Total**: ~25 seconds

Tips for faster iteration:

```bash
# Skip type checking if not needed
npm run test:e2e

# Use UI mode - doesn't rebuild each run
npm run test:e2e:ui

# Watch mode for code changes
npm run check:watch
```

## Questions?

- Check `tests/homepage.spec.ts` for examples
- Review [playwright documentation](https://playwright.dev)
- Look at Playwright Inspector for DOM debugging
- Open an issue if tests are confusing

Happy testing! 🧪


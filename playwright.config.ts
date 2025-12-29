import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 *
 * Key points:
 * - Tests run against a built static preview server (vite preview)
 * - Ensures tests validate the actual production build output
 * - Configured for both local dev (interactive) and CI (automated) environments
 */
export default defineConfig({
    // Test files location
    testDir: './tests',

    // Timeouts
    timeout: 30_000,  // 30 seconds per test
    expect: { timeout: 5_000 },  // 5 seconds for assertions

    // Parallel execution
    fullyParallel: true,
    retries: process.env.CI ? 2 : 0,  // Retry failed tests twice in CI only
    workers: process.env.CI ? 2 : undefined,  // Use 2 workers in CI, auto in local

    // Reporting
    reporter: process.env.CI
        ? [
            ['github'],  // Post results to GitHub Actions
            ['html', { open: 'never' }]  // HTML report (don't auto-open in CI)
          ]
        : [
            ['list'],  // Simple list output locally
            ['html']   // HTML report (auto-opens in browser)
          ],

    // Browser configuration
    use: {
        baseURL: 'http://127.0.0.1:4173',
        trace: 'on-first-retry',  // Collect trace only if test fails
        video: process.env.CI ? 'retain-on-failure' : 'off',  // Record only CI failures
        screenshot: 'only-on-failure'  // Screenshot on failure
    },

    // Web server configuration
    // Builds and serves the static output before tests run
    webServer: {
        command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: !process.env.CI,  // Reuse in local dev, fresh in CI
        timeout: 120_000  // 2 minutes to build and start
    },

    // Currently only testing against Chromium
    // Can add Firefox/Safari later if needed
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] }
        }
    ]
});

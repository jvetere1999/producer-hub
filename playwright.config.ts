import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    timeout: 30_000,
    expect: { timeout: 5_000 },

    fullyParallel: true,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 2 : undefined,

    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html']],

    use: {
        baseURL: 'http://127.0.0.1:4173',
        trace: 'on-first-retry',
        video: process.env.CI ? 'retain-on-failure' : 'off',
        screenshot: 'only-on-failure'
    },

    // Build + serve the static output via `vite preview`
    webServer: {
        command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] }
        }
    ]
});

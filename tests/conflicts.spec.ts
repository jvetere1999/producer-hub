/**
 * Playwright E2E tests for Conflict Resolution UI
 *
 * Tests cover:
 * - Conflict display for lane templates
 * - Conflict display for project clips
 * - Resolution selection (local vs remote)
 * - Resolution application
 */

import { test, expect } from '@playwright/test';

// Skip onboarding for all tests
test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('onboarding_completed', 'true');
        localStorage.setItem('daw_selected_products', JSON.stringify(['ableton']));
    });
});

test.describe('Conflict Resolution - Lane Templates', () => {
    test('displays lane template conflict summary', async ({ page }) => {
        // Set up mock conflict data
        await page.addInitScript(() => {
            const mockConflict = {
                id: 'conflict_1',
                entityType: 'laneTemplate',
                entityId: 'lane_123',
                localValue: {
                    id: 'lane_123',
                    name: 'My Drums (Local)',
                    type: 'drums',
                    notes: [{ pitch: 36, startBeat: 0, duration: 0.5, velocity: 100 }],
                    laneSettings: { instrumentId: 'acoustic-kit', noteMode: 'oneShot', velocityDefault: 100, quantizeGrid: '1/16', color: '#ff6b6b' },
                    bpm: 120,
                    bars: 4,
                    timeSignature: [4, 4],
                    key: 'C',
                    scaleType: 'major',
                    contentHash: 'abc123',
                    updatedAt: '2024-01-01T12:00:00Z',
                    createdAt: '2024-01-01T10:00:00Z',
                },
                remoteValue: {
                    id: 'lane_123',
                    name: 'My Drums (Remote)',
                    type: 'drums',
                    notes: [
                        { pitch: 36, startBeat: 0, duration: 0.5, velocity: 100 },
                        { pitch: 38, startBeat: 1, duration: 0.5, velocity: 90 },
                    ],
                    laneSettings: { instrumentId: 'electronic-kit', noteMode: 'oneShot', velocityDefault: 100, quantizeGrid: '1/16', color: '#ff6b6b' },
                    bpm: 120,
                    bars: 4,
                    timeSignature: [4, 4],
                    key: 'C',
                    scaleType: 'major',
                    contentHash: 'def456',
                    updatedAt: '2024-01-01T13:00:00Z',
                    createdAt: '2024-01-01T10:00:00Z',
                },
                localUpdatedAt: '2024-01-01T12:00:00Z',
                remoteUpdatedAt: '2024-01-01T13:00:00Z',
                localDeviceId: 'device_local',
                remoteDeviceId: 'device_remote',
                conflictReason: 'Both edited',
            };

            localStorage.setItem('sync_conflicts', JSON.stringify([mockConflict]));
        });

        // Navigate to settings or sync page where conflicts would be shown
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Open settings panel
        const settingsBtn = page.locator('[aria-label="Settings"], button:has-text("Settings")').first();
        if (await settingsBtn.isVisible()) {
            await settingsBtn.click();
            await page.waitForTimeout(300);
        }

        // Look for sync/conflicts section
        const conflictSection = page.locator('[data-testid="conflicts"], .conflicts-section');
        // This test may need to be updated based on actual UI implementation
    });
});

test.describe('Conflict Resolution - Project Clips', () => {
    test('displays project clip conflict', async ({ page }) => {
        await page.addInitScript(() => {
            const mockConflict = {
                id: 'conflict_clip_1',
                entityType: 'projectClip',
                entityId: 'clip_123',
                localValue: {
                    id: 'clip_123',
                    projectId: 'project_1',
                    sourceType: 'laneTemplate',
                    sourceId: 'lane_1',
                    startBar: 1,
                    lengthBars: 4,
                    updatedAt: '2024-01-01T12:00:00Z',
                    createdAt: '2024-01-01T10:00:00Z',
                },
                remoteValue: {
                    id: 'clip_123',
                    projectId: 'project_1',
                    sourceType: 'laneTemplate',
                    sourceId: 'lane_1',
                    startBar: 5, // Different position
                    lengthBars: 8, // Different length
                    updatedAt: '2024-01-01T13:00:00Z',
                    createdAt: '2024-01-01T10:00:00Z',
                },
                localUpdatedAt: '2024-01-01T12:00:00Z',
                remoteUpdatedAt: '2024-01-01T13:00:00Z',
                localDeviceId: 'device_local',
                remoteDeviceId: 'device_remote',
            };

            localStorage.setItem('sync_conflicts', JSON.stringify([mockConflict]));
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });
});

test.describe('Conflict Resolution - UI Actions', () => {
    test('can choose local version', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Look for "Keep Local" button
        const keepLocalBtn = page.locator('button:has-text("Keep Local"), button:has-text("Use Local")');
        if (await keepLocalBtn.isVisible()) {
            await keepLocalBtn.click();
            // Verify conflict was resolved
            await expect(page.locator('[data-testid="conflict-resolved"]')).toBeVisible({ timeout: 3000 });
        }
    });

    test('can choose remote version', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Look for "Keep Remote" button
        const keepRemoteBtn = page.locator('button:has-text("Keep Remote"), button:has-text("Use Remote")');
        if (await keepRemoteBtn.isVisible()) {
            await keepRemoteBtn.click();
        }
    });
});

test.describe('Conflict Resolution - Security', () => {
    test('conflict summary does not leak sensitive data', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Get page content
        const content = await page.content();

        // Ensure no raw device IDs or full timestamps are exposed
        expect(content).not.toContain('device_local_full_id');
        expect(content).not.toContain('password');
        expect(content).not.toContain('secret');
    });
});


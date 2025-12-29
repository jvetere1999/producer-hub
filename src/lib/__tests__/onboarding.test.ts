import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    getDefaultSettings,
    loadOnboardingSettings,
    saveOnboardingSettings,
    isOnboardingCompleted,
    completeOnboarding,
    skipOnboarding,
    updateSelectedProducts,
    updateTheme,
    updateICloudSettings,
    connectICloud,
    disconnectICloud,
    type OnboardingSettings
} from '../onboarding';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: vi.fn((key: string) => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; })
    };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('Onboarding Settings', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    describe('getDefaultSettings', () => {
        it('returns default settings with all products enabled', () => {
            const defaults = getDefaultSettings();

            expect(defaults.version).toBe(1);
            expect(defaults.completed).toBe(false);
            expect(defaults.selectedProductIds.length).toBeGreaterThan(0);
            expect(defaults.themeId).toBe('system');
            expect(defaults.iCloud.enabled).toBe(false);
            expect(defaults.iCloud.syncStatus).toBe('disabled');
        });
    });

    describe('loadOnboardingSettings', () => {
        it('returns defaults when no stored settings', () => {
            const settings = loadOnboardingSettings();
            expect(settings.completed).toBe(false);
            expect(settings.themeId).toBe('system');
        });

        it('loads stored settings', () => {
            const stored: OnboardingSettings = {
                version: 1,
                completed: true,
                selectedProductIds: ['product1'],
                themeId: 'dark-theme',
                iCloud: {
                    enabled: true,
                    syncStatus: 'ready',
                    lastConnectedAt: '2024-01-01',
                    lastError: null
                }
            };

            localStorageMock.setItem('daw_onboarding_v1', JSON.stringify(stored));

            const loaded = loadOnboardingSettings();
            expect(loaded.completed).toBe(true);
            expect(loaded.selectedProductIds).toEqual(['product1']);
            expect(loaded.themeId).toBe('dark-theme');
            expect(loaded.iCloud.enabled).toBe(true);
        });

        it('handles invalid JSON gracefully', () => {
            localStorageMock.setItem('daw_onboarding_v1', 'invalid json');

            const settings = loadOnboardingSettings();
            expect(settings.completed).toBe(false); // Should return defaults
        });

        it('handles version mismatch', () => {
            const stored = { version: 999, completed: true };
            localStorageMock.setItem('daw_onboarding_v1', JSON.stringify(stored));

            const settings = loadOnboardingSettings();
            expect(settings.completed).toBe(false); // Should return defaults
        });
    });

    describe('saveOnboardingSettings', () => {
        it('saves settings to localStorage', () => {
            const settings = getDefaultSettings();
            settings.completed = true;
            settings.themeId = 'custom-theme';

            saveOnboardingSettings(settings);

            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'daw_onboarding_v1',
                expect.any(String)
            );

            const saved = JSON.parse(localStorageMock.getItem('daw_onboarding_v1')!);
            expect(saved.completed).toBe(true);
            expect(saved.themeId).toBe('custom-theme');
        });
    });

    describe('isOnboardingCompleted', () => {
        it('returns false when not completed', () => {
            expect(isOnboardingCompleted()).toBe(false);
        });

        it('returns true when completed', () => {
            const settings = getDefaultSettings();
            settings.completed = true;
            saveOnboardingSettings(settings);

            expect(isOnboardingCompleted()).toBe(true);
        });
    });

    describe('completeOnboarding', () => {
        it('marks onboarding as completed', () => {
            completeOnboarding({ selectedProductIds: ['product1'], themeId: 'dark' });

            const settings = loadOnboardingSettings();
            expect(settings.completed).toBe(true);
            expect(settings.selectedProductIds).toEqual(['product1']);
            expect(settings.themeId).toBe('dark');
        });
    });

    describe('skipOnboarding', () => {
        it('marks completed with default settings', () => {
            skipOnboarding();

            const settings = loadOnboardingSettings();
            expect(settings.completed).toBe(true);
            expect(settings.themeId).toBe('system');
        });
    });

    describe('updateSelectedProducts', () => {
        it('updates product selection', () => {
            updateSelectedProducts(['product1', 'product2']);

            const settings = loadOnboardingSettings();
            expect(settings.selectedProductIds).toEqual(['product1', 'product2']);
        });
    });

    describe('updateTheme', () => {
        it('updates theme selection', () => {
            updateTheme('new-theme');

            const settings = loadOnboardingSettings();
            expect(settings.themeId).toBe('new-theme');
        });
    });

    describe('iCloud settings', () => {
        it('updateICloudSettings updates partial settings', () => {
            updateICloudSettings({ enabled: true });

            const settings = loadOnboardingSettings();
            expect(settings.iCloud.enabled).toBe(true);
            expect(settings.iCloud.syncStatus).toBe('disabled'); // Unchanged
        });

        it('connectICloud sets ready status', () => {
            connectICloud();

            const settings = loadOnboardingSettings();
            expect(settings.iCloud.enabled).toBe(true);
            expect(settings.iCloud.syncStatus).toBe('ready');
            expect(settings.iCloud.lastConnectedAt).toBeTruthy();
        });

        it('disconnectICloud clears iCloud settings', () => {
            connectICloud();
            disconnectICloud();

            const settings = loadOnboardingSettings();
            expect(settings.iCloud.enabled).toBe(false);
            expect(settings.iCloud.syncStatus).toBe('disabled');
            expect(settings.iCloud.lastConnectedAt).toBeNull();
        });
    });

    describe('Round-trip', () => {
        it('preserves all settings through save/load cycle', () => {
            const original: OnboardingSettings = {
                version: 1,
                completed: true,
                selectedProductIds: ['a', 'b', 'c'],
                themeId: 'custom-theme-id',
                iCloud: {
                    enabled: true,
                    syncStatus: 'ready',
                    lastConnectedAt: '2024-12-29T00:00:00Z',
                    lastError: 'some error'
                }
            };

            saveOnboardingSettings(original);
            const loaded = loadOnboardingSettings();

            expect(loaded).toEqual(original);
        });
    });
});


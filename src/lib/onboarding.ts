/**
 * Onboarding Settings Module
 *
 * Manages first-run onboarding state, product selection, and settings persistence.
 */

import { products } from '$lib/products';

// Storage key
const STORAGE_KEY = 'daw_onboarding_v1';

/**
 * iCloud sync status enum
 */
export type SyncStatus = 'disabled' | 'needs_auth' | 'ready' | 'error';

/**
 * iCloud settings
 */
export interface ICloudSettings {
    enabled: boolean;
    syncStatus: SyncStatus;
    lastConnectedAt: string | null;
    lastError: string | null;
}

/**
 * Onboarding settings schema
 */
export interface OnboardingSettings {
    version: number;
    completed: boolean;
    selectedProductIds: string[];
    themeId: string;
    iCloud: ICloudSettings;
}

/**
 * Default onboarding settings - all products enabled
 */
export function getDefaultSettings(): OnboardingSettings {
    return {
        version: 1,
        completed: false,
        selectedProductIds: products.map(p => p.productId),
        themeId: 'system',
        iCloud: {
            enabled: false,
            syncStatus: 'disabled',
            lastConnectedAt: null,
            lastError: null
        }
    };
}

/**
 * Load onboarding settings from localStorage
 */
export function loadOnboardingSettings(): OnboardingSettings {
    if (typeof localStorage === 'undefined') {
        return getDefaultSettings();
    }

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);

            // Validate schema version
            if (parsed.version !== 1) {
                console.warn('Onboarding settings version mismatch, using defaults');
                return getDefaultSettings();
            }

            // Ensure all required fields exist
            return {
                version: 1,
                completed: Boolean(parsed.completed),
                selectedProductIds: Array.isArray(parsed.selectedProductIds)
                    ? parsed.selectedProductIds
                    : getDefaultSettings().selectedProductIds,
                themeId: parsed.themeId || 'system',
                iCloud: {
                    enabled: Boolean(parsed.iCloud?.enabled),
                    syncStatus: parsed.iCloud?.syncStatus || 'disabled',
                    lastConnectedAt: parsed.iCloud?.lastConnectedAt || null,
                    lastError: parsed.iCloud?.lastError || null
                }
            };
        }
    } catch (e) {
        console.warn('Failed to load onboarding settings:', e);
    }

    return getDefaultSettings();
}

/**
 * Save onboarding settings to localStorage
 */
export function saveOnboardingSettings(settings: OnboardingSettings): void {
    if (typeof localStorage === 'undefined') return;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
        console.warn('Failed to save onboarding settings:', e);
    }
}

/**
 * Check if onboarding is completed
 */
export function isOnboardingCompleted(): boolean {
    return loadOnboardingSettings().completed;
}

/**
 * Mark onboarding as completed
 */
export function completeOnboarding(settings: Partial<OnboardingSettings>): void {
    const current = loadOnboardingSettings();
    const updated: OnboardingSettings = {
        ...current,
        ...settings,
        version: 1,
        completed: true
    };
    saveOnboardingSettings(updated);
}

/**
 * Skip onboarding with default settings
 */
export function skipOnboarding(): void {
    const defaults = getDefaultSettings();
    defaults.completed = true;
    saveOnboardingSettings(defaults);
}

/**
 * Update selected products
 */
export function updateSelectedProducts(productIds: string[]): void {
    const settings = loadOnboardingSettings();
    settings.selectedProductIds = productIds;
    saveOnboardingSettings(settings);
}

/**
 * Update theme selection
 */
export function updateTheme(themeId: string): void {
    const settings = loadOnboardingSettings();
    settings.themeId = themeId;
    saveOnboardingSettings(settings);
}

/**
 * Update iCloud settings (stub)
 */
export function updateICloudSettings(iCloud: Partial<ICloudSettings>): void {
    const settings = loadOnboardingSettings();
    settings.iCloud = { ...settings.iCloud, ...iCloud };
    saveOnboardingSettings(settings);
}

/**
 * Connect iCloud (stub - just sets ready status)
 */
export function connectICloud(): void {
    updateICloudSettings({
        enabled: true,
        syncStatus: 'ready',
        lastConnectedAt: new Date().toISOString(),
        lastError: null
    });
}

/**
 * Disconnect iCloud
 */
export function disconnectICloud(): void {
    updateICloudSettings({
        enabled: false,
        syncStatus: 'disabled',
        lastConnectedAt: null,
        lastError: null
    });
}

/**
 * Get selected products based on settings
 */
export function getSelectedProducts() {
    const settings = loadOnboardingSettings();
    return products.filter(p => settings.selectedProductIds.includes(p.productId));
}


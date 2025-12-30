/**
 * Player Persistence
 *
 * Saves and loads player preferences to localStorage.
 */

import type { PlayerSettings } from './store';
import { DEFAULT_SETTINGS } from './store';

const STORAGE_KEY = 'producerhub_player_v1';

/**
 * Storage schema
 */
interface PlayerStorageV1 {
    version: 1;
    settings: PlayerSettings;
}

/**
 * Load player settings from localStorage
 */
export function loadPlayerSettings(): PlayerSettings {
    if (typeof localStorage === 'undefined') {
        return DEFAULT_SETTINGS;
    }

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            return DEFAULT_SETTINGS;
        }

        const parsed = JSON.parse(stored) as PlayerStorageV1;

        // Version guard
        if (!parsed.version || parsed.version !== 1) {
            return DEFAULT_SETTINGS;
        }

        // Merge with defaults to handle missing fields
        return {
            ...DEFAULT_SETTINGS,
            ...parsed.settings
        };
    } catch (e) {
        console.error('Failed to load player settings:', e);
        return DEFAULT_SETTINGS;
    }
}

/**
 * Save player settings to localStorage
 */
export function savePlayerSettings(settings: PlayerSettings): void {
    if (typeof localStorage === 'undefined') {
        return;
    }

    try {
        const storage: PlayerStorageV1 = {
            version: 1,
            settings
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
    } catch (e) {
        console.error('Failed to save player settings:', e);
    }
}


/**
 * Pattern Storage
 *
 * Handles persisting patterns to localStorage with versioning.
 */

import type { DrumPattern, PatternsStorageV1 } from './model';

const STORAGE_KEY = 'producerhub_patterns_v1';

/**
 * Default storage state
 */
const DEFAULT_STORAGE: PatternsStorageV1 = {
    version: 1,
    patterns: [],
    lastOpenedId: null
};

/**
 * Load patterns from localStorage
 */
export function loadPatterns(): PatternsStorageV1 {
    if (typeof localStorage === 'undefined') {
        return DEFAULT_STORAGE;
    }

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            return DEFAULT_STORAGE;
        }

        const parsed = JSON.parse(stored);

        // Version guard
        if (!parsed.version || parsed.version !== 1) {
            console.warn('Pattern storage version mismatch, resetting');
            return DEFAULT_STORAGE;
        }

        // Validate structure
        if (!Array.isArray(parsed.patterns)) {
            return DEFAULT_STORAGE;
        }

        return parsed as PatternsStorageV1;
    } catch (e) {
        console.error('Failed to load patterns:', e);
        return DEFAULT_STORAGE;
    }
}

/**
 * Save patterns to localStorage
 */
export function savePatterns(storage: PatternsStorageV1): void {
    if (typeof localStorage === 'undefined') {
        return;
    }

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
    } catch (e) {
        console.error('Failed to save patterns:', e);
    }
}

/**
 * Add a pattern to storage
 */
export function addPattern(pattern: DrumPattern): PatternsStorageV1 {
    const storage = loadPatterns();

    // Check for duplicate ID
    const existingIdx = storage.patterns.findIndex(p => p.id === pattern.id);
    if (existingIdx >= 0) {
        storage.patterns[existingIdx] = pattern;
    } else {
        storage.patterns.push(pattern);
    }

    storage.lastOpenedId = pattern.id;
    savePatterns(storage);

    return storage;
}

/**
 * Update a pattern in storage
 */
export function updatePattern(pattern: DrumPattern): PatternsStorageV1 {
    const storage = loadPatterns();

    const idx = storage.patterns.findIndex(p => p.id === pattern.id);
    if (idx >= 0) {
        storage.patterns[idx] = pattern;
        savePatterns(storage);
    }

    return storage;
}

/**
 * Delete a pattern from storage
 */
export function deletePattern(patternId: string): PatternsStorageV1 {
    const storage = loadPatterns();

    storage.patterns = storage.patterns.filter(p => p.id !== patternId);

    if (storage.lastOpenedId === patternId) {
        storage.lastOpenedId = storage.patterns[0]?.id || null;
    }

    savePatterns(storage);

    return storage;
}

/**
 * Get a pattern by ID
 */
export function getPattern(patternId: string): DrumPattern | null {
    const storage = loadPatterns();
    return storage.patterns.find(p => p.id === patternId) || null;
}

/**
 * Set last opened pattern
 */
export function setLastOpened(patternId: string): void {
    const storage = loadPatterns();
    storage.lastOpenedId = patternId;
    savePatterns(storage);
}

/**
 * Serialize pattern for export
 */
export function serializePattern(pattern: DrumPattern): string {
    return JSON.stringify(pattern, null, 2);
}

/**
 * Deserialize pattern from import
 */
export function deserializePattern(json: string): DrumPattern | null {
    try {
        const parsed = JSON.parse(json);

        // Stricter type validation
        if (
            typeof parsed.id !== 'string' ||
            typeof parsed.name !== 'string' ||
            !Array.isArray(parsed.lanes) ||
            !parsed.lanes.every((lane: any) => lane && typeof lane.laneId === 'string' && typeof lane.name === 'string')
        ) {
            return null;
        }

        return parsed as DrumPattern;
    } catch {
        return null;
    }
}


/**
 * Player Persistence
 *
 * Saves and loads player preferences and queue to localStorage.
 * Implements schema versioning for forward compatibility.
 *
 * Security:
 * - Only stores non-sensitive metadata (no credentials, tokens, etc.)
 * - Validates data before restoring
 */

import type { PlayerSettings, QueueTrack } from './store';
import { DEFAULT_SETTINGS } from './store';

// ============================================
// Schema Version
// ============================================

export const PLAYER_STORAGE_VERSION = 2;

const STORAGE_KEY = 'producerhub_player_v1';
const QUEUE_STORAGE_KEY = 'producerhub_player_queue_v1';

// ============================================
// Types
// ============================================

/**
 * Storage schema v1 (settings only)
 */
interface PlayerStorageV1 {
    version: 1;
    settings: PlayerSettings;
}

/**
 * Storage schema v2 (settings + queue)
 */
interface PlayerStorageV2 {
    version: 2;
    settings: PlayerSettings;
}

/**
 * Queue storage schema
 */
export interface QueueStorage {
    version: typeof PLAYER_STORAGE_VERSION;
    queue: SerializedQueueTrack[];
    queueIndex: number;
    currentTime: number;
    updatedAt: string;
}

/**
 * Serialized queue track (minimal for storage)
 */
export interface SerializedQueueTrack {
    id: string;
    title: string;
    artist?: string;
    source?: string;
    audioUrl: string;
    duration?: number;
    // Note: waveform is NOT persisted - will be regenerated
}

// ============================================
// Settings Persistence
// ============================================

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

        const parsed = JSON.parse(stored) as PlayerStorageV1 | PlayerStorageV2;

        // Version guard - accept v1 and v2
        if (!parsed.version || (parsed.version !== 1 && parsed.version !== 2)) {
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
        const storage: PlayerStorageV2 = {
            version: PLAYER_STORAGE_VERSION,
            settings
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
    } catch (e) {
        console.error('Failed to save player settings:', e);
    }
}

// ============================================
// Queue Persistence
// ============================================

/**
 * Serialize a queue track for storage (strips non-essential data)
 */
function serializeTrack(track: QueueTrack): SerializedQueueTrack {
    return {
        id: track.id,
        title: track.title,
        artist: track.artist,
        source: track.source,
        audioUrl: track.audioUrl,
        duration: track.duration,
        // Intentionally omit waveform - will be regenerated
    };
}

/**
 * Deserialize a queue track from storage
 */
function deserializeTrack(serialized: SerializedQueueTrack): QueueTrack | null {
    // Validate required fields
    if (!serialized.id || typeof serialized.id !== 'string') return null;
    if (!serialized.title || typeof serialized.title !== 'string') return null;
    if (!serialized.audioUrl || typeof serialized.audioUrl !== 'string') return null;

    return {
        id: serialized.id,
        title: serialized.title,
        artist: serialized.artist,
        source: serialized.source,
        audioUrl: serialized.audioUrl,
        duration: serialized.duration,
    };
}

/**
 * Validate queue storage data
 */
function validateQueueStorage(data: unknown): data is QueueStorage {
    if (!data || typeof data !== 'object') return false;

    const storage = data as Record<string, unknown>;

    if (storage.version !== PLAYER_STORAGE_VERSION) return false;
    if (!Array.isArray(storage.queue)) return false;
    if (typeof storage.queueIndex !== 'number') return false;
    // currentTime may be null after JSON serialization of NaN
    if (storage.currentTime !== null && typeof storage.currentTime !== 'number') return false;

    return true;
}

/**
 * Load queue state from localStorage
 */
export function loadQueueState(): {
    queue: QueueTrack[];
    queueIndex: number;
    currentTime: number;
} | null {
    if (typeof localStorage === 'undefined') {
        return null;
    }

    try {
        const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
        if (!stored) {
            return null;
        }

        const parsed = JSON.parse(stored);

        // Validate structure
        if (!validateQueueStorage(parsed)) {
            console.warn('Invalid queue storage format, clearing');
            localStorage.removeItem(QUEUE_STORAGE_KEY);
            return null;
        }

        // Check if data is too old (24 hours)
        const updatedAt = new Date(parsed.updatedAt).getTime();
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        if (now - updatedAt > maxAge) {
            console.info('Queue data expired, clearing');
            localStorage.removeItem(QUEUE_STORAGE_KEY);
            return null;
        }

        // Deserialize and validate each track
        const queue: QueueTrack[] = [];
        for (const serialized of parsed.queue) {
            const track = deserializeTrack(serialized);
            if (track) {
                queue.push(track);
            }
        }

        // If queue is empty after validation, return null
        if (queue.length === 0) {
            return null;
        }

        // Adjust queue index if some tracks were invalid
        let queueIndex = parsed.queueIndex;
        if (queueIndex >= queue.length) {
            queueIndex = queue.length - 1;
        }
        if (queueIndex < 0) {
            queueIndex = 0;
        }

        // Sanitize currentTime (null comes from JSON.stringify(NaN))
        let currentTime = parsed.currentTime;
        if (currentTime === null || !isFinite(currentTime) || currentTime < 0) {
            currentTime = 0;
        }

        return {
            queue,
            queueIndex,
            currentTime,
        };
    } catch (e) {
        console.error('Failed to load queue state:', e);
        return null;
    }
}

// Debounce timer for saving currentTime
let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const SAVE_DEBOUNCE_MS = 2000;

/**
 * Save queue state to localStorage (with debounced currentTime)
 */
export function saveQueueState(
    queue: QueueTrack[],
    queueIndex: number,
    currentTime: number
): void {
    if (typeof localStorage === 'undefined') {
        return;
    }

    // Clear existing debounce
    if (saveDebounceTimer) {
        clearTimeout(saveDebounceTimer);
    }

    // Debounce the save
    saveDebounceTimer = setTimeout(() => {
        try {
            // Don't save empty queues
            if (queue.length === 0) {
                localStorage.removeItem(QUEUE_STORAGE_KEY);
                return;
            }

            // Serialize tracks
            const serializedQueue = queue.map(serializeTrack);

            // Sanitize currentTime
            let sanitizedTime = currentTime;
            if (!isFinite(sanitizedTime) || sanitizedTime < 0) {
                sanitizedTime = 0;
            }

            const storage: QueueStorage = {
                version: PLAYER_STORAGE_VERSION,
                queue: serializedQueue,
                queueIndex,
                currentTime: sanitizedTime,
                updatedAt: new Date().toISOString(),
            };

            localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(storage));
        } catch (e) {
            console.error('Failed to save queue state:', e);
        }
    }, SAVE_DEBOUNCE_MS);
}

/**
 * Save queue state immediately (without debounce)
 */
export function saveQueueStateImmediate(
    queue: QueueTrack[],
    queueIndex: number,
    currentTime: number
): void {
    if (typeof localStorage === 'undefined') {
        return;
    }

    // Clear any pending debounced save
    if (saveDebounceTimer) {
        clearTimeout(saveDebounceTimer);
        saveDebounceTimer = null;
    }

    try {
        if (queue.length === 0) {
            localStorage.removeItem(QUEUE_STORAGE_KEY);
            return;
        }

        const serializedQueue = queue.map(serializeTrack);

        let sanitizedTime = currentTime;
        if (!isFinite(sanitizedTime) || sanitizedTime < 0) {
            sanitizedTime = 0;
        }

        const storage: QueueStorage = {
            version: PLAYER_STORAGE_VERSION,
            queue: serializedQueue,
            queueIndex,
            currentTime: sanitizedTime,
            updatedAt: new Date().toISOString(),
        };

        localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(storage));
    } catch (e) {
        console.error('Failed to save queue state:', e);
    }
}

/**
 * Clear queue state from localStorage
 */
export function clearQueueState(): void {
    if (typeof localStorage === 'undefined') {
        return;
    }

    if (saveDebounceTimer) {
        clearTimeout(saveDebounceTimer);
        saveDebounceTimer = null;
    }

    localStorage.removeItem(QUEUE_STORAGE_KEY);
}

/**
 * Migrate from v1 to v2 if needed
 * Currently just updates version number since queue is separate
 */
export function migratePlayerStorage(): void {
    if (typeof localStorage === 'undefined') {
        return;
    }

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return;

        const parsed = JSON.parse(stored);
        if (parsed.version === 1) {
            // Migrate to v2 - just update version, structure is compatible
            const migrated: PlayerStorageV2 = {
                version: 2,
                settings: {
                    ...DEFAULT_SETTINGS,
                    ...parsed.settings,
                },
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        }
    } catch {
        // Migration failed, will use defaults
    }
}


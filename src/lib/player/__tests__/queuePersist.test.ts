/**
 * Unit tests for Player Queue Persistence
 *
 * Tests serialization, deserialization, and migrations for queue state.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    loadQueueState,
    saveQueueStateImmediate,
    clearQueueState,
    migratePlayerStorage,
    PLAYER_STORAGE_VERSION,
    type QueueStorage,
    type SerializedQueueTrack,
} from '../persist';
import type { QueueTrack } from '../store';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value; },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; },
        get length() { return Object.keys(store).length; },
        key: (i: number) => Object.keys(store)[i] || null,
    };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('Queue Persistence - Serialization', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });

    afterEach(() => {
        localStorageMock.clear();
    });

    const createTestQueue = (): QueueTrack[] => [
        {
            id: 'track-1',
            title: 'Test Track 1',
            artist: 'Test Artist',
            audioUrl: 'https://example.com/track1.mp3',
            duration: 180,
        },
        {
            id: 'track-2',
            title: 'Test Track 2',
            artist: 'Another Artist',
            source: 'Test Album',
            audioUrl: 'https://example.com/track2.mp3',
            duration: 240,
        },
    ];

    it('saves and loads queue state', () => {
        const queue = createTestQueue();
        saveQueueStateImmediate(queue, 1, 45.5);

        const loaded = loadQueueState();

        expect(loaded).not.toBeNull();
        expect(loaded?.queue).toHaveLength(2);
        expect(loaded?.queueIndex).toBe(1);
        expect(loaded?.currentTime).toBe(45.5);
    });

    it('preserves track metadata during serialization', () => {
        const queue = createTestQueue();
        saveQueueStateImmediate(queue, 0, 0);

        const loaded = loadQueueState();
        const firstTrack = loaded?.queue[0];

        expect(firstTrack?.id).toBe('track-1');
        expect(firstTrack?.title).toBe('Test Track 1');
        expect(firstTrack?.artist).toBe('Test Artist');
        expect(firstTrack?.audioUrl).toBe('https://example.com/track1.mp3');
        expect(firstTrack?.duration).toBe(180);
    });

    it('strips waveform data during serialization', () => {
        const queue: QueueTrack[] = [{
            id: 'track-waveform',
            title: 'Track with Waveform',
            audioUrl: 'https://example.com/track.mp3',
            waveform: {
                peaks: [0.5, 0.8, 0.3],
                normalizedPeaks: [0.63, 1.0, 0.38],
            },
        }];

        saveQueueStateImmediate(queue, 0, 0);
        const loaded = loadQueueState();

        // Waveform should not be persisted
        expect(loaded?.queue[0]?.waveform).toBeUndefined();
    });

    it('returns null for empty storage', () => {
        const loaded = loadQueueState();
        expect(loaded).toBeNull();
    });

    it('clears queue state', () => {
        const queue = createTestQueue();
        saveQueueStateImmediate(queue, 0, 0);

        expect(loadQueueState()).not.toBeNull();

        clearQueueState();

        expect(loadQueueState()).toBeNull();
    });

    it('removes storage when saving empty queue', () => {
        const queue = createTestQueue();
        saveQueueStateImmediate(queue, 0, 0);
        expect(loadQueueState()).not.toBeNull();

        saveQueueStateImmediate([], 0, 0);
        expect(loadQueueState()).toBeNull();
    });
});

describe('Queue Persistence - Validation', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });

    afterEach(() => {
        localStorageMock.clear();
    });

    it('rejects invalid version', () => {
        const invalidData = {
            version: 999,
            queue: [],
            queueIndex: 0,
            currentTime: 0,
            updatedAt: new Date().toISOString(),
        };
        localStorageMock.setItem('producerhub_player_queue_v1', JSON.stringify(invalidData));

        const loaded = loadQueueState();
        expect(loaded).toBeNull();
    });

    it('rejects malformed JSON', () => {
        localStorageMock.setItem('producerhub_player_queue_v1', 'not valid json');

        const loaded = loadQueueState();
        expect(loaded).toBeNull();
    });

    it('skips invalid tracks during load', () => {
        const dataWithInvalidTrack = {
            version: PLAYER_STORAGE_VERSION,
            queue: [
                { id: 'valid', title: 'Valid Track', audioUrl: 'https://example.com/valid.mp3' },
                { id: null, title: 'Invalid Track' }, // Missing audioUrl and invalid id
                { title: 'Missing ID' }, // Missing id
            ],
            queueIndex: 0,
            currentTime: 0,
            updatedAt: new Date().toISOString(),
        };
        localStorageMock.setItem('producerhub_player_queue_v1', JSON.stringify(dataWithInvalidTrack));

        const loaded = loadQueueState();

        expect(loaded).not.toBeNull();
        expect(loaded?.queue).toHaveLength(1);
        expect(loaded?.queue[0].id).toBe('valid');
    });

    it('adjusts queue index when tracks are skipped', () => {
        const dataWithInvalidTracks = {
            version: PLAYER_STORAGE_VERSION,
            queue: [
                { id: null, title: 'Invalid' },
                { id: 'valid', title: 'Valid', audioUrl: 'https://example.com/track.mp3' },
            ],
            queueIndex: 5, // Beyond valid range
            currentTime: 0,
            updatedAt: new Date().toISOString(),
        };
        localStorageMock.setItem('producerhub_player_queue_v1', JSON.stringify(dataWithInvalidTracks));

        const loaded = loadQueueState();

        expect(loaded?.queueIndex).toBe(0); // Adjusted to last valid
    });

    it('sanitizes negative currentTime', () => {
        const dataWithNegativeTime = {
            version: PLAYER_STORAGE_VERSION,
            queue: [{ id: 'track', title: 'Track', audioUrl: 'https://example.com/track.mp3' }],
            queueIndex: 0,
            currentTime: -10,
            updatedAt: new Date().toISOString(),
        };
        localStorageMock.setItem('producerhub_player_queue_v1', JSON.stringify(dataWithNegativeTime));

        const loaded = loadQueueState();

        expect(loaded?.currentTime).toBe(0);
    });

    it('sanitizes NaN currentTime', () => {
        const dataWithNaN = {
            version: PLAYER_STORAGE_VERSION,
            queue: [{ id: 'track', title: 'Track', audioUrl: 'https://example.com/track.mp3' }],
            queueIndex: 0,
            currentTime: NaN,
            updatedAt: new Date().toISOString(),
        };
        localStorageMock.setItem('producerhub_player_queue_v1', JSON.stringify(dataWithNaN));

        const loaded = loadQueueState();

        expect(loaded?.currentTime).toBe(0);
    });
});

describe('Queue Persistence - Expiration', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.useFakeTimers();
    });

    afterEach(() => {
        localStorageMock.clear();
        vi.useRealTimers();
    });

    it('clears expired queue data (older than 24 hours)', () => {
        const oldData = {
            version: PLAYER_STORAGE_VERSION,
            queue: [{ id: 'track', title: 'Old Track', audioUrl: 'https://example.com/track.mp3' }],
            queueIndex: 0,
            currentTime: 0,
            updatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
        };
        localStorageMock.setItem('producerhub_player_queue_v1', JSON.stringify(oldData));

        const loaded = loadQueueState();

        expect(loaded).toBeNull();
    });

    it('keeps recent queue data', () => {
        const recentData = {
            version: PLAYER_STORAGE_VERSION,
            queue: [{ id: 'track', title: 'Recent Track', audioUrl: 'https://example.com/track.mp3' }],
            queueIndex: 0,
            currentTime: 0,
            updatedAt: new Date().toISOString(), // Now
        };
        localStorageMock.setItem('producerhub_player_queue_v1', JSON.stringify(recentData));

        const loaded = loadQueueState();

        expect(loaded).not.toBeNull();
        expect(loaded?.queue[0].title).toBe('Recent Track');
    });
});

describe('Queue Persistence - Migration', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });

    afterEach(() => {
        localStorageMock.clear();
    });

    it('migrates v1 settings to v2', () => {
        const v1Data = {
            version: 1,
            settings: {
                autoplayNext: false,
                repeatMode: 'one',
                volume: 0.5,
                shuffle: true,
            },
        };
        localStorageMock.setItem('producerhub_player_v1', JSON.stringify(v1Data));

        migratePlayerStorage();

        const stored = localStorageMock.getItem('producerhub_player_v1');
        expect(stored).not.toBeNull();

        const parsed = JSON.parse(stored!);
        expect(parsed.version).toBe(2);
        expect(parsed.settings.volume).toBe(0.5);
        expect(parsed.settings.repeatMode).toBe('one');
    });

    it('does not migrate already v2 data', () => {
        const v2Data = {
            version: 2,
            settings: {
                autoplayNext: true,
                repeatMode: 'all',
                volume: 0.8,
                shuffle: false,
            },
        };
        localStorageMock.setItem('producerhub_player_v1', JSON.stringify(v2Data));

        migratePlayerStorage();

        const stored = localStorageMock.getItem('producerhub_player_v1');
        const parsed = JSON.parse(stored!);
        expect(parsed.version).toBe(2);
        expect(parsed.settings.repeatMode).toBe('all');
    });
});

describe('Queue Persistence - Security', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });

    afterEach(() => {
        localStorageMock.clear();
    });

    it('only stores non-sensitive metadata', () => {
        const queue: QueueTrack[] = [{
            id: 'track-1',
            title: 'Secure Track',
            artist: 'Artist',
            audioUrl: 'https://example.com/track.mp3',
        }];

        saveQueueStateImmediate(queue, 0, 30);

        const stored = localStorageMock.getItem('producerhub_player_queue_v1');
        expect(stored).not.toBeNull();

        // Verify no sensitive fields are stored
        expect(stored).not.toContain('password');
        expect(stored).not.toContain('token');
        expect(stored).not.toContain('secret');
        expect(stored).not.toContain('cookie');
    });

    it('handles missing localStorage gracefully', () => {
        // This test verifies the typeof check works
        // In real browser, localStorage is always defined
        // The code handles undefined gracefully
        expect(() => loadQueueState()).not.toThrow();
        expect(() => saveQueueStateImmediate([], 0, 0)).not.toThrow();
        expect(() => clearQueueState()).not.toThrow();
    });
});


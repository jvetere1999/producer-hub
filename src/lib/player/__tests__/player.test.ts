/**
 * Player Module Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
    playerStore,
    DEFAULT_SETTINGS,
    type QueueTrack
} from '../store';
import {
    loadPlayerSettings,
    savePlayerSettings
} from '../persist';

// Mock localStorage
const mockStorage: Record<string, string> = {};
vi.stubGlobal('localStorage', {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, value: string) => { mockStorage[key] = value; },
    removeItem: (key: string) => { delete mockStorage[key]; },
    clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
});

const createMockTrack = (id: string): QueueTrack => ({
    id,
    title: `Track ${id}`,
    audioUrl: `https://example.com/${id}.mp3`
});

describe('Player Store', () => {
    beforeEach(() => {
        playerStore.reset();
    });

    describe('setQueue', () => {
        it('sets the queue and current track', () => {
            const tracks = [createMockTrack('1'), createMockTrack('2')];
            playerStore.setQueue(tracks, 0);

            const state = get(playerStore);
            expect(state.queue).toHaveLength(2);
            expect(state.currentTrack?.id).toBe('1');
            expect(state.queueIndex).toBe(0);
            expect(state.isVisible).toBe(true);
        });

        it('can start from any index', () => {
            const tracks = [createMockTrack('1'), createMockTrack('2'), createMockTrack('3')];
            playerStore.setQueue(tracks, 2);

            const state = get(playerStore);
            expect(state.currentTrack?.id).toBe('3');
            expect(state.queueIndex).toBe(2);
        });
    });

    describe('next', () => {
        it('advances to next track', () => {
            const tracks = [createMockTrack('1'), createMockTrack('2')];
            playerStore.setQueue(tracks, 0);
            playerStore.next();

            const state = get(playerStore);
            expect(state.currentTrack?.id).toBe('2');
            expect(state.queueIndex).toBe(1);
        });

        it('wraps around when repeat all is on', () => {
            const tracks = [createMockTrack('1'), createMockTrack('2')];
            playerStore.setQueue(tracks, 1);
            playerStore.updateSettings({ repeatMode: 'all' });
            playerStore.next();

            const state = get(playerStore);
            expect(state.currentTrack?.id).toBe('1');
            expect(state.queueIndex).toBe(0);
        });

        it('stops at end when repeat is off', () => {
            const tracks = [createMockTrack('1'), createMockTrack('2')];
            playerStore.setQueue(tracks, 1);
            playerStore.updateSettings({ repeatMode: 'off' });
            playerStore.next();

            const state = get(playerStore);
            expect(state.status).toBe('paused');
            expect(state.queueIndex).toBe(1); // Stays at last
        });
    });

    describe('previous', () => {
        it('goes to previous track', () => {
            const tracks = [createMockTrack('1'), createMockTrack('2')];
            playerStore.setQueue(tracks, 1);
            playerStore.previous();

            const state = get(playerStore);
            expect(state.currentTrack?.id).toBe('1');
        });

        it('restarts current track if past 3 seconds', () => {
            const tracks = [createMockTrack('1'), createMockTrack('2')];
            playerStore.setQueue(tracks, 1);
            playerStore.setCurrentTime(5);
            playerStore.previous();

            const state = get(playerStore);
            expect(state.currentTime).toBe(0);
            expect(state.queueIndex).toBe(1); // Same track
        });

        it('wraps to end when repeat all is on', () => {
            const tracks = [createMockTrack('1'), createMockTrack('2')];
            playerStore.setQueue(tracks, 0);
            playerStore.updateSettings({ repeatMode: 'all' });
            playerStore.previous();

            const state = get(playerStore);
            expect(state.currentTrack?.id).toBe('2');
        });
    });

    describe('handleEnded', () => {
        it('replays same track when repeat one', () => {
            const tracks = [createMockTrack('1'), createMockTrack('2')];
            playerStore.setQueue(tracks, 0);
            playerStore.updateSettings({ repeatMode: 'one' });
            playerStore.setCurrentTime(100);
            playerStore.handleEnded();

            const state = get(playerStore);
            expect(state.currentTime).toBe(0);
            expect(state.queueIndex).toBe(0);
        });

        it('advances when autoplay is on', () => {
            const tracks = [createMockTrack('1'), createMockTrack('2')];
            playerStore.setQueue(tracks, 0);
            playerStore.updateSettings({ autoplayNext: true, repeatMode: 'off' });
            playerStore.handleEnded();

            const state = get(playerStore);
            expect(state.currentTrack?.id).toBe('2');
        });

        it('pauses when autoplay is off', () => {
            const tracks = [createMockTrack('1'), createMockTrack('2')];
            playerStore.setQueue(tracks, 0);
            playerStore.updateSettings({ autoplayNext: false, repeatMode: 'off' });
            playerStore.handleEnded();

            const state = get(playerStore);
            expect(state.status).toBe('paused');
        });
    });

    describe('updateSettings', () => {
        it('merges settings', () => {
            playerStore.updateSettings({ volume: 0.5 });

            const state = get(playerStore);
            expect(state.settings.volume).toBe(0.5);
            expect(state.settings.autoplayNext).toBe(true); // Default unchanged
        });
    });
});

describe('Player Persistence', () => {
    beforeEach(() => {
        Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    });

    it('loads default settings when storage is empty', () => {
        const settings = loadPlayerSettings();
        expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('saves and loads settings', () => {
        const customSettings = {
            ...DEFAULT_SETTINGS,
            volume: 0.5,
            repeatMode: 'all' as const
        };

        savePlayerSettings(customSettings);
        const loaded = loadPlayerSettings();

        expect(loaded.volume).toBe(0.5);
        expect(loaded.repeatMode).toBe('all');
    });

    it('handles version mismatch', () => {
        mockStorage['producerhub_player_v1'] = JSON.stringify({
            version: 999,
            settings: { volume: 0.1 }
        });

        const settings = loadPlayerSettings();
        expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('handles invalid JSON', () => {
        mockStorage['producerhub_player_v1'] = 'not json';

        const settings = loadPlayerSettings();
        expect(settings).toEqual(DEFAULT_SETTINGS);
    });
});


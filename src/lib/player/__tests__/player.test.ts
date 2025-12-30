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
import {
    initAudioController,
    getAudioElement,
    disposeAudioController
} from '../audio';

// Mock localStorage
const mockStorage: Record<string, string> = {};
vi.stubGlobal('localStorage', {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, value: string) => { mockStorage[key] = value; },
    removeItem: (key: string) => { delete mockStorage[key]; },
    clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
});

// Mock Audio constructor for Node.js environment
class MockAudio {
    src = '';
    preload = '';
    volume = 1;
    currentTime = 0;
    duration = 0;
    paused = true;
    private listeners: Record<string, Function[]> = {};

    addEventListener(event: string, callback: Function) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    removeEventListener(event: string, callback: Function) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }

    play() {
        this.paused = false;
        return Promise.resolve();
    }

    pause() {
        this.paused = true;
    }

    load() {}
}

vi.stubGlobal('Audio', MockAudio);

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

describe('Audio Controller - Single Audio Element Guarantee', () => {
    beforeEach(() => {
        disposeAudioController();
        playerStore.reset();
    });

    it('returns the same audio element on multiple init calls', () => {
        const audio1 = initAudioController();
        const audio2 = initAudioController();

        expect(audio1).toBe(audio2);
    });

    it('getAudioElement returns the initialized audio element', () => {
        const audio = initAudioController();
        const retrieved = getAudioElement();

        expect(retrieved).toBe(audio);
    });

    it('getAudioElement returns null before initialization', () => {
        disposeAudioController();
        const audio = getAudioElement();

        expect(audio).toBeNull();
    });

    it('changing tracks updates the same audio element instead of creating new one', () => {
        const audio = initAudioController();
        const tracks = [createMockTrack('1'), createMockTrack('2')];

        playerStore.setQueue(tracks, 0);

        // Verify same audio element
        expect(getAudioElement()).toBe(audio);

        // Change track
        playerStore.next();

        // Still same audio element
        expect(getAudioElement()).toBe(audio);
    });

    it('store transitions to loading state when track changes', () => {
        const tracks = [createMockTrack('1'), createMockTrack('2')];
        playerStore.setQueue(tracks, 0);

        // After setQueue, status should be loading
        let state = get(playerStore);
        expect(state.status).toBe('loading');
        expect(state.currentTrack?.id).toBe('1');

        // After next(), should transition to loading for new track
        playerStore.next();
        state = get(playerStore);
        expect(state.status).toBe('loading');
        expect(state.currentTrack?.id).toBe('2');
    });
});


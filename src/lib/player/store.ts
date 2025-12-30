/**
 * Player Store
 *
 * Global state for the audio player with queue management.
 */

import { writable, derived, get } from 'svelte/store';

/**
 * Repeat mode options
 */
export type RepeatMode = 'off' | 'one' | 'all';

/**
 * Player status
 */
export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

/**
 * Track in the queue
 */
export interface QueueTrack {
    id: string;
    title: string;
    artist?: string;
    source?: string;
    audioUrl: string;
    duration?: number;
    waveform?: {
        peaks: number[];
        normalizedPeaks?: number[];
    };
}

/**
 * Player settings (persisted)
 */
export interface PlayerSettings {
    autoplayNext: boolean;
    repeatMode: RepeatMode;
    volume: number;
    shuffle: boolean;
}

/**
 * Full player state
 */
export interface PlayerState {
    currentTrack: QueueTrack | null;
    status: PlayerStatus;
    currentTime: number;
    duration: number;
    queue: QueueTrack[];
    queueIndex: number;
    settings: PlayerSettings;
    error: string | null;
    isVisible: boolean;
}

/**
 * Default settings
 */
export const DEFAULT_SETTINGS: PlayerSettings = {
    autoplayNext: true,
    repeatMode: 'off',
    volume: 0.8,
    shuffle: false
};

/**
 * Initial state
 */
const initialState: PlayerState = {
    currentTrack: null,
    status: 'idle',
    currentTime: 0,
    duration: 0,
    queue: [],
    queueIndex: -1,
    settings: { ...DEFAULT_SETTINGS },
    error: null,
    isVisible: false
};

/**
 * Create the player store
 */
function createPlayerStore() {
    const { subscribe, set, update } = writable<PlayerState>(initialState);

    return {
        subscribe,

        /**
         * Set the queue and start playing from index
         */
        setQueue(tracks: QueueTrack[], startIndex: number = 0) {
            update(state => ({
                ...state,
                queue: tracks,
                queueIndex: startIndex,
                currentTrack: tracks[startIndex] || null,
                status: tracks[startIndex] ? 'loading' : 'idle',
                isVisible: tracks.length > 0,
                error: null
            }));
        },

        /**
         * Add tracks to queue
         */
        addToQueue(tracks: QueueTrack[]) {
            update(state => ({
                ...state,
                queue: [...state.queue, ...tracks]
            }));
        },

        /**
         * Clear the queue
         */
        clearQueue() {
            update(state => ({
                ...state,
                queue: [],
                queueIndex: -1,
                currentTrack: null,
                status: 'idle',
                currentTime: 0,
                duration: 0
            }));
        },

        /**
         * Set current track by index
         */
        setTrackIndex(index: number) {
            update(state => {
                const track = state.queue[index];
                if (!track) return state;

                return {
                    ...state,
                    queueIndex: index,
                    currentTrack: track,
                    status: 'loading',
                    currentTime: 0,
                    error: null
                };
            });
        },

        /**
         * Update player status
         */
        setStatus(status: PlayerStatus) {
            update(state => ({ ...state, status }));
        },

        /**
         * Update current time
         */
        setCurrentTime(time: number) {
            update(state => ({ ...state, currentTime: time }));
        },

        /**
         * Update duration
         */
        setDuration(duration: number) {
            update(state => ({ ...state, duration }));
        },

        /**
         * Set error
         */
        setError(error: string | null) {
            update(state => ({
                ...state,
                error,
                status: error ? 'error' : state.status
            }));
        },

        /**
         * Update settings
         */
        updateSettings(settings: Partial<PlayerSettings>) {
            update(state => ({
                ...state,
                settings: { ...state.settings, ...settings }
            }));
        },

        /**
         * Toggle visibility
         */
        setVisible(visible: boolean) {
            update(state => ({ ...state, isVisible: visible }));
        },

        /**
         * Go to next track
         */
        next() {
            update(state => {
                if (state.queue.length === 0) return state;

                let nextIndex = state.queueIndex + 1;

                // Handle repeat modes
                if (nextIndex >= state.queue.length) {
                    if (state.settings.repeatMode === 'all') {
                        nextIndex = 0;
                    } else {
                        // Stay on last track, stop playback
                        return {
                            ...state,
                            status: 'paused'
                        };
                    }
                }

                const track = state.queue[nextIndex];
                return {
                    ...state,
                    queueIndex: nextIndex,
                    currentTrack: track,
                    status: 'loading',
                    currentTime: 0,
                    error: null
                };
            });
        },

        /**
         * Go to previous track
         */
        previous() {
            update(state => {
                if (state.queue.length === 0) return state;

                // If more than 3 seconds in, restart current track
                if (state.currentTime > 3) {
                    return {
                        ...state,
                        currentTime: 0
                    };
                }

                let prevIndex = state.queueIndex - 1;

                if (prevIndex < 0) {
                    if (state.settings.repeatMode === 'all') {
                        prevIndex = state.queue.length - 1;
                    } else {
                        prevIndex = 0;
                    }
                }

                const track = state.queue[prevIndex];
                return {
                    ...state,
                    queueIndex: prevIndex,
                    currentTrack: track,
                    status: 'loading',
                    currentTime: 0,
                    error: null
                };
            });
        },

        /**
         * Handle track ended
         */
        handleEnded() {
            const state = get({ subscribe });

            if (state.settings.repeatMode === 'one') {
                // Replay same track
                update(s => ({
                    ...s,
                    currentTime: 0,
                    status: 'loading'
                }));
            } else if (state.settings.autoplayNext) {
                // Auto advance
                this.next();
            } else {
                // Stop
                update(s => ({
                    ...s,
                    status: 'paused'
                }));
            }
        },

        /**
         * Reset player
         */
        reset() {
            set(initialState);
        }
    };
}

export const playerStore = createPlayerStore();

/**
 * Derived stores for convenience
 */
export const currentTrack = derived(playerStore, $p => $p.currentTrack);
export const playerStatus = derived(playerStore, $p => $p.status);
export const isPlaying = derived(playerStore, $p => $p.status === 'playing');
export const playerVisible = derived(playerStore, $p => $p.isVisible);
export const playerSettings = derived(playerStore, $p => $p.settings);


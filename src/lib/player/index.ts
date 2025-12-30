/**
 * Player Module Index
 *
 * Re-exports all player functionality.
 */

// Store types and state management
export {
    type RepeatMode,
    type PlayerStatus,
    type QueueTrack,
    type PlayerSettings,
    type PlayerState,
    DEFAULT_SETTINGS,
    playerStore,
    currentTrack,
    playerStatus,
    isPlaying,
    playerVisible,
    playerSettings
} from './store';

// Persistence utilities for localStorage
export {
    loadPlayerSettings,
    savePlayerSettings
} from './persist';

// Audio controller for playback
export {
    initAudioController,
    loadAndPlay,
    play,
    pause,
    togglePlayPause,
    seek,
    seekByPercent,
    setVolume,
    getVolume,
    skipForward,
    skipBackward,
    getAudioElement,
    disposeAudioController
} from './audio';


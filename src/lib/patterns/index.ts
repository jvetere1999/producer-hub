/**
 * Patterns Module Index
 *
 * Re-exports all pattern-related functionality.
 */

// Model - Core pattern types and utilities
export {
    type GhostMode,
    type GhostConfig,
    type PatternLane,
    type DrumPattern,
    type PatternTemplate,
    type PatternsStorageV1,
    DRUM_LANES,
    type LaneId,
    DEFAULT_GHOST_CONFIG,
    /** Creates a new empty drum pattern */
    createEmptyPattern,
    /** Generates a unique pattern ID */
    generatePatternId,
    /** Creates a copy of a pattern with new ID */
    clonePattern,
    /** Toggles a hit on/off at a specific step */
    toggleHit,
    /** Sets velocity for a specific step */
    setVelocity
} from './model';

// Templates - Built-in pattern presets
export {
    PATTERN_TEMPLATES,
    getTemplateById,
    getTemplatesByGenre
} from './templates';

// Ghost kicks - Ghost note logic and application
export {
    type GhostResult,
    /** Applies ghost kicks to a pattern */
    applyGhostKicks,
    /** Gets ghost notes for rendering */
    getGhostNotes,
    /** Calculates which steps should have ghost notes */
    calculateGhostIndices,
    /** Checks if a step is a ghost note */
    isGhostNote,
    toggleGhostKicks,
    updateGhostConfig
} from './ghost';

// Storage - Pattern persistence to localStorage
export {
    loadPatterns,
    savePatterns,
    addPattern,
    updatePattern,
    deletePattern,
    getPattern,
    setLastOpened,
    serializePattern,
    deserializePattern
} from './storage';

// Audio - WebAudio synthesis for drum sounds
export {
    /** Initialize audio context (call after user gesture) */
    initAudio,
    isAudioReady,
    /** Resume suspended audio context */
    resumeAudio,
    playKick,
    playSnare,
    playClap,
    playHiHat,
    playPerc,
    playTom,
    playRim,
    playSound,
    getCurrentTime,
    disposeAudio
} from './audio';


/**
 * Melody + Chord Progression Templater Module
 *
 * Re-exports all melody/chord-related functionality.
 */

// Model - Core types and utilities
export {
    // Types
    type NoteName,
    type ScaleType,
    type ChordType,
    type MelodyNote,
    type ChordBlock,
    type VoicingStyle,
    type ScaleConfig,
    type HumanizeConfig,
    type ChordRhythmPattern,
    type MelodyTemplate,
    type ChordProgressionTemplate,
    type MelodyStorageV1,

    // Constants
    NOTE_NAMES,
    SCALE_TYPES,
    CHORD_TYPES,
    DEFAULT_HUMANIZE,
    DEFAULT_SCALE,
    MIN_PITCH,
    MAX_PITCH,
    MIN_VELOCITY,
    MAX_VELOCITY,
    MIN_DURATION,
    MAX_DURATION,

    // Utilities
    generateId,
    noteToMidi,
    midiToNote,
    getScaleNotes,
    isInScale,
    snapToScale,
    validatePitch,
    validateVelocity,
    validateDuration,
    getChordNotes,
    applyInversion,
    applyVoicing,
    getVoicedChordNotes,
    createEmptyTemplate,
    createNote,
    createChordBlock,
    humanizeNotes,
} from './model';

// Templates - Built-in progression presets
export {
    PROGRESSION_TEMPLATES,
    getGenres,
    getTemplatesByGenre,
    getTemplateById,
    parseNumeral,
} from './templates';

// Generator - Progression and melody generation
export {
    generateProgression,
    applyRhythmPattern,
    regenerateVoicings,
    setInversion,
    addBassNotes,
    removeBassNotes,
    generateSimpleMelody,
} from './generator';

// Storage - Persistence
export {
    loadMelodyTemplates,
    saveMelodyTemplates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplate,
    setLastOpened,
    listTemplates,
} from './storage';

// Genre Packs - Pre-configured presets
export {
    type GenrePack,
    type MelodyMotif,
    GENRE_PACKS,
    getPackGenres,
    getPacksByGenre,
    getPackById,
    generateMotifNotes,
    isValidPack,
} from './packs';

// Audio - Simple Web Audio playback
export {
    getAudioContext,
    midiToFrequency,
    playNote,
    playChord,
    playClick,
    scheduleNotes,
} from './audio';

// Chord Detection
export {
    type DetectedChord,
    detectChord,
    detectChordAtBeat,
    detectChordsInSequence,
    getChordDescription,
} from './chordDetection';

// Arpeggiator / Strum Engine
export {
    type ArpPattern,
    type ArpRate,
    type ArpConfig,
    type StrumDirection,
    type StrumConfig,
    type ArpEngineConfig,
    type ArpPreviewResult,
    DEFAULT_ARP_CONFIG,
    DEFAULT_STRUM_CONFIG,
    DEFAULT_ARP_ENGINE_CONFIG,
    RATE_TO_BEATS,
    getPatternOrder,
    getSeededPatternOrder,
    getStrumOffsetBeats,
    applyVelocityCurve,
    arpeggiateSingleChord,
    generateArpPreview,
    commitArpPreview,
    validateArpConfig,
} from './arpEngine';

// Lanes - Unified lane system for arrangement view
export {
    type LaneType,
    type NoteMode,
    type BaseLane,
    type MelodyLane,
    type DrumLane,
    type ChordLane,
    type Lane,
    type MelodyInstrument,
    type DrumKit,
    type DrumPattern,
    type Arrangement,
    type SerializedArrangement,
    ARRANGEMENT_SCHEMA_VERSION,
    MAX_ARRANGEMENT_URL_SIZE,
    DRUM_SOUNDS,
    DEFAULT_DRUM_PITCHES,
    generateLaneId,
    createMelodyLane,
    createDrumLane,
    createChordLane,
    createArrangement,
    addLane,
    removeLane,
    updateLane,
    moveLane,
    encodeArrangementToUrl,
    decodeArrangementFromUrl,
    loadArrangements,
    saveArrangements,
    saveArrangement,
    deleteArrangement,
} from './lanes';

// Project Clip References
export {
    type ClipKind,
    type LaneSettings,
    type QuantizeGrid,
    type ClipMetadata,
    type ProjectClipRef,
    type SerializedClipPayload,
    type SerializedClip,
    type ClipsStorage,
    CLIP_REF_SCHEMA_VERSION,
    MAX_URL_PAYLOAD_SIZE,
    generateClipId,
    createDefaultLaneSettings,
    createClipRefFromLane,
    serializeClip,
    deserializeClip,
    serializeClipsToPayload,
    deserializeClipsFromPayload,
    encodeClipsToUrl,
    decodeClipsFromUrl,
    validatePayload,
    validateSerializedClip,
    migratePayload,
    loadProjectClips,
    saveProjectClips,
    attachClipToProject,
    detachClipFromProject,
    getProjectClips,
    updateProjectClip,
} from './clipRef';

// Extended Audio exports
export {
    playPianoNote,
    playDrumSound,
    type InstrumentType,
} from './audio';

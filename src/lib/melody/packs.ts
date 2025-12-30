/**
 * Genre Packs
 *
 * Pre-configured presets that set up complete progressions with
 * key/scale, voicing, rhythm, and humanization all in one click.
 * Data-driven and easy to extend.
 */

import type {
    NoteName,
    ScaleType,
    VoicingStyle,
    ChordRhythmPattern,
    HumanizeConfig,
    MelodyNote,
} from './model';
import { getScaleNotes, generateId } from './model';

// ============================================
// Genre Pack Types
// ============================================

export interface GenrePack {
    id: string;
    name: string;
    genre: string;
    description: string;
    icon: string;

    // Scale configuration
    scale: {
        root: NoteName;
        type: ScaleType;
        snapToScale: boolean;
    };

    // Tempo
    bpm: number;
    bars: number;

    // Progression
    progressionId: string;  // Reference to PROGRESSION_TEMPLATES

    // Voicing
    voicingStyle: VoicingStyle;
    inversion: number;
    addBass: boolean;

    // Rhythm
    rhythmPattern: ChordRhythmPattern;

    // Humanization
    humanize: HumanizeConfig;

    // Optional melody motif (simple pattern)
    melodyMotif?: MelodyMotif;
}

export interface MelodyMotif {
    name: string;
    // Notes defined as scale degrees (0 = root, 2 = third, etc.) with timing
    notes: {
        scaleDegree: number;  // 0-6 for 7-note scales
        octaveOffset: number; // -1, 0, 1 relative to base octave
        startBeat: number;
        duration: number;
        velocity: number;
    }[];
}

// ============================================
// Genre Pack Definitions
// ============================================

export const GENRE_PACKS: GenrePack[] = [
    // House
    {
        id: 'house-deep',
        name: 'Deep House',
        genre: 'House',
        description: 'Warm, soulful chords with gentle swing',
        icon: '🏠',
        scale: { root: 'A', type: 'minor', snapToScale: true },
        bpm: 122,
        bars: 4,
        progressionId: 'house-vi-iv-i-v',
        voicingStyle: 'open',
        inversion: 0,
        addBass: true,
        rhythmPattern: 'pads',
        humanize: {
            enabled: true,
            timingRange: 0.015,
            velocityRange: 8,
            swingAmount: 0.1,
            linkToGlobalSwing: false,
        },
        melodyMotif: {
            name: 'Deep Lead',
            notes: [
                { scaleDegree: 0, octaveOffset: 1, startBeat: 0, duration: 2, velocity: 90 },
                { scaleDegree: 4, octaveOffset: 1, startBeat: 2, duration: 1, velocity: 85 },
                { scaleDegree: 2, octaveOffset: 1, startBeat: 3.5, duration: 0.5, velocity: 80 },
            ],
        },
    },
    {
        id: 'house-tech',
        name: 'Tech House',
        genre: 'House',
        description: 'Driving stabs with minimal harmony',
        icon: '🔧',
        scale: { root: 'G', type: 'minor', snapToScale: true },
        bpm: 126,
        bars: 4,
        progressionId: 'house-i-vi',
        voicingStyle: 'close',
        inversion: 1,
        addBass: false,
        rhythmPattern: 'stabs',
        humanize: {
            enabled: true,
            timingRange: 0.01,
            velocityRange: 12,
            swingAmount: 0.05,
            linkToGlobalSwing: false,
        },
    },

    // Techno
    {
        id: 'techno-dark',
        name: 'Dark Techno',
        genre: 'Techno',
        description: 'Atmospheric drone with tension',
        icon: '🌑',
        scale: { root: 'D', type: 'phrygian', snapToScale: true },
        bpm: 130,
        bars: 8,
        progressionId: 'techno-i',
        voicingStyle: 'spread',
        inversion: 0,
        addBass: true,
        rhythmPattern: 'pads',
        humanize: {
            enabled: true,
            timingRange: 0.02,
            velocityRange: 5,
            swingAmount: 0,
            linkToGlobalSwing: false,
        },
    },
    {
        id: 'techno-melodic',
        name: 'Melodic Techno',
        genre: 'Techno',
        description: 'Emotional arps with driving bass',
        icon: '🎹',
        scale: { root: 'C', type: 'minor', snapToScale: true },
        bpm: 128,
        bars: 8,
        progressionId: 'techno-i-ii',
        voicingStyle: 'open',
        inversion: 0,
        addBass: true,
        rhythmPattern: 'arpeggiated',
        humanize: {
            enabled: true,
            timingRange: 0.015,
            velocityRange: 10,
            swingAmount: 0,
            linkToGlobalSwing: false,
        },
        melodyMotif: {
            name: 'Melodic Arp',
            notes: [
                { scaleDegree: 0, octaveOffset: 1, startBeat: 0, duration: 0.5, velocity: 100 },
                { scaleDegree: 2, octaveOffset: 1, startBeat: 0.5, duration: 0.5, velocity: 85 },
                { scaleDegree: 4, octaveOffset: 1, startBeat: 1, duration: 0.5, velocity: 90 },
                { scaleDegree: 2, octaveOffset: 1, startBeat: 1.5, duration: 0.5, velocity: 80 },
            ],
        },
    },

    // Dubstep
    {
        id: 'dubstep-heavy',
        name: 'Heavy Dubstep',
        genre: 'Dubstep',
        description: 'Aggressive stabs for drops',
        icon: '💥',
        scale: { root: 'F', type: 'minor', snapToScale: true },
        bpm: 140,
        bars: 4,
        progressionId: 'dubstep-i-v',
        voicingStyle: 'close',
        inversion: 0,
        addBass: false,
        rhythmPattern: 'stabs',
        humanize: {
            enabled: false,
            timingRange: 0,
            velocityRange: 0,
            swingAmount: 0,
            linkToGlobalSwing: false,
        },
    },
    {
        id: 'dubstep-melodic',
        name: 'Melodic Dubstep',
        genre: 'Dubstep',
        description: 'Epic emotional buildups',
        icon: '🌊',
        scale: { root: 'E', type: 'minor', snapToScale: true },
        bpm: 140,
        bars: 8,
        progressionId: 'dubstep-i-vi-iv-v',
        voicingStyle: 'spread',
        inversion: 0,
        addBass: true,
        rhythmPattern: 'pads',
        humanize: {
            enabled: true,
            timingRange: 0.01,
            velocityRange: 8,
            swingAmount: 0,
            linkToGlobalSwing: false,
        },
        melodyMotif: {
            name: 'Epic Lead',
            notes: [
                { scaleDegree: 4, octaveOffset: 1, startBeat: 0, duration: 4, velocity: 100 },
                { scaleDegree: 3, octaveOffset: 1, startBeat: 4, duration: 2, velocity: 95 },
                { scaleDegree: 2, octaveOffset: 1, startBeat: 6, duration: 2, velocity: 90 },
            ],
        },
    },

    // Riddim
    {
        id: 'riddim-classic',
        name: 'Classic Riddim',
        genre: 'Riddim',
        description: 'Minimal stabs for maximum impact',
        icon: '👾',
        scale: { root: 'F', type: 'minor', snapToScale: true },
        bpm: 150,
        bars: 2,
        progressionId: 'dubstep-i-v',
        voicingStyle: 'close',
        inversion: 0,
        addBass: false,
        rhythmPattern: 'stabs',
        humanize: {
            enabled: false,
            timingRange: 0,
            velocityRange: 0,
            swingAmount: 0,
            linkToGlobalSwing: false,
        },
    },
    {
        id: 'riddim-briddim',
        name: 'Briddim',
        genre: 'Riddim',
        description: 'UK-influenced with more movement',
        icon: '🇬🇧',
        scale: { root: 'G', type: 'minor', snapToScale: true },
        bpm: 145,
        bars: 4,
        progressionId: 'house-i-vi',
        voicingStyle: 'drop2',
        inversion: 1,
        addBass: false,
        rhythmPattern: 'offbeat',
        humanize: {
            enabled: false,
            timingRange: 0,
            velocityRange: 0,
            swingAmount: 0,
            linkToGlobalSwing: false,
        },
    },

    // DnB
    {
        id: 'dnb-liquid',
        name: 'Liquid DnB',
        genre: 'DnB',
        description: 'Smooth, soulful vibes',
        icon: '💧',
        scale: { root: 'D', type: 'minor', snapToScale: true },
        bpm: 174,
        bars: 8,
        progressionId: 'dnb-i-vi-iv',
        voicingStyle: 'open',
        inversion: 0,
        addBass: true,
        rhythmPattern: 'pads',
        humanize: {
            enabled: true,
            timingRange: 0.02,
            velocityRange: 12,
            swingAmount: 0.15,
            linkToGlobalSwing: false,
        },
        melodyMotif: {
            name: 'Liquid Lead',
            notes: [
                { scaleDegree: 0, octaveOffset: 1, startBeat: 0, duration: 1.5, velocity: 95 },
                { scaleDegree: 1, octaveOffset: 1, startBeat: 2, duration: 0.5, velocity: 85 },
                { scaleDegree: 2, octaveOffset: 1, startBeat: 2.5, duration: 1.5, velocity: 90 },
            ],
        },
    },
    {
        id: 'dnb-neuro',
        name: 'Neurofunk',
        genre: 'DnB',
        description: 'Dark, techy bass music',
        icon: '🧠',
        scale: { root: 'E', type: 'phrygian', snapToScale: true },
        bpm: 176,
        bars: 4,
        progressionId: 'techno-i-ii',
        voicingStyle: 'drop3',
        inversion: 2,
        addBass: true,
        rhythmPattern: 'stabs',
        humanize: {
            enabled: false,
            timingRange: 0,
            velocityRange: 0,
            swingAmount: 0,
            linkToGlobalSwing: false,
        },
    },
    {
        id: 'dnb-jungle',
        name: 'Jungle',
        genre: 'DnB',
        description: 'Classic ragga jungle vibes',
        icon: '🌴',
        scale: { root: 'A', type: 'minor', snapToScale: true },
        bpm: 170,
        bars: 4,
        progressionId: 'dnb-i-v-vi-iv',
        voicingStyle: 'close',
        inversion: 0,
        addBass: true,
        rhythmPattern: 'offbeat',
        humanize: {
            enabled: true,
            timingRange: 0.025,
            velocityRange: 15,
            swingAmount: 0.2,
            linkToGlobalSwing: false,
        },
    },

    // Trap
    {
        id: 'trap-dark',
        name: 'Dark Trap',
        genre: 'Trap',
        description: 'Moody, atmospheric trap',
        icon: '🖤',
        scale: { root: 'C', type: 'minor', snapToScale: true },
        bpm: 140,
        bars: 4,
        progressionId: 'trap-i-vi',
        voicingStyle: 'spread',
        inversion: 0,
        addBass: true,
        rhythmPattern: 'pads',
        humanize: {
            enabled: true,
            timingRange: 0.02,
            velocityRange: 10,
            swingAmount: 0.1,
            linkToGlobalSwing: false,
        },
        melodyMotif: {
            name: 'Dark Melody',
            notes: [
                { scaleDegree: 4, octaveOffset: 1, startBeat: 0, duration: 0.5, velocity: 100 },
                { scaleDegree: 3, octaveOffset: 1, startBeat: 1, duration: 0.5, velocity: 90 },
                { scaleDegree: 0, octaveOffset: 1, startBeat: 2, duration: 1, velocity: 95 },
            ],
        },
    },
    {
        id: 'trap-melodic',
        name: 'Melodic Trap',
        genre: 'Trap',
        description: 'Emotional, guitar-influenced',
        icon: '🎸',
        scale: { root: 'G', type: 'minor', snapToScale: true },
        bpm: 145,
        bars: 8,
        progressionId: 'trap-i-iv-vi-v',
        voicingStyle: 'open',
        inversion: 0,
        addBass: true,
        rhythmPattern: 'arpeggiated',
        humanize: {
            enabled: true,
            timingRange: 0.015,
            velocityRange: 12,
            swingAmount: 0.05,
            linkToGlobalSwing: false,
        },
        melodyMotif: {
            name: 'Melodic Lead',
            notes: [
                { scaleDegree: 0, octaveOffset: 1, startBeat: 0, duration: 1, velocity: 95 },
                { scaleDegree: 2, octaveOffset: 1, startBeat: 1, duration: 0.5, velocity: 85 },
                { scaleDegree: 4, octaveOffset: 1, startBeat: 1.5, duration: 0.5, velocity: 90 },
                { scaleDegree: 5, octaveOffset: 1, startBeat: 2, duration: 1, velocity: 100 },
            ],
        },
    },
    {
        id: 'trap-drill',
        name: 'UK Drill',
        genre: 'Trap',
        description: 'Dark sliding 808s vibe',
        icon: '🇬🇧',
        scale: { root: 'F', type: 'minor', snapToScale: true },
        bpm: 140,
        bars: 4,
        progressionId: 'trap-i-vi',
        voicingStyle: 'close',
        inversion: 0,
        addBass: true,
        rhythmPattern: 'stabs',
        humanize: {
            enabled: false,
            timingRange: 0,
            velocityRange: 0,
            swingAmount: 0,
            linkToGlobalSwing: false,
        },
    },
];

// ============================================
// Utility Functions
// ============================================

/**
 * Get all unique genres from packs
 */
export function getPackGenres(): string[] {
    const genres = new Set(GENRE_PACKS.map(p => p.genre));
    return Array.from(genres);
}

/**
 * Get packs by genre
 */
export function getPacksByGenre(genre: string): GenrePack[] {
    return GENRE_PACKS.filter(p => p.genre === genre);
}

/**
 * Get a pack by ID
 */
export function getPackById(id: string): GenrePack | undefined {
    return GENRE_PACKS.find(p => p.id === id);
}

/**
 * Generate melody notes from a motif pattern
 */
export function generateMotifNotes(
    motif: MelodyMotif,
    scaleRoot: NoteName,
    scaleType: ScaleType,
    baseOctave: number = 4
): MelodyNote[] {
    const scaleNotes = getScaleNotes(scaleRoot, scaleType);

    return motif.notes.map(note => {
        // Get the scale degree pitch class
        const degreeIndex = note.scaleDegree % scaleNotes.length;
        const pitchClass = scaleNotes[degreeIndex];

        // Calculate MIDI pitch
        const octave = baseOctave + note.octaveOffset;
        const pitch = (octave + 1) * 12 + pitchClass;

        return {
            id: generateId(),
            pitch,
            startBeat: note.startBeat,
            duration: note.duration,
            velocity: note.velocity,
        };
    });
}

/**
 * Validate that a pack has all required fields
 */
export function isValidPack(pack: unknown): pack is GenrePack {
    if (!pack || typeof pack !== 'object') return false;
    const p = pack as Record<string, unknown>;

    return (
        typeof p.id === 'string' &&
        typeof p.name === 'string' &&
        typeof p.genre === 'string' &&
        typeof p.scale === 'object' &&
        typeof p.bpm === 'number' &&
        typeof p.progressionId === 'string' &&
        typeof p.voicingStyle === 'string' &&
        typeof p.rhythmPattern === 'string' &&
        typeof p.humanize === 'object'
    );
}


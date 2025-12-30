/**
 * Arpeggiator / Strum Engine
 *
 * Converts chord blocks into note sequences via patterns, rates, and strum timing.
 * Non-destructive: generates preview notes that can be committed.
 */

import type { MelodyNote, ChordBlock, HumanizeConfig, ScaleConfig } from './model';
import { generateId, getVoicedChordNotes, snapToScale, humanizeNotes } from './model';

// ============================================
// Types
// ============================================

export type ArpPattern = 'up' | 'down' | 'upDown' | 'downUp' | 'random' | 'played';

export type ArpRate = '1/1' | '1/2' | '1/4' | '1/8' | '1/16' | '1/32';

export interface ArpConfig {
    /** Arpeggio pattern */
    pattern: ArpPattern;
    /** Note rate (rhythmic division) */
    rate: ArpRate;
    /** Gate as percentage (0-100), controls note length relative to rate */
    gate: number;
    /** Number of octaves to span (1-4) */
    octaves: number;
    /** Whether to include the chord root at the end of each cycle */
    includeRoot: boolean;
}

export type StrumDirection = 'up' | 'down' | 'alternate';

export interface StrumConfig {
    /** Enable strum mode instead of arp */
    enabled: boolean;
    /** Time between each note in milliseconds */
    timeMs: number;
    /** Or time in ticks (1 tick = 1/480 of a beat at 120 BPM) */
    timeTicks: number;
    /** Use ticks instead of ms */
    useTicks: boolean;
    /** Strum direction */
    direction: StrumDirection;
    /** Velocity curve: 'flat' | 'accent-first' | 'accent-last' | 'crescendo' | 'decrescendo' */
    velocityCurve: 'flat' | 'accentFirst' | 'accentLast' | 'crescendo' | 'decrescendo';
}

export interface ArpEngineConfig {
    arp: ArpConfig;
    strum: StrumConfig;
}

export interface ArpPreviewResult {
    /** Generated notes from arpeggiator */
    notes: MelodyNote[];
    /** Original chord blocks (preserved) */
    originalChords: ChordBlock[];
    /** Config used to generate */
    config: ArpEngineConfig;
}

// ============================================
// Constants
// ============================================

export const DEFAULT_ARP_CONFIG: ArpConfig = {
    pattern: 'up',
    rate: '1/8',
    gate: 80,
    octaves: 1,
    includeRoot: false,
};

export const DEFAULT_STRUM_CONFIG: StrumConfig = {
    enabled: false,
    timeMs: 30,
    timeTicks: 20,
    useTicks: false,
    direction: 'up',
    velocityCurve: 'flat',
};

export const DEFAULT_ARP_ENGINE_CONFIG: ArpEngineConfig = {
    arp: DEFAULT_ARP_CONFIG,
    strum: DEFAULT_STRUM_CONFIG,
};

/** Rate to beats conversion */
export const RATE_TO_BEATS: Record<ArpRate, number> = {
    '1/1': 4,
    '1/2': 2,
    '1/4': 1,
    '1/8': 0.5,
    '1/16': 0.25,
    '1/32': 0.125,
};

// ============================================
// Pattern Generation
// ============================================

/**
 * Get note order based on arp pattern
 */
export function getPatternOrder(
    pitches: number[],
    pattern: ArpPattern,
    octaves: number = 1,
    includeRoot: boolean = false
): number[] {
    if (pitches.length === 0) return [];

    // Sort pitches ascending
    const sorted = [...pitches].sort((a, b) => a - b);

    // Expand to octaves
    let expanded: number[] = [];
    for (let oct = 0; oct < octaves; oct++) {
        expanded.push(...sorted.map(p => p + oct * 12));
    }

    let result: number[];

    switch (pattern) {
        case 'up':
            result = expanded;
            break;

        case 'down':
            result = [...expanded].reverse();
            break;

        case 'upDown':
            // Up then down (excluding last note of up to avoid repeat)
            result = [...expanded, ...expanded.slice(0, -1).reverse()];
            break;

        case 'downUp':
            // Down then up (excluding last note of down to avoid repeat)
            const reversed = [...expanded].reverse();
            result = [...reversed, ...reversed.slice(0, -1).reverse()];
            break;

        case 'random':
            result = [...expanded];
            // Fisher-Yates shuffle
            for (let i = result.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [result[i], result[j]] = [result[j], result[i]];
            }
            break;

        case 'played':
            // Keep original order (as provided)
            result = pitches;
            for (let oct = 1; oct < octaves; oct++) {
                result = [...result, ...pitches.map(p => p + oct * 12)];
            }
            break;

        default:
            result = expanded;
    }

    // Add root at end if requested
    if (includeRoot && sorted.length > 0) {
        result.push(sorted[0]);
    }

    return result;
}

/**
 * Generate deterministic "random" pattern using seed
 */
export function getSeededPatternOrder(
    pitches: number[],
    pattern: ArpPattern,
    octaves: number,
    includeRoot: boolean,
    seed: number
): number[] {
    if (pattern !== 'random') {
        return getPatternOrder(pitches, pattern, octaves, includeRoot);
    }

    // Sort and expand
    const sorted = [...pitches].sort((a, b) => a - b);
    let expanded: number[] = [];
    for (let oct = 0; oct < octaves; oct++) {
        expanded.push(...sorted.map(p => p + oct * 12));
    }

    // Seeded shuffle (simple LCG)
    const seededRandom = (s: number) => {
        const x = Math.sin(s) * 10000;
        return x - Math.floor(x);
    };

    const result = [...expanded];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom(seed + i) * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }

    if (includeRoot && sorted.length > 0) {
        result.push(sorted[0]);
    }

    return result;
}

// ============================================
// Strum Generation
// ============================================

/**
 * Calculate strum offset in beats
 */
export function getStrumOffsetBeats(
    config: StrumConfig,
    bpm: number,
    noteIndex: number,
    totalNotes: number,
    chordIndex: number
): number {
    if (!config.enabled || totalNotes <= 1) return 0;

    const offsetPerNote = config.useTicks
        ? (config.timeTicks / 480) // ticks to beats (480 ticks per beat standard)
        : (config.timeMs / 1000) * (bpm / 60); // ms to beats

    let direction: 'up' | 'down';

    if (config.direction === 'alternate') {
        direction = chordIndex % 2 === 0 ? 'up' : 'down';
    } else {
        direction = config.direction;
    }

    if (direction === 'up') {
        return noteIndex * offsetPerNote;
    } else {
        return (totalNotes - 1 - noteIndex) * offsetPerNote;
    }
}

/**
 * Apply velocity curve to a note in a strum
 */
export function applyVelocityCurve(
    baseVelocity: number,
    curve: StrumConfig['velocityCurve'],
    noteIndex: number,
    totalNotes: number
): number {
    if (totalNotes <= 1) return baseVelocity;

    const position = noteIndex / (totalNotes - 1); // 0 to 1

    switch (curve) {
        case 'flat':
            return baseVelocity;

        case 'accentFirst':
            return noteIndex === 0
                ? Math.min(127, baseVelocity + 20)
                : Math.max(1, baseVelocity - 10);

        case 'accentLast':
            return noteIndex === totalNotes - 1
                ? Math.min(127, baseVelocity + 20)
                : Math.max(1, baseVelocity - 10);

        case 'crescendo':
            return Math.round(baseVelocity * (0.6 + 0.4 * position));

        case 'decrescendo':
            return Math.round(baseVelocity * (1 - 0.4 * position));

        default:
            return baseVelocity;
    }
}

// ============================================
// Main Engine
// ============================================

/**
 * Generate arpeggiated notes from a single chord block
 */
export function arpeggiateSingleChord(
    chord: ChordBlock,
    config: ArpEngineConfig,
    bpm: number,
    chordIndex: number = 0,
    seed?: number
): MelodyNote[] {
    const pitches = getVoicedChordNotes(chord);
    if (pitches.length === 0) return [];

    const notes: MelodyNote[] = [];
    const { arp, strum } = config;

    if (strum.enabled) {
        // Strum mode: all notes play near-simultaneously with offset
        const sortedPitches = [...pitches].sort((a, b) => a - b);

        sortedPitches.forEach((pitch, i) => {
            const offset = getStrumOffsetBeats(strum, bpm, i, sortedPitches.length, chordIndex);
            const velocity = applyVelocityCurve(chord.velocity, strum.velocityCurve, i, sortedPitches.length);

            notes.push({
                id: generateId(),
                pitch,
                startBeat: chord.startBeat + offset,
                duration: Math.max(0.1, chord.duration - offset),
                velocity: Math.round(velocity),
            });
        });
    } else {
        // Arp mode: notes play sequentially
        const patternPitches = seed !== undefined
            ? getSeededPatternOrder(pitches, arp.pattern, arp.octaves, arp.includeRoot, seed)
            : getPatternOrder(pitches, arp.pattern, arp.octaves, arp.includeRoot);

        const noteRate = RATE_TO_BEATS[arp.rate];
        const noteDuration = noteRate * (arp.gate / 100);

        // How many notes fit in the chord duration
        const maxNotes = Math.floor(chord.duration / noteRate);

        let currentBeat = chord.startBeat;
        let patternIndex = 0;

        for (let i = 0; i < maxNotes && patternPitches.length > 0; i++) {
            const pitch = patternPitches[patternIndex % patternPitches.length];

            notes.push({
                id: generateId(),
                pitch,
                startBeat: currentBeat,
                duration: noteDuration,
                velocity: chord.velocity,
            });

            currentBeat += noteRate;
            patternIndex++;
        }
    }

    return notes;
}

/**
 * Generate preview notes from all chord blocks
 */
export function generateArpPreview(
    chords: ChordBlock[],
    config: ArpEngineConfig,
    bpm: number,
    scale?: ScaleConfig,
    humanize?: HumanizeConfig,
    deterministicSeed?: number
): ArpPreviewResult {
    let allNotes: MelodyNote[] = [];

    chords.forEach((chord, index) => {
        const seed = deterministicSeed !== undefined ? deterministicSeed + index : undefined;
        const chordNotes = arpeggiateSingleChord(chord, config, bpm, index, seed);
        allNotes.push(...chordNotes);
    });

    // Apply scale snapping if configured
    if (scale?.snapToScale) {
        allNotes = allNotes.map(note => ({
            ...note,
            pitch: snapToScale(note.pitch, scale),
        }));
    }

    // Apply humanization if configured
    if (humanize?.enabled) {
        allNotes = humanizeNotes(allNotes, humanize);
    }

    // Sort by start time
    allNotes.sort((a, b) => a.startBeat - b.startBeat);

    return {
        notes: allNotes,
        originalChords: chords,
        config,
    };
}

/**
 * Commit preview notes to the main notes array
 * Returns new notes array with arp notes added
 */
export function commitArpPreview(
    existingNotes: MelodyNote[],
    preview: ArpPreviewResult
): MelodyNote[] {
    // Assign new IDs to avoid conflicts
    const newNotes = preview.notes.map(note => ({
        ...note,
        id: generateId(),
    }));

    return [...existingNotes, ...newNotes].sort((a, b) => a.startBeat - b.startBeat);
}

/**
 * Validate arp config
 */
export function validateArpConfig(config: ArpEngineConfig): string[] {
    const errors: string[] = [];

    if (config.arp.gate < 1 || config.arp.gate > 200) {
        errors.push('Gate must be between 1 and 200');
    }

    if (config.arp.octaves < 1 || config.arp.octaves > 4) {
        errors.push('Octaves must be between 1 and 4');
    }

    if (config.strum.timeMs < 0 || config.strum.timeMs > 500) {
        errors.push('Strum time (ms) must be between 0 and 500');
    }

    if (config.strum.timeTicks < 0 || config.strum.timeTicks > 480) {
        errors.push('Strum time (ticks) must be between 0 and 480');
    }

    return errors;
}


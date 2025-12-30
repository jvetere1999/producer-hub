/**
 * Melody + Chord Progression Templater - Core Model
 *
 * Defines types and utilities for melody notes, chord blocks,
 * scales, progressions, voicings, and humanization.
 */

// ============================================
// Musical Constants
// ============================================

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export type NoteName = typeof NOTE_NAMES[number];

export const SCALE_TYPES = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
    lydian: [0, 2, 4, 6, 7, 9, 11],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    aeolian: [0, 2, 3, 5, 7, 8, 10], // same as natural minor
    locrian: [0, 1, 3, 5, 6, 8, 10],
    harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
    melodicMinor: [0, 2, 3, 5, 7, 9, 11],
    pentatonicMajor: [0, 2, 4, 7, 9],
    pentatonicMinor: [0, 3, 5, 7, 10],
    blues: [0, 3, 5, 6, 7, 10],
} as const;

export type ScaleType = keyof typeof SCALE_TYPES;

export const CHORD_TYPES = {
    major: [0, 4, 7],
    minor: [0, 3, 7],
    diminished: [0, 3, 6],
    augmented: [0, 4, 8],
    sus2: [0, 2, 7],
    sus4: [0, 5, 7],
    major7: [0, 4, 7, 11],
    minor7: [0, 3, 7, 10],
    dominant7: [0, 4, 7, 10],
    diminished7: [0, 3, 6, 9],
    halfDiminished7: [0, 3, 6, 10],
    minorMajor7: [0, 3, 7, 11],
    add9: [0, 4, 7, 14],
    minor9: [0, 3, 7, 10, 14],
    major9: [0, 4, 7, 11, 14],
} as const;

export type ChordType = keyof typeof CHORD_TYPES;

// ============================================
// Core Types
// ============================================

export interface MelodyNote {
    id: string;
    pitch: number;       // MIDI note number (0-127)
    startBeat: number;   // Start position in beats (quarter notes)
    duration: number;    // Duration in beats
    velocity: number;    // 1-127
}

export interface ChordBlock {
    id: string;
    rootPitch: number;   // MIDI note number of chord root
    chordType: ChordType;
    startBeat: number;
    duration: number;
    velocity: number;
    inversion: number;   // 0 = root position, 1 = first inversion, etc.
    voicingStyle: VoicingStyle;
    bassNote?: number;   // Optional separate bass note (MIDI)
}

export type VoicingStyle = 'close' | 'open' | 'spread' | 'drop2' | 'drop3';

export interface ScaleConfig {
    root: NoteName;
    type: ScaleType;
    snapToScale: boolean;
}

export interface HumanizeConfig {
    enabled: boolean;
    timingRange: number;    // Max timing offset in beats (e.g., 0.05)
    velocityRange: number;  // Max velocity variation (e.g., 15)
    swingAmount: number;    // 0-1, how much swing to apply
    linkToGlobalSwing: boolean;
}

export type ChordRhythmPattern = 'whole' | 'half' | 'stabs' | 'offbeat' | 'pads' | 'arpeggiated';

export interface MelodyTemplate {
    id: string;
    name: string;
    scale: ScaleConfig;
    bpm: number;
    timeSignature: [number, number]; // [beats per bar, beat unit]
    bars: number;
    melodyNotes: MelodyNote[];
    chordBlocks: ChordBlock[];
    humanize: HumanizeConfig;
    chordRhythmPattern: ChordRhythmPattern;
    createdAt: string;
    updatedAt: string;
}

export interface ChordProgressionTemplate {
    id: string;
    name: string;
    genre: string;
    description: string;
    numerals: string[];      // e.g., ['I', 'V', 'vi', 'IV']
    durations: number[];     // Duration of each chord in beats
    rhythmPattern: ChordRhythmPattern;
}

// ============================================
// Storage Schema
// ============================================

export interface MelodyStorageV1 {
    version: 1;
    templates: MelodyTemplate[];
    lastOpenedId: string | null;
}

// ============================================
// Constants
// ============================================

export const DEFAULT_HUMANIZE: HumanizeConfig = {
    enabled: false,
    timingRange: 0.02,
    velocityRange: 10,
    swingAmount: 0,
    linkToGlobalSwing: false,
};

export const DEFAULT_SCALE: ScaleConfig = {
    root: 'C',
    type: 'minor',
    snapToScale: true,
};

export const MIN_PITCH = 21;  // A0
export const MAX_PITCH = 108; // C8
export const MIN_VELOCITY = 1;
export const MAX_VELOCITY = 127;
export const MIN_DURATION = 0.0625; // 1/16th note minimum
export const MAX_DURATION = 16;     // 4 bars maximum

// ============================================
// Utility Functions
// ============================================

let idCounter = 0;

export function generateId(): string {
    return `${Date.now().toString(36)}-${(++idCounter).toString(36)}`;
}

/**
 * Converts a note name and octave to MIDI pitch
 */
export function noteToMidi(note: NoteName, octave: number): number {
    const noteIndex = NOTE_NAMES.indexOf(note);
    return (octave + 1) * 12 + noteIndex;
}

/**
 * Converts a MIDI pitch to note name and octave
 */
export function midiToNote(midi: number): { note: NoteName; octave: number } {
    const octave = Math.floor(midi / 12) - 1;
    const noteIndex = midi % 12;
    return { note: NOTE_NAMES[noteIndex], octave };
}

/**
 * Gets the scale degrees for a given root and scale type
 */
export function getScaleNotes(root: NoteName, scaleType: ScaleType): number[] {
    const rootIndex = NOTE_NAMES.indexOf(root);
    const intervals = SCALE_TYPES[scaleType];
    return intervals.map(interval => (rootIndex + interval) % 12);
}

/**
 * Checks if a MIDI pitch is in the given scale
 */
export function isInScale(pitch: number, scale: ScaleConfig): boolean {
    const scaleNotes = getScaleNotes(scale.root, scale.type);
    const pitchClass = pitch % 12;
    return scaleNotes.includes(pitchClass);
}

/**
 * Snaps a pitch to the nearest scale degree
 */
export function snapToScale(pitch: number, scale: ScaleConfig): number {
    if (isInScale(pitch, scale)) return pitch;

    const scaleNotes = getScaleNotes(scale.root, scale.type);
    const pitchClass = pitch % 12;
    const octave = Math.floor(pitch / 12);

    // Find nearest scale degree
    let minDistance = Infinity;
    let nearestPitchClass = pitchClass;

    for (const scaleNote of scaleNotes) {
        const distance = Math.min(
            Math.abs(scaleNote - pitchClass),
            12 - Math.abs(scaleNote - pitchClass)
        );
        if (distance < minDistance) {
            minDistance = distance;
            nearestPitchClass = scaleNote;
        }
    }

    // Handle wrap-around
    let result = octave * 12 + nearestPitchClass;
    if (nearestPitchClass < pitchClass && pitchClass - nearestPitchClass > 6) {
        result += 12;
    } else if (nearestPitchClass > pitchClass && nearestPitchClass - pitchClass > 6) {
        result -= 12;
    }

    return Math.max(MIN_PITCH, Math.min(MAX_PITCH, result));
}

/**
 * Validates a pitch is within allowed range
 */
export function validatePitch(pitch: number): number {
    return Math.max(MIN_PITCH, Math.min(MAX_PITCH, Math.round(pitch)));
}

/**
 * Validates a velocity is within allowed range
 */
export function validateVelocity(velocity: number): number {
    return Math.max(MIN_VELOCITY, Math.min(MAX_VELOCITY, Math.round(velocity)));
}

/**
 * Validates a duration is within allowed range
 */
export function validateDuration(duration: number): number {
    return Math.max(MIN_DURATION, Math.min(MAX_DURATION, duration));
}

/**
 * Gets chord notes for a given root and chord type
 */
export function getChordNotes(rootPitch: number, chordType: ChordType): number[] {
    const intervals = CHORD_TYPES[chordType];
    return intervals.map(interval => rootPitch + interval);
}

/**
 * Applies inversion to chord notes
 */
export function applyInversion(notes: number[], inversion: number): number[] {
    if (inversion === 0 || notes.length === 0) return [...notes];

    const result = [...notes];
    const effectiveInversion = inversion % notes.length;

    for (let i = 0; i < effectiveInversion; i++) {
        const note = result.shift()!;
        result.push(note + 12);
    }

    return result;
}

/**
 * Applies voicing style to chord notes
 */
export function applyVoicing(notes: number[], style: VoicingStyle): number[] {
    if (notes.length < 3) return notes;

    switch (style) {
        case 'close':
            return notes;
        case 'open':
            // Move middle notes up an octave for more spread
            return notes.map((n, i) => i === 1 ? n + 12 : n);
        case 'spread':
            // Spread notes across two octaves
            return notes.map((n, i) => n + Math.floor(i / 2) * 12);
        case 'drop2':
            // Drop the second highest note down an octave
            if (notes.length >= 3) {
                const sorted = [...notes].sort((a, b) => b - a);
                const secondHighest = sorted[1];
                return notes.map(n => n === secondHighest ? n - 12 : n);
            }
            return notes;
        case 'drop3':
            // Drop the third highest note down an octave
            if (notes.length >= 3) {
                const sorted = [...notes].sort((a, b) => b - a);
                const thirdHighest = sorted[2];
                return notes.map(n => n === thirdHighest ? n - 12 : n);
            }
            return notes;
        default:
            return notes;
    }
}

/**
 * Gets fully voiced chord notes with inversion and voicing applied
 */
export function getVoicedChordNotes(chord: ChordBlock): number[] {
    let notes = getChordNotes(chord.rootPitch, chord.chordType);
    notes = applyInversion(notes, chord.inversion);
    notes = applyVoicing(notes, chord.voicingStyle);

    // Add bass note if specified
    if (chord.bassNote !== undefined) {
        const bassOctave = Math.floor(Math.min(...notes) / 12) - 1;
        const bassNote = (chord.bassNote % 12) + bassOctave * 12;
        notes = [bassNote, ...notes.filter(n => n !== bassNote)];
    }

    return notes.map(validatePitch);
}

/**
 * Creates a new empty melody template
 */
export function createEmptyTemplate(name = 'New Template'): MelodyTemplate {
    const now = new Date().toISOString();
    return {
        id: generateId(),
        name,
        scale: { ...DEFAULT_SCALE },
        bpm: 120,
        timeSignature: [4, 4],
        bars: 4,
        melodyNotes: [],
        chordBlocks: [],
        humanize: { ...DEFAULT_HUMANIZE },
        chordRhythmPattern: 'whole',
        createdAt: now,
        updatedAt: now,
    };
}

/**
 * Creates a new melody note
 */
export function createNote(
    pitch: number,
    startBeat: number,
    duration: number = 1,
    velocity: number = 100
): MelodyNote {
    return {
        id: generateId(),
        pitch: validatePitch(pitch),
        startBeat: Math.max(0, startBeat),
        duration: validateDuration(duration),
        velocity: validateVelocity(velocity),
    };
}

/**
 * Creates a new chord block
 */
export function createChordBlock(
    rootPitch: number,
    chordType: ChordType,
    startBeat: number,
    duration: number = 4,
    velocity: number = 100
): ChordBlock {
    return {
        id: generateId(),
        rootPitch: validatePitch(rootPitch),
        chordType,
        startBeat: Math.max(0, startBeat),
        duration: validateDuration(duration),
        velocity: validateVelocity(velocity),
        inversion: 0,
        voicingStyle: 'close',
    };
}

/**
 * Applies humanization to notes
 */
export function humanizeNotes(notes: MelodyNote[], config: HumanizeConfig): MelodyNote[] {
    if (!config.enabled) return notes;

    return notes.map(note => {
        const timingOffset = (Math.random() - 0.5) * 2 * config.timingRange;
        const velocityOffset = Math.round((Math.random() - 0.5) * 2 * config.velocityRange);

        // Apply swing to off-beats
        let swingOffset = 0;
        if (config.swingAmount > 0) {
            const isOffBeat = (note.startBeat * 2) % 2 === 1;
            if (isOffBeat) {
                swingOffset = config.swingAmount * 0.1; // Max 10% of beat
            }
        }

        return {
            ...note,
            startBeat: Math.max(0, note.startBeat + timingOffset + swingOffset),
            velocity: validateVelocity(note.velocity + velocityOffset),
        };
    });
}


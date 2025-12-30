/**
 * Chord Detection Module
 *
 * Analyzes groups of notes and identifies what chord they form.
 */

import type { MelodyNote } from './model';

export interface DetectedChord {
    root: string;           // Root note name (C, D, E, etc.)
    type: string;           // Chord type (major, minor, dim, etc.)
    symbol: string;         // Display symbol (Cmaj7, Dm, etc.)
    notes: number[];        // MIDI pitches involved
    inversion: number;      // 0 = root position, 1 = first inversion, etc.
    confidence: number;     // 0-1 how confident the detection is
}

// Interval patterns for chord types (in semitones from root)
const CHORD_PATTERNS: Record<string, { intervals: number[]; symbol: string; priority: number }> = {
    // Triads
    'major': { intervals: [0, 4, 7], symbol: '', priority: 10 },
    'minor': { intervals: [0, 3, 7], symbol: 'm', priority: 10 },
    'diminished': { intervals: [0, 3, 6], symbol: 'dim', priority: 8 },
    'augmented': { intervals: [0, 4, 8], symbol: 'aug', priority: 8 },
    'sus2': { intervals: [0, 2, 7], symbol: 'sus2', priority: 6 },
    'sus4': { intervals: [0, 5, 7], symbol: 'sus4', priority: 6 },

    // Seventh chords
    'major7': { intervals: [0, 4, 7, 11], symbol: 'maj7', priority: 9 },
    'minor7': { intervals: [0, 3, 7, 10], symbol: 'm7', priority: 9 },
    'dominant7': { intervals: [0, 4, 7, 10], symbol: '7', priority: 9 },
    'diminished7': { intervals: [0, 3, 6, 9], symbol: 'dim7', priority: 7 },
    'halfDiminished7': { intervals: [0, 3, 6, 10], symbol: 'm7♭5', priority: 7 },
    'minorMajor7': { intervals: [0, 3, 7, 11], symbol: 'mMaj7', priority: 7 },
    'augmented7': { intervals: [0, 4, 8, 10], symbol: 'aug7', priority: 7 },

    // Extended chords (simplified - just checking key intervals)
    'add9': { intervals: [0, 4, 7, 14], symbol: 'add9', priority: 5 },
    'madd9': { intervals: [0, 3, 7, 14], symbol: 'madd9', priority: 5 },
    '6': { intervals: [0, 4, 7, 9], symbol: '6', priority: 5 },
    'm6': { intervals: [0, 3, 7, 9], symbol: 'm6', priority: 5 },

    // Power chord
    'power': { intervals: [0, 7], symbol: '5', priority: 4 },

    // Single intervals
    'octave': { intervals: [0, 12], symbol: 'oct', priority: 2 },
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Get note name from MIDI pitch
 */
function midiToNoteName(midi: number): string {
    return NOTE_NAMES[midi % 12];
}

/**
 * Normalize pitches to pitch classes (0-11) and remove duplicates
 */
function normalizePitches(pitches: number[]): number[] {
    const pitchClasses = new Set(pitches.map(p => p % 12));
    return Array.from(pitchClasses).sort((a, b) => a - b);
}

/**
 * Get all rotations of an array (for inversion detection)
 */
function getRotations<T>(arr: T[]): T[][] {
    const rotations: T[][] = [];
    for (let i = 0; i < arr.length; i++) {
        rotations.push([...arr.slice(i), ...arr.slice(0, i)]);
    }
    return rotations;
}

/**
 * Calculate intervals from a bass note
 */
function calculateIntervals(pitchClasses: number[], bass: number): number[] {
    return pitchClasses.map(pc => (pc - bass + 12) % 12).sort((a, b) => a - b);
}

/**
 * Check if two interval arrays match (allowing for octave equivalence)
 */
function intervalsMatch(detected: number[], pattern: number[]): boolean {
    // Normalize both to remove octave duplications
    const normalizedDetected = [...new Set(detected.map(i => i % 12))].sort((a, b) => a - b);
    const normalizedPattern = [...new Set(pattern.map(i => i % 12))].sort((a, b) => a - b);

    if (normalizedDetected.length !== normalizedPattern.length) return false;

    return normalizedDetected.every((interval, idx) => interval === normalizedPattern[idx]);
}

/**
 * Detect chord from a set of MIDI pitches
 */
export function detectChord(pitches: number[]): DetectedChord | null {
    if (pitches.length < 2) return null;

    const pitchClasses = normalizePitches(pitches);

    if (pitchClasses.length < 2) return null;

    let bestMatch: DetectedChord | null = null;
    let bestPriority = -1;

    // Try each pitch class as potential root
    for (let inversion = 0; inversion < pitchClasses.length; inversion++) {
        const potentialRoot = pitchClasses[inversion];
        const intervals = calculateIntervals(pitchClasses, potentialRoot);

        // Check against all chord patterns
        for (const [type, pattern] of Object.entries(CHORD_PATTERNS)) {
            if (intervalsMatch(intervals, pattern.intervals)) {
                // Found a match
                if (pattern.priority > bestPriority) {
                    bestPriority = pattern.priority;
                    bestMatch = {
                        root: midiToNoteName(potentialRoot),
                        type,
                        symbol: midiToNoteName(potentialRoot) + pattern.symbol,
                        notes: pitches,
                        inversion: inversion,
                        confidence: pattern.priority / 10,
                    };
                }
            }
        }
    }

    return bestMatch;
}

/**
 * Detect chord from notes at a specific beat
 */
export function detectChordAtBeat(notes: MelodyNote[], beat: number, tolerance: number = 0.5): DetectedChord | null {
    // Find all notes that are sounding at this beat
    const activeNotes = notes.filter(note =>
        beat >= note.startBeat - tolerance &&
        beat < note.startBeat + note.duration + tolerance
    );

    if (activeNotes.length < 2) return null;

    const pitches = activeNotes.map(n => n.pitch);
    return detectChord(pitches);
}

/**
 * Detect all chords in a sequence of notes
 * Groups notes by their start beat and detects chords for each group
 */
export function detectChordsInSequence(notes: MelodyNote[]): Map<number, DetectedChord> {
    const chordMap = new Map<number, DetectedChord>();

    if (notes.length === 0) return chordMap;

    // Group notes by start beat (rounded to nearest beat)
    const notesByBeat = new Map<number, MelodyNote[]>();

    notes.forEach(note => {
        const roundedBeat = Math.round(note.startBeat * 4) / 4; // Round to 16th note
        if (!notesByBeat.has(roundedBeat)) {
            notesByBeat.set(roundedBeat, []);
        }
        notesByBeat.get(roundedBeat)!.push(note);
    });

    // Detect chord for each beat group
    notesByBeat.forEach((beatNotes, beat) => {
        if (beatNotes.length >= 2) {
            const chord = detectChord(beatNotes.map(n => n.pitch));
            if (chord) {
                chordMap.set(beat, chord);
            }
        }
    });

    return chordMap;
}

/**
 * Get a descriptive name for the chord
 */
export function getChordDescription(chord: DetectedChord): string {
    const inversionNames = ['root position', '1st inversion', '2nd inversion', '3rd inversion'];
    const inversionText = chord.inversion > 0 ? ` (${inversionNames[chord.inversion] || 'inverted'})` : '';
    return `${chord.symbol}${inversionText}`;
}


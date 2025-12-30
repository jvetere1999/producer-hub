/**
 * Progression Generator
 *
 * Generates chord blocks from progression templates with voicing and rhythm.
 */

import {
    type ChordBlock,
    type ChordType,
    type ScaleConfig,
    type ChordRhythmPattern,
    type VoicingStyle,
    NOTE_NAMES,
    createChordBlock,
    noteToMidi,
    generateId,
} from './model';
import { parseNumeral, type ChordProgressionTemplate } from './templates';

/**
 * Generates chord blocks from a progression template
 */
export function generateProgression(
    template: ChordProgressionTemplate,
    scale: ScaleConfig,
    baseOctave: number = 3,
    voicingStyle: VoicingStyle = 'close'
): ChordBlock[] {
    const rootMidi = noteToMidi(scale.root, baseOctave);
    const chords: ChordBlock[] = [];
    let currentBeat = 0;

    for (let i = 0; i < template.numerals.length; i++) {
        const numeral = template.numerals[i];
        const duration = template.durations[i] || 4;

        const parsed = parseNumeral(numeral);
        if (!parsed) continue;

        const chordRoot = rootMidi + parsed.degreeOffset;
        const chordType = mapQualityToChordType(parsed.chordType);

        chords.push({
            id: generateId(),
            rootPitch: chordRoot,
            chordType,
            startBeat: currentBeat,
            duration,
            velocity: 100,
            inversion: 0,
            voicingStyle,
        });

        currentBeat += duration;
    }

    return chords;
}

/**
 * Maps quality names to ChordType
 */
function mapQualityToChordType(quality: string): ChordType {
    const mapping: Record<string, ChordType> = {
        'major': 'major',
        'minor': 'minor',
        'diminished': 'diminished',
        'augmented': 'augmented',
        'dominant7': 'dominant7',
        'major7': 'major7',
        'minor7': 'minor7',
        'halfDiminished7': 'halfDiminished7',
    };
    return mapping[quality] || 'major';
}

/**
 * Applies rhythm pattern to chord blocks
 */
export function applyRhythmPattern(
    chords: ChordBlock[],
    pattern: ChordRhythmPattern
): ChordBlock[] {
    switch (pattern) {
        case 'whole':
            // No change - full sustained chords
            return chords;

        case 'half':
            // Split each chord into two half-length hits
            return chords.flatMap(chord => {
                const halfDuration = chord.duration / 2;
                return [
                    { ...chord, id: generateId(), duration: halfDuration * 0.9 },
                    { ...chord, id: generateId(), startBeat: chord.startBeat + halfDuration, duration: halfDuration * 0.9 },
                ];
            });

        case 'stabs':
            // Short staccato hits at the start of each chord
            return chords.map(chord => ({
                ...chord,
                duration: Math.min(0.5, chord.duration / 4),
            }));

        case 'offbeat':
            // Hits on the off-beats (& of each beat)
            return chords.flatMap(chord => {
                const hits: ChordBlock[] = [];
                const numBeats = Math.floor(chord.duration);
                for (let i = 0; i < numBeats; i++) {
                    hits.push({
                        ...chord,
                        id: generateId(),
                        startBeat: chord.startBeat + i + 0.5,
                        duration: 0.4,
                    });
                }
                return hits;
            });

        case 'pads':
            // Long sustained with slight overlap/release
            return chords.map(chord => ({
                ...chord,
                duration: chord.duration * 1.1, // Slight sustain overlap
            }));

        case 'arpeggiated':
            // Will be handled by arp engine (v2), for now just stabs
            return chords.map(chord => ({
                ...chord,
                duration: Math.min(0.5, chord.duration / 4),
            }));

        default:
            return chords;
    }
}

/**
 * Regenerates voicings for chord blocks
 */
export function regenerateVoicings(
    chords: ChordBlock[],
    voicingStyle: VoicingStyle,
    randomizeInversions: boolean = false
): ChordBlock[] {
    return chords.map(chord => ({
        ...chord,
        voicingStyle,
        inversion: randomizeInversions ? Math.floor(Math.random() * 3) : chord.inversion,
    }));
}

/**
 * Sets all chords to a specific inversion
 */
export function setInversion(chords: ChordBlock[], inversion: number): ChordBlock[] {
    return chords.map(chord => ({ ...chord, inversion }));
}

/**
 * Adds bass notes to chords (root in bass by default)
 */
export function addBassNotes(
    chords: ChordBlock[],
    bassOctave: number = 2
): ChordBlock[] {
    return chords.map(chord => {
        const bassNote = (chord.rootPitch % 12) + (bassOctave + 1) * 12;
        return { ...chord, bassNote };
    });
}

/**
 * Removes bass notes from chords
 */
export function removeBassNotes(chords: ChordBlock[]): ChordBlock[] {
    return chords.map(({ bassNote, ...chord }) => chord as ChordBlock);
}

/**
 * Generates a simple melody over a chord progression
 */
export function generateSimpleMelody(
    chords: ChordBlock[],
    scale: ScaleConfig,
    density: 'sparse' | 'medium' | 'dense' = 'medium'
): { pitch: number; startBeat: number; duration: number; velocity: number }[] {
    const notes: { pitch: number; startBeat: number; duration: number; velocity: number }[] = [];
    const scaleRoot = NOTE_NAMES.indexOf(scale.root);

    // Note density per bar based on setting
    const notesPerBeat = density === 'sparse' ? 0.5 : density === 'medium' ? 1 : 2;

    for (const chord of chords) {
        const numNotes = Math.ceil(chord.duration * notesPerBeat);
        const noteDuration = chord.duration / numNotes;

        // Get chord tones for target notes
        const chordRoot = chord.rootPitch % 12;

        for (let i = 0; i < numNotes; i++) {
            // Alternate between chord tones and passing tones
            const octave = 4;
            let pitch: number;

            if (i % 2 === 0) {
                // Chord tone
                pitch = chord.rootPitch + 12; // One octave above chord
            } else {
                // Scale tone
                const scaleOffset = [0, 2, 4, 5, 7, 9, 11][Math.floor(Math.random() * 7)];
                pitch = (scaleRoot + scaleOffset) + (octave + 1) * 12;
            }

            notes.push({
                pitch,
                startBeat: chord.startBeat + i * noteDuration,
                duration: noteDuration * 0.8,
                velocity: 80 + Math.floor(Math.random() * 20),
            });
        }
    }

    return notes;
}


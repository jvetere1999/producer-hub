/**
 * Melody Module Unit Tests
 *
 * Tests for scale snapping, chord validity, and voicing constraints.
 */

import { describe, it, expect } from 'vitest';
import {
    noteToMidi,
    midiToNote,
    isInScale,
    snapToScale,
    getChordNotes,
    applyInversion,
    applyVoicing,
    getVoicedChordNotes,
    validatePitch,
    validateVelocity,
    validateDuration,
    createNote,
    createChordBlock,
    createEmptyTemplate,
    MIN_PITCH,
    MAX_PITCH,
    MIN_VELOCITY,
    MAX_VELOCITY,
    MIN_DURATION,
    MAX_DURATION,
    type ScaleConfig,
    type ChordBlock,
} from '../index';

describe('Note Conversion', () => {
    it('converts note name and octave to MIDI', () => {
        expect(noteToMidi('C', 4)).toBe(60); // Middle C
        expect(noteToMidi('A', 4)).toBe(69); // A440
        expect(noteToMidi('C', 0)).toBe(12);
        expect(noteToMidi('C', -1)).toBe(0);
    });

    it('converts MIDI to note name and octave', () => {
        expect(midiToNote(60)).toEqual({ note: 'C', octave: 4 });
        expect(midiToNote(69)).toEqual({ note: 'A', octave: 4 });
        expect(midiToNote(0)).toEqual({ note: 'C', octave: -1 });
    });

    it('round-trips note conversion', () => {
        for (let midi = 0; midi <= 127; midi++) {
            const { note, octave } = midiToNote(midi);
            expect(noteToMidi(note, octave)).toBe(midi);
        }
    });
});

describe('Scale Functions', () => {
    const cMajor: ScaleConfig = { root: 'C', type: 'major', snapToScale: true };
    const aMinor: ScaleConfig = { root: 'A', type: 'minor', snapToScale: true };
    const fSharpMinor: ScaleConfig = { root: 'F#', type: 'minor', snapToScale: true };

    describe('isInScale', () => {
        it('correctly identifies notes in C major scale', () => {
            // C major: C D E F G A B
            expect(isInScale(60, cMajor)).toBe(true);  // C
            expect(isInScale(62, cMajor)).toBe(true);  // D
            expect(isInScale(64, cMajor)).toBe(true);  // E
            expect(isInScale(65, cMajor)).toBe(true);  // F
            expect(isInScale(67, cMajor)).toBe(true);  // G
            expect(isInScale(69, cMajor)).toBe(true);  // A
            expect(isInScale(71, cMajor)).toBe(true);  // B
        });

        it('correctly identifies notes NOT in C major scale', () => {
            expect(isInScale(61, cMajor)).toBe(false); // C#
            expect(isInScale(63, cMajor)).toBe(false); // D#
            expect(isInScale(66, cMajor)).toBe(false); // F#
            expect(isInScale(68, cMajor)).toBe(false); // G#
            expect(isInScale(70, cMajor)).toBe(false); // A#
        });

        it('works across octaves', () => {
            expect(isInScale(48, cMajor)).toBe(true);  // C3
            expect(isInScale(72, cMajor)).toBe(true);  // C5
            expect(isInScale(49, cMajor)).toBe(false); // C#3
        });

        it('works with A minor scale', () => {
            // A minor: A B C D E F G
            expect(isInScale(69, aMinor)).toBe(true);  // A
            expect(isInScale(71, aMinor)).toBe(true);  // B
            expect(isInScale(72, aMinor)).toBe(true);  // C
            expect(isInScale(70, aMinor)).toBe(false); // A#
        });
    });

    describe('snapToScale', () => {
        it('returns same pitch if already in scale', () => {
            expect(snapToScale(60, cMajor)).toBe(60); // C stays C
            expect(snapToScale(64, cMajor)).toBe(64); // E stays E
        });

        it('snaps out-of-scale notes to nearest scale degree', () => {
            // C# (61) -> C (60) or D (62) - either is valid as distance is same
            const snapped61 = snapToScale(61, cMajor);
            expect([60, 62]).toContain(snapped61);

            // D# (63) -> D (62) or E (64) - either is valid as distance is same
            const snapped63 = snapToScale(63, cMajor);
            expect([62, 64]).toContain(snapped63);
        });

        it('respects pitch boundaries', () => {
            // When input is already out of bounds, result should be validated
            const result = snapToScale(MIN_PITCH, cMajor);
            expect(result).toBeGreaterThanOrEqual(MIN_PITCH);

            const result2 = snapToScale(MAX_PITCH, cMajor);
            expect(result2).toBeLessThanOrEqual(MAX_PITCH);
        });
    });
});

describe('Chord Functions', () => {
    describe('getChordNotes', () => {
        it('generates major chord notes', () => {
            const notes = getChordNotes(60, 'major'); // C major
            expect(notes).toEqual([60, 64, 67]); // C E G
        });

        it('generates minor chord notes', () => {
            const notes = getChordNotes(60, 'minor'); // C minor
            expect(notes).toEqual([60, 63, 67]); // C Eb G
        });

        it('generates diminished chord notes', () => {
            const notes = getChordNotes(60, 'diminished');
            expect(notes).toEqual([60, 63, 66]); // C Eb Gb
        });

        it('generates 7th chord notes', () => {
            const notes = getChordNotes(60, 'major7');
            expect(notes).toEqual([60, 64, 67, 71]); // C E G B
        });
    });

    describe('applyInversion', () => {
        it('returns root position for inversion 0', () => {
            const notes = [60, 64, 67];
            expect(applyInversion(notes, 0)).toEqual([60, 64, 67]);
        });

        it('applies first inversion correctly', () => {
            const notes = [60, 64, 67]; // C E G
            const inverted = applyInversion(notes, 1);
            expect(inverted).toEqual([64, 67, 72]); // E G C
        });

        it('applies second inversion correctly', () => {
            const notes = [60, 64, 67]; // C E G
            const inverted = applyInversion(notes, 2);
            expect(inverted).toEqual([67, 72, 76]); // G C E
        });

        it('wraps around for inversions beyond chord length', () => {
            const notes = [60, 64, 67];
            // Inversion 3 on a 3-note chord = 3 % 3 = 0, returns root position
            const inverted = applyInversion(notes, 3);
            expect(inverted).toEqual([60, 64, 67]); // Same as root position
        });
    });

    describe('applyVoicing', () => {
        const triad = [60, 64, 67];

        it('close voicing keeps notes as-is', () => {
            expect(applyVoicing(triad, 'close')).toEqual([60, 64, 67]);
        });

        it('open voicing moves middle note up', () => {
            const result = applyVoicing(triad, 'open');
            expect(result).toEqual([60, 76, 67]); // Middle note +12
        });

        it('spread voicing spreads notes across octaves', () => {
            const result = applyVoicing(triad, 'spread');
            expect(result[0]).toBe(60);
            expect(result[2]).toBeGreaterThan(result[1]); // Notes spread
        });
    });

    describe('getVoicedChordNotes', () => {
        it('combines chord type, inversion, and voicing', () => {
            const chord: ChordBlock = {
                id: 'test',
                rootPitch: 60,
                chordType: 'major',
                startBeat: 0,
                duration: 4,
                velocity: 100,
                inversion: 1,
                voicingStyle: 'close',
            };

            const notes = getVoicedChordNotes(chord);
            expect(notes.length).toBe(3);
            expect(notes[0]).toBe(64); // First inversion starts on E
        });

        it('includes bass note when specified', () => {
            const chord: ChordBlock = {
                id: 'test',
                rootPitch: 60,
                chordType: 'major',
                startBeat: 0,
                duration: 4,
                velocity: 100,
                inversion: 0,
                voicingStyle: 'close',
                bassNote: 43, // G in bass
            };

            const notes = getVoicedChordNotes(chord);
            expect(notes.length).toBe(4); // 3 chord tones + bass
            expect(notes[0]).toBeLessThan(60); // Bass is below chord
        });
    });
});

describe('Validation Functions', () => {
    describe('validatePitch', () => {
        it('clamps pitch to valid range', () => {
            expect(validatePitch(60)).toBe(60);
            expect(validatePitch(0)).toBe(MIN_PITCH);
            expect(validatePitch(200)).toBe(MAX_PITCH);
            expect(validatePitch(-10)).toBe(MIN_PITCH);
        });

        it('rounds floating point pitches', () => {
            expect(validatePitch(60.7)).toBe(61);
            expect(validatePitch(60.3)).toBe(60);
        });
    });

    describe('validateVelocity', () => {
        it('clamps velocity to valid range', () => {
            expect(validateVelocity(100)).toBe(100);
            expect(validateVelocity(0)).toBe(MIN_VELOCITY);
            expect(validateVelocity(200)).toBe(MAX_VELOCITY);
        });
    });

    describe('validateDuration', () => {
        it('clamps duration to valid range', () => {
            expect(validateDuration(1)).toBe(1);
            expect(validateDuration(0)).toBe(MIN_DURATION);
            expect(validateDuration(100)).toBe(MAX_DURATION);
        });
    });
});

describe('Factory Functions', () => {
    describe('createNote', () => {
        it('creates a note with validated values', () => {
            const note = createNote(60, 0, 1, 100);
            expect(note.id).toBeTruthy();
            expect(note.pitch).toBe(60);
            expect(note.startBeat).toBe(0);
            expect(note.duration).toBe(1);
            expect(note.velocity).toBe(100);
        });

        it('validates pitch, duration, velocity', () => {
            const note = createNote(200, -1, 100, 200);
            expect(note.pitch).toBe(MAX_PITCH);
            expect(note.startBeat).toBe(0);
            expect(note.duration).toBe(MAX_DURATION);
            expect(note.velocity).toBe(MAX_VELOCITY);
        });
    });

    describe('createChordBlock', () => {
        it('creates a chord block with defaults', () => {
            const chord = createChordBlock(60, 'major', 0);
            expect(chord.id).toBeTruthy();
            expect(chord.rootPitch).toBe(60);
            expect(chord.chordType).toBe('major');
            expect(chord.inversion).toBe(0);
            expect(chord.voicingStyle).toBe('close');
        });
    });

    describe('createEmptyTemplate', () => {
        it('creates a template with all required fields', () => {
            const template = createEmptyTemplate('Test');
            expect(template.id).toBeTruthy();
            expect(template.name).toBe('Test');
            expect(template.scale).toBeDefined();
            expect(template.humanize).toBeDefined();
            expect(template.melodyNotes).toEqual([]);
            expect(template.chordBlocks).toEqual([]);
            expect(template.createdAt).toBeTruthy();
            expect(template.updatedAt).toBeTruthy();
        });
    });
});


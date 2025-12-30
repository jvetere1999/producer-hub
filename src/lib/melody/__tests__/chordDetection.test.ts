/**
 * Chord Detection Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
    detectChord,
    detectChordsInSequence,
    getChordDescription,
} from '../chordDetection';
import type { MelodyNote } from '../model';

describe('Chord Detection', () => {
    describe('detectChord', () => {
        it('detects C major triad', () => {
            const chord = detectChord([60, 64, 67]); // C E G
            expect(chord).not.toBeNull();
            expect(chord?.root).toBe('C');
            expect(chord?.type).toBe('major');
            expect(chord?.symbol).toBe('C');
        });

        it('detects C minor triad', () => {
            const chord = detectChord([60, 63, 67]); // C Eb G
            expect(chord).not.toBeNull();
            expect(chord?.root).toBe('C');
            expect(chord?.type).toBe('minor');
            expect(chord?.symbol).toBe('Cm');
        });

        it('detects A minor triad', () => {
            const chord = detectChord([57, 60, 64]); // A C E
            expect(chord).not.toBeNull();
            expect(chord?.root).toBe('A');
            expect(chord?.type).toBe('minor');
            expect(chord?.symbol).toBe('Am');
        });

        it('detects G major triad', () => {
            const chord = detectChord([55, 59, 62]); // G B D
            expect(chord).not.toBeNull();
            expect(chord?.root).toBe('G');
            expect(chord?.type).toBe('major');
        });

        it('detects D minor triad', () => {
            const chord = detectChord([62, 65, 69]); // D F A
            expect(chord).not.toBeNull();
            expect(chord?.root).toBe('D');
            expect(chord?.type).toBe('minor');
        });

        it('detects F major triad', () => {
            const chord = detectChord([53, 57, 60]); // F A C
            expect(chord).not.toBeNull();
            expect(chord?.root).toBe('F');
            expect(chord?.type).toBe('major');
        });

        it('detects diminished triad', () => {
            const chord = detectChord([62, 65, 68]); // D F Ab
            expect(chord).not.toBeNull();
            expect(chord?.type).toBe('diminished');
        });

        it('detects augmented triad', () => {
            const chord = detectChord([60, 64, 68]); // C E G#
            expect(chord).not.toBeNull();
            expect(chord?.type).toBe('augmented');
        });

        it('detects sus4 chord', () => {
            const chord = detectChord([60, 65, 67]); // C F G
            expect(chord).not.toBeNull();
            expect(chord?.type).toBe('sus4');
        });

        it('detects sus2 chord', () => {
            const chord = detectChord([60, 62, 67]); // C D G
            expect(chord).not.toBeNull();
            expect(chord?.type).toBe('sus2');
        });

        it('detects major 7th chord', () => {
            const chord = detectChord([60, 64, 67, 71]); // C E G B
            expect(chord).not.toBeNull();
            expect(chord?.type).toBe('major7');
            expect(chord?.symbol).toBe('Cmaj7');
        });

        it('detects minor 7th chord', () => {
            const chord = detectChord([60, 63, 67, 70]); // C Eb G Bb
            expect(chord).not.toBeNull();
            expect(chord?.type).toBe('minor7');
            expect(chord?.symbol).toBe('Cm7');
        });

        it('detects dominant 7th chord', () => {
            const chord = detectChord([60, 64, 67, 70]); // C E G Bb
            expect(chord).not.toBeNull();
            expect(chord?.type).toBe('dominant7');
            expect(chord?.symbol).toBe('C7');
        });

        it('detects power chord', () => {
            const chord = detectChord([60, 67]); // C G
            expect(chord).not.toBeNull();
            expect(chord?.type).toBe('power');
            expect(chord?.symbol).toBe('C5');
        });

        it('detects chord even with notes in different order', () => {
            const chord = detectChord([64, 67, 72]); // E G C (C major notes in different order)
            expect(chord).not.toBeNull();
            expect(chord?.root).toBe('C');
            expect(chord?.type).toBe('major');
            // Inversion detection is based on which rotation matched first
        });

        it('returns null for single note', () => {
            const chord = detectChord([60]);
            expect(chord).toBeNull();
        });

        it('returns null for empty array', () => {
            const chord = detectChord([]);
            expect(chord).toBeNull();
        });

        it('handles octave-doubled notes', () => {
            const chord = detectChord([60, 64, 67, 72]); // C E G C
            expect(chord).not.toBeNull();
            expect(chord?.root).toBe('C');
            expect(chord?.type).toBe('major');
        });
    });

    describe('detectChordsInSequence', () => {
        it('detects chords from notes at same beat', () => {
            const notes: MelodyNote[] = [
                { id: '1', pitch: 60, startBeat: 0, duration: 1, velocity: 100 },
                { id: '2', pitch: 64, startBeat: 0, duration: 1, velocity: 100 },
                { id: '3', pitch: 67, startBeat: 0, duration: 1, velocity: 100 },
            ];

            const chords = detectChordsInSequence(notes);
            expect(chords.size).toBe(1);
            expect(chords.get(0)?.symbol).toBe('C');
        });

        it('detects multiple chords at different beats', () => {
            const notes: MelodyNote[] = [
                // C major at beat 0
                { id: '1', pitch: 60, startBeat: 0, duration: 1, velocity: 100 },
                { id: '2', pitch: 64, startBeat: 0, duration: 1, velocity: 100 },
                { id: '3', pitch: 67, startBeat: 0, duration: 1, velocity: 100 },
                // A minor at beat 2
                { id: '4', pitch: 57, startBeat: 2, duration: 1, velocity: 100 },
                { id: '5', pitch: 60, startBeat: 2, duration: 1, velocity: 100 },
                { id: '6', pitch: 64, startBeat: 2, duration: 1, velocity: 100 },
            ];

            const chords = detectChordsInSequence(notes);
            expect(chords.size).toBe(2);
            expect(chords.get(0)?.symbol).toBe('C');
            expect(chords.get(2)?.symbol).toBe('Am');
        });

        it('ignores single notes', () => {
            const notes: MelodyNote[] = [
                { id: '1', pitch: 60, startBeat: 0, duration: 1, velocity: 100 },
                { id: '2', pitch: 64, startBeat: 1, duration: 1, velocity: 100 },
            ];

            const chords = detectChordsInSequence(notes);
            expect(chords.size).toBe(0);
        });

        it('returns empty map for no notes', () => {
            const chords = detectChordsInSequence([]);
            expect(chords.size).toBe(0);
        });
    });

    describe('getChordDescription', () => {
        it('returns symbol for root position', () => {
            const desc = getChordDescription({
                root: 'C',
                type: 'major',
                symbol: 'C',
                notes: [60, 64, 67],
                inversion: 0,
                confidence: 1,
            });
            expect(desc).toBe('C');
        });

        it('includes inversion for inverted chords', () => {
            const desc = getChordDescription({
                root: 'C',
                type: 'major',
                symbol: 'C',
                notes: [64, 67, 72],
                inversion: 1,
                confidence: 1,
            });
            expect(desc).toContain('1st inversion');
        });
    });
});


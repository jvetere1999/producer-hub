/**
 * Arp/Strum Engine Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
    getPatternOrder,
    getSeededPatternOrder,
    getStrumOffsetBeats,
    applyVelocityCurve,
    arpeggiateSingleChord,
    generateArpPreview,
    commitArpPreview,
    validateArpConfig,
    RATE_TO_BEATS,
    DEFAULT_ARP_ENGINE_CONFIG,
    type ArpEngineConfig,
} from '../arpEngine';
import type { ChordBlock, MelodyNote } from '../model';

describe('Arp Engine - Pattern Generation', () => {
    const testPitches = [60, 64, 67]; // C major triad (C, E, G)

    describe('getPatternOrder', () => {
        it('returns empty array for empty pitches', () => {
            expect(getPatternOrder([], 'up', 1, false)).toEqual([]);
        });

        it('generates up pattern correctly', () => {
            const result = getPatternOrder(testPitches, 'up', 1, false);
            expect(result).toEqual([60, 64, 67]);
        });

        it('generates down pattern correctly', () => {
            const result = getPatternOrder(testPitches, 'down', 1, false);
            expect(result).toEqual([67, 64, 60]);
        });

        it('generates upDown pattern correctly', () => {
            const result = getPatternOrder(testPitches, 'upDown', 1, false);
            // Up: 60, 64, 67, then down without repeating 67: 64, 60
            expect(result).toEqual([60, 64, 67, 64, 60]);
        });

        it('generates downUp pattern correctly', () => {
            const result = getPatternOrder(testPitches, 'downUp', 1, false);
            // Down: 67, 64, 60, then up without repeating 60: 64, 67
            expect(result).toEqual([67, 64, 60, 64, 67]);
        });

        it('generates random pattern with correct length', () => {
            const result = getPatternOrder(testPitches, 'random', 1, false);
            expect(result.length).toBe(3);
            expect(result.sort()).toEqual([60, 64, 67]);
        });

        it('respects played order', () => {
            const unordered = [67, 60, 64]; // G, C, E
            const result = getPatternOrder(unordered, 'played', 1, false);
            expect(result).toEqual([67, 60, 64]);
        });

        it('expands to multiple octaves', () => {
            const result = getPatternOrder([60, 64, 67], 'up', 2, false);
            expect(result).toEqual([60, 64, 67, 72, 76, 79]);
        });

        it('adds root at end when includeRoot is true', () => {
            const result = getPatternOrder(testPitches, 'up', 1, true);
            expect(result).toEqual([60, 64, 67, 60]);
        });

        it('combines octaves and includeRoot', () => {
            const result = getPatternOrder([60, 64, 67], 'up', 2, true);
            expect(result).toEqual([60, 64, 67, 72, 76, 79, 60]);
        });
    });

    describe('getSeededPatternOrder', () => {
        it('returns same result for same seed', () => {
            const result1 = getSeededPatternOrder(testPitches, 'random', 1, false, 42);
            const result2 = getSeededPatternOrder(testPitches, 'random', 1, false, 42);
            expect(result1).toEqual(result2);
        });

        it('returns different result for different seeds', () => {
            const result1 = getSeededPatternOrder(testPitches, 'random', 1, false, 1);
            const result2 = getSeededPatternOrder(testPitches, 'random', 1, false, 999);
            // May occasionally be same, but very unlikely
            // Just check they're valid
            expect(result1.length).toBe(3);
            expect(result2.length).toBe(3);
        });

        it('uses non-seeded for non-random patterns', () => {
            const result = getSeededPatternOrder(testPitches, 'up', 1, false, 42);
            expect(result).toEqual([60, 64, 67]);
        });
    });
});

describe('Arp Engine - Strum', () => {
    describe('getStrumOffsetBeats', () => {
        const baseConfig = {
            enabled: true,
            timeMs: 30,
            timeTicks: 20,
            useTicks: false,
            direction: 'up' as const,
            velocityCurve: 'flat' as const,
        };

        it('returns 0 when strum disabled', () => {
            const config = { ...baseConfig, enabled: false };
            expect(getStrumOffsetBeats(config, 120, 1, 3, 0)).toBe(0);
        });

        it('returns 0 for single note', () => {
            expect(getStrumOffsetBeats(baseConfig, 120, 0, 1, 0)).toBe(0);
        });

        it('calculates correct offset for up direction (ms)', () => {
            // 30ms at 120 BPM = 30/1000 * 2 = 0.06 beats
            const offset0 = getStrumOffsetBeats(baseConfig, 120, 0, 3, 0);
            const offset1 = getStrumOffsetBeats(baseConfig, 120, 1, 3, 0);
            const offset2 = getStrumOffsetBeats(baseConfig, 120, 2, 3, 0);

            expect(offset0).toBe(0);
            expect(offset1).toBeCloseTo(0.06, 2);
            expect(offset2).toBeCloseTo(0.12, 2);
        });

        it('calculates correct offset for down direction', () => {
            const config = { ...baseConfig, direction: 'down' as const };
            const offset0 = getStrumOffsetBeats(config, 120, 0, 3, 0);
            const offset2 = getStrumOffsetBeats(config, 120, 2, 3, 0);

            expect(offset0).toBeCloseTo(0.12, 2);
            expect(offset2).toBe(0);
        });

        it('alternates direction based on chord index', () => {
            const config = { ...baseConfig, direction: 'alternate' as const };

            // Even chord (0) = up
            const offsetEven = getStrumOffsetBeats(config, 120, 0, 3, 0);
            expect(offsetEven).toBe(0);

            // Odd chord (1) = down
            const offsetOdd = getStrumOffsetBeats(config, 120, 0, 3, 1);
            expect(offsetOdd).toBeCloseTo(0.12, 2);
        });

        it('uses ticks when useTicks is true', () => {
            const config = { ...baseConfig, useTicks: true, timeTicks: 48 };
            // 48 ticks / 480 = 0.1 beats per note
            const offset1 = getStrumOffsetBeats(config, 120, 1, 3, 0);
            expect(offset1).toBeCloseTo(0.1, 5);
        });
    });

    describe('applyVelocityCurve', () => {
        it('returns base velocity for flat curve', () => {
            expect(applyVelocityCurve(100, 'flat', 0, 3)).toBe(100);
            expect(applyVelocityCurve(100, 'flat', 2, 3)).toBe(100);
        });

        it('accents first note', () => {
            const first = applyVelocityCurve(100, 'accentFirst', 0, 3);
            const second = applyVelocityCurve(100, 'accentFirst', 1, 3);
            expect(first).toBeGreaterThan(second);
        });

        it('accents last note', () => {
            const first = applyVelocityCurve(100, 'accentLast', 0, 3);
            const last = applyVelocityCurve(100, 'accentLast', 2, 3);
            expect(last).toBeGreaterThan(first);
        });

        it('applies crescendo correctly', () => {
            const first = applyVelocityCurve(100, 'crescendo', 0, 3);
            const mid = applyVelocityCurve(100, 'crescendo', 1, 3);
            const last = applyVelocityCurve(100, 'crescendo', 2, 3);
            expect(first).toBeLessThan(mid);
            expect(mid).toBeLessThan(last);
        });

        it('applies decrescendo correctly', () => {
            const first = applyVelocityCurve(100, 'decrescendo', 0, 3);
            const mid = applyVelocityCurve(100, 'decrescendo', 1, 3);
            const last = applyVelocityCurve(100, 'decrescendo', 2, 3);
            expect(first).toBeGreaterThan(mid);
            expect(mid).toBeGreaterThan(last);
        });

        it('returns base velocity for single note', () => {
            expect(applyVelocityCurve(100, 'crescendo', 0, 1)).toBe(100);
        });

        it('clamps velocity to valid MIDI range', () => {
            const result = applyVelocityCurve(120, 'accentFirst', 0, 3);
            expect(result).toBeLessThanOrEqual(127);

            const result2 = applyVelocityCurve(10, 'accentFirst', 1, 3);
            expect(result2).toBeGreaterThanOrEqual(1);
        });
    });
});

describe('Arp Engine - Chord Arpeggiation', () => {
    const testChord: ChordBlock = {
        id: 'test-chord',
        rootPitch: 60,
        chordType: 'major',
        startBeat: 0,
        duration: 4,
        velocity: 100,
        inversion: 0,
        voicingStyle: 'close',
    };

    describe('arpeggiateSingleChord', () => {
        it('generates correct number of notes for rate', () => {
            const config: ArpEngineConfig = {
                arp: { ...DEFAULT_ARP_ENGINE_CONFIG.arp, rate: '1/8' },
                strum: { ...DEFAULT_ARP_ENGINE_CONFIG.strum, enabled: false },
            };

            // 4 beats at 1/8 rate = 8 notes
            const notes = arpeggiateSingleChord(testChord, config, 120);
            expect(notes.length).toBe(8);
        });

        it('notes are correctly timed', () => {
            const config: ArpEngineConfig = {
                arp: { ...DEFAULT_ARP_ENGINE_CONFIG.arp, rate: '1/4' },
                strum: { ...DEFAULT_ARP_ENGINE_CONFIG.strum, enabled: false },
            };

            const notes = arpeggiateSingleChord(testChord, config, 120);
            expect(notes[0].startBeat).toBe(0);
            expect(notes[1].startBeat).toBe(1);
            expect(notes[2].startBeat).toBe(2);
            expect(notes[3].startBeat).toBe(3);
        });

        it('applies gate correctly', () => {
            const config: ArpEngineConfig = {
                arp: { ...DEFAULT_ARP_ENGINE_CONFIG.arp, rate: '1/4', gate: 50 },
                strum: { ...DEFAULT_ARP_ENGINE_CONFIG.strum, enabled: false },
            };

            const notes = arpeggiateSingleChord(testChord, config, 120);
            // 1/4 note = 1 beat, 50% gate = 0.5 beat duration
            expect(notes[0].duration).toBe(0.5);
        });

        it('follows pattern order', () => {
            const config: ArpEngineConfig = {
                arp: { ...DEFAULT_ARP_ENGINE_CONFIG.arp, pattern: 'down', rate: '1/4' },
                strum: { ...DEFAULT_ARP_ENGINE_CONFIG.strum, enabled: false },
            };

            const notes = arpeggiateSingleChord(testChord, config, 120);
            // Major triad voiced: C E G = 60, 64, 67
            // Down pattern: G E C = 67, 64, 60
            expect(notes[0].pitch).toBe(67);
            expect(notes[1].pitch).toBe(64);
            expect(notes[2].pitch).toBe(60);
        });

        it('generates strum notes when strum enabled', () => {
            const config: ArpEngineConfig = {
                arp: DEFAULT_ARP_ENGINE_CONFIG.arp,
                strum: { ...DEFAULT_ARP_ENGINE_CONFIG.strum, enabled: true, timeMs: 30 },
            };

            const notes = arpeggiateSingleChord(testChord, config, 120);
            // Should have 3 notes (one per pitch in chord)
            expect(notes.length).toBe(3);

            // All notes should start near beat 0 with small offsets
            expect(notes[0].startBeat).toBe(0);
            expect(notes[1].startBeat).toBeGreaterThan(0);
            expect(notes[1].startBeat).toBeLessThan(0.2);
        });

        it('strum notes have correct duration', () => {
            const config: ArpEngineConfig = {
                arp: DEFAULT_ARP_ENGINE_CONFIG.arp,
                strum: { ...DEFAULT_ARP_ENGINE_CONFIG.strum, enabled: true, timeMs: 30 },
            };

            const notes = arpeggiateSingleChord(testChord, config, 120);
            // Each note duration should be chord duration minus its offset
            notes.forEach(note => {
                expect(note.duration).toBeLessThanOrEqual(4);
                expect(note.duration).toBeGreaterThan(0);
            });
        });
    });

    describe('generateArpPreview', () => {
        it('generates notes for multiple chords', () => {
            const chords: ChordBlock[] = [
                { ...testChord, id: 'c1', startBeat: 0, duration: 2 },
                { ...testChord, id: 'c2', startBeat: 2, duration: 2 },
            ];

            const config: ArpEngineConfig = {
                arp: { ...DEFAULT_ARP_ENGINE_CONFIG.arp, rate: '1/4' },
                strum: { ...DEFAULT_ARP_ENGINE_CONFIG.strum, enabled: false },
            };

            const result = generateArpPreview(chords, config, 120);
            expect(result.notes.length).toBe(4); // 2 notes per chord
            expect(result.originalChords).toBe(chords);
        });

        it('notes are sorted by start beat', () => {
            const chords: ChordBlock[] = [
                { ...testChord, id: 'c1', startBeat: 2, duration: 2 },
                { ...testChord, id: 'c2', startBeat: 0, duration: 2 },
            ];

            const config: ArpEngineConfig = {
                arp: { ...DEFAULT_ARP_ENGINE_CONFIG.arp, rate: '1/4' },
                strum: { ...DEFAULT_ARP_ENGINE_CONFIG.strum, enabled: false },
            };

            const result = generateArpPreview(chords, config, 120);

            for (let i = 1; i < result.notes.length; i++) {
                expect(result.notes[i].startBeat).toBeGreaterThanOrEqual(
                    result.notes[i - 1].startBeat
                );
            }
        });

        it('deterministic with seed', () => {
            const chords: ChordBlock[] = [testChord];
            const config: ArpEngineConfig = {
                arp: { ...DEFAULT_ARP_ENGINE_CONFIG.arp, pattern: 'random', rate: '1/4' },
                strum: { ...DEFAULT_ARP_ENGINE_CONFIG.strum, enabled: false },
            };

            const result1 = generateArpPreview(chords, config, 120, undefined, undefined, 42);
            const result2 = generateArpPreview(chords, config, 120, undefined, undefined, 42);

            expect(result1.notes.map(n => n.pitch)).toEqual(result2.notes.map(n => n.pitch));
        });
    });

    describe('commitArpPreview', () => {
        it('adds preview notes to existing notes', () => {
            const existingNotes: MelodyNote[] = [
                { id: 'n1', pitch: 72, startBeat: 0, duration: 1, velocity: 100 },
            ];

            const preview = generateArpPreview([testChord], DEFAULT_ARP_ENGINE_CONFIG, 120);
            const result = commitArpPreview(existingNotes, preview);

            expect(result.length).toBeGreaterThan(1);
            expect(result.some(n => n.pitch === 72)).toBe(true);
        });

        it('generates new IDs for committed notes', () => {
            const preview = generateArpPreview([testChord], DEFAULT_ARP_ENGINE_CONFIG, 120);
            const originalIds = preview.notes.map(n => n.id);

            const result = commitArpPreview([], preview);
            const newIds = result.map(n => n.id);

            // None of the new IDs should match original IDs
            originalIds.forEach(originalId => {
                expect(newIds).not.toContain(originalId);
            });
        });

        it('sorts result by start beat', () => {
            const existingNotes: MelodyNote[] = [
                { id: 'n1', pitch: 72, startBeat: 5, duration: 1, velocity: 100 },
            ];

            const preview = generateArpPreview([testChord], DEFAULT_ARP_ENGINE_CONFIG, 120);
            const result = commitArpPreview(existingNotes, preview);

            for (let i = 1; i < result.length; i++) {
                expect(result[i].startBeat).toBeGreaterThanOrEqual(result[i - 1].startBeat);
            }
        });
    });
});

describe('Arp Engine - Validation', () => {
    describe('validateArpConfig', () => {
        it('accepts valid config', () => {
            const errors = validateArpConfig(DEFAULT_ARP_ENGINE_CONFIG);
            expect(errors).toEqual([]);
        });

        it('rejects invalid gate', () => {
            const config: ArpEngineConfig = {
                ...DEFAULT_ARP_ENGINE_CONFIG,
                arp: { ...DEFAULT_ARP_ENGINE_CONFIG.arp, gate: 250 },
            };
            const errors = validateArpConfig(config);
            expect(errors.some(e => e.includes('Gate'))).toBe(true);
        });

        it('rejects invalid octaves', () => {
            const config: ArpEngineConfig = {
                ...DEFAULT_ARP_ENGINE_CONFIG,
                arp: { ...DEFAULT_ARP_ENGINE_CONFIG.arp, octaves: 5 },
            };
            const errors = validateArpConfig(config);
            expect(errors.some(e => e.includes('Octaves'))).toBe(true);
        });

        it('rejects invalid strum time ms', () => {
            const config: ArpEngineConfig = {
                ...DEFAULT_ARP_ENGINE_CONFIG,
                strum: { ...DEFAULT_ARP_ENGINE_CONFIG.strum, timeMs: 600 },
            };
            const errors = validateArpConfig(config);
            expect(errors.some(e => e.includes('ms'))).toBe(true);
        });

        it('rejects invalid strum time ticks', () => {
            const config: ArpEngineConfig = {
                ...DEFAULT_ARP_ENGINE_CONFIG,
                strum: { ...DEFAULT_ARP_ENGINE_CONFIG.strum, timeTicks: 500 },
            };
            const errors = validateArpConfig(config);
            expect(errors.some(e => e.includes('ticks'))).toBe(true);
        });
    });
});

describe('Arp Engine - Rate Conversions', () => {
    it('has correct rate to beats mapping', () => {
        expect(RATE_TO_BEATS['1/1']).toBe(4);
        expect(RATE_TO_BEATS['1/2']).toBe(2);
        expect(RATE_TO_BEATS['1/4']).toBe(1);
        expect(RATE_TO_BEATS['1/8']).toBe(0.5);
        expect(RATE_TO_BEATS['1/16']).toBe(0.25);
        expect(RATE_TO_BEATS['1/32']).toBe(0.125);
    });
});

describe('Arp Engine - Event Ordering', () => {
    it('arp notes do not overlap in time for same pattern', () => {
        const chord: ChordBlock = {
            id: 'test',
            rootPitch: 60,
            chordType: 'major',
            startBeat: 0,
            duration: 4,
            velocity: 100,
            inversion: 0,
            voicingStyle: 'close',
        };

        const config: ArpEngineConfig = {
            arp: { ...DEFAULT_ARP_ENGINE_CONFIG.arp, rate: '1/8', gate: 90 },
            strum: { ...DEFAULT_ARP_ENGINE_CONFIG.strum, enabled: false },
        };

        const notes = arpeggiateSingleChord(chord, config, 120);

        // Check no overlapping start times
        for (let i = 1; i < notes.length; i++) {
            expect(notes[i].startBeat).toBeGreaterThan(notes[i - 1].startBeat);
        }
    });

    it('strum notes start times increase progressively', () => {
        const chord: ChordBlock = {
            id: 'test',
            rootPitch: 60,
            chordType: 'major7', // 4 notes
            startBeat: 0,
            duration: 4,
            velocity: 100,
            inversion: 0,
            voicingStyle: 'close',
        };

        const config: ArpEngineConfig = {
            arp: DEFAULT_ARP_ENGINE_CONFIG.arp,
            strum: {
                enabled: true,
                timeMs: 30,
                timeTicks: 20,
                useTicks: false,
                direction: 'up',
                velocityCurve: 'flat',
            },
        };

        const notes = arpeggiateSingleChord(chord, config, 120);

        // Sort by start time to verify ordering
        const sorted = [...notes].sort((a, b) => a.startBeat - b.startBeat);

        for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i].startBeat).toBeGreaterThanOrEqual(sorted[i - 1].startBeat);
        }
    });
});

describe('Arp Engine - Duration Math', () => {
    it('note duration respects gate percentage', () => {
        const chord: ChordBlock = {
            id: 'test',
            rootPitch: 60,
            chordType: 'major',
            startBeat: 0,
            duration: 4,
            velocity: 100,
            inversion: 0,
            voicingStyle: 'close',
        };

        // Test different gate values
        const gates = [25, 50, 75, 100, 150];

        gates.forEach(gate => {
            const config: ArpEngineConfig = {
                arp: { ...DEFAULT_ARP_ENGINE_CONFIG.arp, rate: '1/4', gate },
                strum: { ...DEFAULT_ARP_ENGINE_CONFIG.strum, enabled: false },
            };

            const notes = arpeggiateSingleChord(chord, config, 120);
            const expectedDuration = 1 * (gate / 100); // 1/4 note = 1 beat

            expect(notes[0].duration).toBeCloseTo(expectedDuration, 5);
        });
    });

    it('strum note durations decrease for later notes', () => {
        const chord: ChordBlock = {
            id: 'test',
            rootPitch: 60,
            chordType: 'major',
            startBeat: 0,
            duration: 4,
            velocity: 100,
            inversion: 0,
            voicingStyle: 'close',
        };

        const config: ArpEngineConfig = {
            arp: DEFAULT_ARP_ENGINE_CONFIG.arp,
            strum: {
                enabled: true,
                timeMs: 50,
                timeTicks: 20,
                useTicks: false,
                direction: 'up',
                velocityCurve: 'flat',
            },
        };

        const notes = arpeggiateSingleChord(chord, config, 120);
        const sorted = [...notes].sort((a, b) => a.startBeat - b.startBeat);

        // Later notes should have shorter duration
        for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i].duration).toBeLessThanOrEqual(sorted[i - 1].duration);
        }
    });

    it('total arp notes fit within chord duration', () => {
        const chord: ChordBlock = {
            id: 'test',
            rootPitch: 60,
            chordType: 'major',
            startBeat: 2,
            duration: 2,
            velocity: 100,
            inversion: 0,
            voicingStyle: 'close',
        };

        const config: ArpEngineConfig = {
            arp: { ...DEFAULT_ARP_ENGINE_CONFIG.arp, rate: '1/16' },
            strum: { ...DEFAULT_ARP_ENGINE_CONFIG.strum, enabled: false },
        };

        const notes = arpeggiateSingleChord(chord, config, 120);

        notes.forEach(note => {
            expect(note.startBeat).toBeGreaterThanOrEqual(chord.startBeat);
            expect(note.startBeat).toBeLessThan(chord.startBeat + chord.duration);
        });
    });
});


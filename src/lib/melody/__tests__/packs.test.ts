/**
 * Genre Packs Unit Tests
 *
 * Tests for preset data loading and deterministic application.
 */

import { describe, it, expect } from 'vitest';
import {
    GENRE_PACKS,
    getPackGenres,
    getPacksByGenre,
    getPackById,
    generateMotifNotes,
    isValidPack,
    type GenrePack,
} from '../packs';
import { getTemplateById, PROGRESSION_TEMPLATES } from '$lib/melody';

describe('Genre Packs Data', () => {
    it('has all required genres', () => {
        const genres = getPackGenres();
        expect(genres).toContain('House');
        expect(genres).toContain('Techno');
        expect(genres).toContain('Dubstep');
        expect(genres).toContain('Riddim');
        expect(genres).toContain('DnB');
        expect(genres).toContain('Trap');
    });

    it('has at least one pack per required genre', () => {
        const requiredGenres = ['House', 'Techno', 'Dubstep', 'Riddim', 'DnB', 'Trap'];
        for (const genre of requiredGenres) {
            const packs = getPacksByGenre(genre);
            expect(packs.length).toBeGreaterThan(0);
        }
    });

    it('all packs have valid structure', () => {
        for (const pack of GENRE_PACKS) {
            expect(isValidPack(pack)).toBe(true);
        }
    });

    it('all packs reference existing progression templates', () => {
        for (const pack of GENRE_PACKS) {
            const template = getTemplateById(pack.progressionId);
            expect(template).toBeDefined();
            expect(template?.id).toBe(pack.progressionId);
        }
    });

    it('all packs have valid BPM range', () => {
        for (const pack of GENRE_PACKS) {
            expect(pack.bpm).toBeGreaterThanOrEqual(80);
            expect(pack.bpm).toBeLessThanOrEqual(200);
        }
    });

    it('all packs have valid bar count', () => {
        for (const pack of GENRE_PACKS) {
            expect(pack.bars).toBeGreaterThanOrEqual(1);
            expect(pack.bars).toBeLessThanOrEqual(16);
        }
    });
});

describe('Pack Retrieval', () => {
    it('getPackById returns correct pack', () => {
        const pack = getPackById('house-deep');
        expect(pack).toBeDefined();
        expect(pack?.name).toBe('Deep House');
        expect(pack?.genre).toBe('House');
    });

    it('getPackById returns undefined for non-existent id', () => {
        const pack = getPackById('non-existent-pack');
        expect(pack).toBeUndefined();
    });

    it('getPacksByGenre returns correct packs', () => {
        const housePacks = getPacksByGenre('House');
        expect(housePacks.length).toBeGreaterThan(0);
        expect(housePacks.every(p => p.genre === 'House')).toBe(true);
    });

    it('getPacksByGenre returns empty for non-existent genre', () => {
        const packs = getPacksByGenre('NonExistentGenre');
        expect(packs).toEqual([]);
    });
});

describe('Pack Configuration Determinism', () => {
    it('pack scale config is deterministic', () => {
        const pack = getPackById('house-deep');
        expect(pack?.scale).toEqual({
            root: 'A',
            type: 'minor',
            snapToScale: true,
        });
    });

    it('pack humanize config is deterministic', () => {
        const pack = getPackById('dubstep-heavy');
        expect(pack?.humanize).toEqual({
            enabled: false,
            timingRange: 0,
            velocityRange: 0,
            swingAmount: 0,
            linkToGlobalSwing: false,
        });
    });

    it('pack voicing settings are deterministic', () => {
        const pack = getPackById('dnb-liquid');
        expect(pack?.voicingStyle).toBe('open');
        expect(pack?.inversion).toBe(0);
        expect(pack?.addBass).toBe(true);
        expect(pack?.rhythmPattern).toBe('pads');
    });
});

describe('Melody Motif Generation', () => {
    it('generates correct number of notes from motif', () => {
        const pack = getPackById('house-deep');
        expect(pack?.melodyMotif).toBeDefined();

        if (pack?.melodyMotif) {
            const notes = generateMotifNotes(
                pack.melodyMotif,
                pack.scale.root,
                pack.scale.type,
                4
            );
            expect(notes.length).toBe(pack.melodyMotif.notes.length);
        }
    });

    it('generates notes with valid MIDI pitches', () => {
        const pack = getPackById('dubstep-melodic');
        expect(pack?.melodyMotif).toBeDefined();

        if (pack?.melodyMotif) {
            const notes = generateMotifNotes(
                pack.melodyMotif,
                pack.scale.root,
                pack.scale.type,
                4
            );
            for (const note of notes) {
                expect(note.pitch).toBeGreaterThanOrEqual(0);
                expect(note.pitch).toBeLessThanOrEqual(127);
            }
        }
    });

    it('generates notes with correct timing from motif', () => {
        const pack = getPackById('techno-melodic');
        expect(pack?.melodyMotif).toBeDefined();

        if (pack?.melodyMotif) {
            const notes = generateMotifNotes(
                pack.melodyMotif,
                pack.scale.root,
                pack.scale.type,
                4
            );

            for (let i = 0; i < notes.length; i++) {
                expect(notes[i].startBeat).toBe(pack.melodyMotif.notes[i].startBeat);
                expect(notes[i].duration).toBe(pack.melodyMotif.notes[i].duration);
                expect(notes[i].velocity).toBe(pack.melodyMotif.notes[i].velocity);
            }
        }
    });

    it('generates deterministic output for same input', () => {
        const pack = getPackById('trap-melodic');
        if (!pack?.melodyMotif) return;

        const notes1 = generateMotifNotes(pack.melodyMotif, 'C', 'minor', 4);
        const notes2 = generateMotifNotes(pack.melodyMotif, 'C', 'minor', 4);

        // Pitches should be identical (IDs will differ)
        expect(notes1.map(n => n.pitch)).toEqual(notes2.map(n => n.pitch));
        expect(notes1.map(n => n.startBeat)).toEqual(notes2.map(n => n.startBeat));
        expect(notes1.map(n => n.duration)).toEqual(notes2.map(n => n.duration));
    });
});

describe('isValidPack', () => {
    it('returns true for valid pack', () => {
        const validPack: GenrePack = {
            id: 'test-pack',
            name: 'Test Pack',
            genre: 'Test',
            description: 'Test description',
            icon: '🎵',
            scale: { root: 'C', type: 'minor', snapToScale: true },
            bpm: 120,
            bars: 4,
            progressionId: 'house-i-vi',
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
        };
        expect(isValidPack(validPack)).toBe(true);
    });

    it('returns false for null', () => {
        expect(isValidPack(null)).toBe(false);
    });

    it('returns false for missing required fields', () => {
        expect(isValidPack({ id: 'test' })).toBe(false);
        expect(isValidPack({ id: 'test', name: 'Test' })).toBe(false);
    });

    it('returns false for wrong types', () => {
        expect(isValidPack({
            id: 123, // should be string
            name: 'Test',
            genre: 'Test',
            scale: {},
            bpm: 120,
            progressionId: 'test',
            voicingStyle: 'close',
            rhythmPattern: 'stabs',
            humanize: {},
        })).toBe(false);
    });
});


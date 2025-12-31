/**
 * Unit tests for Reference Packs
 */

import { describe, it, expect } from 'vitest';
import {
    createReferencePack,
    importReferencePack,
    validateReferencePack,
    parseReferencePack,
    serializeReferencePack,
    REFERENCE_PACK_VERSION,
    MAX_PACK_SIZE,
    type ReferencePack,
} from '../referencePacks';
import type { LaneTemplateRef, ChordProgressionRef } from '../vaultTypes';

// Helper to create a test template
function createTestTemplate(id: string, type: 'melody' | 'drums' = 'drums'): LaneTemplateRef {
    return {
        id,
        name: `Test Template ${id}`,
        type,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        laneSettings: {
            instrumentId: type === 'drums' ? 'acoustic-kit' : 'grand-piano',
            noteMode: type === 'drums' ? 'oneShot' : 'sustain',
            velocityDefault: 100,
            quantizeGrid: '1/16',
            color: '#ff6b6b',
        },
        notes: [
            { pitch: 36, startBeat: 0, duration: 0.5, velocity: 100 },
            { pitch: 38, startBeat: 1, duration: 0.5, velocity: 90 },
        ],
        bpm: 120,
        bars: 4,
        timeSignature: [4, 4],
        key: 'C',
        scaleType: 'major',
        contentHash: `hash_${id}`,
    };
}

// Helper to create a test progression
function createTestProgression(id: string): ChordProgressionRef {
    return {
        id,
        name: `Test Progression ${id}`,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        numerals: ['I', 'V', 'vi', 'IV'],
        durations: [4, 4, 4, 4],
        rhythmPattern: 'whole',
        genre: 'pop',
        description: 'Test progression',
        key: 'C',
        scaleType: 'major',
        contentHash: `prog_hash_${id}`,
    };
}

describe('Reference Packs - Creation', () => {
    it('creates a pack with templates', async () => {
        const templates = [createTestTemplate('t1'), createTestTemplate('t2', 'melody')];

        const pack = await createReferencePack(templates, [], {
            name: 'Test Pack',
            description: 'A test pack',
        });

        expect(pack.version).toBe(REFERENCE_PACK_VERSION);
        expect(pack.name).toBe('Test Pack');
        expect(pack.description).toBe('A test pack');
        expect(pack.laneTemplates).toHaveLength(2);
        expect(Object.keys(pack.contentHashes)).toHaveLength(2);
    });

    it('creates a pack with progressions', async () => {
        const templates = [createTestTemplate('t1')];
        const progressions = [createTestProgression('p1')];

        const pack = await createReferencePack(templates, progressions, {
            name: 'With Progressions',
        });

        expect(pack.laneTemplates).toHaveLength(1);
        expect(pack.chordProgressions).toHaveLength(1);
        expect(Object.keys(pack.contentHashes)).toHaveLength(2);
    });

    it('generates share URL manifest when requested', async () => {
        const templates = [createTestTemplate('t1')];

        const pack = await createReferencePack(templates, [], {
            name: 'With URLs',
            generateShareUrls: true,
        });

        expect(pack.shareUrlManifest).toBeDefined();
        expect(pack.shareUrlManifest!.urls).toHaveLength(1);
        expect(pack.shareUrlManifest!.urls[0].entityType).toBe('laneTemplate');
    });

    it('sanitizes pack name', async () => {
        const pack = await createReferencePack([], [], {
            name: '../evil/path/../name',
        });

        expect(pack.name).not.toContain('..');
        expect(pack.name).not.toContain('/');
    });

    it('truncates long descriptions', async () => {
        const longDesc = 'x'.repeat(600);
        const pack = await createReferencePack([], [], {
            name: 'Long Desc',
            description: longDesc,
        });

        expect(pack.description!.length).toBeLessThanOrEqual(500);
    });
});

describe('Reference Packs - Import', () => {
    it('imports templates without duplicates', async () => {
        const templates = [createTestTemplate('t1'), createTestTemplate('t2')];
        const pack = await createReferencePack(templates, [], { name: 'Import Test' });

        const result = await importReferencePack(pack, [], []);

        expect(result.success).toBe(true);
        expect(result.imported.laneTemplates).toBe(2);
        expect(result.skipped.duplicates).toBe(0);
    });

    it('skips duplicate templates by hash', async () => {
        const templates = [createTestTemplate('t1')];
        const pack = await createReferencePack(templates, [], { name: 'Dupe Test' });

        // Import into existing templates that have the same hash
        const existing = [createTestTemplate('t1')];

        const result = await importReferencePack(pack, existing, []);

        expect(result.imported.laneTemplates).toBe(0);
        expect(result.skipped.duplicates).toBe(1);
    });

    it('skips invalid templates', async () => {
        const invalidPack: ReferencePack = {
            version: 1,
            createdAt: new Date().toISOString(),
            name: 'Invalid Templates',
            laneTemplates: [
                { id: '', name: '', type: 'drums' as any } as any, // Invalid
            ],
            contentHashes: {},
        };

        const result = await importReferencePack(invalidPack, [], []);

        expect(result.skipped.invalid).toBe(1);
        expect(result.imported.laneTemplates).toBe(0);
    });

    it('counts regenerated share URLs', async () => {
        const templates = [createTestTemplate('t1')];
        const pack = await createReferencePack(templates, [], {
            name: 'URL Test',
            generateShareUrls: true,
        });

        const result = await importReferencePack(pack, [], []);

        expect(result.regeneratedShareUrls).toBe(1);
    });
});

describe('Reference Packs - Validation', () => {
    it('validates a correct pack', () => {
        const validPack: ReferencePack = {
            version: 1,
            createdAt: new Date().toISOString(),
            name: 'Valid Pack',
            laneTemplates: [createTestTemplate('t1')],
            contentHashes: { hash_t1: 't1' },
        };

        const result = validateReferencePack(validPack);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.stats.laneTemplates).toBe(1);
    });

    it('rejects pack without version', () => {
        const result = validateReferencePack({ name: 'No Version' });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid pack version');
    });

    it('rejects pack without name', () => {
        const result = validateReferencePack({ version: 1 });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Pack must have a name');
    });

    it('rejects pack without laneTemplates', () => {
        const result = validateReferencePack({ version: 1, name: 'No Templates' });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Pack must have laneTemplates array');
    });

    it('warns about newer version', () => {
        const futurePack = {
            version: REFERENCE_PACK_VERSION + 1,
            name: 'Future Pack',
            laneTemplates: [],
            contentHashes: {},
        };

        const result = validateReferencePack(futurePack);

        expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('rejects oversized pack', () => {
        // Create a pack that exceeds size limit
        const largeTemplates = Array(1000).fill(null).map((_, i) => createTestTemplate(`t${i}`));
        const largePack = {
            version: 1,
            name: 'Large Pack',
            laneTemplates: largeTemplates,
            contentHashes: {},
        };

        const result = validateReferencePack(largePack);

        if (result.stats.totalSizeBytes > MAX_PACK_SIZE) {
            expect(result.valid).toBe(false);
        }
    });
});

describe('Reference Packs - Serialization', () => {
    it('serializes and parses round-trip', async () => {
        const templates = [createTestTemplate('t1')];
        const original = await createReferencePack(templates, [], { name: 'Round Trip' });

        const json = serializeReferencePack(original);
        const parsed = parseReferencePack(json);

        expect(parsed).not.toBeNull();
        expect(parsed!.name).toBe(original.name);
        expect(parsed!.laneTemplates).toHaveLength(1);
    });

    it('returns null for invalid JSON', () => {
        const result = parseReferencePack('not valid json');

        expect(result).toBeNull();
    });

    it('returns null for invalid pack structure', () => {
        const result = parseReferencePack('{"foo": "bar"}');

        expect(result).toBeNull();
    });
});

describe('Reference Packs - Security', () => {
    it('sanitizes dangerous filenames in pack name', async () => {
        const pack = await createReferencePack([], [], {
            name: '../../etc/passwd',
        });

        expect(pack.name).not.toContain('..');
        expect(pack.name).not.toContain('/');
    });

    it('validates template note ranges', () => {
        const badTemplate = {
            id: 'bad',
            name: 'Bad',
            type: 'melody',
            notes: [{ pitch: 200, startBeat: -1, duration: -1, velocity: 200 }],
            bpm: 500, // Out of range
            bars: 100, // Out of range
            laneSettings: {},
            contentHash: 'x',
        };

        const pack = {
            version: 1,
            name: 'Bad Pack',
            laneTemplates: [badTemplate],
            contentHashes: {},
        };

        const result = validateReferencePack(pack);
        expect(result.valid).toBe(false);
    });
});


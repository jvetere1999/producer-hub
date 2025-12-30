/**
 * Unit tests for ProjectClipRef system
 *
 * Tests serialization, deserialization, URL encoding, validation, and migrations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    type ProjectClipRef,
    type SerializedClipPayload,
    type ClipKind,
    CLIP_REF_SCHEMA_VERSION,
    MAX_URL_PAYLOAD_SIZE,
    generateClipId,
    createDefaultLaneSettings,
    createClipRefFromLane,
    serializeClip,
    deserializeClip,
    serializeClipsToPayload,
    deserializeClipsFromPayload,
    encodeClipsToUrl,
    decodeClipsFromUrl,
    validatePayload,
    validateSerializedClip,
    migratePayload,
} from './clipRef';
import { createMelodyLane, createDrumLane } from './lanes';

describe('ClipRef - ID Generation', () => {
    it('generates unique clip IDs', () => {
        const id1 = generateClipId();
        const id2 = generateClipId();
        expect(id1).not.toBe(id2);
        expect(id1).toMatch(/^clip_\d+_\d+$/);
    });
});

describe('ClipRef - Default Lane Settings', () => {
    it('creates drum lane settings with oneShot mode', () => {
        const settings = createDefaultLaneSettings('drumLane');
        expect(settings.noteMode).toBe('oneShot');
        expect(settings.instrumentId).toBe('acoustic-kit');
        expect(settings.quantizeGrid).toBe('1/16');
    });

    it('creates melody lane settings with sustain mode', () => {
        const settings = createDefaultLaneSettings('melodyLane');
        expect(settings.noteMode).toBe('sustain');
        expect(settings.instrumentId).toBe('grand-piano');
    });
});

describe('ClipRef - Creation from Lane', () => {
    it('creates clip ref from melody lane', () => {
        const lane = createMelodyLane('Test Melody');
        lane.notes = [
            { id: 'n1', pitch: 60, startBeat: 0, duration: 1, velocity: 100 },
        ];

        const metadata = {
            bpm: 120,
            key: 'C',
            scale: { root: 'C' as const, type: 'major' as const, snapToScale: false },
            timeSignature: [4, 4] as [number, number],
        };

        const clip = createClipRefFromLane(lane, 1, 4, metadata);

        expect(clip.kind).toBe('melodyLane');
        expect(clip.name).toBe('Test Melody');
        expect(clip.startBar).toBe(1);
        expect(clip.lengthBars).toBe(4);
        expect(clip.notes).toHaveLength(1);
        expect(clip.metadata.bpm).toBe(120);
    });

    it('creates clip ref from drum lane', () => {
        const lane = createDrumLane('Test Drums');
        const metadata = {
            bpm: 140,
            key: 'C',
            scale: { root: 'C' as const, type: 'minor' as const, snapToScale: false },
            timeSignature: [4, 4] as [number, number],
        };

        const clip = createClipRefFromLane(lane, 2, 8, metadata);

        expect(clip.kind).toBe('drumLane');
        expect(clip.laneSettings.noteMode).toBe('oneShot');
    });
});

describe('ClipRef - Serialization', () => {
    const createTestClip = (): ProjectClipRef => ({
        id: 'test_clip_1',
        kind: 'melodyLane',
        refId: 'lane_123',
        name: 'Test Clip',
        startBar: 1,
        lengthBars: 4,
        metadata: {
            bpm: 120,
            key: 'C',
            scale: { root: 'C', type: 'major', snapToScale: false },
            timeSignature: [4, 4],
        },
        laneSettings: {
            instrumentId: 'grand-piano',
            noteMode: 'sustain',
            velocityDefault: 100,
            quantizeGrid: '1/16',
        },
        notes: [
            { id: 'n1', pitch: 60, startBeat: 0, duration: 1, velocity: 100 },
            { id: 'n2', pitch: 64, startBeat: 1, duration: 0.5, velocity: 80 },
        ],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
    });

    it('serializes clip to compact format', () => {
        const clip = createTestClip();
        const serialized = serializeClip(clip);

        expect(serialized.k).toBe('melodyLane');
        expect(serialized.n).toBe('Test Clip');
        expect(serialized.sb).toBe(1);
        expect(serialized.lb).toBe(4);
        expect(serialized.m.b).toBe(120);
        expect(serialized.nt).toHaveLength(2);
    });

    it('deserializes clip from compact format', () => {
        const clip = createTestClip();
        const serialized = serializeClip(clip);
        const deserialized = deserializeClip(serialized);

        expect(deserialized.kind).toBe(clip.kind);
        expect(deserialized.name).toBe(clip.name);
        expect(deserialized.startBar).toBe(clip.startBar);
        expect(deserialized.notes).toHaveLength(clip.notes.length);
    });

    it('round-trips clip data correctly', () => {
        const original = createTestClip();
        const serialized = serializeClip(original);
        const deserialized = deserializeClip(serialized);

        expect(deserialized.name).toBe(original.name);
        expect(deserialized.kind).toBe(original.kind);
        expect(deserialized.metadata.bpm).toBe(original.metadata.bpm);
        expect(deserialized.laneSettings.noteMode).toBe(original.laneSettings.noteMode);
        expect(deserialized.notes[0].pitch).toBe(original.notes[0].pitch);
    });
});

describe('ClipRef - Payload Serialization', () => {
    it('creates payload with version', () => {
        const clips: ProjectClipRef[] = [];
        const payload = serializeClipsToPayload(clips);

        expect(payload.v).toBe(CLIP_REF_SCHEMA_VERSION);
        expect(payload.clips).toEqual([]);
    });

    it('serializes multiple clips', () => {
        const clips: ProjectClipRef[] = [
            {
                id: 'clip1',
                kind: 'melodyLane',
                refId: 'lane1',
                name: 'Clip 1',
                startBar: 1,
                lengthBars: 4,
                metadata: {
                    bpm: 120,
                    key: 'C',
                    scale: { root: 'C', type: 'major', snapToScale: false },
                    timeSignature: [4, 4],
                },
                laneSettings: {
                    instrumentId: 'grand-piano',
                    noteMode: 'sustain',
                    velocityDefault: 100,
                    quantizeGrid: '1/16',
                },
                notes: [],
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
            },
        ];

        const payload = serializeClipsToPayload(clips);
        const deserialized = deserializeClipsFromPayload(payload);

        expect(deserialized).toHaveLength(1);
        expect(deserialized[0].name).toBe('Clip 1');
    });
});

describe('ClipRef - URL Encoding', () => {
    it('encodes clips to URL string', () => {
        const clips: ProjectClipRef[] = [{
            id: 'clip1',
            kind: 'drumLane',
            refId: 'lane1',
            name: 'Test',
            startBar: 1,
            lengthBars: 2,
            metadata: {
                bpm: 120,
                key: 'C',
                scale: { root: 'C', type: 'major', snapToScale: false },
                timeSignature: [4, 4],
            },
            laneSettings: {
                instrumentId: 'acoustic-kit',
                noteMode: 'oneShot',
                velocityDefault: 100,
                quantizeGrid: '1/16',
            },
            notes: [],
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
        }];

        const encoded = encodeClipsToUrl(clips);
        expect(encoded).not.toBeNull();
        expect(typeof encoded).toBe('string');
        expect(encoded!.length).toBeGreaterThan(0);
    });

    it('decodes clips from URL string', () => {
        const clips: ProjectClipRef[] = [{
            id: 'clip1',
            kind: 'melodyLane',
            refId: 'lane1',
            name: 'Decoded Test',
            startBar: 1,
            lengthBars: 4,
            metadata: {
                bpm: 140,
                key: 'D',
                scale: { root: 'D', type: 'minor', snapToScale: false },
                timeSignature: [4, 4],
            },
            laneSettings: {
                instrumentId: 'grand-piano',
                noteMode: 'sustain',
                velocityDefault: 80,
                quantizeGrid: '1/8',
            },
            notes: [
                { id: 'n1', pitch: 62, startBeat: 0, duration: 2, velocity: 90 },
            ],
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
        }];

        const encoded = encodeClipsToUrl(clips);
        const decoded = decodeClipsFromUrl(encoded!);

        expect(decoded).not.toBeNull();
        expect(decoded).toHaveLength(1);
        expect(decoded![0].name).toBe('Decoded Test');
        expect(decoded![0].metadata.bpm).toBe(140);
    });

    it('returns null for invalid encoded strings', () => {
        expect(decodeClipsFromUrl('')).toBeNull();
        expect(decodeClipsFromUrl('invalid-base64!')).toBeNull();
        expect(decodeClipsFromUrl('aW52YWxpZCBqc29u')).toBeNull(); // "invalid json" in base64
    });

    it('rejects oversized payloads', () => {
        // Create a clip with too many notes
        const manyNotes = Array.from({ length: 5000 }, (_, i) => ({
            id: `n${i}`,
            pitch: 60,
            startBeat: i * 0.25,
            duration: 0.25,
            velocity: 100,
        }));

        const clips: ProjectClipRef[] = [{
            id: 'clip1',
            kind: 'melodyLane',
            refId: 'lane1',
            name: 'Too Large',
            startBar: 1,
            lengthBars: 4,
            metadata: {
                bpm: 120,
                key: 'C',
                scale: { root: 'C', type: 'major', snapToScale: false },
                timeSignature: [4, 4],
            },
            laneSettings: {
                instrumentId: 'grand-piano',
                noteMode: 'sustain',
                velocityDefault: 100,
                quantizeGrid: '1/16',
            },
            notes: manyNotes,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
        }];

        const encoded = encodeClipsToUrl(clips);
        expect(encoded).toBeNull();
    });
});

describe('ClipRef - Validation', () => {
    it('validates correct payload structure', () => {
        const valid: SerializedClipPayload = {
            v: 1,
            clips: [{
                id: 'c1',
                k: 'drumLane',
                n: 'Test',
                sb: 1,
                lb: 4,
                m: { b: 120, k: 'C', s: 'major', t: [4, 4] },
                ls: { i: 'kit', nm: 'oneShot', v: 100, q: '1/16' },
                nt: [],
            }],
        };

        expect(validatePayload(valid)).toBe(true);
    });

    it('rejects invalid payload - missing version', () => {
        const invalid = { clips: [] };
        expect(validatePayload(invalid)).toBe(false);
    });

    it('rejects invalid payload - missing clips', () => {
        const invalid = { v: 1 };
        expect(validatePayload(invalid)).toBe(false);
    });

    it('rejects invalid clip - invalid kind', () => {
        const clip = {
            k: 'invalidKind',
            n: 'Test',
            sb: 1,
            lb: 4,
            m: { b: 120, k: 'C', s: 'major', t: [4, 4] },
            ls: { i: 'kit', nm: 'oneShot', v: 100, q: '1/16' },
            nt: [],
        };
        expect(validateSerializedClip(clip)).toBe(false);
    });

    it('rejects invalid clip - negative bar', () => {
        const clip = {
            k: 'drumLane',
            n: 'Test',
            sb: -1, // Invalid
            lb: 4,
            m: { b: 120, k: 'C', s: 'major', t: [4, 4] },
            ls: { i: 'kit', nm: 'oneShot', v: 100, q: '1/16' },
            nt: [],
        };
        expect(validateSerializedClip(clip)).toBe(false);
    });
});

describe('ClipRef - Migration', () => {
    it('migrates payload at current version unchanged', () => {
        const payload: SerializedClipPayload = {
            v: CLIP_REF_SCHEMA_VERSION,
            clips: [],
        };

        const migrated = migratePayload(payload);
        expect(migrated.v).toBe(CLIP_REF_SCHEMA_VERSION);
    });

    it('handles future version gracefully', () => {
        const futurePayload: SerializedClipPayload = {
            v: CLIP_REF_SCHEMA_VERSION + 1,
            clips: [],
        };

        // Should not throw, returns payload as-is
        const migrated = migratePayload(futurePayload);
        expect(migrated).toBeDefined();
    });
});


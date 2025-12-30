/**
 * Unit tests for Arrangement Lane system
 *
 * Tests lane operations, URL encoding/decoding, validation, and migrations.
 */

import { describe, it, expect } from 'vitest';
import {
    type Arrangement,
    type Lane,
    ARRANGEMENT_SCHEMA_VERSION,
    MAX_ARRANGEMENT_URL_SIZE,
    createMelodyLane,
    createDrumLane,
    createChordLane,
    createArrangement,
    addLane,
    removeLane,
    updateLane,
    moveLane,
    encodeArrangementToUrl,
    decodeArrangementFromUrl,
} from './lanes';

describe('Lanes - Factory Functions', () => {
    it('creates melody lane with correct defaults', () => {
        const lane = createMelodyLane('Test Melody');

        expect(lane.type).toBe('melody');
        expect(lane.name).toBe('Test Melody');
        expect(lane.noteMode).toBe('sustain');
        expect(lane.notes).toEqual([]);
        expect(lane.instrument).toBe('grand-piano');
        expect(lane.muted).toBe(false);
        expect(lane.solo).toBe(false);
    });

    it('creates drum lane with correct defaults', () => {
        const lane = createDrumLane('Test Drums');

        expect(lane.type).toBe('drums');
        expect(lane.name).toBe('Test Drums');
        expect(lane.noteMode).toBe('oneShot');
        expect(lane.notes).toEqual([]);
        expect(lane.kit).toBe('acoustic');
    });

    it('creates chord lane with correct defaults', () => {
        const lane = createChordLane('Test Chords');

        expect(lane.type).toBe('chord');
        expect(lane.name).toBe('Test Chords');
        expect(lane.noteMode).toBe('sustain');
        expect(lane.chords).toEqual([]);
        expect(lane.instrument).toBe('grand-piano');
    });

    it('generates unique lane IDs', () => {
        const lane1 = createMelodyLane();
        const lane2 = createMelodyLane();
        expect(lane1.id).not.toBe(lane2.id);
    });
});

describe('Lanes - Arrangement Operations', () => {
    it('creates arrangement with default lanes', () => {
        const arr = createArrangement('My Arrangement');

        expect(arr.name).toBe('My Arrangement');
        expect(arr.schemaVersion).toBe(ARRANGEMENT_SCHEMA_VERSION);
        expect(arr.lanes).toHaveLength(2);
        expect(arr.lanes[0].type).toBe('melody');
        expect(arr.lanes[1].type).toBe('drums');
        expect(arr.bpm).toBe(120);
        expect(arr.bars).toBe(4);
    });

    it('adds melody lane', () => {
        const arr = createArrangement();
        const updated = addLane(arr, 'melody');

        expect(updated.lanes).toHaveLength(3);
        expect(updated.lanes[2].type).toBe('melody');
        expect(updated.lanes[2].name).toBe('Melody 2');
    });

    it('adds drum lane', () => {
        const arr = createArrangement();
        const updated = addLane(arr, 'drums');

        expect(updated.lanes).toHaveLength(3);
        expect(updated.lanes[2].type).toBe('drums');
        expect(updated.lanes[2].name).toBe('Drums 2');
    });

    it('adds chord lane', () => {
        const arr = createArrangement();
        const updated = addLane(arr, 'chord');

        expect(updated.lanes).toHaveLength(3);
        expect(updated.lanes[2].type).toBe('chord');
    });

    it('removes lane by id', () => {
        const arr = createArrangement();
        const laneId = arr.lanes[0].id;
        const updated = removeLane(arr, laneId);

        expect(updated.lanes).toHaveLength(1);
        expect(updated.lanes.find(l => l.id === laneId)).toBeUndefined();
    });

    it('updates lane properties', () => {
        const arr = createArrangement();
        const laneId = arr.lanes[0].id;
        const updated = updateLane(arr, laneId, { name: 'Updated Name', muted: true });

        const lane = updated.lanes.find(l => l.id === laneId);
        expect(lane?.name).toBe('Updated Name');
        expect(lane?.muted).toBe(true);
    });

    it('moves lane up', () => {
        const arr = createArrangement();
        const secondLaneId = arr.lanes[1].id;
        const updated = moveLane(arr, secondLaneId, 'up');

        expect(updated.lanes[0].id).toBe(secondLaneId);
    });

    it('moves lane down', () => {
        const arr = createArrangement();
        const firstLaneId = arr.lanes[0].id;
        const updated = moveLane(arr, firstLaneId, 'down');

        expect(updated.lanes[1].id).toBe(firstLaneId);
    });

    it('does not move lane past boundaries', () => {
        const arr = createArrangement();
        const firstLaneId = arr.lanes[0].id;
        const updated = moveLane(arr, firstLaneId, 'up');

        expect(updated.lanes[0].id).toBe(firstLaneId); // Unchanged
    });
});

describe('Lanes - URL Encoding', () => {
    it('encodes arrangement to URL string', () => {
        const arr = createArrangement('URL Test');
        const encoded = encodeArrangementToUrl(arr);

        expect(encoded).toBeTruthy();
        expect(typeof encoded).toBe('string');
        expect(encoded.length).toBeGreaterThan(0);
    });

    it('decodes arrangement from URL string', () => {
        const original = createArrangement('Decode Test');
        original.bpm = 140;
        original.bars = 8;

        const encoded = encodeArrangementToUrl(original);
        const decoded = decodeArrangementFromUrl(encoded);

        expect(decoded).not.toBeNull();
        expect(decoded!.name).toBe('Decode Test');
        expect(decoded!.bpm).toBe(140);
        expect(decoded!.bars).toBe(8);
        expect(decoded!.lanes).toHaveLength(2);
    });

    it('includes version in encoded payload', () => {
        const arr = createArrangement();
        const encoded = encodeArrangementToUrl(arr);
        const decoded = decodeArrangementFromUrl(encoded);

        expect(decoded?.schemaVersion).toBe(ARRANGEMENT_SCHEMA_VERSION);
    });

    it('returns empty string for oversized arrangement', () => {
        const arr = createArrangement();

        // Add many notes to exceed size limit
        const manyNotes = Array.from({ length: 10000 }, (_, i) => ({
            id: `note_${i}`,
            pitch: 60,
            startBeat: i * 0.25,
            duration: 0.25,
            velocity: 100,
        }));

        if (arr.lanes[0].type === 'melody') {
            (arr.lanes[0] as any).notes = manyNotes;
        }

        const encoded = encodeArrangementToUrl(arr);
        expect(encoded).toBe('');
    });

    it('returns null for invalid encoded strings', () => {
        expect(decodeArrangementFromUrl('')).toBeNull();
        expect(decodeArrangementFromUrl('not-valid-base64!')).toBeNull();
    });

    it('returns null for invalid arrangement structure', () => {
        // Encode invalid data
        const invalid = btoa(encodeURIComponent(JSON.stringify({ v: 1, data: { invalid: true } })));
        expect(decodeArrangementFromUrl(invalid)).toBeNull();
    });

    it('rejects suspiciously large payloads', () => {
        // Create a very long base64 string
        const hugeString = 'A'.repeat(MAX_ARRANGEMENT_URL_SIZE * 2);
        expect(decodeArrangementFromUrl(hugeString)).toBeNull();
    });
});

describe('Lanes - Migration', () => {
    it('migrates legacy arrangement without schemaVersion', () => {
        // Simulate legacy v1 arrangement
        const legacyData = {
            id: 'arr_123',
            name: 'Legacy',
            bpm: 120,
            bars: 4,
            timeSignature: [4, 4],
            key: 'C',
            scale: { root: 'C', type: 'major', snapToScale: false },
            lanes: [
                {
                    id: 'lane_1',
                    name: 'Melody',
                    type: 'melody',
                    muted: false,
                    solo: false,
                    volume: 100,
                    pan: 0,
                    color: '#92d36e',
                    collapsed: false,
                    notes: [],
                    scale: { root: 'C', type: 'major', snapToScale: false },
                    instrument: 'grand-piano',
                    // Note: no noteMode field
                },
            ],
            humanize: {
                enabled: false,
                timingRange: 10,
                velocityRange: 15,
                swingAmount: 0,
                linkToGlobalSwing: false,
            },
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
        };

        // Encode as legacy (no version wrapper)
        const encoded = btoa(encodeURIComponent(JSON.stringify(legacyData)));
        const decoded = decodeArrangementFromUrl(encoded);

        expect(decoded).not.toBeNull();
        expect(decoded!.schemaVersion).toBe(ARRANGEMENT_SCHEMA_VERSION);
        expect(decoded!.lanes[0]).toHaveProperty('noteMode');
    });

    it('migrates versioned v1 arrangement to current', () => {
        const v1Data = {
            v: 1,
            data: {
                id: 'arr_456',
                name: 'V1 Arrangement',
                bpm: 120,
                bars: 4,
                timeSignature: [4, 4],
                key: 'C',
                scale: { root: 'C', type: 'major', snapToScale: false },
                lanes: [
                    {
                        id: 'lane_1',
                        name: 'Drums',
                        type: 'drums',
                        muted: false,
                        solo: false,
                        volume: 100,
                        pan: 0,
                        color: '#ff9f43',
                        collapsed: false,
                        notes: [],
                        kit: 'acoustic',
                        pattern: { id: 'default', name: 'Default', steps: 16, swing: 0 },
                    },
                ],
                humanize: {
                    enabled: false,
                    timingRange: 10,
                    velocityRange: 15,
                    swingAmount: 0,
                    linkToGlobalSwing: false,
                },
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
            },
        };

        const encoded = btoa(encodeURIComponent(JSON.stringify(v1Data)));
        const decoded = decodeArrangementFromUrl(encoded);

        expect(decoded).not.toBeNull();
        expect(decoded!.schemaVersion).toBe(ARRANGEMENT_SCHEMA_VERSION);
        expect((decoded!.lanes[0] as any).noteMode).toBe('oneShot');
    });
});

describe('Lanes - Validation', () => {
    it('validates correct arrangement', () => {
        const arr = createArrangement();
        const encoded = encodeArrangementToUrl(arr);
        const decoded = decodeArrangementFromUrl(encoded);

        expect(decoded).not.toBeNull();
    });

    it('rejects arrangement with invalid BPM', () => {
        const invalidData = {
            v: ARRANGEMENT_SCHEMA_VERSION,
            data: {
                id: 'arr_123',
                name: 'Invalid',
                bpm: 500, // Too high
                bars: 4,
                lanes: [],
            },
        };

        const encoded = btoa(encodeURIComponent(JSON.stringify(invalidData)));
        expect(decodeArrangementFromUrl(encoded)).toBeNull();
    });

    it('rejects arrangement with invalid bars', () => {
        const invalidData = {
            v: ARRANGEMENT_SCHEMA_VERSION,
            data: {
                id: 'arr_123',
                name: 'Invalid',
                bpm: 120,
                bars: 100, // Too many
                lanes: [],
            },
        };

        const encoded = btoa(encodeURIComponent(JSON.stringify(invalidData)));
        expect(decodeArrangementFromUrl(encoded)).toBeNull();
    });
});


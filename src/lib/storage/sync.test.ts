/**
 * Unit tests for Vault Sync and Bundle functionality
 *
 * Tests Lane Builder entity sync, merge rules, and bundle export/import.
 * Tests conflict resolution utilities and validation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type {
    VaultMeta,
    LaneTemplateRef,
    ChordProgressionRef,
    AudioLoopRef,
    ProjectClipRefEntry,
    ProjectRef,
    ConflictRecord,
} from './vaultTypes';
import {
    VAULT_SCHEMA_VERSION,
    ALLOWED_BLOB_MIME_TYPES,
    MAX_BLOB_SIZE,
    MAX_BUNDLE_SIZE,
} from './vaultTypes';
import {
    validateBundle,
    isAllowedBlobType,
    generateLaneTemplateHash,
    generateProgressionHash,
    type VaultBundle,
} from './bundle';
import {
    summarizeConflict,
    validateEntityForResolution,
    applyResolution,
    getEntityTypeDisplayName,
    getSeverityColor,
} from './conflictResolution';

describe('Vault Types', () => {
    it('has correct schema version', () => {
        expect(VAULT_SCHEMA_VERSION).toBe(2);
    });

    it('defines allowed blob MIME types', () => {
        expect(ALLOWED_BLOB_MIME_TYPES).toContain('audio/wav');
        expect(ALLOWED_BLOB_MIME_TYPES).toContain('audio/mpeg');
        expect(ALLOWED_BLOB_MIME_TYPES).toContain('audio/ogg');
    });

    it('has reasonable size limits', () => {
        expect(MAX_BLOB_SIZE).toBe(50 * 1024 * 1024); // 50MB
        expect(MAX_BUNDLE_SIZE).toBe(500 * 1024 * 1024); // 500MB
    });
});

describe('isAllowedBlobType', () => {
    it('allows audio MIME types', () => {
        expect(isAllowedBlobType('audio/wav')).toBe(true);
        expect(isAllowedBlobType('audio/mpeg')).toBe(true);
        expect(isAllowedBlobType('audio/ogg')).toBe(true);
    });

    it('rejects disallowed MIME types', () => {
        expect(isAllowedBlobType('text/html')).toBe(false);
        expect(isAllowedBlobType('application/javascript')).toBe(false);
        expect(isAllowedBlobType('image/png')).toBe(false);
    });
});

describe('Content Hash Generation', () => {
    it('generates consistent hash for lane template', async () => {
        const notes = [
            { pitch: 60, startBeat: 0, duration: 1, velocity: 100 },
            { pitch: 64, startBeat: 1, duration: 0.5, velocity: 80 },
        ];
        const settings = {
            instrumentId: 'grand-piano',
            noteMode: 'sustain' as const,
            velocityDefault: 100,
            quantizeGrid: '1/16' as const,
            color: '#92d36e',
        };

        const hash1 = await generateLaneTemplateHash(notes, settings);
        const hash2 = await generateLaneTemplateHash(notes, settings);

        expect(hash1).toBe(hash2);
        expect(hash1.length).toBe(16);
    });

    it('generates different hash for different notes', async () => {
        const settings = {
            instrumentId: 'grand-piano',
            noteMode: 'sustain' as const,
            velocityDefault: 100,
            quantizeGrid: '1/16' as const,
            color: '#92d36e',
        };

        const hash1 = await generateLaneTemplateHash(
            [{ pitch: 60, startBeat: 0, duration: 1, velocity: 100 }],
            settings
        );
        const hash2 = await generateLaneTemplateHash(
            [{ pitch: 62, startBeat: 0, duration: 1, velocity: 100 }],
            settings
        );

        expect(hash1).not.toBe(hash2);
    });

    it('generates consistent hash for chord progression', async () => {
        const numerals = ['I', 'V', 'vi', 'IV'];
        const durations = [4, 4, 4, 4];

        const hash1 = await generateProgressionHash(numerals, durations);
        const hash2 = await generateProgressionHash(numerals, durations);

        expect(hash1).toBe(hash2);
        expect(hash1.length).toBe(16);
    });
});

describe('Bundle Validation', () => {
    const createValidBundle = (): VaultBundle => ({
        version: VAULT_SCHEMA_VERSION,
        createdAt: new Date().toISOString(),
        deviceId: 'test-device',
        metadataEnvelope: '{}',
        manifest: {
            schemaVersion: VAULT_SCHEMA_VERSION,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            blobs: {},
        },
        blobs: {},
    });

    it('validates correct bundle', () => {
        const bundle = createValidBundle();
        const result = validateBundle(bundle);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('rejects null bundle', () => {
        const result = validateBundle(null);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Bundle is not a valid object');
    });

    it('rejects bundle with missing version', () => {
        const bundle = createValidBundle();
        delete (bundle as any).version;
        const result = validateBundle(bundle);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('version'))).toBe(true);
    });

    it('rejects bundle with future version', () => {
        const bundle = createValidBundle();
        (bundle as any).version = VAULT_SCHEMA_VERSION + 10;
        const result = validateBundle(bundle);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('newer'))).toBe(true);
    });

    it('warns about disallowed blob types', () => {
        const bundle = createValidBundle();
        bundle.manifest.blobs['test-blob'] = {
            id: 'test-blob',
            size: 1000,
            mimeType: 'text/html', // Disallowed
            createdAt: new Date().toISOString(),
            checksum: 'abc123',
        };
        const result = validateBundle(bundle);

        expect(result.warnings.some(w => w.includes('disallowed MIME type'))).toBe(true);
    });

    it('warns about oversized blobs', () => {
        const bundle = createValidBundle();
        bundle.manifest.blobs['test-blob'] = {
            id: 'test-blob',
            size: MAX_BLOB_SIZE + 1000,
            mimeType: 'audio/wav',
            createdAt: new Date().toISOString(),
            checksum: 'abc123',
        };
        const result = validateBundle(bundle);

        expect(result.warnings.some(w => w.includes('exceeds maximum size'))).toBe(true);
    });

    it('rejects bundle exceeding total size limit', () => {
        const bundle = createValidBundle();
        // Add a huge blob data string
        bundle.blobs['huge'] = 'A'.repeat(MAX_BUNDLE_SIZE + 1);
        const result = validateBundle(bundle);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('total size'))).toBe(true);
    });
});

describe('VaultMeta Entity Types', () => {
    it('defines LaneTemplateRef structure', () => {
        const template: LaneTemplateRef = {
            id: 'template_1',
            name: 'Test Template',
            type: 'melody',
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            laneSettings: {
                instrumentId: 'grand-piano',
                noteMode: 'sustain',
                velocityDefault: 100,
                quantizeGrid: '1/16',
                color: '#92d36e',
            },
            notes: [
                { pitch: 60, startBeat: 0, duration: 1, velocity: 100 },
            ],
            bpm: 120,
            bars: 4,
            timeSignature: [4, 4],
            key: 'C',
            scaleType: 'major',
            contentHash: 'abc123',
        };

        expect(template.type).toBe('melody');
        expect(template.laneSettings.noteMode).toBe('sustain');
    });

    it('defines AudioLoopRef structure', () => {
        const loop: AudioLoopRef = {
            id: 'loop_1',
            name: 'Test Loop',
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            blobId: 'blob_123',
            blobHash: 'hash_abc',
            mimeType: 'audio/wav',
            durationMs: 4000,
            sampleRate: 44100,
            channels: 2,
            bpm: 120,
            key: 'C',
            bars: 4,
        };

        expect(loop.mimeType).toBe('audio/wav');
        expect(loop.blobHash).toBe('hash_abc');
    });

    it('defines ProjectClipRefEntry structure', () => {
        const clip: ProjectClipRefEntry = {
            id: 'clip_1',
            projectId: 'project_1',
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            sourceType: 'laneTemplate',
            sourceId: 'template_1',
            startBar: 1,
            lengthBars: 4,
        };

        expect(clip.sourceType).toBe('laneTemplate');
        expect(clip.startBar).toBe(1);
    });

    it('allows ProjectRef with clipRefs', () => {
        const project: ProjectRef = {
            id: 'project_1',
            name: 'Test Project',
            updatedAt: new Date().toISOString(),
            blobIds: ['blob_1'],
            clipRefs: ['clip_1', 'clip_2'],
        };

        expect(project.clipRefs).toHaveLength(2);
    });
});

describe('VaultMeta Structure', () => {
    it('supports all new entity arrays', () => {
        const meta: VaultMeta = {
            schemaVersion: VAULT_SCHEMA_VERSION,
            deviceId: 'test-device',
            updatedAt: new Date().toISOString(),
            projects: [],
            referenceLibraries: [],
            infobase: [],
            settings: {
                updatedAt: new Date().toISOString(),
                themeId: 'dark',
                selectedProductIds: [],
            },
            laneTemplates: [],
            chordProgressions: [],
            audioLoops: [],
            projectClips: [],
        };

        expect(meta.schemaVersion).toBe(VAULT_SCHEMA_VERSION);
        expect(meta.laneTemplates).toEqual([]);
        expect(meta.chordProgressions).toEqual([]);
        expect(meta.audioLoops).toEqual([]);
        expect(meta.projectClips).toEqual([]);
    });
});

describe('Conflict Resolution - Summarize', () => {
    const createLaneTemplateConflict = (): ConflictRecord => ({
        entityType: 'laneTemplate',
        entityId: 'template_1',
        localValue: {
            id: 'template_1',
            name: 'My Melody',
            type: 'melody',
            updatedAt: '2024-01-01T10:00:00Z',
            createdAt: '2024-01-01T00:00:00Z',
            laneSettings: {
                instrumentId: 'grand-piano',
                noteMode: 'sustain',
                velocityDefault: 100,
                quantizeGrid: '1/16',
                color: '#92d36e',
            },
            notes: [
                { pitch: 60, startBeat: 0, duration: 1, velocity: 100 },
                { pitch: 64, startBeat: 1, duration: 0.5, velocity: 80 },
            ],
            bpm: 120,
            bars: 4,
            timeSignature: [4, 4],
            key: 'C',
            scaleType: 'major',
            contentHash: 'abc123',
        },
        remoteValue: {
            id: 'template_1',
            name: 'My Melody',
            type: 'melody',
            updatedAt: '2024-01-01T11:00:00Z',
            createdAt: '2024-01-01T00:00:00Z',
            laneSettings: {
                instrumentId: 'synth-lead',
                noteMode: 'sustain',
                velocityDefault: 100,
                quantizeGrid: '1/8',
                color: '#92d36e',
            },
            notes: [
                { pitch: 60, startBeat: 0, duration: 1, velocity: 100 },
                { pitch: 64, startBeat: 1, duration: 0.5, velocity: 80 },
                { pitch: 67, startBeat: 2, duration: 1, velocity: 90 },
            ],
            bpm: 140,
            bars: 4,
            timeSignature: [4, 4],
            key: 'D',
            scaleType: 'major',
            contentHash: 'xyz789',
        },
        localDeviceId: 'device123456789',
        remoteDeviceId: 'device987654321',
        localUpdatedAt: '2024-01-01T10:00:00Z',
        remoteUpdatedAt: '2024-01-01T11:00:00Z',
        conflictReason: 'settings_conflict',
    });

    it('summarizes lane template conflict', () => {
        const conflict = createLaneTemplateConflict();
        const summary = summarizeConflict(conflict);

        expect(summary.entityType).toBe('laneTemplate');
        expect(summary.entityName).toBe('My Melody');
        expect(summary.changes.length).toBeGreaterThan(0);
    });

    it('detects instrument change', () => {
        const conflict = createLaneTemplateConflict();
        const summary = summarizeConflict(conflict);

        const instrumentChange = summary.changes.find(c => c.field === 'Instrument');
        expect(instrumentChange).toBeDefined();
        expect(instrumentChange?.localValue).toBe('Grand Piano');
        expect(instrumentChange?.remoteValue).toBe('Synth Lead');
    });

    it('detects note count change', () => {
        const conflict = createLaneTemplateConflict();
        const summary = summarizeConflict(conflict);

        const notesChange = summary.changes.find(c => c.field === 'Notes');
        expect(notesChange).toBeDefined();
        expect(notesChange?.localValue).toContain('2 notes');
    });

    it('sanitizes device IDs in summary', () => {
        const conflict = createLaneTemplateConflict();
        const summary = summarizeConflict(conflict);

        expect(summary.localDeviceId).toBe('...23456789');
        expect(summary.remoteDeviceId).toBe('...87654321');
    });

    it('summarizes project clip conflict', () => {
        const conflict: ConflictRecord = {
            entityType: 'projectClip',
            entityId: 'clip_1',
            localValue: {
                id: 'clip_1',
                projectId: 'project_1',
                updatedAt: '2024-01-01T10:00:00Z',
                createdAt: '2024-01-01T00:00:00Z',
                sourceType: 'laneTemplate',
                sourceId: 'template_1',
                startBar: 1,
                lengthBars: 4,
            },
            remoteValue: {
                id: 'clip_1',
                projectId: 'project_1',
                updatedAt: '2024-01-01T11:00:00Z',
                createdAt: '2024-01-01T00:00:00Z',
                sourceType: 'laneTemplate',
                sourceId: 'template_1',
                startBar: 5,
                lengthBars: 8,
            },
            localDeviceId: 'device_a',
            remoteDeviceId: 'device_b',
            localUpdatedAt: '2024-01-01T10:00:00Z',
            remoteUpdatedAt: '2024-01-01T11:00:00Z',
        };

        const summary = summarizeConflict(conflict);

        expect(summary.entityType).toBe('projectClip');
        const startChange = summary.changes.find(c => c.field === 'Start Bar');
        expect(startChange).toBeDefined();
        expect(startChange?.localValue).toBe('Bar 1');
        expect(startChange?.remoteValue).toBe('Bar 5');
    });
});

describe('Conflict Resolution - Validation', () => {
    it('validates correct lane template', () => {
        const template: LaneTemplateRef = {
            id: 'template_1',
            name: 'Test',
            type: 'melody',
            updatedAt: '2024-01-01T00:00:00Z',
            createdAt: '2024-01-01T00:00:00Z',
            laneSettings: {
                instrumentId: 'grand-piano',
                noteMode: 'sustain',
                velocityDefault: 100,
                quantizeGrid: '1/16',
                color: '#92d36e',
            },
            notes: [],
            bpm: 120,
            bars: 4,
            timeSignature: [4, 4],
            key: 'C',
            scaleType: 'major',
            contentHash: 'abc',
        };

        const result = validateEntityForResolution('laneTemplate', template);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('rejects lane template with invalid type', () => {
        const template = {
            id: 'template_1',
            name: 'Test',
            type: 'invalid',
            updatedAt: '2024-01-01T00:00:00Z',
            laneSettings: {},
            notes: [],
        };

        const result = validateEntityForResolution('laneTemplate', template);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('lane type'))).toBe(true);
    });

    it('rejects null value', () => {
        const result = validateEntityForResolution('laneTemplate', null);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Value must be a non-null object');
    });

    it('validates project clip with required fields', () => {
        const clip: ProjectClipRefEntry = {
            id: 'clip_1',
            projectId: 'project_1',
            updatedAt: '2024-01-01T00:00:00Z',
            createdAt: '2024-01-01T00:00:00Z',
            sourceType: 'laneTemplate',
            sourceId: 'template_1',
            startBar: 1,
            lengthBars: 4,
        };

        const result = validateEntityForResolution('projectClip', clip);
        expect(result.valid).toBe(true);
    });

    it('rejects project clip with invalid startBar', () => {
        const clip = {
            id: 'clip_1',
            projectId: 'project_1',
            updatedAt: '2024-01-01T00:00:00Z',
            sourceType: 'laneTemplate',
            sourceId: 'template_1',
            startBar: 0, // Invalid
            lengthBars: 4,
        };

        const result = validateEntityForResolution('projectClip', clip);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('startBar'))).toBe(true);
    });
});

describe('Conflict Resolution - Apply', () => {
    it('applies local resolution', () => {
        const conflict: ConflictRecord = {
            entityType: 'laneTemplate',
            entityId: 'template_1',
            localValue: {
                id: 'template_1',
                name: 'Local Version',
                type: 'melody',
                updatedAt: '2024-01-01T10:00:00Z',
                createdAt: '2024-01-01T00:00:00Z',
                laneSettings: {
                    instrumentId: 'grand-piano',
                    noteMode: 'sustain',
                    velocityDefault: 100,
                    quantizeGrid: '1/16',
                    color: '#92d36e',
                },
                notes: [],
                bpm: 120,
                bars: 4,
                timeSignature: [4, 4],
                key: 'C',
                scaleType: 'major',
                contentHash: 'abc',
            },
            remoteValue: {
                id: 'template_1',
                name: 'Remote Version',
                type: 'melody',
                updatedAt: '2024-01-01T11:00:00Z',
                createdAt: '2024-01-01T00:00:00Z',
                laneSettings: {
                    instrumentId: 'synth-lead',
                    noteMode: 'sustain',
                    velocityDefault: 100,
                    quantizeGrid: '1/16',
                    color: '#92d36e',
                },
                notes: [],
                bpm: 140,
                bars: 4,
                timeSignature: [4, 4],
                key: 'D',
                scaleType: 'major',
                contentHash: 'xyz',
            },
            localDeviceId: 'device_a',
            remoteDeviceId: 'device_b',
            localUpdatedAt: '2024-01-01T10:00:00Z',
            remoteUpdatedAt: '2024-01-01T11:00:00Z',
        };

        const { resolved, resolution } = applyResolution(conflict, 'local', 'my_device');

        expect((resolved as LaneTemplateRef).name).toBe('Local Version');
        expect(resolution.choice).toBe('local');
        expect(resolution.resolvedBy).toBe('my_device');
    });

    it('applies remote resolution', () => {
        const conflict: ConflictRecord = {
            entityType: 'laneTemplate',
            entityId: 'template_1',
            localValue: {
                id: 'template_1',
                name: 'Local',
                type: 'melody',
                updatedAt: '2024-01-01T00:00:00Z',
                createdAt: '2024-01-01T00:00:00Z',
                laneSettings: {
                    instrumentId: 'grand-piano',
                    noteMode: 'sustain',
                    velocityDefault: 100,
                    quantizeGrid: '1/16',
                    color: '#92d36e',
                },
                notes: [],
                bpm: 120,
                bars: 4,
                timeSignature: [4, 4],
                key: 'C',
                scaleType: 'major',
                contentHash: 'abc',
            },
            remoteValue: {
                id: 'template_1',
                name: 'Remote',
                type: 'drums',
                updatedAt: '2024-01-01T00:00:00Z',
                createdAt: '2024-01-01T00:00:00Z',
                laneSettings: {
                    instrumentId: 'acoustic-kit',
                    noteMode: 'oneShot',
                    velocityDefault: 100,
                    quantizeGrid: '1/16',
                    color: '#ff9f43',
                },
                notes: [],
                bpm: 140,
                bars: 4,
                timeSignature: [4, 4],
                key: 'C',
                scaleType: 'major',
                contentHash: 'xyz',
            },
            localDeviceId: 'device_a',
            remoteDeviceId: 'device_b',
            localUpdatedAt: '2024-01-01T00:00:00Z',
            remoteUpdatedAt: '2024-01-01T00:00:00Z',
        };

        const { resolved, resolution } = applyResolution(conflict, 'remote', 'my_device');

        expect((resolved as LaneTemplateRef).name).toBe('Remote');
        expect((resolved as LaneTemplateRef).type).toBe('drums');
        expect(resolution.choice).toBe('remote');
    });

    it('throws on invalid entity for resolution', () => {
        const conflict: ConflictRecord = {
            entityType: 'laneTemplate',
            entityId: 'template_1',
            localValue: { invalid: true },
            remoteValue: { invalid: true },
            localDeviceId: 'device_a',
            remoteDeviceId: 'device_b',
            localUpdatedAt: '2024-01-01T00:00:00Z',
            remoteUpdatedAt: '2024-01-01T00:00:00Z',
        };

        expect(() => applyResolution(conflict, 'local', 'my_device')).toThrow();
    });
});

describe('Conflict Resolution - Helpers', () => {
    it('returns correct display names for entity types', () => {
        expect(getEntityTypeDisplayName('laneTemplate')).toBe('Lane Template');
        expect(getEntityTypeDisplayName('projectClip')).toBe('Project Clip');
        expect(getEntityTypeDisplayName('audioLoop')).toBe('Audio Loop');
        expect(getEntityTypeDisplayName('project')).toBe('Project');
    });

    it('returns correct severity colors', () => {
        expect(getSeverityColor('high')).toContain('ef4444');
        expect(getSeverityColor('medium')).toContain('f59e0b');
        expect(getSeverityColor('low')).toContain('666');
    });
});

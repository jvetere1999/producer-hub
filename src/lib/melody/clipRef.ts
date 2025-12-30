/**
 * Project Clip Reference System
 *
 * Allows lanes to be linked to projects as reusable clips.
 * Supports versioned schema for URL-embedding and local storage.
 */

import type { MelodyNote, ScaleConfig } from './model';
import type { Lane, LaneType } from './lanes';

// ============================================
// Schema Version
// ============================================

export const CLIP_REF_SCHEMA_VERSION = 1;
export const MAX_URL_PAYLOAD_SIZE = 8000; // ~8KB limit for URL safety

// ============================================
// Clip Reference Types
// ============================================

export type ClipKind = 'drumLane' | 'melodyLane' | 'chordLane' | 'audioLoop';

export type NoteMode = 'oneShot' | 'sustain';

export interface LaneSettings {
    instrumentId: string;
    noteMode: NoteMode;
    velocityDefault: number;
    quantizeGrid: QuantizeGrid;
}

export type QuantizeGrid = '1/4' | '1/8' | '1/16' | '1/32' | 'off';

export interface ClipMetadata {
    bpm: number;
    key: string;
    scale: ScaleConfig;
    timeSignature: [number, number];
}

export interface ProjectClipRef {
    id: string;
    kind: ClipKind;
    refId: string;           // Reference to the source lane/clip
    name: string;
    startBar: number;        // Position in arrangement (1-based)
    lengthBars: number;      // Duration in bars
    metadata: ClipMetadata;
    laneSettings: LaneSettings;
    notes: MelodyNote[];     // Actual note data
    createdAt: string;
    updatedAt: string;
}

// ============================================
// Serialized URL Payload
// ============================================

export interface SerializedClipPayload {
    v: number;               // Schema version
    clips: SerializedClip[];
}

export interface SerializedClip {
    id: string;
    k: ClipKind;             // kind (shortened)
    n: string;               // name
    sb: number;              // startBar
    lb: number;              // lengthBars
    m: {                     // metadata
        b: number;           // bpm
        k: string;           // key
        s: string;           // scale type
        t: [number, number]; // timeSignature
    };
    ls: {                    // laneSettings
        i: string;           // instrumentId
        nm: NoteMode;        // noteMode
        v: number;           // velocityDefault
        q: QuantizeGrid;     // quantizeGrid
    };
    nt: SerializedNote[];    // notes
}

export interface SerializedNote {
    p: number;   // pitch
    s: number;   // startBeat
    d: number;   // duration
    v: number;   // velocity
}

// ============================================
// Factory Functions
// ============================================

let clipIdCounter = 0;

export function generateClipId(): string {
    return `clip_${Date.now()}_${++clipIdCounter}`;
}

export function createDefaultLaneSettings(kind: ClipKind): LaneSettings {
    return {
        instrumentId: kind === 'drumLane' ? 'acoustic-kit' : 'grand-piano',
        noteMode: kind === 'drumLane' ? 'oneShot' : 'sustain',
        velocityDefault: 100,
        quantizeGrid: '1/16',
    };
}

export function createClipRefFromLane(
    lane: Lane,
    startBar: number = 1,
    lengthBars: number = 4,
    metadata: ClipMetadata
): ProjectClipRef {
    const kind: ClipKind = lane.type === 'drums' ? 'drumLane' : 'melodyLane';
    const now = new Date().toISOString();

    return {
        id: generateClipId(),
        kind,
        refId: lane.id,
        name: lane.name,
        startBar,
        lengthBars,
        metadata,
        laneSettings: createDefaultLaneSettings(kind),
        notes: [...lane.notes],
        createdAt: now,
        updatedAt: now,
    };
}

// ============================================
// Serialization (for URL embedding)
// ============================================

export function serializeClip(clip: ProjectClipRef): SerializedClip {
    return {
        id: clip.id,
        k: clip.kind,
        n: clip.name,
        sb: clip.startBar,
        lb: clip.lengthBars,
        m: {
            b: clip.metadata.bpm,
            k: clip.metadata.key,
            s: clip.metadata.scale.type,
            t: clip.metadata.timeSignature,
        },
        ls: {
            i: clip.laneSettings.instrumentId,
            nm: clip.laneSettings.noteMode,
            v: clip.laneSettings.velocityDefault,
            q: clip.laneSettings.quantizeGrid,
        },
        nt: clip.notes.map(n => ({
            p: n.pitch,
            s: n.startBeat,
            d: n.duration,
            v: n.velocity,
        })),
    };
}

export function deserializeClip(data: SerializedClip): ProjectClipRef {
    const now = new Date().toISOString();
    return {
        id: data.id || generateClipId(),
        kind: data.k,
        refId: data.id,
        name: data.n,
        startBar: data.sb,
        lengthBars: data.lb,
        metadata: {
            bpm: data.m.b,
            key: data.m.k,
            scale: {
                root: data.m.k as any,
                type: data.m.s as any,
                snapToScale: false,
            },
            timeSignature: data.m.t,
        },
        laneSettings: {
            instrumentId: data.ls.i,
            noteMode: data.ls.nm,
            velocityDefault: data.ls.v,
            quantizeGrid: data.ls.q,
        },
        notes: data.nt.map((n, i) => ({
            id: `note_${i}`,
            pitch: n.p,
            startBeat: n.s,
            duration: n.d,
            velocity: n.v,
        })),
        createdAt: now,
        updatedAt: now,
    };
}

export function serializeClipsToPayload(clips: ProjectClipRef[]): SerializedClipPayload {
    return {
        v: CLIP_REF_SCHEMA_VERSION,
        clips: clips.map(serializeClip),
    };
}

export function deserializeClipsFromPayload(payload: SerializedClipPayload): ProjectClipRef[] {
    // Validate version and migrate if needed
    const migrated = migratePayload(payload);
    return migrated.clips.map(deserializeClip);
}

// ============================================
// URL Encoding/Decoding (with size limits)
// ============================================

export function encodeClipsToUrl(clips: ProjectClipRef[]): string | null {
    try {
        const payload = serializeClipsToPayload(clips);
        const json = JSON.stringify(payload);

        // Check size before encoding
        if (json.length > MAX_URL_PAYLOAD_SIZE) {
            console.warn('Clip payload too large for URL embedding');
            return null;
        }

        const compressed = btoa(encodeURIComponent(json));
        return compressed;
    } catch (e) {
        console.error('Failed to encode clips to URL:', e);
        return null;
    }
}

export function decodeClipsFromUrl(encoded: string): ProjectClipRef[] | null {
    try {
        // Basic validation
        if (!encoded || typeof encoded !== 'string') {
            return null;
        }

        // Check for suspiciously large payloads
        if (encoded.length > MAX_URL_PAYLOAD_SIZE * 1.5) {
            console.warn('URL payload too large, rejecting');
            return null;
        }

        const json = decodeURIComponent(atob(encoded));
        const payload = JSON.parse(json) as SerializedClipPayload;

        // Validate payload structure
        if (!validatePayload(payload)) {
            console.warn('Invalid clip payload structure');
            return null;
        }

        return deserializeClipsFromPayload(payload);
    } catch (e) {
        console.error('Failed to decode clips from URL:', e);
        return null;
    }
}

// ============================================
// Validation
// ============================================

export function validatePayload(payload: unknown): payload is SerializedClipPayload {
    if (!payload || typeof payload !== 'object') return false;

    const p = payload as Record<string, unknown>;

    // Check version
    if (typeof p.v !== 'number' || p.v < 1) return false;

    // Check clips array
    if (!Array.isArray(p.clips)) return false;

    // Validate each clip (basic structure check)
    for (const clip of p.clips) {
        if (!validateSerializedClip(clip)) return false;
    }

    return true;
}

export function validateSerializedClip(clip: unknown): clip is SerializedClip {
    if (!clip || typeof clip !== 'object') return false;

    const c = clip as Record<string, unknown>;

    // Required fields
    if (typeof c.k !== 'string') return false;
    if (typeof c.n !== 'string') return false;
    if (typeof c.sb !== 'number') return false;
    if (typeof c.lb !== 'number') return false;
    if (!c.m || typeof c.m !== 'object') return false;
    if (!c.ls || typeof c.ls !== 'object') return false;
    if (!Array.isArray(c.nt)) return false;

    // Validate kind
    const validKinds: ClipKind[] = ['drumLane', 'melodyLane', 'chordLane', 'audioLoop'];
    if (!validKinds.includes(c.k as ClipKind)) return false;

    // Validate bars (must be positive)
    if (c.sb < 1 || c.lb < 1) return false;

    return true;
}

// ============================================
// Migration
// ============================================

export function migratePayload(payload: SerializedClipPayload): SerializedClipPayload {
    // Currently only version 1 exists
    if (payload.v === CLIP_REF_SCHEMA_VERSION) {
        return payload;
    }

    // Future: Add migration logic for older versions
    // For now, return as-is or reject if version is newer
    if (payload.v > CLIP_REF_SCHEMA_VERSION) {
        console.warn(`Clip payload version ${payload.v} is newer than supported ${CLIP_REF_SCHEMA_VERSION}`);
    }

    return payload;
}

// ============================================
// Local Storage for Project Clips
// ============================================

const CLIPS_STORAGE_KEY = 'daw_project_clips_v1';

export interface ClipsStorage {
    version: number;
    projectClips: Record<string, ProjectClipRef[]>; // projectId -> clips
}

export function loadProjectClips(): ClipsStorage {
    if (typeof localStorage === 'undefined') {
        return { version: 1, projectClips: {} };
    }

    try {
        const data = localStorage.getItem(CLIPS_STORAGE_KEY);
        if (!data) {
            return { version: 1, projectClips: {} };
        }
        return JSON.parse(data);
    } catch {
        return { version: 1, projectClips: {} };
    }
}

export function saveProjectClips(storage: ClipsStorage): void {
    if (typeof localStorage === 'undefined') return;

    try {
        localStorage.setItem(CLIPS_STORAGE_KEY, JSON.stringify(storage));
    } catch (e) {
        console.error('Failed to save project clips:', e);
    }
}

export function attachClipToProject(projectId: string, clip: ProjectClipRef): void {
    const storage = loadProjectClips();
    if (!storage.projectClips[projectId]) {
        storage.projectClips[projectId] = [];
    }
    storage.projectClips[projectId].push(clip);
    saveProjectClips(storage);
}

export function detachClipFromProject(projectId: string, clipId: string): void {
    const storage = loadProjectClips();
    if (storage.projectClips[projectId]) {
        storage.projectClips[projectId] = storage.projectClips[projectId].filter(c => c.id !== clipId);
        saveProjectClips(storage);
    }
}

export function getProjectClips(projectId: string): ProjectClipRef[] {
    const storage = loadProjectClips();
    return storage.projectClips[projectId] || [];
}

export function updateProjectClip(projectId: string, clipId: string, updates: Partial<ProjectClipRef>): void {
    const storage = loadProjectClips();
    if (storage.projectClips[projectId]) {
        storage.projectClips[projectId] = storage.projectClips[projectId].map(c =>
            c.id === clipId ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
        );
        saveProjectClips(storage);
    }
}


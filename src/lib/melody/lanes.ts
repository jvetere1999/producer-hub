/**
 * Unified Lane System
 *
 * Core types and utilities for the lane-based arrangement view.
 * Supports both melody (piano) and drum lanes.
 */

import type { MelodyNote, ScaleConfig, HumanizeConfig } from './model';

// ============================================
// Lane Types
// ============================================

export type LaneType = 'melody' | 'drums';

export interface BaseLane {
    id: string;
    name: string;
    type: LaneType;
    muted: boolean;
    solo: boolean;
    volume: number; // 0-127
    pan: number; // -64 to 63 (center = 0)
    color: string;
    collapsed: boolean;
}

export interface MelodyLane extends BaseLane {
    type: 'melody';
    notes: MelodyNote[];
    scale: ScaleConfig;
    instrument: MelodyInstrument;
}

export interface DrumLane extends BaseLane {
    type: 'drums';
    notes: MelodyNote[]; // Reuse MelodyNote, pitch = drum sound
    kit: DrumKit;
    pattern: DrumPattern;
}

export type Lane = MelodyLane | DrumLane;

// ============================================
// Instrument Types
// ============================================

export type MelodyInstrument = 'grand-piano' | 'electric-piano' | 'synth-lead' | 'synth-pad' | 'bass' | 'strings';

export type DrumKit = 'acoustic' | 'electronic' | '808' | '909' | 'trap' | 'dnb';

export interface DrumPattern {
    id: string;
    name: string;
    steps: number; // 16, 32, 64
    swing: number; // 0-100
}

// ============================================
// Arrangement Types
// ============================================

export interface Arrangement {
    id: string;
    name: string;
    version: number;
    createdAt: string;
    updatedAt: string;

    // Global settings
    bpm: number;
    timeSignature: [number, number];
    bars: number;
    key: string;
    scale: ScaleConfig;

    // Lanes
    lanes: Lane[];

    // Humanization (global)
    humanize: HumanizeConfig;

    // Playback state (not persisted)
    loopStart?: number;
    loopEnd?: number;
}

// ============================================
// Drum Sound Mapping
// ============================================

export const DRUM_SOUNDS: Record<number, { name: string; shortName: string }> = {
    36: { name: 'Kick', shortName: 'KK' },
    37: { name: 'Rim Shot', shortName: 'RM' },
    38: { name: 'Snare', shortName: 'SN' },
    39: { name: 'Clap', shortName: 'CP' },
    40: { name: 'Snare 2', shortName: 'S2' },
    41: { name: 'Low Tom', shortName: 'LT' },
    42: { name: 'Closed Hi-Hat', shortName: 'CH' },
    43: { name: 'Mid Tom', shortName: 'MT' },
    44: { name: 'Pedal Hi-Hat', shortName: 'PH' },
    45: { name: 'High Tom', shortName: 'HT' },
    46: { name: 'Open Hi-Hat', shortName: 'OH' },
    47: { name: 'Tom 4', shortName: 'T4' },
    48: { name: 'Tom 5', shortName: 'T5' },
    49: { name: 'Crash', shortName: 'CR' },
    50: { name: 'Tom 6', shortName: 'T6' },
    51: { name: 'Ride', shortName: 'RD' },
    52: { name: 'China', shortName: 'CN' },
    53: { name: 'Ride Bell', shortName: 'RB' },
    54: { name: 'Tambourine', shortName: 'TB' },
    55: { name: 'Splash', shortName: 'SP' },
    56: { name: 'Cowbell', shortName: 'CB' },
};

// Default drum pitches for step sequencer view (standard drum kit order from top to bottom)
export const DEFAULT_DRUM_PITCHES = [
    49, // Crash
    46, // Open Hi-Hat
    42, // Closed Hi-Hat
    39, // Clap
    38, // Snare
    36, // Kick
];

// ============================================
// Factory Functions
// ============================================

let idCounter = 0;

export function generateLaneId(): string {
    return `lane_${Date.now()}_${++idCounter}`;
}

export function createMelodyLane(name: string = 'Melody'): MelodyLane {
    return {
        id: generateLaneId(),
        name,
        type: 'melody',
        muted: false,
        solo: false,
        volume: 100,
        pan: 0,
        color: '#92d36e',
        collapsed: false,
        notes: [],
        scale: {
            root: 'C',
            type: 'major',
            snapToScale: false,
        },
        instrument: 'grand-piano',
    };
}

export function createDrumLane(name: string = 'Drums'): DrumLane {
    return {
        id: generateLaneId(),
        name,
        type: 'drums',
        muted: false,
        solo: false,
        volume: 100,
        pan: 0,
        color: '#ff9f43',
        collapsed: false,
        notes: [],
        kit: 'acoustic',
        pattern: {
            id: 'default',
            name: 'Default',
            steps: 16,
            swing: 0,
        },
    };
}

export function createArrangement(name: string = 'New Arrangement'): Arrangement {
    return {
        id: `arr_${Date.now()}`,
        name,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        bpm: 120,
        timeSignature: [4, 4],
        bars: 4,
        key: 'C',
        scale: {
            root: 'C',
            type: 'major',
            snapToScale: false,
        },
        lanes: [
            createMelodyLane('Piano'),
            createDrumLane('Drums'),
        ],
        humanize: {
            enabled: false,
            timingRange: 10,
            velocityRange: 15,
            swingAmount: 0,
            linkToGlobalSwing: false,
        },
    };
}

// ============================================
// Lane Operations
// ============================================

export function addLane(arrangement: Arrangement, type: LaneType): Arrangement {
    const lane = type === 'melody'
        ? createMelodyLane(`Melody ${arrangement.lanes.filter(l => l.type === 'melody').length + 1}`)
        : createDrumLane(`Drums ${arrangement.lanes.filter(l => l.type === 'drums').length + 1}`);

    return {
        ...arrangement,
        lanes: [...arrangement.lanes, lane],
        updatedAt: new Date().toISOString(),
    };
}

export function removeLane(arrangement: Arrangement, laneId: string): Arrangement {
    return {
        ...arrangement,
        lanes: arrangement.lanes.filter(l => l.id !== laneId),
        updatedAt: new Date().toISOString(),
    };
}

export function updateLane(arrangement: Arrangement, laneId: string, updates: Partial<Lane>): Arrangement {
    return {
        ...arrangement,
        lanes: arrangement.lanes.map(l =>
            l.id === laneId ? { ...l, ...updates } as Lane : l
        ),
        updatedAt: new Date().toISOString(),
    };
}

export function moveLane(arrangement: Arrangement, laneId: string, direction: 'up' | 'down'): Arrangement {
    const index = arrangement.lanes.findIndex(l => l.id === laneId);
    if (index === -1) return arrangement;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= arrangement.lanes.length) return arrangement;

    const lanes = [...arrangement.lanes];
    [lanes[index], lanes[newIndex]] = [lanes[newIndex], lanes[index]];

    return {
        ...arrangement,
        lanes,
        updatedAt: new Date().toISOString(),
    };
}

// ============================================
// URL Encoding/Decoding
// ============================================

export function encodeArrangementToUrl(arrangement: Arrangement): string {
    try {
        const json = JSON.stringify(arrangement);
        const compressed = btoa(encodeURIComponent(json));
        return compressed;
    } catch {
        console.error('Failed to encode arrangement');
        return '';
    }
}

export function decodeArrangementFromUrl(encoded: string): Arrangement | null {
    try {
        const json = decodeURIComponent(atob(encoded));
        const arrangement = JSON.parse(json) as Arrangement;
        // Basic validation
        if (!arrangement.id || !arrangement.lanes) {
            return null;
        }
        return arrangement;
    } catch {
        console.error('Failed to decode arrangement');
        return null;
    }
}

// ============================================
// Storage
// ============================================

const STORAGE_KEY = 'daw_arrangements_v1';

export interface ArrangementStorage {
    version: number;
    arrangements: Arrangement[];
    lastOpenedId: string | null;
}

export function loadArrangements(): ArrangementStorage {
    if (typeof localStorage === 'undefined') {
        return { version: 1, arrangements: [], lastOpenedId: null };
    }

    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) {
            return { version: 1, arrangements: [], lastOpenedId: null };
        }
        return JSON.parse(data);
    } catch {
        return { version: 1, arrangements: [], lastOpenedId: null };
    }
}

export function saveArrangements(storage: ArrangementStorage): void {
    if (typeof localStorage === 'undefined') return;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
    } catch (e) {
        console.error('Failed to save arrangements:', e);
    }
}

export function saveArrangement(arrangement: Arrangement): void {
    const storage = loadArrangements();
    const index = storage.arrangements.findIndex(a => a.id === arrangement.id);

    if (index >= 0) {
        storage.arrangements[index] = arrangement;
    } else {
        storage.arrangements.push(arrangement);
    }

    storage.lastOpenedId = arrangement.id;
    saveArrangements(storage);
}

export function deleteArrangement(id: string): void {
    const storage = loadArrangements();
    storage.arrangements = storage.arrangements.filter(a => a.id !== id);
    if (storage.lastOpenedId === id) {
        storage.lastOpenedId = storage.arrangements[0]?.id ?? null;
    }
    saveArrangements(storage);
}


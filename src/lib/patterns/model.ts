/**
 * Pattern Data Model
 *
 * Defines the structure for drum patterns, lanes, and ghost kicks.
 */

/**
 * Ghost kick placement modes
 */
export type GhostMode = 'offbeat' | 'pre-snare' | 'rolling' | 'user-defined';

/**
 * Ghost kick configuration
 */
export interface GhostConfig {
    enabled: boolean;
    mode: GhostMode;
    velocity: number; // 0-127, typically 20, 40, or 60
    applyToLaneIds: string[];
    density: number; // 0-1, affects how many ghost notes
}

/**
 * Single lane in the drum rack
 */
export interface PatternLane {
    laneId: string;
    name: string;
    hits: boolean[];
    velocity: number[]; // 0-127 per step
    muted: boolean;
    solo: boolean;
}

/**
 * A complete drum pattern
 */
export interface DrumPattern {
    id: string;
    name: string;
    genre: string;
    bpm: number;
    swing: number; // 0-1
    stepsPerBar: number;
    bars: number;
    lanes: PatternLane[];
    ghost: GhostConfig;
    createdAt: string;
    updatedAt: string;
}

/**
 * Pattern template for preset patterns
 */
export interface PatternTemplate {
    id: string;
    name: string;
    genre: string;
    bpm: number;
    stepsPerBar: number;
    bars: number;
    swing: number;
    lanes: Omit<PatternLane, 'muted' | 'solo'>[];
    ghost: GhostConfig;
    explanation: string; // Educational description
}

/**
 * Storage schema for patterns
 */
export interface PatternsStorageV1 {
    version: 1;
    patterns: DrumPattern[];
    lastOpenedId: string | null;
}

/**
 * Lane definitions for drum rack
 */
export const DRUM_LANES = [
    { id: 'kick', name: 'Kick', key: 'C1' },
    { id: 'snare', name: 'Snare', key: 'D1' },
    { id: 'clap', name: 'Clap', key: 'E1' },
    { id: 'hihat', name: 'Hi-Hat', key: 'F#1' },
    { id: 'openhat', name: 'Open Hat', key: 'G#1' },
    { id: 'perc', name: 'Perc', key: 'A1' },
    { id: 'tom', name: 'Tom', key: 'B1' },
    { id: 'rim', name: 'Rim', key: 'C#1' }
] as const;

export type LaneId = typeof DRUM_LANES[number]['id'];

/**
 * Default ghost configuration
 */
export const DEFAULT_GHOST_CONFIG: GhostConfig = {
    enabled: false,
    mode: 'offbeat',
    velocity: 40,
    applyToLaneIds: ['kick'],
    density: 0.5
};

/**
 * Create an empty pattern
 */
export function createEmptyPattern(
    name: string = 'New Pattern',
    stepsPerBar: number = 16,
    bars: number = 1
): DrumPattern {
    const totalSteps = stepsPerBar * bars;
    const now = new Date().toISOString();

    return {
        id: generatePatternId(),
        name,
        genre: 'Custom',
        bpm: 120,
        swing: 0,
        stepsPerBar,
        bars,
        lanes: DRUM_LANES.map(lane => ({
            laneId: lane.id,
            name: lane.name,
            hits: new Array(totalSteps).fill(false),
            velocity: new Array(totalSteps).fill(100),
            muted: false,
            solo: false
        })),
        ghost: { ...DEFAULT_GHOST_CONFIG },
        createdAt: now,
        updatedAt: now
    };
}

/**
 * Generate a unique pattern ID
 */
export function generatePatternId(): string {
    return `pat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Clone a pattern with a new ID
 */
export function clonePattern(pattern: DrumPattern, newName?: string): DrumPattern {
    const now = new Date().toISOString();
    return {
        ...structuredClone(pattern),
        id: generatePatternId(),
        name: newName || `${pattern.name} (Copy)`,
        createdAt: now,
        updatedAt: now
    };
}

/**
 * Toggle a hit at a specific lane and step
 */
export function toggleHit(
    pattern: DrumPattern,
    laneId: string,
    step: number
): DrumPattern {
    const newPattern = structuredClone(pattern);
    const lane = newPattern.lanes.find(l => l.laneId === laneId);

    if (lane && step >= 0 && step < lane.hits.length) {
        lane.hits[step] = !lane.hits[step];
        newPattern.updatedAt = new Date().toISOString();
    }

    return newPattern;
}

/**
 * Set velocity for a specific step
 */
export function setVelocity(
    pattern: DrumPattern,
    laneId: string,
    step: number,
    velocity: number
): DrumPattern {
    const newPattern = structuredClone(pattern);
    const lane = newPattern.lanes.find(l => l.laneId === laneId);

    if (lane && step >= 0 && step < lane.velocity.length) {
        lane.velocity[step] = Math.max(0, Math.min(127, velocity));
        newPattern.updatedAt = new Date().toISOString();
    }

    return newPattern;
}


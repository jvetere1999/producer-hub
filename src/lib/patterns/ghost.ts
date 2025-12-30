/**
 * Ghost Kick Logic
 *
 * Applies ghost notes to patterns based on configuration.
 * Ghost notes are quieter, visually distinct notes that add groove.
 */

import type { DrumPattern, GhostConfig, GhostMode } from './model';

/**
 * Result of applying ghost kicks
 */
export interface GhostResult {
    /** Modified lane hits with ghost notes added */
    hits: boolean[];
    /** Modified velocities with ghost note velocities */
    velocity: number[];
    /** Indices that are ghost notes */
    ghostIndices: number[];
}

/**
 * Apply ghost kicks to a pattern without mutating the original
 * Returns a new pattern with ghost notes applied to the specified lanes
 */
export function applyGhostKicks(pattern: DrumPattern): DrumPattern {
    if (!pattern.ghost.enabled) {
        return pattern;
    }

    const newPattern = structuredClone(pattern);

    // Validate cloned pattern integrity
    if (!newPattern || !newPattern.lanes || !newPattern.ghost) {
        console.error('Cloned pattern is missing required properties');
        return pattern;
    }

    const { mode, velocity, applyToLaneIds, density } = newPattern.ghost;
    const totalSteps = newPattern.stepsPerBar * newPattern.bars;

    for (const lane of newPattern.lanes) {
        if (!applyToLaneIds.includes(lane.laneId)) {
            continue;
        }

        const ghostIndices = calculateGhostIndices(
            mode,
            totalSteps,
            newPattern.stepsPerBar,
            lane.hits,
            density
        );

        for (const idx of ghostIndices) {
            // Only add ghost if there's no existing hit
            if (!lane.hits[idx]) {
                lane.hits[idx] = true;
                lane.velocity[idx] = velocity;
            }
        }
    }

    return newPattern;
}

/**
 * Get ghost note data for a specific lane (for rendering)
 * Does not modify the pattern, just returns which indices should be ghosts
 */
export function getGhostNotes(
    pattern: DrumPattern,
    laneId: string
): GhostResult {
    const lane = pattern.lanes.find(l => l.laneId === laneId);

    if (!lane) {
        return { hits: [], velocity: [], ghostIndices: [] };
    }

    if (!pattern.ghost.enabled || !pattern.ghost.applyToLaneIds.includes(laneId)) {
        return {
            hits: [...lane.hits],
            velocity: [...lane.velocity],
            ghostIndices: []
        };
    }

    const totalSteps = pattern.stepsPerBar * pattern.bars;
    const { mode, velocity: ghostVelocity, density } = pattern.ghost;

    const ghostIndices = calculateGhostIndices(
        mode,
        totalSteps,
        pattern.stepsPerBar,
        lane.hits,
        density
    );

    const newHits = [...lane.hits];
    const newVelocity = [...lane.velocity];

    for (const idx of ghostIndices) {
        if (!lane.hits[idx]) {
            newHits[idx] = true;
            newVelocity[idx] = ghostVelocity;
        }
    }

    return {
        hits: newHits,
        velocity: newVelocity,
        ghostIndices
    };
}

/**
 * Calculate which step indices should have ghost notes
 */
export function calculateGhostIndices(
    mode: GhostMode,
    totalSteps: number,
    stepsPerBar: number,
    existingHits: boolean[],
    density: number
): number[] {
    const indices: number[] = [];

    switch (mode) {
        case 'offbeat':
            // Ghost notes on the "&" of each beat (step 2, 6, 10, 14 in 16-step)
            for (let i = 0; i < totalSteps; i++) {
                const stepInBar = i % stepsPerBar;
                // Offbeat positions (between main beats)
                if (stepInBar % 4 === 2) {
                    if (Math.random() < density && !existingHits[i]) {
                        indices.push(i);
                    }
                }
            }
            break;

        case 'pre-snare':
            // Ghost notes just before snare hits (typically step 7, 15)
            for (let i = 0; i < totalSteps; i++) {
                const stepInBar = i % stepsPerBar;
                // Before typical snare positions (steps 4 and 12 in 16-step)
                if (stepInBar === 3 || stepInBar === 11) {
                    if (Math.random() < density && !existingHits[i]) {
                        indices.push(i);
                    }
                }
            }
            break;

        case 'rolling':
            // More frequent ghost notes for rolling feel
            for (let i = 0; i < totalSteps; i++) {
                const stepInBar = i % stepsPerBar;
                // Every other 16th note that's not on a beat
                if (stepInBar % 2 === 1) {
                    if (Math.random() < density * 0.5 && !existingHits[i]) {
                        indices.push(i);
                    }
                }
            }
            break;

        case 'user-defined':
            // No automatic placement - user manually places ghost notes
            break;
    }

    return indices;
}

/**
 * Check if a step is a ghost note
 */
export function isGhostNote(
    pattern: DrumPattern,
    laneId: string,
    step: number
): boolean {
    if (!pattern.ghost.enabled || !pattern.ghost.applyToLaneIds.includes(laneId)) {
        return false;
    }

    const lane = pattern.lanes.find(l => l.laneId === laneId);
    if (!lane) {
        return false;
    }

    // Bounds check for step
    if (step < 0 || step >= lane.hits.length) {
        return false;
    }

    if (!lane.hits[step]) {
        return false;
    }

    // A ghost note has velocity at or below the ghost velocity threshold
    return lane.velocity[step] <= pattern.ghost.velocity;
}

/**
 * Toggle ghost kicks for a pattern
 */
export function toggleGhostKicks(pattern: DrumPattern, enabled: boolean): DrumPattern {
    return {
        ...pattern,
        ghost: {
            ...pattern.ghost,
            enabled
        },
        updatedAt: new Date().toISOString()
    };
}

/**
 * Update ghost configuration
 */
export function updateGhostConfig(
    pattern: DrumPattern,
    config: Partial<GhostConfig>
): DrumPattern {
    return {
        ...pattern,
        ghost: {
            ...pattern.ghost,
            ...config
        },
        updatedAt: new Date().toISOString()
    };
}


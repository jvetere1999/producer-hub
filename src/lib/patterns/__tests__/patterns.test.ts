/**
 * Pattern Module Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    createEmptyPattern,
    toggleHit,
    setVelocity,
    clonePattern,
    DRUM_LANES
} from '../model';
import {
    PATTERN_TEMPLATES,
    getTemplateById
} from '../templates';
import {
    applyGhostKicks,
    getGhostNotes,
    calculateGhostIndices,
    isGhostNote,
    toggleGhostKicks,
    updateGhostConfig
} from '../ghost';

describe('Pattern Model', () => {
    describe('createEmptyPattern', () => {
        it('creates a pattern with correct default values', () => {
            const pattern = createEmptyPattern('Test');

            expect(pattern.name).toBe('Test');
            expect(pattern.bpm).toBe(120);
            expect(pattern.stepsPerBar).toBe(16);
            expect(pattern.bars).toBe(1);
            expect(pattern.lanes).toHaveLength(DRUM_LANES.length);
        });

        it('creates lanes with correct number of steps', () => {
            const pattern = createEmptyPattern('Test', 16, 2);

            expect(pattern.lanes[0].hits).toHaveLength(32);
            expect(pattern.lanes[0].velocity).toHaveLength(32);
        });

        it('initializes all hits as false', () => {
            const pattern = createEmptyPattern();

            for (const lane of pattern.lanes) {
                expect(lane.hits.every(h => h === false)).toBe(true);
            }
        });
    });

    describe('toggleHit', () => {
        it('toggles a hit from false to true', () => {
            const pattern = createEmptyPattern();
            const updated = toggleHit(pattern, 'kick', 0);

            expect(updated.lanes.find(l => l.laneId === 'kick')?.hits[0]).toBe(true);
        });

        it('toggles a hit from true to false', () => {
            let pattern = createEmptyPattern();
            pattern = toggleHit(pattern, 'kick', 0);
            pattern = toggleHit(pattern, 'kick', 0);

            expect(pattern.lanes.find(l => l.laneId === 'kick')?.hits[0]).toBe(false);
        });

        it('does not mutate original pattern', () => {
            const original = createEmptyPattern();
            const originalHit = original.lanes[0].hits[0];
            toggleHit(original, 'kick', 0);

            expect(original.lanes[0].hits[0]).toBe(originalHit);
        });
    });

    describe('setVelocity', () => {
        it('sets velocity for a step', () => {
            const pattern = createEmptyPattern();
            const updated = setVelocity(pattern, 'kick', 0, 80);

            expect(updated.lanes.find(l => l.laneId === 'kick')?.velocity[0]).toBe(80);
        });

        it('clamps velocity to 0-127', () => {
            const pattern = createEmptyPattern();

            const low = setVelocity(pattern, 'kick', 0, -10);
            expect(low.lanes.find(l => l.laneId === 'kick')?.velocity[0]).toBe(0);

            const high = setVelocity(pattern, 'kick', 0, 200);
            expect(high.lanes.find(l => l.laneId === 'kick')?.velocity[0]).toBe(127);
        });
    });

    describe('clonePattern', () => {
        it('creates a new pattern with different ID', () => {
            const original = createEmptyPattern('Original');
            const clone = clonePattern(original);

            expect(clone.id).not.toBe(original.id);
            expect(clone.name).toBe('Original (Copy)');
        });

        it('allows custom name for clone', () => {
            const original = createEmptyPattern('Original');
            const clone = clonePattern(original, 'My Clone');

            expect(clone.name).toBe('My Clone');
        });
    });
});

describe('Pattern Templates', () => {
    it('has all expected templates', () => {
        const genres = ['House', 'Techno', 'Dubstep', 'Riddim', 'Drum & Bass', 'Trap'];

        for (const genre of genres) {
            const template = PATTERN_TEMPLATES.find(t => t.genre === genre);
            expect(template).toBeDefined();
        }
    });

    it('templates have stable IDs', () => {
        const ids = PATTERN_TEMPLATES.map(t => t.id);

        expect(ids).toContain('template_house');
        expect(ids).toContain('template_techno');
        expect(ids).toContain('template_dubstep');
    });

    it('getTemplateById returns correct template', () => {
        const house = getTemplateById('template_house');

        expect(house).toBeDefined();
        expect(house?.name).toBe('House');
        expect(house?.bpm).toBe(124);
    });

    it('templates have valid structure', () => {
        for (const template of PATTERN_TEMPLATES) {
            expect(template.id).toBeTruthy();
            expect(template.name).toBeTruthy();
            expect(template.bpm).toBeGreaterThan(0);
            expect(template.lanes).toHaveLength(6); // All templates use 6 lanes
            expect(template.explanation).toBeTruthy();
        }
    });

    it('template lanes have correct step counts', () => {
        for (const template of PATTERN_TEMPLATES) {
            const expectedSteps = template.stepsPerBar * template.bars;

            for (const lane of template.lanes) {
                expect(lane.hits).toHaveLength(expectedSteps);
                expect(lane.velocity).toHaveLength(expectedSteps);
            }
        }
    });
});

describe('Ghost Kicks', () => {
    describe('calculateGhostIndices', () => {
        it('returns offbeat positions for offbeat mode', () => {
            const indices = calculateGhostIndices(
                'offbeat',
                16,
                16,
                new Array(16).fill(false),
                1 // 100% density
            );

            // Steps 2, 6, 10, 14 are offbeat positions
            expect(indices).toContain(2);
            expect(indices).toContain(6);
            expect(indices).toContain(10);
            expect(indices).toContain(14);
        });

        it('returns pre-snare positions for pre-snare mode', () => {
            const indices = calculateGhostIndices(
                'pre-snare',
                16,
                16,
                new Array(16).fill(false),
                1
            );

            // Steps 3 and 11 are pre-snare
            expect(indices).toContain(3);
            expect(indices).toContain(11);
        });

        it('returns empty for user-defined mode', () => {
            const indices = calculateGhostIndices(
                'user-defined',
                16,
                16,
                new Array(16).fill(false),
                1
            );

            expect(indices).toHaveLength(0);
        });

        it('respects existing hits', () => {
            const existingHits = new Array(16).fill(false);
            existingHits[2] = true; // Already has a hit at position 2

            const indices = calculateGhostIndices(
                'offbeat',
                16,
                16,
                existingHits,
                1
            );

            expect(indices).not.toContain(2);
        });
    });

    describe('getGhostNotes', () => {
        it('returns original data when ghost disabled', () => {
            const pattern = createEmptyPattern();
            pattern.ghost.enabled = false;

            const result = getGhostNotes(pattern, 'kick');

            expect(result.ghostIndices).toHaveLength(0);
        });

        it('returns ghost indices when enabled', () => {
            const pattern = createEmptyPattern();
            pattern.ghost.enabled = true;
            pattern.ghost.mode = 'pre-snare';
            pattern.ghost.density = 1;
            pattern.ghost.applyToLaneIds = ['kick'];

            const result = getGhostNotes(pattern, 'kick');

            expect(result.ghostIndices.length).toBeGreaterThan(0);
        });
    });

    describe('isGhostNote', () => {
        it('returns false when ghost disabled', () => {
            const pattern = createEmptyPattern();
            pattern.lanes[0].hits[0] = true;
            pattern.lanes[0].velocity[0] = 40;
            pattern.ghost.enabled = false;

            expect(isGhostNote(pattern, 'kick', 0)).toBe(false);
        });

        it('identifies ghost notes by velocity', () => {
            const pattern = createEmptyPattern();
            pattern.lanes[0].hits[0] = true;
            pattern.lanes[0].velocity[0] = 40;
            pattern.ghost.enabled = true;
            pattern.ghost.velocity = 40;
            pattern.ghost.applyToLaneIds = ['kick'];

            expect(isGhostNote(pattern, 'kick', 0)).toBe(true);
        });
    });

    describe('toggleGhostKicks', () => {
        it('toggles ghost enabled state', () => {
            const pattern = createEmptyPattern();

            const enabled = toggleGhostKicks(pattern, true);
            expect(enabled.ghost.enabled).toBe(true);

            const disabled = toggleGhostKicks(enabled, false);
            expect(disabled.ghost.enabled).toBe(false);
        });

        it('does not mutate original', () => {
            const original = createEmptyPattern();
            toggleGhostKicks(original, true);

            expect(original.ghost.enabled).toBe(false);
        });
    });

    describe('updateGhostConfig', () => {
        it('updates specific config properties', () => {
            const pattern = createEmptyPattern();

            const updated = updateGhostConfig(pattern, {
                mode: 'rolling',
                velocity: 60
            });

            expect(updated.ghost.mode).toBe('rolling');
            expect(updated.ghost.velocity).toBe(60);
            expect(updated.ghost.enabled).toBe(false); // Unchanged
        });
    });

    describe('applyGhostKicks', () => {
        it('does not modify pattern when disabled', () => {
            const pattern = createEmptyPattern();
            pattern.ghost.enabled = false;

            const result = applyGhostKicks(pattern);

            // Should be effectively the same
            expect(result.lanes[0].hits).toEqual(pattern.lanes[0].hits);
        });

        it('adds ghost hits when enabled', () => {
            const pattern = createEmptyPattern();
            pattern.ghost.enabled = true;
            pattern.ghost.mode = 'pre-snare';
            pattern.ghost.density = 1;
            pattern.ghost.applyToLaneIds = ['kick'];

            const result = applyGhostKicks(pattern);
            const kickLane = result.lanes.find(l => l.laneId === 'kick');

            // Should have some hits now
            expect(kickLane?.hits.some(h => h === true)).toBe(true);
        });
    });
});


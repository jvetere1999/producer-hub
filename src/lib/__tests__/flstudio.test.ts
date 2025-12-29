import { describe, it, expect } from 'vitest';
import { flstudioShortcuts } from '../data/flstudio';

describe('FL Studio dataset', () => {
    describe('data integrity', () => {
        it('has non-empty shortcuts array', () => {
            expect(flstudioShortcuts.length).toBeGreaterThan(0);
        });

        it('has substantial number of shortcuts', () => {
            // FL Studio has extensive shortcuts, expect 100+
            expect(flstudioShortcuts.length).toBeGreaterThan(100);
        });

        it('has no duplicate IDs', () => {
            const ids = flstudioShortcuts.map((s) => s.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });

        it('all entries have productId "flstudio"', () => {
            for (const shortcut of flstudioShortcuts) {
                expect(shortcut.productId).toBe('flstudio');
            }
        });

        it('all IDs are namespaced by productId', () => {
            for (const shortcut of flstudioShortcuts) {
                expect(shortcut.id).toMatch(/^flstudio:/);
            }
        });
    });

    describe('required fields', () => {
        it('all entries have required id field', () => {
            for (const shortcut of flstudioShortcuts) {
                expect(shortcut.id).toBeDefined();
                expect(shortcut.id.length).toBeGreaterThan(0);
            }
        });

        it('all entries have required productId field', () => {
            for (const shortcut of flstudioShortcuts) {
                expect(shortcut.productId).toBeDefined();
            }
        });

        it('all entries have required type field', () => {
            for (const shortcut of flstudioShortcuts) {
                expect(shortcut.type).toBeDefined();
                expect(shortcut.type.length).toBeGreaterThan(0);
            }
        });

        it('all entries have required command field', () => {
            for (const shortcut of flstudioShortcuts) {
                expect(shortcut.command).toBeDefined();
                expect(shortcut.command.length).toBeGreaterThan(0);
            }
        });

        it('all entries have required keys field', () => {
            for (const shortcut of flstudioShortcuts) {
                expect(shortcut.keys).toBeDefined();
                expect(shortcut.keys.length).toBeGreaterThan(0);
            }
        });
    });

    describe('key normalization', () => {
        it('keys are normalized strings', () => {
            for (const shortcut of flstudioShortcuts) {
                expect(typeof shortcut.keys).toBe('string');
                // Should not have raw arrow text (should be symbols or normalized)
                expect(shortcut.keys).not.toMatch(/Arrow$/);
            }
        });

        it('keysWin (if present) are normalized strings', () => {
            for (const shortcut of flstudioShortcuts) {
                if (shortcut.keysWin) {
                    expect(typeof shortcut.keysWin).toBe('string');
                    expect(shortcut.keysWin.length).toBeGreaterThan(0);
                }
            }
        });

        it('some entries have different Windows keys', () => {
            const withWinKeys = flstudioShortcuts.filter((s) => s.keysWin !== undefined);
            expect(withWinKeys.length).toBeGreaterThan(0);
        });
    });

    describe('descriptions', () => {
        it('all entries have description', () => {
            for (const shortcut of flstudioShortcuts) {
                expect(shortcut.description).toBeDefined();
                expect(shortcut.description!.length).toBeGreaterThan(0);
            }
        });

        it('all entries have descriptionSource', () => {
            for (const shortcut of flstudioShortcuts) {
                expect(shortcut.descriptionSource).toBeDefined();
                expect(shortcut.descriptionSource).toContain('image-line.com');
            }
        });

        it('descriptions end with period', () => {
            for (const shortcut of flstudioShortcuts) {
                expect(shortcut.description!.trim()).toMatch(/\.$/);
            }
        });
    });

    describe('groups and context', () => {
        it('all entries have group field', () => {
            for (const shortcut of flstudioShortcuts) {
                expect(shortcut.group).toBeDefined();
                expect(shortcut.group!.length).toBeGreaterThan(0);
            }
        });

        it('all entries have context field', () => {
            for (const shortcut of flstudioShortcuts) {
                expect(shortcut.context).toBeDefined();
                expect(shortcut.context!.length).toBeGreaterThan(0);
            }
        });

        it('has expected groups from FL Studio sections', () => {
            const groups = new Set(flstudioShortcuts.map((s) => s.group));
            expect(groups.has('Global Shortcuts')).toBe(true);
            expect(groups.has('File Operations')).toBe(true);
            expect(groups.has('Record / Playback / Transport')).toBe(true);
        });
    });

    describe('type inference', () => {
        it('has variety of types', () => {
            const types = new Set(flstudioShortcuts.map((s) => s.type));
            expect(types.size).toBeGreaterThan(1);
        });

        it('includes expected types', () => {
            const types = new Set(flstudioShortcuts.map((s) => s.type));
            // FL Studio has transport, view, browser, mixer sections
            expect(
                types.has('transport') ||
                types.has('view') ||
                types.has('browser') ||
                types.has('mixer') ||
                types.has('sequencer')
            ).toBe(true);
        });
    });

    describe('specific shortcuts', () => {
        it('has Undo shortcut', () => {
            const undo = flstudioShortcuts.find((s) =>
                s.command.toLowerCase().includes('undo')
            );
            expect(undo).toBeDefined();
            expect(undo!.keys).toContain('⌘');
        });

        it('has Play/Stop shortcut', () => {
            const playStop = flstudioShortcuts.find((s) =>
                s.command.toLowerCase().includes('playback') ||
                s.command.toLowerCase().includes('start/stop')
            );
            expect(playStop).toBeDefined();
        });

        it('has Save shortcut', () => {
            const save = flstudioShortcuts.find((s) =>
                s.command.toLowerCase() === 'save file'
            );
            expect(save).toBeDefined();
            expect(save!.keys).toContain('⌘');
        });
    });
});


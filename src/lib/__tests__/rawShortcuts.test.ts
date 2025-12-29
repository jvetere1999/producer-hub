import { describe, it, expect } from 'vitest';
import {
    slugify,
    generateUniqueIds,
    inferTypeFromSection,
    normalizeKeys,
    parseRawShortcutJson,
    dedupeShortcuts,
    generateActionDescription,
    type RawShortcutJson
} from '../data/importers/rawShortcuts';

describe('rawShortcuts importer', () => {
    describe('slugify', () => {
        it('converts text to lowercase kebab-case', () => {
            expect(slugify('Hello World')).toBe('hello-world');
            expect(slugify('Test Case')).toBe('test-case');
        });

        it('handles special characters', () => {
            expect(slugify('Copy/Paste')).toBe('copy-paste');
            // Parenthetical content is removed for cleaner slugs
            expect(slugify('Undo (Ctrl+Z)')).toBe('undo');
            expect(slugify('Test…Something')).toBe('test-something');
        });

        it('handles parenthetical notes', () => {
            // Parenthetical content is stripped for cleaner slugs
            expect(slugify('Open file (shortcut)')).toBe('open-file');
        });

        it('collapses multiple dashes', () => {
            expect(slugify('Test --- Something')).toBe('test-something');
        });

        it('removes leading and trailing dashes', () => {
            expect(slugify('---test---')).toBe('test');
        });

        it('handles empty and whitespace input', () => {
            expect(slugify('')).toBe('');
            expect(slugify('   ')).toBe('');
        });
    });

    describe('generateUniqueIds', () => {
        it('generates namespaced IDs', () => {
            const actions = ['Copy', 'Paste', 'Cut'];
            const { idMap } = generateUniqueIds('test', actions);

            expect(idMap.get('Copy')).toBe('test:copy');
            expect(idMap.get('Paste')).toBe('test:paste');
            expect(idMap.get('Cut')).toBe('test:cut');
        });

        it('disambiguates duplicate slugs with section context', () => {
            // Use different action strings that slugify to the same thing
            const actions = ['Select All', 'Select  All', 'select all'];
            const sections = ['Section A', 'Section B', 'Section C'];
            const { idMap, duplicateResolutions } = generateUniqueIds('test', actions, sections);

            // First occurrence gets base slug
            expect(idMap.get('Select All')).toBe('test:select-all');

            // Subsequent occurrences get section-based or numbered disambiguation
            expect(duplicateResolutions.length).toBeGreaterThan(0);
        });

        it('returns disambiguation tracking', () => {
            const actions = ['Test', 'Test'];
            const { duplicateResolutions } = generateUniqueIds('product', actions);

            expect(duplicateResolutions).toHaveLength(1);
            expect(duplicateResolutions[0].originalSlug).toBe('test');
        });

        it('handles empty actions array', () => {
            const { idMap, duplicateResolutions } = generateUniqueIds('test', []);
            expect(idMap.size).toBe(0);
            expect(duplicateResolutions).toHaveLength(0);
        });
    });

    describe('inferTypeFromSection', () => {
        it('detects transport sections', () => {
            expect(inferTypeFromSection('Transport Controls')).toBe('transport');
            expect(inferTypeFromSection('Record / Playback / Transport')).toBe('transport');
            expect(inferTypeFromSection('Play and Record')).toBe('transport');
        });

        it('detects edit sections', () => {
            expect(inferTypeFromSection('Editing')).toBe('edit');
            expect(inferTypeFromSection('Select and Copy')).toBe('edit');
            expect(inferTypeFromSection('Cut and Paste')).toBe('edit');
        });

        it('detects view sections', () => {
            expect(inferTypeFromSection('View Options')).toBe('view');
            expect(inferTypeFromSection('Window Navigation')).toBe('view');
            expect(inferTypeFromSection('Zoom Controls')).toBe('view');
        });

        it('detects browser sections', () => {
            expect(inferTypeFromSection('Browser action')).toBe('browser');
            expect(inferTypeFromSection('File Operations')).toBe('browser');
        });

        it('detects mixer sections', () => {
            expect(inferTypeFromSection('Mixer')).toBe('mixer');
            expect(inferTypeFromSection('Channel Rack & Step Sequencer')).toBe('mixer');
        });

        it('detects sequencer sections', () => {
            expect(inferTypeFromSection('Pattern Mode')).toBe('sequencer');
            expect(inferTypeFromSection('Piano roll action')).toBe('sequencer');
            expect(inferTypeFromSection('Step Sequence Controls')).toBe('sequencer');
        });

        it('detects global sections', () => {
            expect(inferTypeFromSection('Global Shortcuts')).toBe('general');
        });

        it('returns "other" for unrecognized sections', () => {
            expect(inferTypeFromSection('Random Stuff')).toBe('other');
            expect(inferTypeFromSection('Miscellaneous Commands')).toBe('other');
        });
    });

    describe('normalizeKeys', () => {
        describe('Mac keys', () => {
            it('normalizes modifier keys', () => {
                expect(normalizeKeys('Cmd+Z', true)).toBe('Cmd+Z');
                expect(normalizeKeys('Command+Z', true)).toBe('Cmd+Z');
                expect(normalizeKeys('Opt+Z', true)).toBe('Option+Z');
            });

            it('normalizes arrow keys to symbols', () => {
                expect(normalizeKeys('Up Arrow', true)).toBe('↑');
                expect(normalizeKeys('Down Arrow', true)).toBe('↓');
                expect(normalizeKeys('Left Arrow', true)).toBe('←');
                expect(normalizeKeys('Right Arrow', true)).toBe('→');
            });

            it('normalizes compound arrow keys', () => {
                // "Up/Down" pattern gets normalized, "Arrow" is separate
                expect(normalizeKeys('Up Arrow/Down Arrow', true)).toBe('↑/↓');
                expect(normalizeKeys('Left Arrow/Right Arrow', true)).toBe('←/→');
            });

            it('normalizes special keys', () => {
                expect(normalizeKeys('Space', true)).toBe('Space');
                expect(normalizeKeys('Enter', true)).toBe('Return');
                expect(normalizeKeys('Backspace', true)).toBe('Delete');
                expect(normalizeKeys('Escape', true)).toBe('Esc');
            });

            it('normalizes key ranges', () => {
                expect(normalizeKeys('0..9', true)).toBe('0-9');
                expect(normalizeKeys('1..9', true)).toBe('1-9');
            });

            it('handles function keys', () => {
                expect(normalizeKeys('F1', true)).toBe('F1');
                expect(normalizeKeys('F12', true)).toBe('F12');
            });

            it('handles empty and undefined input', () => {
                expect(normalizeKeys('', true)).toBe('');
                expect(normalizeKeys(undefined, true)).toBe('');
            });
        });

        describe('Windows keys', () => {
            it('normalizes modifier keys', () => {
                expect(normalizeKeys('Ctrl+Z', false)).toBe('Ctrl+Z');
                expect(normalizeKeys('Control+Z', false)).toBe('Ctrl+Z');
                expect(normalizeKeys('Alt+Z', false)).toBe('Alt+Z');
            });

            it('keeps arrow keys as text', () => {
                expect(normalizeKeys('Up Arrow', false)).toBe('Up');
                expect(normalizeKeys('Down Arrow', false)).toBe('Down');
            });

            it('normalizes special keys', () => {
                expect(normalizeKeys('Delete', false)).toBe('Del');
                expect(normalizeKeys('Insert', false)).toBe('Ins');
            });

            it('handles page keys', () => {
                expect(normalizeKeys('Page Up', false)).toBe('Page Up');
                expect(normalizeKeys('PgDown', false)).toBe('Page Down');
            });
        });

        it('handles complex key combinations', () => {
            expect(normalizeKeys('Ctrl+Alt+Z', false)).toBe('Ctrl+Alt+Z');
            expect(normalizeKeys('Cmd+Shift+S', true)).toBe('Cmd+Shift+S');
        });

        it('handles comma-separated sequences', () => {
            expect(normalizeKeys('1..9, 0', true)).toBe('1-9, 0');
        });
    });

    describe('generateActionDescription', () => {
        it('handles toggle actions', () => {
            expect(generateActionDescription('Toggle Playlist')).toBe('Toggles Playlist on or off.');
        });

        it('handles show/hide actions', () => {
            expect(generateActionDescription('Show/hide Mixer')).toBe('Shows or hides Mixer.');
        });

        it('handles open actions', () => {
            expect(generateActionDescription('Open file')).toBe('Opens file.');
        });

        it('handles select actions', () => {
            expect(generateActionDescription('Select All')).toBe('Selects All.');
        });

        it('handles copy/paste actions', () => {
            expect(generateActionDescription('Copy selection')).toBe('Copies selection.');
            expect(generateActionDescription('Paste selection')).toBe('Pastes selection.');
        });

        it('handles compound actions with slash', () => {
            expect(generateActionDescription('Undo / Redo last edit')).toBe('Undo / Redo last edit.');
        });

        it('removes trailing parenthetical notes', () => {
            expect(generateActionDescription('Test action (note)')).toBe('Test action.');
        });

        it('capitalizes first letter for generic actions', () => {
            expect(generateActionDescription('some action')).toBe('Some action.');
        });
    });

    describe('parseRawShortcutJson', () => {
        const sampleRaw: RawShortcutJson = {
            source: 'Test Source',
            sections: [
                {
                    title: 'Global Shortcuts',
                    shortcuts: [
                        { action: 'Undo', windows: 'Ctrl+Z', mac: 'Cmd+Z' },
                        { action: 'Redo', windows: 'Ctrl+Y', mac: 'Cmd+Shift+Z' }
                    ]
                },
                {
                    title: 'Transport',
                    shortcuts: [
                        { action: 'Play', windows: 'Space', mac: 'Space' }
                    ]
                }
            ]
        };

        it('parses shortcuts with correct structure', () => {
            const { shortcuts } = parseRawShortcutJson(sampleRaw, 'test');

            expect(shortcuts).toHaveLength(3);
            expect(shortcuts[0].id).toBe('test:undo');
            expect(shortcuts[0].productId).toBe('test');
            expect(shortcuts[0].command).toBe('Undo');
        });

        it('assigns types from section titles', () => {
            const { shortcuts } = parseRawShortcutJson(sampleRaw, 'test');

            expect(shortcuts[0].type).toBe('general');
            expect(shortcuts[2].type).toBe('transport');
        });

        it('normalizes keys correctly', () => {
            const { shortcuts } = parseRawShortcutJson(sampleRaw, 'test');

            expect(shortcuts[0].keys).toBe('Cmd+Z');
            expect(shortcuts[0].keysWin).toBe('Ctrl+Z');
        });

        it('assigns group from section title', () => {
            const { shortcuts } = parseRawShortcutJson(sampleRaw, 'test');

            expect(shortcuts[0].group).toBe('Global Shortcuts');
            expect(shortcuts[2].group).toBe('Transport');
        });

        it('includes authority URL in descriptionSource', () => {
            const url = 'https://example.com/docs';
            const { shortcuts } = parseRawShortcutJson(sampleRaw, 'test', url);

            expect(shortcuts[0].descriptionSource).toBe(url);
        });

        it('returns import summary', () => {
            const { summary } = parseRawShortcutJson(sampleRaw, 'test');

            expect(summary.totalCount).toBe(3);
            expect(summary.importedCount).toBe(3);
            expect(summary.skippedCount).toBe(0);
        });

        it('skips shortcuts without keys', () => {
            const rawWithMissing: RawShortcutJson = {
                source: 'Test',
                sections: [
                    {
                        title: 'Test',
                        shortcuts: [
                            { action: 'No Keys' },
                            { action: 'Has Keys', mac: 'Cmd+X' }
                        ]
                    }
                ]
            };

            const { shortcuts, summary } = parseRawShortcutJson(rawWithMissing, 'test');

            expect(shortcuts).toHaveLength(1);
            expect(summary.skippedCount).toBe(1);
            expect(summary.skippedReasons[0].action).toBe('No Keys');
        });

        it('only sets keysWin when different from keys', () => {
            const rawSameKeys: RawShortcutJson = {
                source: 'Test',
                sections: [
                    {
                        title: 'Test',
                        shortcuts: [
                            { action: 'Same Keys', windows: 'Space', mac: 'Space' }
                        ]
                    }
                ]
            };

            const { shortcuts } = parseRawShortcutJson(rawSameKeys, 'test');

            expect(shortcuts[0].keys).toBe('Space');
            expect(shortcuts[0].keysWin).toBeUndefined();
        });
    });

    describe('dedupeShortcuts', () => {
        it('removes duplicate IDs keeping first occurrence', () => {
            const shortcuts = [
                { id: 'test:a', productId: 'test', type: 'edit', command: 'A', keys: 'A' },
                { id: 'test:b', productId: 'test', type: 'edit', command: 'B', keys: 'B' },
                { id: 'test:a', productId: 'test', type: 'edit', command: 'A2', keys: 'A2' }
            ];

            const { deduped, removedCount } = dedupeShortcuts(shortcuts as any);

            expect(deduped).toHaveLength(2);
            expect(removedCount).toBe(1);
            expect(deduped[0].command).toBe('A');
        });

        it('handles empty array', () => {
            const { deduped, removedCount } = dedupeShortcuts([]);

            expect(deduped).toHaveLength(0);
            expect(removedCount).toBe(0);
        });

        it('handles array with no duplicates', () => {
            const shortcuts = [
                { id: 'test:a', productId: 'test', type: 'edit', command: 'A', keys: 'A' },
                { id: 'test:b', productId: 'test', type: 'edit', command: 'B', keys: 'B' }
            ];

            const { deduped, removedCount } = dedupeShortcuts(shortcuts as any);

            expect(deduped).toHaveLength(2);
            expect(removedCount).toBe(0);
        });
    });
});


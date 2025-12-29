import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    obfuscate,
    deobfuscate,
    stateToMarkdown,
    parseMarkdown,
    importInfoBase
} from '../infobase/obfuscate';
import type { InfoBaseState } from '../infobase/types';

// Mock localStorage and crypto
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] ?? null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
        clear: vi.fn(() => { store = {}; })
    };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Mock crypto.getRandomValues
Object.defineProperty(globalThis, 'crypto', {
    value: {
        getRandomValues: (arr: Uint8Array) => {
            for (let i = 0; i < arr.length; i++) {
                arr[i] = Math.floor(Math.random() * 256);
            }
            return arr;
        }
    }
});

describe('Info Base Obfuscation', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    describe('stateToMarkdown', () => {
        it('converts state to markdown format', () => {
            const state: InfoBaseState = {
                version: 1,
                entries: {
                    'note-1': {
                        id: 'note-1',
                        title: 'Test Note',
                        body: 'This is the body',
                        tags: ['test', 'example'],
                        category: 'Mixing',
                        createdAt: '2024-01-01T00:00:00Z',
                        updatedAt: '2024-01-02T00:00:00Z'
                    }
                },
                order: ['note-1']
            };

            const md = stateToMarkdown(state);

            expect(md).toContain('# Producer Hub Info Base Export');
            expect(md).toContain('Entry count: 1');
            expect(md).toContain('## Test Note');
            expect(md).toContain('id: note-1');
            expect(md).toContain('category: Mixing');
            expect(md).toContain('tags: [test, example]');
            expect(md).toContain('This is the body');
        });

        it('handles empty state', () => {
            const state: InfoBaseState = {
                version: 1,
                entries: {},
                order: []
            };

            const md = stateToMarkdown(state);
            expect(md).toContain('Entry count: 0');
        });
    });

    describe('obfuscate / deobfuscate roundtrip', () => {
        it('roundtrips simple text', () => {
            const original = 'Hello, World!';
            const obfuscated = obfuscate(original);
            const restored = deobfuscate(obfuscated);

            expect(restored).toBe(original);
        });

        it('roundtrips markdown with special characters', () => {
            const original = `# Heading
## Subheading
- List item
\`\`\`
code block
\`\`\`
Special: éàü → ←`;

            const obfuscated = obfuscate(original);
            const restored = deobfuscate(obfuscated);

            expect(restored).toBe(original);
        });

        it('produces obfuscated output with header', () => {
            const original = 'Test content';
            const obfuscated = obfuscate(original);

            expect(obfuscated).toContain('PRODUCER-HUB-INFOBASE-OBFUSCATED v1');
            expect(obfuscated).toContain('timestamp:');
            expect(obfuscated).toContain('length:');
        });

        it('obfuscated content is not readable as original', () => {
            const original = 'Secret information';
            const obfuscated = obfuscate(original);

            // The base64 part should not contain the original text
            const lines = obfuscated.split('\n');
            const b64Part = lines.slice(3).join('\n');
            expect(b64Part).not.toContain('Secret');
        });
    });

    describe('deobfuscate error handling', () => {
        it('throws on missing header', () => {
            expect(() => deobfuscate('invalid content')).toThrow('missing header');
        });

        it('throws on empty content', () => {
            const invalid = 'PRODUCER-HUB-INFOBASE-OBFUSCATED v1\ntimestamp: 2024\nlength: 10\n';
            expect(() => deobfuscate(invalid)).toThrow();
        });
    });

    describe('parseMarkdown', () => {
        it('parses markdown back to entries', () => {
            const md = `# Producer Hub Info Base Export

Exported: 2024-01-01T00:00:00Z
Entry count: 1

---

## Test Note

\`\`\`yaml
id: note-1
createdAt: 2024-01-01T00:00:00Z
updatedAt: 2024-01-02T00:00:00Z
category: Mixing
tags: [test, example]
\`\`\`

This is the body content.

---
`;

            const entries = parseMarkdown(md);
            expect(entries).toHaveLength(1);
            expect(entries[0].id).toBe('note-1');
            expect(entries[0].title).toBe('Test Note');
            expect(entries[0].category).toBe('Mixing');
            expect(entries[0].tags).toContain('test');
        });
    });

    describe('importInfoBase', () => {
        it('merges imported entries with existing', () => {
            const existingState: InfoBaseState = {
                version: 1,
                entries: {
                    'note-1': {
                        id: 'note-1',
                        title: 'Existing',
                        body: 'Old body',
                        tags: [],
                        createdAt: '2024-01-01T00:00:00Z',
                        updatedAt: '2024-01-01T00:00:00Z'
                    }
                },
                order: ['note-1']
            };

            const importState: InfoBaseState = {
                version: 1,
                entries: {
                    'note-2': {
                        id: 'note-2',
                        title: 'Imported',
                        body: 'New body',
                        tags: [],
                        createdAt: '2024-01-02T00:00:00Z',
                        updatedAt: '2024-01-02T00:00:00Z'
                    }
                },
                order: ['note-2']
            };

            const markdown = stateToMarkdown(importState);
            const obfuscated = obfuscate(markdown);
            const merged = importInfoBase(obfuscated, existingState);

            expect(Object.keys(merged.entries)).toHaveLength(2);
            expect(merged.entries['note-1']).toBeDefined();
            expect(merged.entries['note-2']).toBeDefined();
        });

        it('newer entry wins on conflict', () => {
            const existingState: InfoBaseState = {
                version: 1,
                entries: {
                    'note-1': {
                        id: 'note-1',
                        title: 'Old Title',
                        body: 'Old',
                        tags: [],
                        createdAt: '2024-01-01T00:00:00Z',
                        updatedAt: '2024-01-01T00:00:00Z'
                    }
                },
                order: ['note-1']
            };

            const importState: InfoBaseState = {
                version: 1,
                entries: {
                    'note-1': {
                        id: 'note-1',
                        title: 'New Title',
                        body: 'New',
                        tags: [],
                        createdAt: '2024-01-01T00:00:00Z',
                        updatedAt: '2024-01-02T00:00:00Z' // Newer
                    }
                },
                order: ['note-1']
            };

            const markdown = stateToMarkdown(importState);
            const obfuscated = obfuscate(markdown);
            const merged = importInfoBase(obfuscated, existingState);

            expect(merged.entries['note-1'].title).toBe('New Title');
        });

        it('rejects files that are too large', () => {
            const largeContent = 'x'.repeat(2 * 1024 * 1024); // 2MB
            expect(() => importInfoBase(largeContent, { version: 1, entries: {}, order: [] }))
                .toThrow('too large');
        });
    });
});


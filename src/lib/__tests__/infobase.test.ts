import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { InfoBaseState, KnowledgeNote } from '../infobase/types';

// Mock localStorage with a backing store
const createLocalStorageMock = () => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] ?? null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: vi.fn((key: string) => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; }),
        _getStore: () => store
    };
};

let localStorageMock = createLocalStorageMock();

// Stub window and localStorage before importing the module
vi.stubGlobal('window', {});
vi.stubGlobal('localStorage', localStorageMock);

// Now import the module (after stubs are in place)
const { loadInfoBase, saveInfoBase, upsertNote, deleteNote, listNotes, getAllTags, generateId } = await import('../infobase/storage');

describe('InfoBase Storage', () => {
    beforeEach(() => {
        // Reset the mock between tests
        localStorageMock = createLocalStorageMock();
        vi.stubGlobal('localStorage', localStorageMock);
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.stubGlobal('window', {});
        vi.stubGlobal('localStorage', localStorageMock);
    });

    describe('generateId', () => {
        it('generates unique IDs', () => {
            const id1 = generateId();
            const id2 = generateId();
            expect(id1).not.toBe(id2);
        });

        it('generates IDs with note- prefix', () => {
            const id = generateId();
            expect(id).toMatch(/^note-/);
        });
    });

    describe('loadInfoBase', () => {
        it('returns empty state when nothing stored', () => {
            const state = loadInfoBase();
            expect(state.version).toBe(1);
            expect(state.entries).toEqual({});
            expect(state.order).toEqual([]);
        });

        it('returns stored state', () => {
            const stored: InfoBaseState = {
                version: 1,
                entries: {
                    'note-1': {
                        id: 'note-1',
                        title: 'Test',
                        body: 'Body',
                        tags: ['test'],
                        createdAt: '2024-01-01T00:00:00Z',
                        updatedAt: '2024-01-01T00:00:00Z'
                    }
                },
                order: ['note-1']
            };
            localStorageMock.setItem('daw_infobase_v1', JSON.stringify(stored));

            const state = loadInfoBase();
            expect(state.entries['note-1'].title).toBe('Test');
        });

        it('handles corrupted JSON gracefully', () => {
            localStorageMock.setItem('daw_infobase_v1', 'not valid json');

            const state = loadInfoBase();
            expect(state.version).toBe(1);
            expect(state.entries).toEqual({});
        });

        it('migrates old version to current', () => {
            const oldState = {
                entries: { 'note-1': { id: 'note-1', title: 'Old' } }
            };
            localStorageMock.setItem('daw_infobase_v1', JSON.stringify(oldState));

            const state = loadInfoBase();
            expect(state.version).toBe(1);
            expect(state.order).toContain('note-1');
        });
    });

    describe('saveInfoBase', () => {
        it('saves state to localStorage', () => {
            const state: InfoBaseState = {
                version: 1,
                entries: {},
                order: []
            };

            saveInfoBase(state);
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'daw_infobase_v1',
                JSON.stringify(state)
            );
        });
    });

    describe('upsertNote', () => {
        it('creates new note', () => {
            const state: InfoBaseState = { version: 1, entries: {}, order: [] };

            const newState = upsertNote(state, {
                title: 'New Note',
                body: 'Content'
            });

            expect(Object.keys(newState.entries)).toHaveLength(1);
            expect(newState.order).toHaveLength(1);

            const note = Object.values(newState.entries)[0];
            expect(note.title).toBe('New Note');
            expect(note.body).toBe('Content');
        });

        it('updates existing note', () => {
            const existingNote: KnowledgeNote = {
                id: 'note-1',
                title: 'Original',
                body: 'Original body',
                tags: ['old'],
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z'
            };
            const state: InfoBaseState = {
                version: 1,
                entries: { 'note-1': existingNote },
                order: ['note-1']
            };

            const newState = upsertNote(state, {
                id: 'note-1',
                title: 'Updated',
                body: 'Updated body'
            });

            expect(newState.entries['note-1'].title).toBe('Updated');
            expect(newState.entries['note-1'].createdAt).toBe('2024-01-01T00:00:00Z');
            expect(newState.entries['note-1'].tags).toEqual(['old']); // Preserved
        });

        it('adds new note to front of order', () => {
            const state: InfoBaseState = {
                version: 1,
                entries: {
                    'note-1': {
                        id: 'note-1',
                        title: 'First',
                        body: '',
                        tags: [],
                        createdAt: '',
                        updatedAt: ''
                    }
                },
                order: ['note-1']
            };

            const newState = upsertNote(state, {
                title: 'Second',
                body: ''
            });

            expect(newState.order[0]).not.toBe('note-1');
            expect(newState.order).toHaveLength(2);
        });
    });

    describe('deleteNote', () => {
        it('removes note from state', () => {
            const state: InfoBaseState = {
                version: 1,
                entries: {
                    'note-1': {
                        id: 'note-1',
                        title: 'Test',
                        body: '',
                        tags: [],
                        createdAt: '',
                        updatedAt: ''
                    }
                },
                order: ['note-1']
            };

            const newState = deleteNote(state, 'note-1');

            expect(newState.entries['note-1']).toBeUndefined();
            expect(newState.order).not.toContain('note-1');
        });
    });

    describe('listNotes', () => {
        const createState = (): InfoBaseState => ({
            version: 1,
            entries: {
                'note-1': {
                    id: 'note-1',
                    title: 'Mixing Tips',
                    body: 'EQ before compression',
                    tags: ['mixing', 'eq'],
                    category: 'Mixing',
                    createdAt: '2024-01-01T00:00:00Z',
                    updatedAt: '2024-01-02T00:00:00Z'
                },
                'note-2': {
                    id: 'note-2',
                    title: 'Synth Patch',
                    body: 'Saw wave with filter',
                    tags: ['synthesis'],
                    category: 'Sound Design',
                    createdAt: '2024-01-02T00:00:00Z',
                    updatedAt: '2024-01-03T00:00:00Z'
                }
            },
            order: ['note-2', 'note-1']
        });

        it('returns all notes in order', () => {
            const notes = listNotes(createState());
            expect(notes).toHaveLength(2);
            // Default sort is by updatedAt descending
            expect(notes[0].id).toBe('note-2');
        });

        it('filters by query', () => {
            const notes = listNotes(createState(), { query: 'mixing' });
            expect(notes).toHaveLength(1);
            expect(notes[0].id).toBe('note-1');
        });

        it('filters by tag', () => {
            const notes = listNotes(createState(), { tag: 'synthesis' });
            expect(notes).toHaveLength(1);
            expect(notes[0].id).toBe('note-2');
        });

        it('filters by category', () => {
            const notes = listNotes(createState(), { category: 'Mixing' });
            expect(notes).toHaveLength(1);
            expect(notes[0].id).toBe('note-1');
        });

        it('sorts by title', () => {
            const notes = listNotes(createState(), { sortBy: 'title' });
            expect(notes[0].title).toBe('Mixing Tips');
            expect(notes[1].title).toBe('Synth Patch');
        });
    });

    describe('getAllTags', () => {
        it('returns unique sorted tags', () => {
            const state: InfoBaseState = {
                version: 1,
                entries: {
                    'note-1': {
                        id: 'note-1',
                        title: '',
                        body: '',
                        tags: ['mixing', 'eq'],
                        createdAt: '',
                        updatedAt: ''
                    },
                    'note-2': {
                        id: 'note-2',
                        title: '',
                        body: '',
                        tags: ['mixing', 'synth'],
                        createdAt: '',
                        updatedAt: ''
                    }
                },
                order: []
            };

            const tags = getAllTags(state);
            expect(tags).toEqual(['eq', 'mixing', 'synth']);
        });
    });
});


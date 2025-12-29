/**
 * Info Base Storage Module
 *
 * Handles localStorage persistence for the knowledge base.
 * Includes migrations for schema versioning.
 *
 * @module infobase/storage
 */

import type { InfoBaseState, KnowledgeNote } from './types';

const STORAGE_KEY = 'daw_infobase_v1';
const CURRENT_VERSION = 1;

/**
 * Creates an empty Info Base state.
 */
function createEmptyState(): InfoBaseState {
    return {
        version: CURRENT_VERSION,
        entries: {},
        order: []
    };
}

/**
 * Generates a unique ID for a new entry.
 */
export function generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `note-${timestamp}-${random}`;
}

/**
 * Migrates state from an older version to the current version.
 */
function migrateState(state: any): InfoBaseState {
    // Version 0 or undefined -> Version 1
    if (!state.version || state.version < 1) {
        // Initial migration: just ensure structure
        return {
            version: CURRENT_VERSION,
            entries: state.entries ?? {},
            order: state.order ?? Object.keys(state.entries ?? {})
        };
    }

    // Already current version
    return state as InfoBaseState;
}

/**
 * Loads the Info Base state from localStorage.
 * Returns empty state if not found or corrupted.
 */
export function loadInfoBase(): InfoBaseState {
    if (typeof window === 'undefined') {
        return createEmptyState();
    }

    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return createEmptyState();
        }

        const parsed = JSON.parse(raw);
        return migrateState(parsed);
    } catch (e) {
        console.error('Failed to load Info Base, returning empty state:', e);
        return createEmptyState();
    }
}

/**
 * Saves the Info Base state to localStorage.
 */
export function saveInfoBase(state: InfoBaseState): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        const serialized = JSON.stringify(state);
        localStorage.setItem(STORAGE_KEY, serialized);
    } catch (e) {
        console.error('Failed to save Info Base:', e);
    }
}

/**
 * Creates or updates an entry in the Info Base.
 */
export function upsertNote(
    state: InfoBaseState,
    note: Partial<KnowledgeNote> & { title: string; body: string }
): InfoBaseState {
    const now = new Date().toISOString();
    const id = note.id ?? generateId();

    const existing = state.entries[id];
    const entry: KnowledgeNote = {
        id,
        title: note.title,
        body: note.body,
        tags: note.tags ?? existing?.tags ?? [],
        category: note.category ?? existing?.category,
        links: note.links ?? existing?.links,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now
    };

    const entries = { ...state.entries, [id]: entry };
    const order = existing ? state.order : [id, ...state.order];

    const newState = { ...state, entries, order };
    saveInfoBase(newState);
    return newState;
}

/**
 * Deletes an entry from the Info Base.
 */
export function deleteNote(state: InfoBaseState, id: string): InfoBaseState {
    const { [id]: removed, ...entries } = state.entries;
    const order = state.order.filter(oid => oid !== id);

    const newState = { ...state, entries, order };
    saveInfoBase(newState);
    return newState;
}

/**
 * Gets an entry by ID.
 */
export function getNote(state: InfoBaseState, id: string): KnowledgeNote | null {
    return state.entries[id] ?? null;
}

/**
 * Lists entries with optional filtering.
 */
export function listNotes(
    state: InfoBaseState,
    opts?: {
        query?: string;
        tag?: string;
        category?: string;
        sortBy?: 'updatedAt' | 'title';
    }
): KnowledgeNote[] {
    let notes = state.order
        .map(id => state.entries[id])
        .filter((n): n is KnowledgeNote => !!n);

    // Filter by query (title and body)
    if (opts?.query) {
        const q = opts.query.toLowerCase();
        notes = notes.filter(n =>
            n.title.toLowerCase().includes(q) ||
            n.body.toLowerCase().includes(q) ||
            n.tags.some(t => t.toLowerCase().includes(q))
        );
    }

    // Filter by tag
    if (opts?.tag) {
        const tag = opts.tag.toLowerCase();
        notes = notes.filter(n => n.tags.some(t => t.toLowerCase() === tag));
    }

    // Filter by category
    if (opts?.category) {
        notes = notes.filter(n => n.category === opts.category);
    }

    // Sort
    if (opts?.sortBy === 'title') {
        notes.sort((a, b) => a.title.localeCompare(b.title));
    } else {
        // Default: sort by updatedAt descending
        notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }

    return notes;
}

/**
 * Gets all unique tags from entries.
 */
export function getAllTags(state: InfoBaseState): string[] {
    const tagSet = new Set<string>();
    for (const entry of Object.values(state.entries)) {
        for (const tag of entry.tags) {
            tagSet.add(tag);
        }
    }
    return [...tagSet].sort((a, b) => a.localeCompare(b));
}


/**
 * Search module for Producer Hub.
 *
 * Uses FlexSearch for fast, fuzzy full-text search across all entry fields.
 * The index is lazily built and cached for performance.
 *
 * @module search
 */

import FlexSearch from 'flexsearch';
import type { ShortcutWithProduct } from './types';
import { resolveKeysForOS } from './platform';

/**
 * Internal document shape for the FlexSearch index.
 * All fields are stringified for full-text indexing.
 */
type Doc = {
    id: string;
    command: string;
    keys: string;
    type: string;
    context: string;
    tags: string;
    productId: string;
    productName: string;
    group: string;
    facets: string;
    note: string;
    defaultVal: string;
};

/** Cached FlexSearch index instance */
let index: any = null;
/** Set of IDs currently in the index */
let indexedIds = new Set<string>();

/**
 * Normalizes a search query string.
 * @param s - The string to normalize
 * @returns Lowercase, trimmed string
 */
function normalize(s: string) {
    return s.trim().toLowerCase();
}

/**
 * Builds or returns the cached FlexSearch index.
 *
 * The index is configured with:
 * - Forward tokenization for prefix matching
 * - Case-insensitive encoding
 * - Context-aware matching
 * - Caching for repeated queries
 *
 * Indexed fields:
 * - command, keys, type, context, tags, productName
 * - group, facets (for categorization search)
 * - note, defaultVal (for power features search)
 *
 * @param shortcuts - Array of shortcuts to index
 * @returns The FlexSearch document index
 */
export function buildSearchIndex(shortcuts: ShortcutWithProduct[]) {
    if (index && shortcuts.every((s) => indexedIds.has(s.id))) return index;

    index = new (FlexSearch as any).Document({
        document: {
            id: 'id',
            index: ['command', 'keys', 'type', 'context', 'tags', 'productName', 'group', 'facets', 'note', 'defaultVal'],
            store: ['productId', 'type', 'productName', 'group']
        },
        tokenize: 'forward',
        encode: 'icase',
        cache: 200,
        context: true
    });

    indexedIds = new Set<string>();

    for (const s of shortcuts) {
        const keysMac = s.keys;
        const keysWin = s.keysWin?.trim() ? s.keysWin : resolveKeysForOS(s, 'win');

        index.add({
            id: s.id,
            command: s.command,
            keys: `${keysMac} ${keysWin}`,
            type: s.type,
            context: s.context ?? '',
            tags: (s.tags ?? []).join(' '),
            productId: s.productId,
            productName: s.productName,
            group: s.group ?? '',
            facets: (s.facets ?? []).join(' '),
            note: s.note ?? '',
            defaultVal: s.default ?? ''
        });
        indexedIds.add(s.id);
    }

    return index;
}

/**
 * Searches for shortcuts matching a query string.
 *
 * Returns an array of matching shortcut IDs, ordered by relevance.
 * The search matches across all indexed fields including command,
 * keys, tags, context, group, facets, and notes.
 *
 * @param query - The search query string
 * @param shortcuts - Array of shortcuts to search (used to build index)
 * @param opts - Optional search configuration
 * @param opts.limit - Maximum number of results (default: 250)
 * @param opts.fuzzy - Enable fuzzy/tolerant matching (default: true)
 * @returns Array of matching shortcut IDs
 *
 * @example
 * ```ts
 * const ids = searchShortcutIds('copy', allShortcuts);
 * const matches = allShortcuts.filter(s => ids.includes(s.id));
 * ```
 */
export function searchShortcutIds(
    query: string,
    shortcuts: ShortcutWithProduct[],
    opts?: { limit?: number; fuzzy?: boolean }
): string[] {
    const q = normalize(query);
    if (!q) return [];

    const idx = buildSearchIndex(shortcuts);
    const limit = opts?.limit ?? 250;

    const result = idx.search(q, {
        limit,
        enrich: false,
        suggest: opts?.fuzzy ?? true
    }) as Array<{ field: string; result: string[] }>;

    // Merge results from all fields, preserving order and removing duplicates
    const seen = new Set<string>();
    const merged: string[] = [];
    for (const bucket of result) {
        for (const id of bucket.result) {
            if (!seen.has(id)) {
                seen.add(id);
                merged.push(id);
            }
        }
    }
    return merged;
}

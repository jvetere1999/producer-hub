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
/** Track the number of shortcuts last indexed */
let lastIndexedCount = 0;
/** Cache for recent search results */
const searchCache = new Map<string, string[]>();
const CACHE_MAX_SIZE = 50;

/**
 * Clears the search index cache, forcing a rebuild on next search.
 * Call this when shortcuts data changes.
 */
export function clearSearchIndex(): void {
    index = null;
    indexedIds = new Set<string>();
    lastIndexedCount = 0;
    searchCache.clear();
}

/**
 * Normalizes a search query string.
 * @param s - The string to normalize
 * @returns Lowercase, trimmed string
 */
function normalize(s: string) {
    return s.trim().toLowerCase();
}

/**
 * Normalizes keyboard shortcut keys for searchability.
 * Converts Mac symbols to searchable text equivalents.
 * @param keys - The key combination string
 * @returns Searchable string with both symbols and text versions
 */
function normalizeKeysForSearch(keys: string): string {
    if (!keys) return '';

    let searchable = keys;

    // Add text equivalents for Mac symbols
    const symbolMap: [string, string][] = [
        ['⌘', ' cmd command '],
        ['⌃', ' ctrl control '],
        ['⌥', ' alt option opt '],
        ['⇧', ' shift '],
        ['⎋', ' esc escape '],
        ['⌫', ' backspace delete '],
        ['⌦', ' delete del '],
        ['↩', ' return enter '],
        ['⇥', ' tab '],
        ['␣', ' space spacebar '],
        ['↑', ' up arrow '],
        ['↓', ' down arrow '],
        ['←', ' left arrow '],
        ['→', ' right arrow '],
    ];

    for (const [symbol, text] of symbolMap) {
        if (keys.includes(symbol)) {
            searchable += text;
        }
    }

    // Also add versions with + separators normalized
    searchable += ' ' + keys.replace(/\+/g, ' ');

    return searchable;
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
    // Rebuild if index doesn't exist, count changed, or not all IDs are indexed
    if (index && lastIndexedCount === shortcuts.length && shortcuts.every((s) => indexedIds.has(s.id))) {
        return index;
    }

    // Clear cache when rebuilding index
    searchCache.clear();

    // FlexSearch 0.8.x Document configuration
    index = new (FlexSearch as any).Document({
        document: {
            id: 'id',
            index: ['command', 'keys', 'type', 'context', 'tags', 'productName', 'group', 'facets', 'note', 'defaultVal']
        },
        tokenize: 'forward',  // 'forward' for prefix matching
        encode: 'simple',     // Simple encoder for better matching
        cache: 100
    });

    indexedIds = new Set<string>();

    for (const s of shortcuts) {
        const keysMac = s.keys || '';
        const keysWin = s.keysWin?.trim() ? s.keysWin : resolveKeysForOS(s, 'win');

        // Normalize keys for search - include symbols, text equivalents, and Windows keys
        const keysSearchable = normalizeKeysForSearch(keysMac) + ' ' + normalizeKeysForSearch(keysWin);

        index.add({
            id: s.id,
            command: s.command || '',
            keys: keysSearchable,
            type: s.type || '',
            context: s.context ?? '',
            tags: (s.tags ?? []).join(' '),
            productName: s.productName || '',
            group: s.group ?? '',
            facets: (s.facets ?? []).join(' '),
            note: s.note ?? '',
            defaultVal: s.default ?? ''
        });
        indexedIds.add(s.id);
    }

    lastIndexedCount = shortcuts.length;
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

    // Check cache first (include shortcuts count in cache key for invalidation)
    const cacheKey = `${q}:${shortcuts.length}:${opts?.limit ?? 250}`;
    if (searchCache.has(cacheKey)) {
        return searchCache.get(cacheKey)!;
    }

    const limit = opts?.limit ?? 250;
    let merged: string[] = [];

    try {
        const idx = buildSearchIndex(shortcuts);

        // Search with simpler options for reliability
        const result = idx.search(q, { limit }) as Array<{ field: string; result: string[] }>;

        // Merge results from all fields, preserving order and removing duplicates
        const seen = new Set<string>();
        for (const bucket of result) {
            if (bucket && Array.isArray(bucket.result)) {
                for (const id of bucket.result) {
                    if (!seen.has(id)) {
                        seen.add(id);
                        merged.push(id);
                    }
                }
            }
        }
    } catch (e) {
        console.error('FlexSearch error:', e);
    }

    // Fallback: if FlexSearch returns no results, do simple string matching
    if (merged.length === 0) {
        const lowerQuery = q.toLowerCase();
        merged = shortcuts
            .filter(s => {
                const searchText = [
                    s.command,
                    s.keys,
                    s.keysWin,
                    s.type,
                    s.context,
                    s.productName,
                    s.group,
                    ...(s.tags || []),
                    ...(s.facets || []),
                    s.note,
                    s.description
                ].filter(Boolean).join(' ').toLowerCase();

                return searchText.includes(lowerQuery);
            })
            .slice(0, limit)
            .map(s => s.id);
    }

    // Cache the result (LRU-style: remove oldest if full)
    if (searchCache.size >= CACHE_MAX_SIZE) {
        const firstKey = searchCache.keys().next().value;
        if (firstKey) searchCache.delete(firstKey);
    }
    searchCache.set(cacheKey, merged);

    return merged;
}

/**
 * Filtering utilities for shortcuts.
 *
 * Provides pure functions for filtering shortcuts by various criteria.
 */

import type { ShortcutWithProduct } from './types';

/**
 * Filter options for shortcuts.
 */
export interface FilterOptions {
    /** Filter by product ID. 'all' means no product filter. */
    productId?: string | 'all';

    /** Filter by type. 'all' means no type filter. */
    type?: string | 'all';

    /** Filter by group. 'all' means no group filter. */
    group?: string | 'all';

    /** Filter by entry kind. 'all' means no kind filter. */
    kind?: 'shortcut' | 'feature' | 'all';

    /**
     * Filter by facets. Empty array means no facet filter.
     * Uses AND semantics: all selected facets must be present on the shortcut.
     */
    facets?: string[];

    /** Only include favorites (by ID set). */
    favoriteIds?: Set<string>;

    /** If true, only return shortcuts in favoriteIds. */
    favoritesOnly?: boolean;
}

/**
 * Filters shortcuts based on the provided options.
 *
 * Facet filtering uses AND semantics: if multiple facets are selected,
 * the shortcut must have ALL of them to be included.
 *
 * @param shortcuts - The array of shortcuts to filter
 * @param options - Filter options
 * @returns Filtered array of shortcuts
 */
export function filterShortcuts(
    shortcuts: ShortcutWithProduct[],
    options: FilterOptions = {}
): ShortcutWithProduct[] {
    const {
        productId = 'all',
        type = 'all',
        group = 'all',
        kind = 'all',
        facets = [],
        favoriteIds = new Set<string>(),
        favoritesOnly = false
    } = options;

    return shortcuts.filter((s) => {
        // Product filter
        if (productId !== 'all' && s.productId !== productId) {
            return false;
        }

        // Type filter
        if (type !== 'all' && s.type !== type) {
            return false;
        }

        // Group filter
        if (group !== 'all' && s.group !== group) {
            return false;
        }

        // Kind filter
        if (kind !== 'all') {
            const entryKind = s.kind ?? 'shortcut';
            if (entryKind !== kind) {
                return false;
            }
        }

        // Facets filter (AND semantics)
        if (facets.length > 0) {
            const shortcutFacets = s.facets ?? [];
            const hasAllFacets = facets.every((f) => shortcutFacets.includes(f));
            if (!hasAllFacets) {
                return false;
            }
        }

        // Favorites filter
        if (favoritesOnly && !favoriteIds.has(s.id)) {
            return false;
        }

        return true;
    });
}

/**
 * Groups shortcuts by their group field.
 *
 * @param shortcuts - Array of shortcuts to group
 * @returns Map of group name to array of shortcuts
 */
export function groupShortcutsByGroup(
    shortcuts: ShortcutWithProduct[]
): Map<string, ShortcutWithProduct[]> {
    const groups = new Map<string, ShortcutWithProduct[]>();

    for (const s of shortcuts) {
        const groupName = s.group;
        if (!groups.has(groupName)) {
            groups.set(groupName, []);
        }
        groups.get(groupName)!.push(s);
    }

    return groups;
}


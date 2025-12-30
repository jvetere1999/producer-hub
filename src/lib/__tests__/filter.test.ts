import { describe, it, expect } from 'vitest';
import { filterShortcuts, groupShortcutsByGroup, filterShortcutsByProducts, filterProducts } from '$lib/filter';
import type { ShortcutWithProduct } from '$lib';

// Test data factory
function createShortcut(overrides: Partial<ShortcutWithProduct>): ShortcutWithProduct {
    return {
        id: 'test:shortcut',
        productId: 'test',
        type: 'edit',
        command: 'Test Command',
        keys: '⌘T',
        productName: 'Test Product',
        group: 'General',
        ...overrides
    };
}

describe('filterShortcuts', () => {
    const shortcuts: ShortcutWithProduct[] = [
        createShortcut({ id: 'a:1', productId: 'a', type: 'edit', group: 'Editing', facets: ['Editing'] }),
        createShortcut({ id: 'a:2', productId: 'a', type: 'view', group: 'View', facets: ['Navigation'] }),
        createShortcut({ id: 'b:1', productId: 'b', type: 'edit', group: 'Editing', facets: ['Editing', 'MIDI Control'] }),
        createShortcut({ id: 'b:2', productId: 'b', type: 'transport', group: 'Transport', facets: ['Transport'] }),
    ];

    describe('productId filter', () => {
        it('filters by product when specified', () => {
            const result = filterShortcuts(shortcuts, { productId: 'a' });
            expect(result).toHaveLength(2);
            expect(result.every(s => s.productId === 'a')).toBe(true);
        });

        it('returns all products when "all"', () => {
            const result = filterShortcuts(shortcuts, { productId: 'all' });
            expect(result).toHaveLength(4);
        });

        it('returns all products when undefined', () => {
            const result = filterShortcuts(shortcuts, {});
            expect(result).toHaveLength(4);
        });
    });

    describe('type filter', () => {
        it('filters by type when specified', () => {
            const result = filterShortcuts(shortcuts, { type: 'edit' });
            expect(result).toHaveLength(2);
            expect(result.every(s => s.type === 'edit')).toBe(true);
        });

        it('returns all types when "all"', () => {
            const result = filterShortcuts(shortcuts, { type: 'all' });
            expect(result).toHaveLength(4);
        });
    });

    describe('group filter', () => {
        it('filters by group when specified', () => {
            const result = filterShortcuts(shortcuts, { group: 'Editing' });
            expect(result).toHaveLength(2);
            expect(result.every(s => s.group === 'Editing')).toBe(true);
        });

        it('returns all groups when "all"', () => {
            const result = filterShortcuts(shortcuts, { group: 'all' });
            expect(result).toHaveLength(4);
        });

        it('returns empty array for non-existent group', () => {
            const result = filterShortcuts(shortcuts, { group: 'NonExistent' });
            expect(result).toHaveLength(0);
        });
    });

    describe('facets filter (AND semantics)', () => {
        it('filters by single facet', () => {
            const result = filterShortcuts(shortcuts, { facets: ['Editing'] });
            expect(result).toHaveLength(2);
            expect(result.every(s => s.facets?.includes('Editing'))).toBe(true);
        });

        it('filters by multiple facets (AND)', () => {
            const result = filterShortcuts(shortcuts, { facets: ['Editing', 'MIDI Control'] });
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('b:1');
        });

        it('returns all when facets is empty', () => {
            const result = filterShortcuts(shortcuts, { facets: [] });
            expect(result).toHaveLength(4);
        });

        it('returns empty for non-existent facet', () => {
            const result = filterShortcuts(shortcuts, { facets: ['NonExistent'] });
            expect(result).toHaveLength(0);
        });
    });

    describe('favorites filter', () => {
        it('filters to favorites when enabled', () => {
            const favoriteIds = new Set(['a:1', 'b:2']);
            const result = filterShortcuts(shortcuts, { favoriteIds, favoritesOnly: true });
            expect(result).toHaveLength(2);
            expect(result.map(s => s.id).sort()).toEqual(['a:1', 'b:2']);
        });

        it('returns all when favoritesOnly is false', () => {
            const favoriteIds = new Set(['a:1']);
            const result = filterShortcuts(shortcuts, { favoriteIds, favoritesOnly: false });
            expect(result).toHaveLength(4);
        });
    });

    describe('combined filters', () => {
        it('combines product and group filters', () => {
            const result = filterShortcuts(shortcuts, { productId: 'a', group: 'Editing' });
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('a:1');
        });

        it('combines product, type, and facets filters', () => {
            const result = filterShortcuts(shortcuts, {
                productId: 'b',
                type: 'edit',
                facets: ['MIDI Control']
            });
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('b:1');
        });

        it('returns empty when no items match all criteria', () => {
            const result = filterShortcuts(shortcuts, {
                productId: 'a',
                facets: ['MIDI Control']
            });
            expect(result).toHaveLength(0);
        });
    });
});

describe('groupShortcutsByGroup', () => {
    const shortcuts: ShortcutWithProduct[] = [
        createShortcut({ id: 'a:1', group: 'Editing' }),
        createShortcut({ id: 'a:2', group: 'View' }),
        createShortcut({ id: 'b:1', group: 'Editing' }),
        createShortcut({ id: 'b:2', group: 'Transport' }),
    ];

    it('groups shortcuts by group field', () => {
        const result = groupShortcutsByGroup(shortcuts);
        expect(result.size).toBe(3);
        expect(result.get('Editing')).toHaveLength(2);
        expect(result.get('View')).toHaveLength(1);
        expect(result.get('Transport')).toHaveLength(1);
    });

    it('returns empty map for empty array', () => {
        const result = groupShortcutsByGroup([]);
        expect(result.size).toBe(0);
    });

    it('preserves shortcut references', () => {
        const result = groupShortcutsByGroup(shortcuts);
        expect(result.get('Editing')?.[0]).toBe(shortcuts[0]);
    });
});

describe('filterShortcutsByProducts', () => {

    const shortcuts: ShortcutWithProduct[] = [
        createShortcut({ id: 'a:1', productId: 'ableton' }),
        createShortcut({ id: 'a:2', productId: 'ableton' }),
        createShortcut({ id: 'b:1', productId: 'serum' }),
        createShortcut({ id: 'c:1', productId: 'flstudio' }),
    ];

    it('filters shortcuts by selected product IDs', () => {
        const result = filterShortcutsByProducts(shortcuts, ['ableton', 'serum']);
        expect(result).toHaveLength(3);
        expect(result.every(s => ['ableton', 'serum'].includes(s.productId))).toBe(true);
    });

    it('returns all shortcuts when selectedProductIds is empty', () => {
        const result = filterShortcutsByProducts(shortcuts, []);
        expect(result).toHaveLength(4);
    });

    it('returns empty array when no products match', () => {
        const result = filterShortcutsByProducts(shortcuts, ['nonexistent']);
        expect(result).toHaveLength(0);
    });

    it('is deterministic', () => {
        const result1 = filterShortcutsByProducts(shortcuts, ['ableton']);
        const result2 = filterShortcutsByProducts(shortcuts, ['ableton']);
        expect(result1).toEqual(result2);
    });
});

describe('filterProducts', () => {

    const products = [
        { productId: 'ableton', name: 'Ableton' },
        { productId: 'serum', name: 'Serum' },
        { productId: 'flstudio', name: 'FL Studio' },
    ];

    it('filters products by selected IDs', () => {
        const result = filterProducts(products, ['ableton', 'serum']);
        expect(result).toHaveLength(2);
    });

    it('returns all products when selectedProductIds is empty', () => {
        const result = filterProducts(products, []);
        expect(result).toHaveLength(3);
    });

    it('preserves product references', () => {
        const result = filterProducts(products, ['ableton']);
        expect(result[0]).toBe(products[0]);
    });
});

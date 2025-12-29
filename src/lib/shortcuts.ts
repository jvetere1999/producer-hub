/**
 * Entry aggregation and validation module.
 *
 * This module is responsible for:
 * 1. Importing all data modules (shortcuts and power features)
 * 2. Validating data integrity at load time
 * 3. Resolving product information for each entry
 * 4. Providing derived collections (types, groups, facets, kinds)
 *
 * All validation errors are thrown at module load time, ensuring
 * the app fails fast if data is malformed.
 *
 * @module shortcuts
 */

import { productById, products } from './products';
import type { Shortcut, ShortcutWithProduct, FeatureEntry } from './types';
import { ableton12suiteShortcuts } from './data/ableton12suite';
import { reasonrackShortcuts } from './data/reasonrack';
import { flstudioShortcuts } from './data/flstudio';
import { logicproShortcuts } from './data/logicpro';
import { serum2PowerFeatures } from './data/serum2PowerFeatures';
import { resolveGroup } from './grouping';

// ============================================
// Data Module Imports
// ============================================

/** All keyboard shortcut modules (Ableton, Reason, FL Studio, and Logic Pro) */
const shortcutModules: Shortcut[] = [
    ...ableton12suiteShortcuts,
    ...reasonrackShortcuts,
    ...flstudioShortcuts,
    ...logicproShortcuts
];

/** All power feature modules (Serum uses features instead of shortcuts) */
const featureModules: FeatureEntry[] = [
    ...serum2PowerFeatures
];

// ============================================
// Validation Functions
// ============================================

/**
 * Generates a fallback description for a shortcut if not provided.
 */
function generateDescription(command: string): string {
    const cmd = command.toLowerCase();
    if (cmd.startsWith('toggle ')) return `Toggles ${command.slice(7)} on or off.`;
    if (cmd.startsWith('open ')) return `Opens ${command.slice(5)}.`;
    if (cmd.startsWith('close ')) return `Closes ${command.slice(6)}.`;
    if (cmd.startsWith('show ')) return `Shows ${command.slice(5)}.`;
    if (cmd.startsWith('hide ')) return `Hides ${command.slice(5)}.`;
    if (cmd.startsWith('hide/show ')) return `Toggles ${command.slice(10)} visibility.`;
    return `${command}.`;
}

/**
 * Validates an array of shortcut entries.
 *
 * Checks:
 * - Required fields are present (id, productId, type, command, keys)
 * - description is auto-generated if missing
 * - ID is namespaced by productId (e.g., "ableton12suite:copy")
 * - IDs are unique
 * - productId exists in products registry
 * - Facets (if present) are non-empty strings
 *
 * @param shortcuts - Array of shortcuts to validate
 * @returns Set of validated IDs (for duplicate checking across modules)
 * @throws Error if any validation fails
 */
function assertValidShortcuts(shortcuts: Shortcut[]): Set<string> {
    const ids = new Set<string>();

    for (const s of shortcuts) {
        if (!s.id || !s.productId || !s.type || !s.command || !s.keys) {
            throw new Error(`Invalid shortcut (missing required fields: id, productId, type, command, keys): ${JSON.stringify(s)}`);
        }

        // Auto-generate description if missing
        if (!s.description) {
            (s as any).description = generateDescription(s.command);
        }

        if (!s.id.startsWith(`${s.productId}:`)) {
            throw new Error(`Shortcut id must be namespaced by productId: ${s.id} (expected ${s.productId}:*)`);
        }
        if (ids.has(s.id)) throw new Error(`Duplicate shortcut id: ${s.id}`);
        ids.add(s.id);

        if (!productById.get(s.productId)) {
            throw new Error(`Unknown productId "${s.productId}" on shortcut "${s.id}"`);
        }

        if (s.facets) {
            for (const facet of s.facets) {
                if (!facet || !facet.trim()) {
                    throw new Error(`Invalid facet (empty after trim) on shortcut "${s.id}"`);
                }
            }
        }
    }

    return ids;
}

/**
 * Validates an array of feature entries.
 *
 * Checks:
 * - Required fields are present
 * - ID is namespaced by productId
 * - IDs are unique (including against shortcuts)
 * - productId exists in products registry
 * - group is required and non-empty
 * - facets is required (can be empty array)
 *
 * @param features - Array of features to validate
 * @param existingIds - Set of already-validated IDs (from shortcuts)
 * @throws Error if any validation fails
 */
function assertValidFeatures(features: FeatureEntry[], existingIds: Set<string>) {
    for (const f of features) {
        if (!f.id || !f.productId || !f.type || !f.command || !f.keys) {
            throw new Error(`Invalid feature (missing required fields: id, productId, type, command, keys): ${JSON.stringify(f)}`);
        }

        // Auto-generate description if missing
        if (!f.description) {
            (f as any).description = generateDescription(f.command);
        }

        if (!f.id.startsWith(`${f.productId}:`)) {
            throw new Error(`Feature id must be namespaced by productId: ${f.id} (expected ${f.productId}:*)`);
        }
        if (existingIds.has(f.id)) throw new Error(`Duplicate entry id: ${f.id}`);
        existingIds.add(f.id);

        if (!productById.get(f.productId)) {
            throw new Error(`Unknown productId "${f.productId}" on feature "${f.id}"`);
        }

        // Features require group
        if (!f.group || !f.group.trim()) {
            throw new Error(`Feature missing required group: ${f.id}`);
        }

        // Features require facets array (can be empty)
        if (!Array.isArray(f.facets)) {
            throw new Error(`Feature missing required facets array: ${f.id}`);
        }

        // Validate facets - each must be non-empty after trimming
        for (const facet of f.facets) {
            if (!facet || !facet.trim()) {
                throw new Error(`Invalid facet (empty after trim) on feature "${f.id}"`);
            }
        }
    }
}

// Validate all data at load time
const ids = assertValidShortcuts(shortcutModules);
assertValidFeatures(featureModules, ids);

export const allProducts = products;

/**
 * All entries (shortcuts + features) with resolved product information.
 */
export const allShortcuts: ShortcutWithProduct[] = [
    // Convert shortcuts to unified format
    ...shortcutModules.map((s) => {
        const p = productById.get(s.productId)!;
        return {
            ...s,
            kind: 'shortcut' as const,
            productName: p.name,
            productVendor: p.vendor,
            productCategory: p.category,
            productIcon: p.icon,
            group: resolveGroup(s.group)
        };
    }),
    // Convert features to unified format
    ...featureModules.map((f) => {
        const p = productById.get(f.productId)!;
        return {
            ...f,
            productName: p.name,
            productVendor: p.vendor,
            productCategory: p.category,
            productIcon: p.icon,
            group: resolveGroup(f.group)
        };
    })
];

/**
 * Get unique types for a product (or all products).
 */
export function typesForProduct(productId: string | 'all'): string[] {
    const set = new Set<string>();
    for (const s of allShortcuts) {
        if (productId === 'all' || s.productId === productId) set.add(s.type);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
}

/**
 * Get unique groups for a product (or all products).
 */
export function groupsForProduct(productId: string | 'all'): string[] {
    const set = new Set<string>();
    for (const s of allShortcuts) {
        if (productId === 'all' || s.productId === productId) set.add(s.group);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
}

/**
 * Get unique facets for a product (or all products).
 */
export function facetsForProduct(productId: string | 'all'): string[] {
    const set = new Set<string>();
    for (const s of allShortcuts) {
        if (productId === 'all' || s.productId === productId) {
            for (const facet of s.facets ?? []) {
                set.add(facet);
            }
        }
    }
    return [...set].sort((a, b) => a.localeCompare(b));
}

/**
 * Get unique entry kinds for a product (or all products).
 */
export function kindsForProduct(productId: string | 'all'): string[] {
    const set = new Set<string>();
    for (const s of allShortcuts) {
        if (productId === 'all' || s.productId === productId) {
            set.add(s.kind ?? 'shortcut');
        }
    }
    return [...set].sort((a, b) => a.localeCompare(b));
}


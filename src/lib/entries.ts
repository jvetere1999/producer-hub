/**
 * Entry types for the DAW Shortcuts app.
 *
 * Supports two kinds of entries:
 * - ShortcutEntry: Traditional keyboard shortcuts
 * - FeatureEntry: Power features (mouse actions, workflow tips, etc.)
 */

/**
 * Base fields shared by all entry types.
 */
export interface BaseEntry {
    id: string; // stable unique, namespaced by product: `${productId}:slug`
    productId: string;
    type: string; // category for filtering (e.g., 'edit', 'view', 'transport')
    command: string; // human-readable action name

    /**
     * Human-readable description explaining the practical use.
     * Should be 1-2 sentences in plain language.
     * Auto-generated if not provided.
     */
    description?: string;

    /**
     * URL to the authoritative source used for the description.
     */
    descriptionSource?: string;

    /**
     * Keys display (mac-style by default).
     * For features, this might be a mouse action like "Double-click" or "Drag".
     */
    keys: string;
    keysWin?: string;

    context?: string;
    tags?: string[];
}

/**
 * A keyboard shortcut entry.
 */
export interface ShortcutEntry extends BaseEntry {
    kind: 'shortcut';

    /**
     * Primary grouping that mirrors the source document's section header.
     */
    group?: string;

    /**
     * Cross-cutting facets for secondary categorization.
     */
    facets?: string[];
}

/**
 * A power feature entry (mouse actions, workflow tips, advanced features).
 */
export interface FeatureEntry extends BaseEntry {
    kind: 'feature';

    /**
     * Primary grouping (required for features).
     */
    group: string;

    /**
     * Cross-cutting facets (required for features, can be empty array).
     */
    facets: string[];

    /**
     * Additional note explaining the feature.
     */
    note?: string;

    /**
     * Default value or state, if applicable.
     */
    default?: string;
}

/**
 * Union type for all entry kinds.
 */
export type Entry = ShortcutEntry | FeatureEntry;

/**
 * Entry with resolved product information.
 */
export type EntryWithProduct = Entry & {
    productName: string;
    productVendor?: string;
    productCategory?: string;
    /** Resolved group - always present after aggregation (defaults to "General") */
    group: string;
};

/**
 * Type guard to check if an entry is a shortcut.
 */
export function isShortcut(entry: Entry): entry is ShortcutEntry {
    return entry.kind === 'shortcut';
}

/**
 * Type guard to check if an entry is a feature.
 */
export function isFeature(entry: Entry): entry is FeatureEntry {
    return entry.kind === 'feature';
}


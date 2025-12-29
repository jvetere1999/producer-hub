// Re-export new entry types
export {
    type BaseEntry,
    type ShortcutEntry,
    type FeatureEntry,
    type Entry,
    type EntryWithProduct,
    isShortcut,
    isFeature
} from './entries';

export type Product = {
    productId: string;
    name: string;
    vendor?: string;
    category?: string;
    website?: string;
    icon?: string;
};

/**
 * Legacy Shortcut type - use Entry for new code.
 * Kept for backwards compatibility with existing data modules.
 */
export type Shortcut = {
    id: string; // stable unique, namespaced by product: `${productId}:slug`
    productId: string;
    type: string; // derived for filter; do not hardcode in UI
    command: string;

    /**
     * Human-readable description explaining the practical use of this shortcut.
     * Should be 1-2 sentences in plain language.
     * Auto-generated if not provided.
     */
    description?: string;

    /**
     * URL to the authoritative source used for the description.
     * Should point to official documentation.
     */
    descriptionSource?: string;

    /**
     * Convention:
     * - `keys` is the mac-style display by default (e.g., "⇧⌘Z", "⌘⌥M", "Space").
     * - `keysWin` optionally overrides Windows display (e.g., "Ctrl+Shift+Z").
     * If keysWin is missing, app will derive it from `keys`.
     */
    keys: string;
    keysWin?: string;

    context?: string;
    tags?: string[];

    /**
     * Primary grouping that mirrors the source document's section header.
     * If not provided, defaults to "General" during aggregation.
     * Leading numbering (e.g., "3. ", "12) ") is stripped via normalizeGroupTitle.
     */
    group?: string;

    /**
     * Cross-cutting facets for secondary categorization.
     * Examples: "MIDI Control", "Navigation", "Editing", "Browser", "Transport".
     * A shortcut can belong to multiple facets.
     */
    facets?: string[];
};

/**
 * Legacy ShortcutWithProduct type - use EntryWithProduct for new code.
 */
export type ShortcutWithProduct = Shortcut & {
    productName: string;
    productVendor?: string;
    productCategory?: string;
    /** Product icon path */
    productIcon?: string;
    /** Resolved group - always present after aggregation (defaults to "General") */
    group: string;
    /** Entry kind - 'shortcut' for legacy shortcuts, 'feature' for power features */
    kind?: 'shortcut' | 'feature';
    /** Note for feature entries */
    note?: string;
    /** Default value for feature entries */
    default?: string;
};

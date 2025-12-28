export type Product = {
    productId: string;
    name: string;
    vendor?: string;
    category?: string;
    website?: string;
    icon?: string;
};

export type Shortcut = {
    id: string; // stable unique, namespaced by product: `${productId}:slug`
    productId: string;
    type: string; // derived for filter; do not hardcode in UI
    command: string;

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
};

export type ShortcutWithProduct = Shortcut & {
    productName: string;
    productVendor?: string;
    productCategory?: string;
};

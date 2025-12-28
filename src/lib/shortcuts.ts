import { productById, products } from './products';
import type { Shortcut, ShortcutWithProduct } from './types';
import { serum2Shortcuts } from './data/serum2';
import { ableton12suiteShortcuts } from './data/ableton12suite';
import { reasonrackShortcuts } from './data/reasonrack';

const modules: Shortcut[] = [...serum2Shortcuts, ...ableton12suiteShortcuts, ...reasonrackShortcuts];

function assertValidData(shortcuts: Shortcut[]) {
    const ids = new Set<string>();

    for (const s of shortcuts) {
        if (!s.id || !s.productId || !s.type || !s.command || !s.keys) {
            throw new Error(`Invalid shortcut (missing required fields): ${JSON.stringify(s)}`);
        }
        if (!s.id.startsWith(`${s.productId}:`)) {
            throw new Error(`Shortcut id must be namespaced by productId: ${s.id} (expected ${s.productId}:*)`);
        }
        if (ids.has(s.id)) throw new Error(`Duplicate shortcut id: ${s.id}`);
        ids.add(s.id);

        if (!productById.get(s.productId)) {
            throw new Error(`Unknown productId "${s.productId}" on shortcut "${s.id}"`);
        }
    }
}

assertValidData(modules);

export const allProducts = products;

export const allShortcuts: ShortcutWithProduct[] = modules.map((s) => {
    const p = productById.get(s.productId)!;
    return {
        ...s,
        productName: p.name,
        productVendor: p.vendor,
        productCategory: p.category
    };
});

export function typesForProduct(productId: string | 'all') {
    const set = new Set<string>();
    for (const s of allShortcuts) {
        if (productId === 'all' || s.productId === productId) set.add(s.type);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
}

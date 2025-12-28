import FlexSearch from 'flexsearch';
import type { ShortcutWithProduct } from './types';
import { resolveKeysForOS } from './platform';

type Doc = {
    id: string;
    command: string;
    keys: string;
    type: string;
    context: string;
    tags: string;
    productId: string;
    productName: string;
};

let index: any = null;
let indexedIds = new Set<string>();

function normalize(s: string) {
    return s.trim().toLowerCase();
}

export function buildSearchIndex(shortcuts: ShortcutWithProduct[]) {
    if (index && shortcuts.every((s) => indexedIds.has(s.id))) return index;

    index = new (FlexSearch as any).Document({
        document: {
            id: 'id',
            index: ['command', 'keys', 'type', 'context', 'tags', 'productName'],
            store: ['productId', 'type', 'productName']
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
            productName: s.productName
        });
        indexedIds.add(s.id);
    }

    return index;
}


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
        // tolerant matching; good for a few thousand records
        suggest: opts?.fuzzy ?? true
    }) as Array<{ field: string; result: string[] }>;

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

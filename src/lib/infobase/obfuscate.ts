/**
 * Info Base Obfuscation Module
 *
 * Provides reversible obfuscation for Markdown export/import.
 * Uses XOR with a per-install key stored in localStorage.
 *
 * @module infobase/obfuscate
 */

import type { InfoBaseState, KnowledgeNote } from './types';

const KEY_STORAGE = 'daw_infobase_key_v1';
const HEADER_PREFIX = 'PRODUCER-HUB-INFOBASE-OBFUSCATED v1';

/**
 * Gets or creates the per-install obfuscation key.
 */
function getOrCreateKey(): string {
    if (typeof window === 'undefined') {
        return 'default-key-for-ssr';
    }

    let key = localStorage.getItem(KEY_STORAGE);
    if (!key) {
        // Generate a random key
        const bytes = new Uint8Array(32);
        crypto.getRandomValues(bytes);
        key = Array.from(bytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        localStorage.setItem(KEY_STORAGE, key);
    }
    return key;
}

/**
 * XOR-based obfuscation.
 */
function xorString(input: string, key: string): string {
    const result: number[] = [];
    for (let i = 0; i < input.length; i++) {
        const charCode = input.charCodeAt(i);
        const keyCode = key.charCodeAt(i % key.length);
        result.push(charCode ^ keyCode);
    }
    return String.fromCharCode(...result);
}

/**
 * Encodes a string to base64 safely (handles Unicode).
 */
function toBase64(str: string): string {
    if (typeof window === 'undefined') {
        return Buffer.from(str, 'utf-8').toString('base64');
    }
    // Handle Unicode by encoding to UTF-8 bytes first
    const bytes = new TextEncoder().encode(str);
    const binString = Array.from(bytes)
        .map(b => String.fromCharCode(b))
        .join('');
    return btoa(binString);
}

/**
 * Decodes a base64 string safely (handles Unicode).
 */
function fromBase64(b64: string): string {
    if (typeof window === 'undefined') {
        return Buffer.from(b64, 'base64').toString('utf-8');
    }
    const binString = atob(b64);
    const bytes = new Uint8Array(binString.length);
    for (let i = 0; i < binString.length; i++) {
        bytes[i] = binString.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
}

/**
 * Converts an entry to Markdown format.
 */
function entryToMarkdown(entry: KnowledgeNote): string {
    const lines: string[] = [];

    lines.push(`## ${entry.title}`);
    lines.push('');
    lines.push('```yaml');
    lines.push(`id: ${entry.id}`);
    lines.push(`createdAt: ${entry.createdAt}`);
    lines.push(`updatedAt: ${entry.updatedAt}`);
    if (entry.category) {
        lines.push(`category: ${entry.category}`);
    }
    if (entry.tags.length > 0) {
        lines.push(`tags: [${entry.tags.join(', ')}]`);
    }
    if (entry.links && entry.links.length > 0) {
        lines.push('links:');
        for (const link of entry.links) {
            lines.push(`  - title: ${link.title}`);
            lines.push(`    url: ${link.url}`);
        }
    }
    lines.push('```');
    lines.push('');
    lines.push(entry.body);
    lines.push('');
    lines.push('---');
    lines.push('');

    return lines.join('\n');
}

/**
 * Converts Info Base state to Markdown.
 */
export function stateToMarkdown(state: InfoBaseState): string {
    const lines: string[] = [];

    lines.push('# Producer Hub Info Base Export');
    lines.push('');
    lines.push(`Exported: ${new Date().toISOString()}`);
    lines.push(`Entry count: ${Object.keys(state.entries).length}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    for (const id of state.order) {
        const entry = state.entries[id];
        if (entry) {
            lines.push(entryToMarkdown(entry));
        }
    }

    return lines.join('\n');
}

/**
 * Obfuscates Markdown content for export.
 */
export function obfuscate(markdown: string): string {
    const key = getOrCreateKey();
    const xored = xorString(markdown, key);
    const b64 = toBase64(xored);

    const header = [
        HEADER_PREFIX,
        `timestamp: ${new Date().toISOString()}`,
        `length: ${markdown.length}`,
        '',
        b64
    ].join('\n');

    return header;
}

/**
 * Deobfuscates content from import.
 */
export function deobfuscate(content: string): string {
    const lines = content.split('\n');

    // Validate header
    if (!lines[0]?.startsWith('PRODUCER-HUB-INFOBASE-OBFUSCATED')) {
        throw new Error('Invalid file format: missing header');
    }

    // Find the base64 content (after empty line)
    const emptyIdx = lines.findIndex((l, i) => i > 0 && l.trim() === '');
    if (emptyIdx < 0) {
        throw new Error('Invalid file format: missing content');
    }

    const b64 = lines.slice(emptyIdx + 1).join('\n').trim();
    if (!b64) {
        throw new Error('Invalid file format: empty content');
    }

    const key = getOrCreateKey();
    const xored = fromBase64(b64);
    const markdown = xorString(xored, key);

    return markdown;
}

/**
 * Parses Markdown back to entries.
 */
export function parseMarkdown(markdown: string): KnowledgeNote[] {
    const entries: KnowledgeNote[] = [];

    // Split by entry delimiter
    const sections = markdown.split(/\n---\n/).filter(s => s.trim());

    for (const section of sections) {
        // Skip header section
        if (section.includes('# Producer Hub Info Base Export')) {
            continue;
        }

        // Extract title
        const titleMatch = section.match(/^## (.+)$/m);
        if (!titleMatch) continue;

        // Extract metadata
        const metaMatch = section.match(/```yaml\n([\s\S]+?)```/);
        if (!metaMatch) continue;

        const meta: Record<string, string> = {};
        const metaLines = metaMatch[1].split('\n');
        for (const line of metaLines) {
            const colonIdx = line.indexOf(':');
            if (colonIdx > 0) {
                const key = line.slice(0, colonIdx).trim();
                const value = line.slice(colonIdx + 1).trim();
                meta[key] = value;
            }
        }

        // Extract body
        const bodyStart = section.indexOf('```', section.indexOf('```yaml') + 7);
        const body = section.slice(bodyStart + 3).trim();

        // Parse tags
        const tagsMatch = meta.tags?.match(/\[(.+)\]/);
        const tags = tagsMatch
            ? tagsMatch[1].split(',').map(t => t.trim())
            : [];

        entries.push({
            id: meta.id || `imported-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            title: titleMatch[1],
            body,
            tags,
            category: meta.category as any,
            createdAt: meta.createdAt || new Date().toISOString(),
            updatedAt: meta.updatedAt || new Date().toISOString()
        });
    }

    return entries;
}

/**
 * Exports Info Base state as an obfuscated file.
 */
export function exportInfoBase(state: InfoBaseState): Blob {
    const markdown = stateToMarkdown(state);
    const obfuscated = obfuscate(markdown);
    return new Blob([obfuscated], { type: 'text/plain' });
}

/**
 * Imports entries from obfuscated content.
 * Returns entries to merge (newer updatedAt wins for duplicates).
 */
export function importInfoBase(
    content: string,
    existingState: InfoBaseState
): InfoBaseState {
    // Size limit check (1MB)
    if (content.length > 1024 * 1024) {
        throw new Error('File too large (max 1MB)');
    }

    const markdown = deobfuscate(content);
    const imported = parseMarkdown(markdown);

    const entries = { ...existingState.entries };
    const orderSet = new Set(existingState.order);

    for (const entry of imported) {
        const existing = entries[entry.id];
        if (!existing || entry.updatedAt > existing.updatedAt) {
            entries[entry.id] = entry;
            if (!orderSet.has(entry.id)) {
                orderSet.add(entry.id);
            }
        }
    }

    // Rebuild order with imported entries at the front
    const importedIds = imported.map(e => e.id);
    const order = [
        ...importedIds.filter(id => !existingState.order.includes(id)),
        ...existingState.order
    ];

    return {
        ...existingState,
        entries,
        order
    };
}


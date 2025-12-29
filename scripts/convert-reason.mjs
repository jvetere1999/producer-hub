/**
 * Script to convert reason Raw.json to TypeScript module.
 * Run with: node scripts/convert-reason.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const inputPath = join(__dirname, '../temp/reason Raw.json');
const outputPath = join(__dirname, '../src/lib/data/reasonrack.ts');

const rawData = JSON.parse(readFileSync(inputPath, 'utf-8'));

// Type inference from section title
function inferType(sectionTitle) {
    const title = sectionTitle.toLowerCase();
    if (title.includes('transport') || title.includes('playback') || title.includes('performance')) return 'transport';
    if (title.includes('edit') || title.includes('sequencer edit')) return 'edit';
    if (title.includes('view') || title.includes('window') || title.includes('zoom')) return 'view';
    if (title.includes('browser') || title.includes('navigation')) return 'browser';
    if (title.includes('record') || title.includes('sampling')) return 'record';
    if (title.includes('mixer') || title.includes('level')) return 'mixer';
    if (title.includes('rack') || title.includes('device')) return 'device';
    if (title.includes('piano') || title.includes('audio edit')) return 'edit';
    if (title.includes('track')) return 'edit';
    if (title.includes('automation')) return 'edit';
    if (title.includes('pattern')) return 'transport';
    if (title.includes('remote') || title.includes('midi')) return 'device';
    if (title.includes('export') || title.includes('bounce')) return 'edit';
    if (title.includes('tempo') || title.includes('time')) return 'transport';
    return 'other';
}

// Convert Mac key string to normalized format
function normalizeKeys(macKey) {
    if (!macKey) return '';
    return macKey
        .replace(/Cmd/g, '⌘')
        .replace(/Command/g, '⌘')
        .replace(/Ctrl/g, '⌃')
        .replace(/Control/g, '⌃')
        .replace(/Shift/g, '⇧')
        .replace(/Option/g, '⌥')
        .replace(/Alt/g, '⌥')
        .replace(/\+/g, '');
}

// Create a slug from action text
function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50);
}

// Generate descriptions based on action and section
function generateDescription(action, sectionTitle) {
    const actionLower = action.toLowerCase();

    // Common patterns
    if (actionLower.includes('toggle')) {
        const thing = action.replace(/^toggle\s+/i, '');
        return `Toggles the ${thing} on or off.`;
    }
    if (actionLower.includes('open')) {
        const thing = action.replace(/^open\s+/i, '');
        return `Opens the ${thing}.`;
    }
    if (actionLower.includes('close')) {
        const thing = action.replace(/^close\s+/i, '');
        return `Closes the ${thing}.`;
    }
    if (actionLower.startsWith('go to')) {
        return `Navigates to ${action.replace(/^go to\s+/i, '')}.`;
    }
    if (actionLower.includes('zoom')) {
        return `${action} to change the view scale.`;
    }
    if (actionLower.includes('select')) {
        return `${action} in the current context.`;
    }

    // Default description
    return `${action} in Reason.`;
}

const source = rawData.source || 'https://docs.reasonstudios.com/reason13/key-commands';

const shortcuts = [];
const seenIds = new Set();

for (const section of rawData.sections) {
    const sectionTitle = section.title;
    const type = inferType(sectionTitle);

    // Skip the formatting note section
    if (sectionTitle.includes('formatting in the docs')) continue;

    for (const shortcut of section.shortcuts) {
        const action = shortcut.action;

        // Skip documentation notes
        if (action.includes('formatting') || action.includes('[Command]')) continue;

        let baseSlug = slugify(action);
        let id = `reasonrack:${baseSlug}`;

        // Handle duplicates
        if (seenIds.has(id)) {
            // Add section context
            const sectionSlug = slugify(sectionTitle).slice(0, 20);
            id = `reasonrack:${baseSlug}-${sectionSlug}`;

            // Still duplicate? Add counter
            let counter = 2;
            while (seenIds.has(id)) {
                id = `reasonrack:${baseSlug}-${sectionSlug}-${counter}`;
                counter++;
            }
        }
        seenIds.add(id);

        const entry = {
            id,
            productId: 'reasonrack',
            type,
            command: action,
            description: generateDescription(action, sectionTitle),
            descriptionSource: source,
            keys: normalizeKeys(shortcut.mac),
            ...(shortcut.windows && shortcut.windows !== shortcut.mac ? { keysWin: shortcut.windows } : {}),
            context: sectionTitle,
            tags: [type],
            group: sectionTitle,
            facets: type === 'transport' ? ['Transport'] :
                    type === 'edit' ? ['Editing'] :
                    type === 'view' ? ['Navigation'] :
                    type === 'browser' ? ['Browser', 'Navigation'] :
                    type === 'mixer' ? ['Mixing'] :
                    type === 'device' ? ['Sound Design'] :
                    []
        };

        shortcuts.push(entry);
    }
}

// Generate TypeScript output
function formatEntry(entry) {
    const lines = [];
    lines.push('    {');
    lines.push(`        id: '${entry.id}',`);
    lines.push(`        productId: '${entry.productId}',`);
    lines.push(`        type: '${entry.type}',`);
    lines.push(`        command: '${entry.command.replace(/'/g, "\\'")}',`);
    lines.push(`        description: '${entry.description.replace(/'/g, "\\'")}',`);
    lines.push(`        descriptionSource: '${entry.descriptionSource}',`);
    lines.push(`        keys: '${entry.keys.replace(/'/g, "\\'")}',`);
    if (entry.keysWin) {
        lines.push(`        keysWin: '${entry.keysWin.replace(/'/g, "\\'")}',`);
    }
    if (entry.context) {
        lines.push(`        context: '${entry.context.replace(/'/g, "\\'")}',`);
    }
    lines.push(`        tags: [${entry.tags.map(t => `'${t}'`).join(', ')}],`);
    lines.push(`        group: '${entry.group.replace(/'/g, "\\'")}',`);
    lines.push(`        facets: [${entry.facets.map(f => `'${f}'`).join(', ')}]`);
    lines.push('    }');
    return lines.join('\n');
}

const output = `import type { Shortcut } from '../types';

/**
 * Reason 13 Keyboard Shortcuts
 * Source: ${source}
 *
 * Generated from reason Raw.json
 * Total shortcuts: ${shortcuts.length}
 */
export const reasonrackShortcuts: Shortcut[] = [
${shortcuts.map(formatEntry).join(',\n')}
];
`;

writeFileSync(outputPath, output, 'utf-8');
console.log(`Wrote ${shortcuts.length} shortcuts to ${outputPath}`);


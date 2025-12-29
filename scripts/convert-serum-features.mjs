/**
 * Script to convert rawSerym2PowerFeatures.json to TypeScript module.
 * Run with: node scripts/convert-serum-features.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const inputPath = join(__dirname, '../temp/rawSerym2PowerFeatures.json');
const outputPath = join(__dirname, '../src/lib/data/serum2PowerFeatures.ts');

const rawData = JSON.parse(readFileSync(inputPath, 'utf-8'));

const DESCRIPTION_SOURCE = 'https://xferrecords.com/products/serum';

const items = rawData.items.map(item => {
    // Generate description from note or command
    let description = item.note
        ? item.note.slice(0, 150) + (item.note.length > 150 ? '...' : '')
        : `${item.command} feature in Serum 2.`;

    const entry = {
        kind: 'feature',
        id: item.id,
        productId: item.productId,
        type: item.type,
        command: item.command,
        description: description,
        descriptionSource: DESCRIPTION_SOURCE,
        keys: item.keys,
        ...(item.keysWin && item.keysWin !== item.keys ? { keysWin: item.keysWin } : {}),
        ...(item.context ? { context: item.context } : {}),
        ...(item.tags?.length ? { tags: item.tags } : {}),
        group: item.group,
        facets: item.facets || [],
        ...(item.note ? { note: item.note } : {}),
        ...(item.default ? { default: item.default } : {})
    };
    return entry;
});

// Use JSON.stringify but with proper escaping for TypeScript
function toTsString(obj, indent = 0) {
    const spaces = ' '.repeat(indent);
    const lines = [];
    lines.push('{');
    const entries = Object.entries(obj);
    for (let i = 0; i < entries.length; i++) {
        const [key, value] = entries[i];
        const comma = i < entries.length - 1 ? ',' : '';
        if (Array.isArray(value)) {
            if (value.length === 0) {
                lines.push(`${spaces}    ${key}: []${comma}`);
            } else {
                lines.push(`${spaces}    ${key}: [`);
                for (let j = 0; j < value.length; j++) {
                    const itemComma = j < value.length - 1 ? ',' : '';
                    // Escape single quotes in array items
                    const escaped = String(value[j]).replace(/'/g, "\\'");
                    lines.push(`${spaces}        '${escaped}'${itemComma}`);
                }
                lines.push(`${spaces}    ]${comma}`);
            }
        } else if (typeof value === 'string') {
            // Escape single quotes in string values
            const escaped = value.replace(/'/g, "\\'");
            lines.push(`${spaces}    ${key}: '${escaped}'${comma}`);
        } else {
            lines.push(`${spaces}    ${key}: ${JSON.stringify(value)}${comma}`);
        }
    }
    lines.push(`${spaces}}`);
    return lines.join('\n');
}

const itemStrings = items.map(item => toTsString(item, 4));

const output = `import type { FeatureEntry } from '../entries';

/**
 * Serum 2 Power Features.
 * Source: ${rawData.source}
 * 
 * These are advanced features, mouse actions, and workflow tips
 * that go beyond simple keyboard shortcuts.
 */
export const serum2PowerFeatures: FeatureEntry[] = [
    ${itemStrings.join(',\n    ')}
];
`;

writeFileSync(outputPath, output, 'utf-8');
console.log(`Wrote ${items.length} features to ${outputPath}`);


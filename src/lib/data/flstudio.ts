/**
 * FL Studio keyboard shortcuts dataset.
 *
 * Generated from FL Studio raw JSON data using the raw shortcuts importer.
 * Source: FL Studio Online Manual - Keyboard & Mouse Shortcuts
 *
 * @module data/flstudio
 */

import type { Shortcut } from '../types';
import {
    parseRawShortcutJson,
    dedupeShortcuts,
    printImportSummary,
    type ImportSummary
} from './importers/rawShortcuts';
import flStudioRawData from '../../../temp/fl studio raw.json';

/** Authority URL for FL Studio shortcuts documentation */
const AUTHORITY_URL = 'https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/basics_shortcuts.htm';

// Parse and generate FL Studio shortcuts
const { shortcuts: rawShortcuts, summary } = parseRawShortcutJson(
    flStudioRawData,
    'flstudio',
    AUTHORITY_URL
);

// Deduplicate shortcuts
const { deduped, removedCount } = dedupeShortcuts(rawShortcuts);

// Export the final shortcuts array
export const flstudioShortcuts: Shortcut[] = deduped;

// Export count for validation
export const flstudioShortcutsCount = flstudioShortcuts.length;

// Export raw count for testing
export const flstudioRawCount = flStudioRawData.sections.reduce(
    (acc, section) => acc + section.shortcuts.length,
    0
);

// Export summary for testing
export const flstudioImportSummary: ImportSummary = summary;

// Print summary during development (only in non-production)
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    printImportSummary('flstudio', summary, removedCount);
}


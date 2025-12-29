/**
 * Raw shortcut JSON importer.
 *
 * Converts raw JSON dumps from various DAWs into normalized Shortcut[] arrays.
 * Handles key normalization, stable ID generation, type inference, and deduplication.
 *
 * Reusable for FL Studio, Logic Pro, and other DAWs with similar JSON formats.
 */

import type { Shortcut } from '../../types';

export interface RawShortcutSection {
    id?: string;
    title: string;
    notes?: string[];
    shortcuts: Array<{
        action: string;
        windows?: string;
        mac?: string;
    }>;
}

export interface RawShortcutJson {
    source: string;
    title?: string;
    notes?: string[];
    windows_mac_equivalents?: Array<{ windows: string; mac: string }>;
    sections: RawShortcutSection[];
}

/**
 * Import summary for logging and testing.
 */
export interface ImportSummary {
    totalCount: number;
    importedCount: number;
    skippedCount: number;
    skippedReasons: Array<{ action: string; reason: string }>;
    duplicateResolutions: Array<{ originalSlug: string; resolvedId: string }>;
}

/**
 * Creates a stable slug from text by normalizing whitespace, lowercasing,
 * and converting to kebab-case.
 *
 * Handles special characters, parentheses, and various separators.
 */
export function slugify(text: string): string {
    return text
        .trim()
        .toLowerCase()
        // Remove content in parentheses for cleaner slugs (but keep key info)
        .replace(/\s*\([^)]*\)\s*/g, '-')
        // Replace special punctuation with dashes
        .replace(/[…·–—]/g, '-')
        // Replace sequences of non-alphanumeric chars with single dash
        .replace(/[^a-z0-9]+/g, '-')
        // Remove leading/trailing dashes
        .replace(/^-+|-+$/g, '')
        // Collapse multiple dashes
        .replace(/-{2,}/g, '-');
}

/**
 * Generates unique IDs with disambiguation when collisions occur.
 * Returns a Map of action -> unique ID, plus tracking of disambiguations.
 */
export function generateUniqueIds(
    productId: string,
    actions: string[],
    sectionTitles?: string[]
): { idMap: Map<string, string>; duplicateResolutions: Array<{ originalSlug: string; resolvedId: string }> } {
    const idMap = new Map<string, string>();
    const duplicateResolutions: Array<{ originalSlug: string; resolvedId: string }> = [];
    const slugCounts = new Map<string, number>();
    const actionToSection = new Map<string, string>();

    // Build section mapping if provided
    if (sectionTitles) {
        actions.forEach((action, idx) => {
            if (sectionTitles[idx]) {
                actionToSection.set(action, sectionTitles[idx]);
            }
        });
    }

    for (const action of actions) {
        const baseSlug = slugify(action);
        const count = slugCounts.get(baseSlug) || 0;
        slugCounts.set(baseSlug, count + 1);

        let slug: string;
        if (count === 0) {
            slug = baseSlug;
        } else {
            // Try section-based disambiguation first
            const section = actionToSection.get(action);
            if (section && count === 1) {
                const sectionSlug = slugify(section);
                slug = `${baseSlug}-${sectionSlug}`;
            } else {
                slug = `${baseSlug}-${count + 1}`;
            }
            duplicateResolutions.push({ originalSlug: baseSlug, resolvedId: `${productId}:${slug}` });
        }

        const id = `${productId}:${slug}`;
        idMap.set(action, id);
    }

    return { idMap, duplicateResolutions };
}

/**
 * Infers shortcut type from section title.
 * Uses deterministic mapping to ensure consistent categorization.
 */
export function inferTypeFromSection(sectionTitle: string): string {
    const title = sectionTitle.toLowerCase();

    // Transport controls
    if (title.includes('transport') || title.includes('playback') || title.includes('play') ||
        title.includes('record') || title.includes('stop')) {
        return 'transport';
    }

    // Editing operations
    if (title.includes('edit') || title.includes('select') || title.includes('copy') ||
        title.includes('paste') || title.includes('delete') || title.includes('undo')) {
        return 'edit';
    }

    // View and navigation
    if (title.includes('view') || title.includes('zoom') || title.includes('navigation') ||
        title.includes('window') || title.includes('panel')) {
        return 'view';
    }

    // Browser and files
    if (title.includes('browser') || title.includes('file') || title.includes('folder') ||
        title.includes('load') || title.includes('save')) {
        return 'browser';
    }

    // Mixer controls
    if (title.includes('mixer') || title.includes('mix') || title.includes('channel') ||
        title.includes('track') || title.includes('volume') || title.includes('mute')) {
        return 'mixer';
    }

    // Pattern and sequencer
    if (title.includes('pattern') || title.includes('sequence') || title.includes('step') ||
        title.includes('piano') || title.includes('roll')) {
        return 'sequencer';
    }

    // Tools and utilities
    if (title.includes('tool') || title.includes('utility') || title.includes('help') ||
        title.includes('option') || title.includes('preference')) {
        return 'tools';
    }

    // Global/general operations
    if (title.includes('global') || title.includes('general') || title.includes('shortcut')) {
        return 'general';
    }

    // Default fallback
    return 'other';
}

/**
 * Normalizes key combinations for consistent display.
 *
 * @param keys Raw key string
 * @param isMac Whether this is Mac keys (for Mac-specific normalization)
 * @returns Normalized key string
 */
export function normalizeKeys(keys: string | undefined, isMac: boolean = true): string {
    if (!keys) return '';

    let normalized = keys.trim();

    if (isMac) {
        // Mac key normalization
        normalized = normalized
            // Modifier keys - standardize format
            .replace(/\bCmd\b/gi, 'Cmd')
            .replace(/\bCommand\b/gi, 'Cmd')
            .replace(/\bOpt\b/gi, 'Option')
            .replace(/\bOption\b/gi, 'Option')
            .replace(/\bShift\b/gi, 'Shift')
            .replace(/\bCtrl\b/gi, 'Ctrl')
            .replace(/\bControl\b/gi, 'Ctrl')
            // Handle special keys
            .replace(/\bSpace\b/gi, 'Space')
            .replace(/\bReturn\b/gi, 'Return')
            .replace(/\bEnter\b/gi, 'Return')
            .replace(/\bTab\b/gi, 'Tab')
            .replace(/\bEscape\b/gi, 'Esc')
            .replace(/\bEsc\b/gi, 'Esc')
            .replace(/\bDelete\b/gi, 'Delete')
            .replace(/\bBackspace\b/gi, 'Delete')
            .replace(/\bDel\b/gi, 'Delete')
            // Function keys
            .replace(/\bF(\d+)\b/g, 'F$1')
            // Page Up/Down
            .replace(/\bPage\s*Up\b/gi, 'Page Up')
            .replace(/\bPage\s*Down\b/gi, 'Page Down')
            .replace(/\bPgUp\b/gi, 'Page Up')
            .replace(/\bPgDown\b/gi, 'Page Down')
            // Home/End
            .replace(/\bHome\b/gi, 'Home')
            .replace(/\bEnd\b/gi, 'End')
            // Numpad keys
            .replace(/\(Numpad\)/gi, '(Numpad)')
            .replace(/\bNumpad\s*(\d+)\b/gi, 'Numpad $1')
            // Handle arrows - various formats
            .replace(/\bUp\s*Arrow\b/gi, '↑')
            .replace(/\bDown\s*Arrow\b/gi, '↓')
            .replace(/\bLeft\s*Arrow\b/gi, '←')
            .replace(/\bRight\s*Arrow\b/gi, '→')
            .replace(/\bArrow\s*Up\b/gi, '↑')
            .replace(/\bArrow\s*Down\b/gi, '↓')
            .replace(/\bArrow\s*Left\b/gi, '←')
            .replace(/\bArrow\s*Right\b/gi, '→')
            .replace(/\bUp\/Down\b/gi, '↑/↓')
            .replace(/\bLeft\/Right\b/gi, '←/→')
            .replace(/\bArrow keys\b/gi, 'Arrow Keys')
            // Handle ranges like "0..9" -> "0-9"
            .replace(/(\d+)\.\.(\d+)/g, '$1-$2')
            // Handle comma-separated sequences
            .replace(/,\s*/g, ', ')
            // Clean up spacing around + and /
            .replace(/\s*\+\s*/g, '+')
            .replace(/\s*\/\s*/g, '/');
    } else {
        // Windows key normalization
        normalized = normalized
            // Modifier keys
            .replace(/\bCtrl\b/gi, 'Ctrl')
            .replace(/\bControl\b/gi, 'Ctrl')
            .replace(/\bAlt\b/gi, 'Alt')
            .replace(/\bShift\b/gi, 'Shift')
            .replace(/\bWin\b/gi, 'Win')
            .replace(/\bWindows\b/gi, 'Win')
            // Handle special keys
            .replace(/\bSpace\b/gi, 'Space')
            .replace(/\bEnter\b/gi, 'Enter')
            .replace(/\bReturn\b/gi, 'Enter')
            .replace(/\bTab\b/gi, 'Tab')
            .replace(/\bEscape\b/gi, 'Esc')
            .replace(/\bEsc\b/gi, 'Esc')
            .replace(/\bDelete\b/gi, 'Del')
            .replace(/\bDel\b/gi, 'Del')
            .replace(/\bBackspace\b/gi, 'Backspace')
            .replace(/\bInsert\b/gi, 'Ins')
            .replace(/\bIns\b/gi, 'Ins')
            // Function keys
            .replace(/\bF(\d+)\b/g, 'F$1')
            // Page Up/Down
            .replace(/\bPage\s*Up\b/gi, 'Page Up')
            .replace(/\bPage\s*Down\b/gi, 'Page Down')
            .replace(/\bPgUp\b/gi, 'Page Up')
            .replace(/\bPgDown\b/gi, 'Page Down')
            // Home/End
            .replace(/\bHome\b/gi, 'Home')
            .replace(/\bEnd\b/gi, 'End')
            // Numpad keys
            .replace(/\(Numpad\)/gi, '(Numpad)')
            .replace(/\bNumpad\s*(\d+)\b/gi, 'Numpad $1')
            // Handle arrows - keep text format for Windows
            .replace(/\bUp\s*Arrow\b/gi, 'Up')
            .replace(/\bDown\s*Arrow\b/gi, 'Down')
            .replace(/\bLeft\s*Arrow\b/gi, 'Left')
            .replace(/\bRight\s*Arrow\b/gi, 'Right')
            .replace(/\bArrow\s*Up\b/gi, 'Up')
            .replace(/\bArrow\s*Down\b/gi, 'Down')
            .replace(/\bArrow\s*Left\b/gi, 'Left')
            .replace(/\bArrow\s*Right\b/gi, 'Right')
            .replace(/\bUp\/Down\b/gi, 'Up/Down')
            .replace(/\bLeft\/Right\b/gi, 'Left/Right')
            .replace(/\bArrow keys\b/gi, 'Arrow Keys')
            // Handle ranges like "0..9" -> "0-9"
            .replace(/(\d+)\.\.(\d+)/g, '$1-$2')
            // Handle comma-separated sequences
            .replace(/,\s*/g, ', ')
            // Clean up spacing around + and /
            .replace(/\s*\+\s*/g, '+')
            .replace(/\s*\/\s*/g, '/');
    }

    return normalized;
}

/**
 * Parses raw shortcut JSON and returns normalized Shortcut array with import summary.
 *
 * @param raw Raw JSON data
 * @param productId Product identifier for the shortcuts
 * @param authorityUrl Base URL for description sources
 * @returns Object containing array of normalized shortcuts and import summary
 */
export function parseRawShortcutJson(
    raw: RawShortcutJson,
    productId: string,
    authorityUrl?: string
): { shortcuts: Shortcut[]; summary: ImportSummary } {
    const shortcuts: Shortcut[] = [];
    const allActions: string[] = [];
    const sectionTitles: string[] = [];
    const skippedReasons: Array<{ action: string; reason: string }> = [];

    // Collect all actions for ID generation with section context
    for (const section of raw.sections) {
        for (const shortcut of section.shortcuts) {
            allActions.push(shortcut.action);
            sectionTitles.push(section.title);
        }
    }

    // Generate unique IDs with section-based disambiguation
    const { idMap, duplicateResolutions } = generateUniqueIds(productId, allActions, sectionTitles);

    // Process sections
    for (const section of raw.sections) {
        const type = inferTypeFromSection(section.title);
        const group = section.title;

        for (const rawShortcut of section.shortcuts) {
            const id = idMap.get(rawShortcut.action);
            if (!id) {
                skippedReasons.push({ action: rawShortcut.action, reason: 'ID generation failed' });
                continue;
            }

            // Check for missing keys
            if (!rawShortcut.mac && !rawShortcut.windows) {
                skippedReasons.push({ action: rawShortcut.action, reason: 'No key bindings provided' });
                continue;
            }

            // Normalize keys
            const macKeys = normalizeKeys(rawShortcut.mac, true);
            const winKeys = normalizeKeys(rawShortcut.windows, false);

            // Generate description from action
            const description = generateActionDescription(rawShortcut.action);

            shortcuts.push({
                id,
                productId,
                type,
                command: rawShortcut.action,
                description,
                descriptionSource: authorityUrl,
                keys: macKeys || winKeys, // Prefer Mac, fall back to Windows
                keysWin: winKeys !== macKeys ? winKeys : undefined, // Only set if different
                group,
                context: section.title
            });
        }
    }

    const summary: ImportSummary = {
        totalCount: allActions.length,
        importedCount: shortcuts.length,
        skippedCount: skippedReasons.length,
        skippedReasons,
        duplicateResolutions
    };

    return { shortcuts, summary };
}

/**
 * Generates a user-friendly description from an action string.
 */
export function generateActionDescription(action: string): string {
    // Clean up the action text
    const cleanAction = action
        .replace(/\s*\([^)]*\)\s*$/, '') // Remove trailing parenthetical notes
        .trim();

    const actionLower = cleanAction.toLowerCase();

    // Handle common patterns
    if (actionLower.startsWith('toggle ')) {
        return `Toggles ${cleanAction.slice(7)} on or off.`;
    }
    if (actionLower.startsWith('show/hide ')) {
        return `Shows or hides ${cleanAction.slice(10)}.`;
    }
    if (actionLower.startsWith('open ')) {
        return `Opens ${cleanAction.slice(5)}.`;
    }
    if (actionLower.startsWith('close ')) {
        return `Closes ${cleanAction.slice(6)}.`;
    }
    if (actionLower.startsWith('select ')) {
        return `Selects ${cleanAction.slice(7)}.`;
    }
    if (actionLower.startsWith('delete ')) {
        return `Deletes ${cleanAction.slice(7)}.`;
    }
    if (actionLower.startsWith('copy ')) {
        return `Copies ${cleanAction.slice(5)}.`;
    }
    if (actionLower.startsWith('paste ')) {
        return `Pastes ${cleanAction.slice(6)}.`;
    }
    if (actionLower.startsWith('cut ')) {
        return `Cuts ${cleanAction.slice(4)}.`;
    }
    if (actionLower.startsWith('move ')) {
        return `Moves ${cleanAction.slice(5)}.`;
    }
    if (actionLower.includes('/')) {
        // Handle compound actions like "Undo / Redo"
        return `${cleanAction}.`;
    }

    // Default: capitalize first letter and add period
    return `${cleanAction.charAt(0).toUpperCase()}${cleanAction.slice(1)}.`;
}

/**
 * Removes duplicate shortcuts based on ID, keeping the first occurrence.
 * Returns count of removed duplicates.
 */
export function dedupeShortcuts(shortcuts: Shortcut[]): { deduped: Shortcut[]; removedCount: number } {
    const seen = new Set<string>();
    const deduped: Shortcut[] = [];
    let removedCount = 0;

    for (const shortcut of shortcuts) {
        if (!seen.has(shortcut.id)) {
            seen.add(shortcut.id);
            deduped.push(shortcut);
        } else {
            removedCount++;
        }
    }

    return { deduped, removedCount };
}

/**
 * Prints import summary to console.
 */
export function printImportSummary(productId: string, summary: ImportSummary, removedDuplicates: number = 0): void {
    console.log(`\n=== ${productId} Import Summary ===`);
    console.log(`Total entries in raw JSON: ${summary.totalCount}`);
    console.log(`Successfully imported: ${summary.importedCount}`);
    console.log(`Skipped: ${summary.skippedCount}`);
    console.log(`Duplicates removed: ${removedDuplicates}`);

    if (summary.skippedReasons.length > 0) {
        console.log(`\nSkipped entries:`);
        for (const { action, reason } of summary.skippedReasons) {
            console.log(`  - "${action}": ${reason}`);
        }
    }

    if (summary.duplicateResolutions.length > 0) {
        console.log(`\nDuplicate ID resolutions:`);
        for (const { originalSlug, resolvedId } of summary.duplicateResolutions) {
            console.log(`  - ${originalSlug} -> ${resolvedId}`);
        }
    }
}

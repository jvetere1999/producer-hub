/**
 * Grouping utilities for shortcuts.
 *
 * Provides normalization of group titles that strip leading numbering
 * from section headers in source documentation.
 */

/**
 * Pattern to match leading numbering in group titles.
 * Matches patterns like:
 * - "1. ", "01. ", "123. " (number + dot + space)
 * - "1) ", "01) ", "123) " (number + parenthesis + space)
 * - "1 - ", "01 - " (number + space + dash + space)
 * - "1: ", "01: " (number + colon + space)
 * - "1 " (number + space, minimal case)
 */
const LEADING_NUMBER_PATTERN = /^\d+(?:\.|\)|\s-\s|:|\s)\s*/;

/**
 * Normalizes a group title by stripping leading numbering.
 *
 * Examples:
 * - "3. MIDI Editing" => "MIDI Editing"
 * - "12) Arrangement View" => "Arrangement View"
 * - "1 - Transport Controls" => "Transport Controls"
 * - "01: Browser" => "Browser"
 * - "  5. Mixer  " => "Mixer" (also trims whitespace)
 * - "General" => "General" (no change if no leading number)
 *
 * @param input - The raw group title, possibly with leading numbering
 * @returns The normalized group title with leading numbering removed
 */
export function normalizeGroupTitle(input: string): string {
    const trimmed = input.trim();
    if (!trimmed) return trimmed;

    // Remove leading number pattern if present
    const normalized = trimmed.replace(LEADING_NUMBER_PATTERN, '');

    // Return the result, trimmed again in case the pattern left trailing space
    return normalized.trim();
}

/**
 * Default group name used when no group is specified.
 */
export const DEFAULT_GROUP = 'General';

/**
 * Resolves the group for a shortcut, applying normalization and defaults.
 *
 * @param rawGroup - The raw group value from the shortcut data
 * @returns The resolved, normalized group name
 */
export function resolveGroup(rawGroup: string | undefined): string {
    if (!rawGroup || !rawGroup.trim()) {
        return DEFAULT_GROUP;
    }
    return normalizeGroupTitle(rawGroup);
}


/**
 * Key parsing module for Producer Hub.
 *
 * Parses keyboard shortcut strings into structured tokens for rendering
 * as individual keycaps in the UI.
 *
 * @module keys/parse
 */

/**
 * Represents a single key token.
 */
export interface KeyToken {
    /** The display text for this key */
    label: string;
    /** Type of token for styling purposes */
    type: 'modifier' | 'key' | 'special' | 'hold' | 'separator';
}

/**
 * Represents a complete key combination (one way to activate the shortcut).
 */
export interface KeyCombo {
    /** Whether this combo starts with "Hold" */
    isHold: boolean;
    /** The individual key tokens in this combo */
    tokens: KeyToken[];
}

/**
 * Represents parsed key alternatives (some shortcuts have OR variants).
 */
export interface ParsedKeys {
    /** Array of alternative key combos (e.g., "Shift+Tab OR F12" = 2 combos) */
    combos: KeyCombo[];
}

// Modifier key mappings
const MODIFIER_SYMBOLS: Record<string, string> = {
    '⌘': 'Cmd',
    '⇧': 'Shift',
    '⌥': 'Option',
    '⌃': 'Ctrl',
    'Cmd': 'Cmd',
    'Command': 'Cmd',
    'Ctrl': 'Ctrl',
    'Control': 'Ctrl',
    'Shift': 'Shift',
    'Alt': 'Alt',
    'Option': 'Option',
    'Opt': 'Option',
};

// Special keys that should be displayed distinctly
const SPECIAL_KEYS = new Set([
    'Space', 'Enter', 'Return', 'Tab', 'Esc', 'Escape',
    'Delete', 'Backspace', 'Home', 'End',
    'Up', 'Down', 'Left', 'Right',
    '↑', '↓', '←', '→',
    'Page Up', 'Page Down', 'PageUp', 'PageDown',
    'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
    'NumPad0', 'NumPad1', 'NumPad2', 'NumPad3', 'NumPad4',
    'NumPad5', 'NumPad6', 'NumPad7', 'NumPad8', 'NumPad9',
]);

/**
 * Checks if a token represents a modifier key.
 */
function isModifier(token: string): boolean {
    const normalized = token.trim();
    return normalized in MODIFIER_SYMBOLS ||
        ['Cmd', 'Ctrl', 'Shift', 'Alt', 'Option', '⌘', '⇧', '⌥', '⌃'].includes(normalized);
}

/**
 * Checks if a token represents a special key.
 */
function isSpecialKey(token: string): boolean {
    return SPECIAL_KEYS.has(token) || /^F\d+$/.test(token);
}

/**
 * Normalizes a single key token for display.
 */
function normalizeToken(token: string): string {
    const trimmed = token.trim();

    // Map symbols to readable names
    if (trimmed in MODIFIER_SYMBOLS) {
        return MODIFIER_SYMBOLS[trimmed];
    }

    // Handle arrow keys
    const arrows: Record<string, string> = {
        '↑': 'Up', '↓': 'Down', '←': 'Left', '→': 'Right',
        'Up Arrow': 'Up', 'Down Arrow': 'Down',
        'Left Arrow': 'Left', 'Right Arrow': 'Right',
    };
    if (trimmed in arrows) {
        return arrows[trimmed];
    }

    return trimmed;
}

/**
 * Parses a single key combination string into tokens.
 *
 * @param combo - A single key combo like "⌘⇧Z" or "Ctrl+Shift+W"
 * @returns Array of KeyTokens
 */
function parseComboTokens(combo: string): KeyToken[] {
    const tokens: KeyToken[] = [];
    let remaining = combo.trim();

    // Check for "Hold" prefix
    const holdMatch = remaining.match(/^Hold\s+/i);
    if (holdMatch) {
        tokens.push({ label: 'Hold', type: 'hold' });
        remaining = remaining.slice(holdMatch[0].length);
    }

    // Split by + or spaces, handling special cases
    // First, try splitting by +
    let parts: string[];
    if (remaining.includes('+')) {
        parts = remaining.split('+').map(p => p.trim()).filter(Boolean);
    } else {
        // Handle symbol-style shortcuts like "⌘⇧Z"
        parts = [];
        let current = '';
        for (const char of remaining) {
            if (char in MODIFIER_SYMBOLS) {
                if (current) parts.push(current);
                parts.push(char);
                current = '';
            } else if (char === ' ') {
                if (current) parts.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        if (current) parts.push(current);
    }

    // Convert parts to tokens
    for (const part of parts) {
        const normalized = normalizeToken(part);
        if (!normalized) continue;

        let type: KeyToken['type'] = 'key';
        if (isModifier(part)) {
            type = 'modifier';
        } else if (isSpecialKey(normalized)) {
            type = 'special';
        }

        tokens.push({ label: normalized, type });
    }

    return tokens;
}

/**
 * Parses a key string that may contain OR alternatives.
 *
 * @param keys - The full keys string, e.g., "Shift+Tab OR F12" or "⌘⇧Z"
 * @returns ParsedKeys with all alternative combos
 *
 * @example
 * parseKeys("⌘⇧Z")
 * // => { combos: [{ isHold: false, tokens: [{label:'Cmd',type:'modifier'}, {label:'Shift',type:'modifier'}, {label:'Z',type:'key'}] }] }
 *
 * @example
 * parseKeys("Shift+Tab OR F12")
 * // => { combos: [{ isHold: false, tokens: [...] }, { isHold: false, tokens: [...] }] }
 */
export function parseKeys(keys: string): ParsedKeys {
    if (!keys || !keys.trim()) {
        return { combos: [] };
    }

    // Split by OR (case-insensitive, with surrounding spaces)
    const alternatives = keys.split(/\s+OR\s+/i);

    const combos: KeyCombo[] = [];
    for (const alt of alternatives) {
        const trimmed = alt.trim();
        if (!trimmed) continue;

        const isHold = /^Hold\s+/i.test(trimmed);
        const tokens = parseComboTokens(trimmed);

        if (tokens.length > 0) {
            combos.push({ isHold, tokens });
        }
    }

    return { combos };
}

/**
 * Converts parsed keys back to a readable string (for accessibility).
 */
export function keysToAriaLabel(parsed: ParsedKeys): string {
    return parsed.combos
        .map(combo => {
            const prefix = combo.isHold ? 'Hold ' : '';
            const keys = combo.tokens
                .filter(t => t.type !== 'hold')
                .map(t => t.label)
                .join(' plus ');
            return prefix + keys;
        })
        .join(' or ');
}


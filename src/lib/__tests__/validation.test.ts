import { describe, it, expect } from 'vitest';
import type { Shortcut } from '$lib';

/**
 * Test that validation rejects invalid data.
 * These tests verify the validation logic by testing standalone copies
 * of the validation rules (not importing the actual assertValidData
 * which runs at module load).
 */

describe('Shortcut validation rules', () => {
    // Replica of validation logic for testing
    function validateShortcut(s: Partial<Shortcut>): { valid: boolean; error?: string } {
        if (!s.id || !s.productId || !s.type || !s.command || !s.keys) {
            return { valid: false, error: 'Missing required fields' };
        }
        if (!s.id.startsWith(`${s.productId}:`)) {
            return { valid: false, error: 'ID must be namespaced by productId' };
        }
        if (s.facets) {
            for (const facet of s.facets) {
                if (!facet || !facet.trim()) {
                    return { valid: false, error: 'Empty facet value' };
                }
            }
        }
        return { valid: true };
    }

    it('accepts valid shortcut with all fields', () => {
        const shortcut: Shortcut = {
            id: 'product:test',
            productId: 'product',
            type: 'edit',
            command: 'Test',
            keys: '⌘T',
            group: 'General',
            facets: ['Editing']
        };
        expect(validateShortcut(shortcut).valid).toBe(true);
    });

    it('accepts valid shortcut without optional fields', () => {
        const shortcut: Shortcut = {
            id: 'product:test',
            productId: 'product',
            type: 'edit',
            command: 'Test',
            keys: '⌘T'
        };
        expect(validateShortcut(shortcut).valid).toBe(true);
    });

    it('rejects shortcut missing required fields', () => {
        const shortcut = {
            id: 'product:test',
            productId: 'product',
            // missing type, command, keys
        };
        const result = validateShortcut(shortcut);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('required');
    });

    it('rejects shortcut with wrong id namespace', () => {
        const shortcut: Shortcut = {
            id: 'wrong:test',
            productId: 'product',
            type: 'edit',
            command: 'Test',
            keys: '⌘T'
        };
        const result = validateShortcut(shortcut);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('namespaced');
    });

    it('rejects shortcut with empty facet', () => {
        const shortcut: Shortcut = {
            id: 'product:test',
            productId: 'product',
            type: 'edit',
            command: 'Test',
            keys: '⌘T',
            facets: ['Valid', '']
        };
        const result = validateShortcut(shortcut);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('facet');
    });

    it('rejects shortcut with whitespace-only facet', () => {
        const shortcut: Shortcut = {
            id: 'product:test',
            productId: 'product',
            type: 'edit',
            command: 'Test',
            keys: '⌘T',
            facets: ['Valid', '   ']
        };
        const result = validateShortcut(shortcut);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('facet');
    });

    it('accepts shortcut with valid facets', () => {
        const shortcut: Shortcut = {
            id: 'product:test',
            productId: 'product',
            type: 'edit',
            command: 'Test',
            keys: '⌘T',
            facets: ['Editing', 'MIDI Control', 'Navigation']
        };
        expect(validateShortcut(shortcut).valid).toBe(true);
    });
});


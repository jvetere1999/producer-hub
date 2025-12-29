import { describe, it, expect } from 'vitest';
import { parseKeys, keysToAriaLabel } from '../keys/parse';

describe('parseKeys', () => {
    describe('single key combos', () => {
        it('parses simple letter key', () => {
            const result = parseKeys('A');
            expect(result.combos).toHaveLength(1);
            expect(result.combos[0].tokens).toHaveLength(1);
            expect(result.combos[0].tokens[0].label).toBe('A');
            expect(result.combos[0].tokens[0].type).toBe('key');
        });

        it('parses Mac-style modifier + key', () => {
            const result = parseKeys('⌘C');
            expect(result.combos).toHaveLength(1);
            expect(result.combos[0].tokens).toHaveLength(2);
            expect(result.combos[0].tokens[0].label).toBe('Cmd');
            expect(result.combos[0].tokens[0].type).toBe('modifier');
            expect(result.combos[0].tokens[1].label).toBe('C');
        });

        it('parses ⌘⇧Z (Cmd+Shift+Z)', () => {
            const result = parseKeys('⌘⇧Z');
            expect(result.combos).toHaveLength(1);
            expect(result.combos[0].tokens).toHaveLength(3);
            expect(result.combos[0].tokens[0].label).toBe('Cmd');
            expect(result.combos[0].tokens[1].label).toBe('Shift');
            expect(result.combos[0].tokens[2].label).toBe('Z');
        });

        it('parses Ctrl+Shift+W (plus-separated)', () => {
            const result = parseKeys('Ctrl+Shift+W');
            expect(result.combos).toHaveLength(1);
            expect(result.combos[0].tokens).toHaveLength(3);
            expect(result.combos[0].tokens[0].label).toBe('Ctrl');
            expect(result.combos[0].tokens[1].label).toBe('Shift');
            expect(result.combos[0].tokens[2].label).toBe('W');
        });
    });

    describe('special keys', () => {
        it('parses Space', () => {
            const result = parseKeys('Space');
            expect(result.combos[0].tokens[0].label).toBe('Space');
            expect(result.combos[0].tokens[0].type).toBe('special');
        });

        it('parses F-keys', () => {
            const result = parseKeys('F12');
            expect(result.combos[0].tokens[0].label).toBe('F12');
            expect(result.combos[0].tokens[0].type).toBe('special');
        });

        it('parses arrow keys', () => {
            const result = parseKeys('↑');
            expect(result.combos[0].tokens[0].label).toBe('Up');
            expect(result.combos[0].tokens[0].type).toBe('special');
        });

        it('parses Enter', () => {
            const result = parseKeys('Enter');
            expect(result.combos[0].tokens[0].label).toBe('Enter');
            expect(result.combos[0].tokens[0].type).toBe('special');
        });
    });

    describe('OR alternatives', () => {
        it('parses Shift+Tab OR F12', () => {
            const result = parseKeys('Shift+Tab OR F12');
            expect(result.combos).toHaveLength(2);

            // First combo: Shift+Tab
            expect(result.combos[0].tokens).toHaveLength(2);
            expect(result.combos[0].tokens[0].label).toBe('Shift');
            expect(result.combos[0].tokens[1].label).toBe('Tab');

            // Second combo: F12
            expect(result.combos[1].tokens).toHaveLength(1);
            expect(result.combos[1].tokens[0].label).toBe('F12');
        });

        it('parses Left OR Right', () => {
            const result = parseKeys('Left OR Right');
            expect(result.combos).toHaveLength(2);
            expect(result.combos[0].tokens[0].label).toBe('Left');
            expect(result.combos[1].tokens[0].label).toBe('Right');
        });
    });

    describe('Hold patterns', () => {
        it('parses Hold Alt', () => {
            const result = parseKeys('Hold Alt');
            expect(result.combos[0].isHold).toBe(true);
            expect(result.combos[0].tokens[0].label).toBe('Hold');
            expect(result.combos[0].tokens[0].type).toBe('hold');
            expect(result.combos[0].tokens[1].label).toBe('Alt');
        });

        it('parses Hold Option', () => {
            const result = parseKeys('Hold Option');
            expect(result.combos[0].isHold).toBe(true);
            expect(result.combos[0].tokens).toContainEqual(
                expect.objectContaining({ label: 'Option' })
            );
        });
    });

    describe('edge cases', () => {
        it('returns empty combos for empty string', () => {
            const result = parseKeys('');
            expect(result.combos).toHaveLength(0);
        });

        it('returns empty combos for whitespace', () => {
            const result = parseKeys('   ');
            expect(result.combos).toHaveLength(0);
        });

        it('handles mixed case OR', () => {
            const result = parseKeys('A or B');
            expect(result.combos).toHaveLength(2);
        });
    });
});

describe('keysToAriaLabel', () => {
    it('generates aria label for simple combo', () => {
        const parsed = parseKeys('⌘C');
        expect(keysToAriaLabel(parsed)).toBe('Cmd plus C');
    });

    it('generates aria label for OR alternatives', () => {
        const parsed = parseKeys('Shift+Tab OR F12');
        expect(keysToAriaLabel(parsed)).toBe('Shift plus Tab or F12');
    });

    it('generates aria label for Hold pattern', () => {
        const parsed = parseKeys('Hold Alt');
        expect(keysToAriaLabel(parsed)).toContain('Hold');
    });
});


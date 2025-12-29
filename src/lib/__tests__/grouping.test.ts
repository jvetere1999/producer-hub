import { describe, it, expect } from 'vitest';
import { normalizeGroupTitle, resolveGroup, DEFAULT_GROUP } from '$lib/grouping';

describe('normalizeGroupTitle', () => {
    it('strips leading number with dot and space', () => {
        expect(normalizeGroupTitle('3. MIDI Editing')).toBe('MIDI Editing');
        expect(normalizeGroupTitle('12. Arrangement View')).toBe('Arrangement View');
        expect(normalizeGroupTitle('01. Browser')).toBe('Browser');
        expect(normalizeGroupTitle('123. Long Number')).toBe('Long Number');
    });

    it('strips leading number with parenthesis and space', () => {
        expect(normalizeGroupTitle('3) MIDI Editing')).toBe('MIDI Editing');
        expect(normalizeGroupTitle('12) Arrangement View')).toBe('Arrangement View');
    });

    it('strips leading number with dash and space', () => {
        expect(normalizeGroupTitle('3 - MIDI Editing')).toBe('MIDI Editing');
        expect(normalizeGroupTitle('12 - Arrangement View')).toBe('Arrangement View');
    });

    it('strips leading number with colon and space', () => {
        expect(normalizeGroupTitle('3: MIDI Editing')).toBe('MIDI Editing');
        expect(normalizeGroupTitle('12: Arrangement View')).toBe('Arrangement View');
    });

    it('strips leading number with space only', () => {
        expect(normalizeGroupTitle('3 MIDI Editing')).toBe('MIDI Editing');
        expect(normalizeGroupTitle('12 Arrangement View')).toBe('Arrangement View');
    });

    it('trims whitespace', () => {
        expect(normalizeGroupTitle('  5. Mixer  ')).toBe('Mixer');
        expect(normalizeGroupTitle('   General   ')).toBe('General');
    });

    it('preserves text without leading numbers', () => {
        expect(normalizeGroupTitle('General')).toBe('General');
        expect(normalizeGroupTitle('MIDI Editing')).toBe('MIDI Editing');
        expect(normalizeGroupTitle('Transport Controls')).toBe('Transport Controls');
    });

    it('preserves numbers that are not leading', () => {
        expect(normalizeGroupTitle('Live 12 Editing')).toBe('Live 12 Editing');
        expect(normalizeGroupTitle('3. Section 42')).toBe('Section 42');
    });

    it('handles empty input', () => {
        expect(normalizeGroupTitle('')).toBe('');
        expect(normalizeGroupTitle('   ')).toBe('');
    });
});

describe('resolveGroup', () => {
    it('returns DEFAULT_GROUP for undefined', () => {
        expect(resolveGroup(undefined)).toBe(DEFAULT_GROUP);
    });

    it('returns DEFAULT_GROUP for empty string', () => {
        expect(resolveGroup('')).toBe(DEFAULT_GROUP);
        expect(resolveGroup('   ')).toBe(DEFAULT_GROUP);
    });

    it('normalizes and returns valid group', () => {
        expect(resolveGroup('3. MIDI Editing')).toBe('MIDI Editing');
        expect(resolveGroup('Transport')).toBe('Transport');
    });
});

describe('DEFAULT_GROUP', () => {
    it('is "General"', () => {
        expect(DEFAULT_GROUP).toBe('General');
    });
});


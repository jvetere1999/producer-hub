import { describe, it, expect } from 'vitest';
import { serum2PowerFeatures } from '../data/serum2PowerFeatures';
import type { FeatureEntry } from '../entries';

describe('serum2PowerFeatures data module', () => {
    it('exports an array of FeatureEntry', () => {
        expect(Array.isArray(serum2PowerFeatures)).toBe(true);
        expect(serum2PowerFeatures.length).toBeGreaterThan(0);
    });

    it('all entries have kind = "feature"', () => {
        for (const f of serum2PowerFeatures) {
            expect(f.kind).toBe('feature');
        }
    });

    it('all entries have required fields', () => {
        for (const f of serum2PowerFeatures) {
            expect(f.id).toBeTruthy();
            expect(f.productId).toBe('serum2');
            expect(f.type).toBeTruthy();
            expect(f.command).toBeTruthy();
            expect(f.keys).toBeTruthy();
            expect(f.group).toBeTruthy();
            expect(Array.isArray(f.facets)).toBe(true);
        }
    });

    it('all ids are namespaced by productId', () => {
        for (const f of serum2PowerFeatures) {
            expect(f.id.startsWith('serum2:')).toBe(true);
        }
    });

    it('all ids are unique', () => {
        const ids = serum2PowerFeatures.map(f => f.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
    });

    it('contains expected sample entries', () => {
        const wrapPhase = serum2PowerFeatures.find(f =>
            f.command.includes('Wrap Phase')
        );
        expect(wrapPhase).toBeDefined();
        expect(wrapPhase?.group).toBeTruthy();
        expect(wrapPhase?.facets.length).toBeGreaterThan(0);
    });

    it('note field is present on most entries', () => {
        const withNote = serum2PowerFeatures.filter(f => f.note);
        // Most features should have notes
        expect(withNote.length).toBeGreaterThan(serum2PowerFeatures.length * 0.5);
    });

    it('default field is present on some entries', () => {
        const withDefault = serum2PowerFeatures.filter(f => f.default);
        expect(withDefault.length).toBeGreaterThan(0);
    });
});

describe('Feature validation', () => {
    function validateFeature(f: FeatureEntry): string[] {
        const errors: string[] = [];

        if (!f.id) errors.push('missing id');
        if (!f.productId) errors.push('missing productId');
        if (!f.id.startsWith(`${f.productId}:`)) errors.push('id not namespaced');
        if (!f.type) errors.push('missing type');
        if (!f.command) errors.push('missing command');
        if (!f.keys) errors.push('missing keys');
        if (!f.group || !f.group.trim()) errors.push('missing or empty group');
        if (!Array.isArray(f.facets)) errors.push('facets not an array');
        if (f.kind !== 'feature') errors.push('kind not feature');

        return errors;
    }

    it('all features pass validation', () => {
        for (const f of serum2PowerFeatures) {
            const errors = validateFeature(f);
            expect(errors, `Feature ${f.id} has errors: ${errors.join(', ')}`).toEqual([]);
        }
    });
});


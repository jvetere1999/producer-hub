import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Theme Extractor Fixtures', () => {
    const fixturesDir = path.join(process.cwd(), 'tests/fixtures/themes');

    it('parsable.ask fixture exists', () => {
        const parsablePath = path.join(fixturesDir, 'parsable.ask');
        expect(fs.existsSync(parsablePath)).toBe(true);
    });

    it('unparsable.ask fixture exists', () => {
        const unparsablePath = path.join(fixturesDir, 'unparsable.ask');
        expect(fs.existsSync(unparsablePath)).toBe(true);
    });

    it('parsable.ask contains XML-like color definitions', () => {
        const parsablePath = path.join(fixturesDir, 'parsable.ask');
        const content = fs.readFileSync(parsablePath, 'utf-8');

        // Should contain color definitions with R, G, B attributes
        expect(content).toContain('R="');
        expect(content).toContain('G="');
        expect(content).toContain('B="');
    });

    it('unparsable.ask is not valid XML', () => {
        const unparsablePath = path.join(fixturesDir, 'unparsable.ask');
        const content = fs.readFileSync(unparsablePath, 'utf-8');

        // Should not contain valid color definitions
        expect(content).not.toContain('R="');
        expect(content).not.toContain('G="');
    });
});

describe('Theme Manifest', () => {
    it('ableton-live-12.manifest.json exists', async () => {
        const manifest = await import('$lib/themes/ableton-live-12.manifest.json');
        expect(manifest).toBeDefined();
    });

    it('manifest has correct structure', async () => {
        const manifest = await import('$lib/themes/ableton-live-12.manifest.json');

        expect(manifest.version).toBe(1);
        expect(manifest.themes).toBeDefined();
        expect(Array.isArray(manifest.themes)).toBe(true);
        expect(manifest.themes.length).toBeGreaterThan(0);
    });

    it('each theme has required fields', async () => {
        const manifest = await import('$lib/themes/ableton-live-12.manifest.json');

        for (const theme of manifest.themes) {
            expect(theme.id).toBeDefined();
            expect(theme.name).toBeDefined();
            expect(theme.mode).toMatch(/^(light|dark)$/);
            expect(theme.vars).toBeDefined();
            expect(theme.meta).toBeDefined();
            expect(theme.meta.sourceType).toBeDefined();
        }
    });

    it('theme IDs are unique and stable', async () => {
        const manifest = await import('$lib/themes/ableton-live-12.manifest.json');

        const ids = manifest.themes.map((t: any) => t.id);
        const uniqueIds = [...new Set(ids)];

        expect(ids.length).toBe(uniqueIds.length);
    });

    it('theme vars contain required CSS properties', async () => {
        const manifest = await import('$lib/themes/ableton-live-12.manifest.json');

        const requiredVars = [
            '--bg-primary',
            '--text-primary',
            '--accent-primary'
        ];

        for (const theme of manifest.themes) {
            for (const varName of requiredVars) {
                expect(theme.vars[varName]).toBeDefined();
                expect(theme.vars[varName]).toMatch(/^#[0-9a-fA-F]{6,8}$/);
            }
        }
    });
});


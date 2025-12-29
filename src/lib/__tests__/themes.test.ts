import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    getThemes,
    getThemeById,
    getThemesByMode,
    resolveTheme,
    loadThemePreferences,
    saveThemePreferences,
    applyTheme
} from '../themes';
import type { ThemeDefinition } from '../themes/types';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: vi.fn((key: string) => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; })
    };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock matchMedia
Object.defineProperty(global, 'matchMedia', {
    value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
    }))
});

describe('Theme System', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    describe('getThemes', () => {
        it('returns all themes from manifest', () => {
            const themes = getThemes();
            expect(themes).toBeDefined();
            expect(Array.isArray(themes)).toBe(true);
            expect(themes.length).toBeGreaterThan(0);
        });

        it('each theme has required fields', () => {
            const themes = getThemes();
            for (const theme of themes) {
                expect(theme.id).toBeDefined();
                expect(theme.name).toBeDefined();
                expect(theme.mode).toMatch(/^(light|dark)$/);
                expect(theme.vars).toBeDefined();
                expect(theme.meta).toBeDefined();
            }
        });

        it('generates stable theme IDs', () => {
            const themes1 = getThemes();
            const themes2 = getThemes();

            expect(themes1.map(t => t.id)).toEqual(themes2.map(t => t.id));
        });
    });

    describe('getThemeById', () => {
        it('returns theme by ID', () => {
            const themes = getThemes();
            const firstTheme = themes[0];

            const found = getThemeById(firstTheme.id);
            expect(found).toEqual(firstTheme);
        });

        it('returns undefined for unknown ID', () => {
            const found = getThemeById('nonexistent-theme');
            expect(found).toBeUndefined();
        });
    });

    describe('getThemesByMode', () => {
        it('returns only dark themes', () => {
            const darkThemes = getThemesByMode('dark');
            expect(darkThemes.length).toBeGreaterThan(0);
            for (const theme of darkThemes) {
                expect(theme.mode).toBe('dark');
            }
        });

        it('returns only light themes', () => {
            const lightThemes = getThemesByMode('light');
            expect(lightThemes.length).toBeGreaterThan(0);
            for (const theme of lightThemes) {
                expect(theme.mode).toBe('light');
            }
        });
    });

    describe('Theme Preferences', () => {
        it('returns defaults when no saved preferences', () => {
            const prefs = loadThemePreferences();
            expect(prefs.themeId).toBe('system');
            expect(prefs.waveformMode).toBe('ableton');
        });

        it('saves and loads preferences', () => {
            const prefs = { themeId: 'ableton-live-dark', waveformMode: 'high-contrast' as const };
            saveThemePreferences(prefs);

            const loaded = loadThemePreferences();
            expect(loaded.themeId).toBe('ableton-live-dark');
            expect(loaded.waveformMode).toBe('high-contrast');
        });
    });

    describe('resolveTheme', () => {
        it('returns specific theme by ID', () => {
            const themes = getThemes();
            const darkTheme = themes.find(t => t.mode === 'dark')!;

            const resolved = resolveTheme(darkTheme.id);
            expect(resolved.id).toBe(darkTheme.id);
        });

        it('resolves "system" to dark theme when prefers-color-scheme is dark', () => {
            const resolved = resolveTheme('system');
            expect(resolved.mode).toBe('dark');
        });

        it('falls back to first theme for unknown ID', () => {
            const themes = getThemes();
            const resolved = resolveTheme('nonexistent');
            expect(resolved.id).toBe(themes[0].id);
        });
    });

    describe('applyTheme', () => {
        it('sets CSS variables on document element', () => {
            // Create a mock document
            const mockElement = {
                dataset: {} as Record<string, string>,
                style: {
                    setProperty: vi.fn()
                }
            };

            Object.defineProperty(global, 'document', {
                value: { documentElement: mockElement },
                writable: true
            });

            const theme: ThemeDefinition = {
                id: 'test-theme',
                name: 'Test Theme',
                mode: 'dark',
                vars: {
                    '--bg-primary': '#1a1a1a',
                    '--text-primary': '#ffffff'
                } as any,
                meta: { sourceType: 'custom' }
            };

            applyTheme(theme);

            expect(mockElement.dataset.theme).toBe('dark');
            expect(mockElement.dataset.themeId).toBe('test-theme');
            expect(mockElement.style.setProperty).toHaveBeenCalledWith('--bg-primary', '#1a1a1a');
            expect(mockElement.style.setProperty).toHaveBeenCalledWith('--text-primary', '#ffffff');
        });
    });
});


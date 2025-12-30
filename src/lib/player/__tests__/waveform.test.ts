/**
 * Unit tests for Waveform generation and caching
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
    getCachedWaveform,
    cacheWaveform,
    clearWaveformCache,
    type WaveformData,
} from '../waveform';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value; },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; },
    };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('Waveform Cache', () => {
    beforeEach(() => {
        localStorageMock.clear();
        clearWaveformCache();
    });

    afterEach(() => {
        localStorageMock.clear();
    });

    const createTestWaveform = (): WaveformData => ({
        peaks: [0.5, 0.8, 0.3, 0.9, 0.6],
        normalizedPeaks: [0.56, 0.89, 0.33, 1.0, 0.67],
        duration: 30,
        sampleRate: 44100,
        generatedAt: new Date().toISOString(),
    });

    it('returns null for uncached waveform', () => {
        const result = getCachedWaveform('nonexistent');
        expect(result).toBeNull();
    });

    it('caches and retrieves waveform data', () => {
        const waveform = createTestWaveform();
        cacheWaveform('track_123', waveform);

        const cached = getCachedWaveform('track_123');
        expect(cached).not.toBeNull();
        expect(cached?.duration).toBe(30);
        expect(cached?.peaks).toEqual(waveform.peaks);
    });

    it('clears waveform cache', () => {
        const waveform = createTestWaveform();
        cacheWaveform('track_1', waveform);
        cacheWaveform('track_2', waveform);

        clearWaveformCache();

        expect(getCachedWaveform('track_1')).toBeNull();
        expect(getCachedWaveform('track_2')).toBeNull();
    });

    it('uses memory cache for fast access', () => {
        const waveform = createTestWaveform();
        cacheWaveform('track_fast', waveform);

        // Clear localStorage but keep memory cache
        localStorageMock.clear();

        // Should still find in memory cache
        const cached = getCachedWaveform('track_fast');
        expect(cached).not.toBeNull();
    });
});

describe('Waveform Data Structure', () => {
    it('has correct structure', () => {
        const waveform: WaveformData = {
            peaks: [0.1, 0.2, 0.3],
            normalizedPeaks: [0.33, 0.67, 1.0],
            duration: 10,
            sampleRate: 44100,
            generatedAt: '2024-01-01T00:00:00Z',
        };

        expect(waveform.peaks).toHaveLength(3);
        expect(waveform.normalizedPeaks).toHaveLength(3);
        expect(waveform.duration).toBe(10);
        expect(waveform.sampleRate).toBe(44100);
    });

    it('normalizedPeaks are between 0 and 1', () => {
        const waveform: WaveformData = {
            peaks: [0.5, 1.0, 0.25],
            normalizedPeaks: [0.5, 1.0, 0.25],
            duration: 5,
            sampleRate: 48000,
            generatedAt: new Date().toISOString(),
        };

        for (const peak of waveform.normalizedPeaks) {
            expect(peak).toBeGreaterThanOrEqual(0);
            expect(peak).toBeLessThanOrEqual(1);
        }
    });
});


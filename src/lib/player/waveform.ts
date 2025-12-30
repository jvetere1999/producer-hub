/**
 * Waveform Generator and Cache
 *
 * Generates waveform peak data from audio and caches by track ID/blob hash.
 * Uses Web Audio API for decoding and runs asynchronously to never block playback.
 */

// ============================================
// Types
// ============================================

export interface WaveformData {
    peaks: number[];          // Raw peak values (0-1)
    normalizedPeaks: number[]; // Normalized to max peak
    duration: number;
    sampleRate: number;
    generatedAt: string;
}

export interface WaveformCacheEntry {
    id: string;              // Track ID or blob hash
    data: WaveformData;
    createdAt: string;
}

// ============================================
// Cache
// ============================================

const CACHE_KEY = 'daw_waveform_cache_v1';
const MAX_CACHE_ENTRIES = 50;
const DEFAULT_SAMPLES = 150; // Number of bars in waveform

// In-memory cache for fast access
const memoryCache = new Map<string, WaveformData>();

/**
 * Load waveform cache from localStorage
 */
function loadCache(): Map<string, WaveformCacheEntry> {
    try {
        const data = localStorage.getItem(CACHE_KEY);
        if (!data) return new Map();
        const entries = JSON.parse(data) as WaveformCacheEntry[];
        return new Map(entries.map(e => [e.id, e]));
    } catch {
        return new Map();
    }
}

/**
 * Save waveform cache to localStorage
 */
function saveCache(cache: Map<string, WaveformCacheEntry>): void {
    try {
        // Keep only the most recent entries
        const entries = Array.from(cache.values())
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, MAX_CACHE_ENTRIES);
        localStorage.setItem(CACHE_KEY, JSON.stringify(entries));
    } catch {
        // Storage full - clear old entries
        try {
            const entries = Array.from(cache.values())
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, Math.floor(MAX_CACHE_ENTRIES / 2));
            localStorage.setItem(CACHE_KEY, JSON.stringify(entries));
        } catch {
            // Give up on caching
        }
    }
}

/**
 * Get cached waveform data
 */
export function getCachedWaveform(id: string): WaveformData | null {
    // Check memory cache first
    if (memoryCache.has(id)) {
        return memoryCache.get(id)!;
    }

    // Check localStorage
    const cache = loadCache();
    const entry = cache.get(id);
    if (entry) {
        // Populate memory cache
        memoryCache.set(id, entry.data);
        return entry.data;
    }

    return null;
}

/**
 * Store waveform data in cache
 */
export function cacheWaveform(id: string, data: WaveformData): void {
    // Update memory cache
    memoryCache.set(id, data);

    // Update localStorage
    const cache = loadCache();
    cache.set(id, {
        id,
        data,
        createdAt: new Date().toISOString(),
    });
    saveCache(cache);
}

/**
 * Clear all cached waveforms
 */
export function clearWaveformCache(): void {
    memoryCache.clear();
    localStorage.removeItem(CACHE_KEY);
}

// ============================================
// Waveform Generation
// ============================================

// Track ongoing generation to prevent duplicates
const pendingGenerations = new Map<string, Promise<WaveformData | null>>();

/**
 * Generate waveform data from audio URL (non-blocking)
 */
export async function generateWaveform(
    audioUrl: string,
    id: string,
    samples: number = DEFAULT_SAMPLES
): Promise<WaveformData | null> {
    // Check cache first
    const cached = getCachedWaveform(id);
    if (cached) {
        return cached;
    }

    // Check if already generating
    if (pendingGenerations.has(id)) {
        return pendingGenerations.get(id)!;
    }

    // Start generation (non-blocking)
    const promise = generateWaveformAsync(audioUrl, samples);
    pendingGenerations.set(id, promise);

    try {
        const data = await promise;
        if (data) {
            cacheWaveform(id, data);
        }
        return data;
    } finally {
        pendingGenerations.delete(id);
    }
}

/**
 * Generate waveform asynchronously
 */
async function generateWaveformAsync(
    audioUrl: string,
    samples: number
): Promise<WaveformData | null> {
    try {
        // Fetch audio data
        const response = await fetch(audioUrl);
        if (!response.ok) return null;

        const arrayBuffer = await response.arrayBuffer();

        // Decode audio
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

        let audioBuffer: AudioBuffer;
        try {
            audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        } finally {
            // Close context to free resources
            await audioContext.close();
        }

        // Extract peaks
        const peaks = extractPeaks(audioBuffer, samples);
        const normalizedPeaks = normalizePeaks(peaks);

        return {
            peaks,
            normalizedPeaks,
            duration: audioBuffer.duration,
            sampleRate: audioBuffer.sampleRate,
            generatedAt: new Date().toISOString(),
        };
    } catch (error) {
        console.warn('Failed to generate waveform:', error);
        return null;
    }
}

/**
 * Extract peak values from audio buffer
 */
function extractPeaks(buffer: AudioBuffer, samples: number): number[] {
    const channelData = buffer.getChannelData(0); // Use first channel
    const totalSamples = channelData.length;
    const samplesPerBar = Math.floor(totalSamples / samples);
    const peaks: number[] = [];

    for (let i = 0; i < samples; i++) {
        const start = i * samplesPerBar;
        const end = Math.min(start + samplesPerBar, totalSamples);

        let max = 0;
        for (let j = start; j < end; j++) {
            const abs = Math.abs(channelData[j]);
            if (abs > max) max = abs;
        }

        peaks.push(max);
    }

    return peaks;
}

/**
 * Normalize peaks to 0-1 range based on max value
 */
function normalizePeaks(peaks: number[]): number[] {
    const max = Math.max(...peaks, 0.001); // Avoid division by zero
    return peaks.map(p => p / max);
}

/**
 * Generate waveform from ArrayBuffer (for blob audio)
 */
export async function generateWaveformFromBuffer(
    buffer: ArrayBuffer,
    id: string,
    samples: number = DEFAULT_SAMPLES
): Promise<WaveformData | null> {
    // Check cache first
    const cached = getCachedWaveform(id);
    if (cached) {
        return cached;
    }

    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

        let audioBuffer: AudioBuffer;
        try {
            audioBuffer = await audioContext.decodeAudioData(buffer.slice(0)); // Clone buffer as decodeAudioData detaches it
        } finally {
            await audioContext.close();
        }

        const peaks = extractPeaks(audioBuffer, samples);
        const normalizedPeaks = normalizePeaks(peaks);

        const data: WaveformData = {
            peaks,
            normalizedPeaks,
            duration: audioBuffer.duration,
            sampleRate: audioBuffer.sampleRate,
            generatedAt: new Date().toISOString(),
        };

        cacheWaveform(id, data);
        return data;
    } catch (error) {
        console.warn('Failed to generate waveform from buffer:', error);
        return null;
    }
}

/**
 * Generate a blob hash for cache key
 */
export async function generateBlobHash(data: ArrayBuffer): Promise<string> {
    try {
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
    } catch {
        // Fallback for environments without crypto.subtle
        return `blob_${Date.now()}_${data.byteLength}`;
    }
}


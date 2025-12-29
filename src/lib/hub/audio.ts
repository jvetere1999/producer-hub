/**
 * Producer Hub Audio Utilities
 *
 * Provides waveform generation, audio analysis, and playback helpers.
 * All operations are non-blocking and cancellable.
 *
 * @module hub/audio
 */

import type { WaveformData, AudioAnalysis, AudioAnnotations, AudioAnnotationMarker, AudioAnnotationRegion, AudioAnnotationNote, FrequencySpectrum, FrequencyBand } from './types';
import { generateId, encodeBase64 } from './encoding';

// ============================================
// Waveform Generation
// ============================================

const DEFAULT_PEAK_COUNT = 1500;
const MAX_ANALYSIS_DURATION_SEC = 90;
const MAX_ANALYSIS_BYTES = 5 * 1024 * 1024; // 5MB

export interface WaveformProgress {
	stage: 'decoding' | 'computing' | 'done' | 'error';
	progress: number; // 0-1
	message?: string;
}

/**
 * Generates waveform peaks from an audio buffer.
 */
export function computePeaks(audioBuffer: AudioBuffer, peakCount = DEFAULT_PEAK_COUNT): number[] {
	const channelData = audioBuffer.getChannelData(0);
	const samplesPerPeak = Math.floor(channelData.length / peakCount);
	const peaks: number[] = new Array(peakCount);

	for (let i = 0; i < peakCount; i++) {
		const start = i * samplesPerPeak;
		const end = Math.min(start + samplesPerPeak, channelData.length);

		let max = 0;
		for (let j = start; j < end; j++) {
			const abs = Math.abs(channelData[j]);
			if (abs > max) max = abs;
		}
		peaks[i] = max;
	}

	return peaks;
}

/**
 * Generates waveform data from an ArrayBuffer.
 * Returns null if decoding fails (unsupported codec).
 */
export async function generateWaveform(
	arrayBuffer: ArrayBuffer,
	onProgress?: (progress: WaveformProgress) => void,
	abortSignal?: AbortSignal
): Promise<WaveformData | null> {
	const audioContext = new AudioContext();

	try {
		onProgress?.({ stage: 'decoding', progress: 0.1 });

		if (abortSignal?.aborted) return null;

		let audioBuffer: AudioBuffer;
		try {
			audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
		} catch (e) {
			onProgress?.({ stage: 'error', progress: 0, message: 'Failed to decode audio' });
			return null;
		}

		if (abortSignal?.aborted) return null;

		onProgress?.({ stage: 'computing', progress: 0.5 });

		// Use requestAnimationFrame to avoid blocking UI
		const peaks = await new Promise<number[]>((resolve) => {
			requestAnimationFrame(() => {
				resolve(computePeaks(audioBuffer));
			});
		});

		if (abortSignal?.aborted) return null;

		onProgress?.({ stage: 'done', progress: 1 });

		const normalizedPeaks = normalizePeaks(peaks);

		return {
			version: 1,
			peaks,
			normalizedPeaks,
			durationSec: audioBuffer.duration
		};
	} finally {
		await audioContext.close();
	}
}

/**
 * Normalizes peaks to 0-1 range using max-based normalization.
 * Also applies logarithmic scaling for better visual representation.
 */
export function normalizePeaks(peaks: number[]): number[] {
	if (peaks.length === 0) return [];

	const max = Math.max(...peaks);
	if (max === 0) return peaks.map(() => 0);

	// Linear normalization to 0-1
	return peaks.map(peak => {
		const normalized = peak / max;
		// Apply logarithmic scaling for better visual balance
		// log(1 + x) prevents log(0) = -Infinity
		return Math.log(1 + normalized * 10) / Math.log(11);
	});
}

/**
 * Generates frequency spectrum analysis (lows, mids, highs).
 * Uses FFT-based frequency analysis for band-specific energy.
 */
export async function analyzeFrequencySpectrum(
	arrayBuffer: ArrayBuffer,
	onProgress?: (progress: number) => void,
	abortSignal?: AbortSignal
): Promise<FrequencySpectrum | null> {
	const audioContext = new AudioContext();

	try {
		// Limit analysis to first portion for performance
		const limitedBuffer = arrayBuffer.byteLength > MAX_ANALYSIS_BYTES
			? arrayBuffer.slice(0, MAX_ANALYSIS_BYTES)
			: arrayBuffer;

		let audioBuffer: AudioBuffer;
		try {
			audioBuffer = await audioContext.decodeAudioData(limitedBuffer.slice(0));
		} catch {
			return null;
		}

		if (abortSignal?.aborted) return null;

		onProgress?.(0.3);

		// Get channel data
		const channelData = audioBuffer.getChannelData(0);
		const sampleRate = audioBuffer.sampleRate;
		const nyquist = sampleRate / 2;

		// Create FFT via OfflineAudioContext for better frequency resolution
		const fftSize = 4096;
		const offlineContext = new OfflineAudioContext(1, fftSize, sampleRate);
		const buffer = offlineContext.createBuffer(1, Math.min(fftSize, channelData.length), sampleRate);
		buffer.getChannelData(0).set(channelData.slice(0, fftSize));

		// Create analyser
		const analyser = offlineContext.createAnalyser();
		analyser.fftSize = fftSize;
		const source = offlineContext.createBufferSource();
		source.buffer = buffer;
		source.connect(analyser);
		analyser.connect(offlineContext.destination);
		source.start();

		await offlineContext.startRendering();

		if (abortSignal?.aborted) return null;

		onProgress?.(0.7);

		const dataArray = new Uint8Array(analyser.frequencyBinCount);
		analyser.getByteFrequencyData(dataArray);

		// Convert to decibels and normalize
		const freqData = Array.from(dataArray).map(val => val / 255);

		// Define frequency bands (using standard production audio ranges)
		const bassFreq = [20, 250]; // Lows: 20Hz - 250Hz
		const midFreq = [250, 4000]; // Mids: 250Hz - 4kHz
		const trebFreq = [4000, nyquist]; // Highs: 4kHz - Nyquist

		// Calculate frequency bins for each band
		const binWidth = sampleRate / fftSize;
		const bassBins = [
			Math.floor(bassFreq[0] / binWidth),
			Math.floor(bassFreq[1] / binWidth)
		];
		const midBins = [
			Math.floor(midFreq[0] / binWidth),
			Math.floor(midFreq[1] / binWidth)
		];
		const trebBins = [
			Math.floor(trebFreq[0] / binWidth),
			Math.floor(trebFreq[1] / binWidth)
		];

		// Extract energy for each band
		const calculateBandStats = (
			binStart: number,
			binEnd: number,
			freqMin: number,
			freqMax: number
		): Omit<FrequencyBand, 'name' | 'color'> => {
			const bandData = freqData.slice(binStart, binEnd);
			const energy = Math.sqrt(bandData.reduce((sum, v) => sum + v * v, 0) / bandData.length);
			const peak = Math.max(...bandData);
			const average = bandData.reduce((a, b) => a + b, 0) / bandData.length;

			return {
				freqRange: [freqMin, freqMax],
				energy: Math.min(1, energy),
				peak: peak,
				average: average
			};
		};

		const lows = calculateBandStats(bassBins[0], bassBins[1], bassFreq[0], bassFreq[1]);
		const mids = calculateBandStats(midBins[0], midBins[1], midFreq[0], midFreq[1]);
		const highs = calculateBandStats(trebBins[0], trebBins[1], trebFreq[0], trebFreq[1]);

		// Calculate overall statistics
		const overallRMS = Math.sqrt(freqData.reduce((sum, v) => sum + v * v, 0) / freqData.length);
		const peakAmplitude = Math.max(...freqData);
		const minAmplitude = freqData.filter(v => v > 0).reduce((a, b) => Math.min(a, b), 1);
		const dynamicRange = 20 * Math.log10(peakAmplitude / Math.max(minAmplitude, 0.0001));
		const crestFactor = peakAmplitude / overallRMS;

		if (abortSignal?.aborted) return null;

		onProgress?.(1);

		const bands: FrequencyBand[] = [
			{ name: 'lows', color: '#ef4444', ...lows },
			{ name: 'mids', color: '#f59e0b', ...mids },
			{ name: 'highs', color: '#10b981', ...highs }
		];

		return {
			version: 1,
			analyzedAt: new Date().toISOString(),
			bands,
			overallRMS,
			dynamicRange: isFinite(dynamicRange) ? dynamicRange : 0,
			crestFactor: isFinite(crestFactor) ? crestFactor : 1,
			peakAmplitude
		};
	} catch (e) {
		console.error('Frequency spectrum analysis failed:', e);
		return null;
	} finally {
		await audioContext.close();
	}
}

/**
 * Gets amplitude color based on peak value.
 */
export function getAmplitudeColor(peak: number, theme: 'light' | 'dark' = 'dark'): string {
	if (peak < 0.3) {
		return theme === 'dark' ? '#4a5568' : '#a0aec0'; // Low
	} else if (peak < 0.7) {
		return theme === 'dark' ? '#48bb78' : '#38a169'; // Medium
	} else {
		return theme === 'dark' ? '#ed8936' : '#dd6b20'; // High
	}
}

// ============================================
// Audio Analysis (Basic BPM/Key)
// ============================================

/**
 * Performs comprehensive audio analysis including BPM estimation and frequency spectrum.
 * This is a heuristic approach, not production-grade.
 */
export async function analyzeAudio(
	arrayBuffer: ArrayBuffer,
	onProgress?: (progress: number) => void,
	abortSignal?: AbortSignal
): Promise<AudioAnalysis | null> {
	const audioContext = new AudioContext();

	try {
		// Limit analysis to first portion
		const limitedBuffer = arrayBuffer.byteLength > MAX_ANALYSIS_BYTES
			? arrayBuffer.slice(0, MAX_ANALYSIS_BYTES)
			: arrayBuffer;

		let audioBuffer: AudioBuffer;
		try {
			audioBuffer = await audioContext.decodeAudioData(limitedBuffer.slice(0));
		} catch {
			return null;
		}

		if (abortSignal?.aborted) return null;

		// Limit duration
		const analysisLength = Math.min(
			audioBuffer.length,
			MAX_ANALYSIS_DURATION_SEC * audioBuffer.sampleRate
		);

		const channelData = audioBuffer.getChannelData(0).slice(0, analysisLength);
		onProgress?.(0.2);

		if (abortSignal?.aborted) return null;

		// Simple onset detection via energy changes
		const bpm = estimateBPM(channelData, audioBuffer.sampleRate);
		onProgress?.(0.6);

		if (abortSignal?.aborted) return null;

		// Get frequency spectrum
		const spectrum = await analyzeFrequencySpectrum(arrayBuffer, (prog) => {
			onProgress?.(0.6 + prog * 0.4); // Last 40% for spectrum
		}, abortSignal);

		onProgress?.(1);

		return {
			version: 1,
			bpm: bpm ? Math.round(bpm) : undefined,
			confidence: bpm ? 0.5 : undefined, // Low confidence for heuristic
			source: 'heuristic',
			spectrum: spectrum ?? undefined
		};
	} finally {
		await audioContext.close();
	}
}

/**
 * Simple BPM estimation using onset envelope and autocorrelation.
 */
function estimateBPM(samples: Float32Array, sampleRate: number): number | null {
	// Downsample for efficiency
	const hopSize = 512;
	const frameSize = 1024;
	const onsets: number[] = [];

	let prevEnergy = 0;
	for (let i = 0; i < samples.length - frameSize; i += hopSize) {
		let energy = 0;
		for (let j = 0; j < frameSize; j++) {
			energy += samples[i + j] ** 2;
		}
		energy /= frameSize;

		// Onset = energy increase
		const diff = energy - prevEnergy;
		onsets.push(diff > 0 ? diff : 0);
		prevEnergy = energy;
	}

	// Autocorrelation to find periodicity
	const minBPM = 60;
	const maxBPM = 200;
	const framesPerSec = sampleRate / hopSize;
	const minLag = Math.floor(framesPerSec * 60 / maxBPM);
	const maxLag = Math.floor(framesPerSec * 60 / minBPM);

	let bestLag = 0;
	let bestCorr = 0;

	for (let lag = minLag; lag <= maxLag; lag++) {
		let corr = 0;
		for (let i = 0; i < onsets.length - lag; i++) {
			corr += onsets[i] * onsets[i + lag];
		}
		if (corr > bestCorr) {
			bestCorr = corr;
			bestLag = lag;
		}
	}

	if (bestLag === 0) return null;

	return (60 * framesPerSec) / bestLag;
}

// ============================================
// Annotation Helpers
// ============================================

export function createEmptyAnnotations(): AudioAnnotations {
	return {
		version: 1,
		markers: [],
		regions: [],
		notes: []
	};
}

export function addMarker(
	annotations: AudioAnnotations,
	time: number,
	label: string,
	color?: string
): AudioAnnotations {
	const marker: AudioAnnotationMarker = {
		id: generateId(),
		t: time,
		labelEncoded: encodeBase64(label),
		color
	};

	return {
		...annotations,
		markers: [...annotations.markers, marker].sort((a, b) => a.t - b.t)
	};
}

export function updateMarker(
	annotations: AudioAnnotations,
	markerId: string,
	updates: Partial<Omit<AudioAnnotationMarker, 'id'>>
): AudioAnnotations {
	return {
		...annotations,
		markers: annotations.markers.map(m =>
			m.id === markerId
				? { ...m, ...updates, labelEncoded: updates.labelEncoded ?? m.labelEncoded }
				: m
		)
	};
}

export function removeMarker(annotations: AudioAnnotations, markerId: string): AudioAnnotations {
	return {
		...annotations,
		markers: annotations.markers.filter(m => m.id !== markerId)
	};
}

export function addRegion(
	annotations: AudioAnnotations,
	startTime: number,
	endTime: number,
	label: string,
	color?: string
): AudioAnnotations {
	const region: AudioAnnotationRegion = {
		id: generateId(),
		t0: Math.min(startTime, endTime),
		t1: Math.max(startTime, endTime),
		labelEncoded: encodeBase64(label),
		color
	};

	return {
		...annotations,
		regions: [...annotations.regions, region].sort((a, b) => a.t0 - b.t0)
	};
}

export function updateRegion(
	annotations: AudioAnnotations,
	regionId: string,
	updates: Partial<Omit<AudioAnnotationRegion, 'id'>>
): AudioAnnotations {
	return {
		...annotations,
		regions: annotations.regions.map(r =>
			r.id === regionId
				? { ...r, ...updates }
				: r
		)
	};
}

export function removeRegion(annotations: AudioAnnotations, regionId: string): AudioAnnotations {
	return {
		...annotations,
		regions: annotations.regions.filter(r => r.id !== regionId)
	};
}

export function addAnnotationNote(
	annotations: AudioAnnotations,
	time: number,
	body: string
): AudioAnnotations {
	const note: AudioAnnotationNote = {
		id: generateId(),
		t: time,
		bodyEncoded: encodeBase64(body)
	};

	return {
		...annotations,
		notes: [...annotations.notes, note].sort((a, b) => a.t - b.t)
	};
}

export function updateAnnotationNote(
	annotations: AudioAnnotations,
	noteId: string,
	updates: Partial<Omit<AudioAnnotationNote, 'id'>>
): AudioAnnotations {
	return {
		...annotations,
		notes: annotations.notes.map(n =>
			n.id === noteId
				? { ...n, ...updates }
				: n
		)
	};
}

export function removeAnnotationNote(annotations: AudioAnnotations, noteId: string): AudioAnnotations {
	return {
		...annotations,
		notes: annotations.notes.filter(n => n.id !== noteId)
	};
}

// ============================================
// Time Formatting
// ============================================

export function formatTime(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatTimeWithMs(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	const ms = Math.floor((seconds % 1) * 1000);
	return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}


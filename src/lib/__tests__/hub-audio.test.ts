/**
 * Unit tests for Producer Hub audio utilities.
 */

import { describe, it, expect } from 'vitest';
import { computePeaks, getAmplitudeColor, formatTime, formatTimeWithMs } from '../hub/audio';
import {
	createEmptyAnnotations,
	addMarker,
	updateMarker,
	removeMarker,
	addRegion,
	removeRegion,
	addAnnotationNote,
	removeAnnotationNote
} from '../hub/audio';
import { decodeBase64 } from '../hub/encoding';

describe('Waveform Peak Computation', () => {
	function createMockAudioBuffer(samples: number[]): AudioBuffer {
		return {
			duration: samples.length / 44100,
			sampleRate: 44100,
			length: samples.length,
			numberOfChannels: 1,
			getChannelData: () => new Float32Array(samples),
			copyFromChannel: () => {},
			copyToChannel: () => {}
		} as unknown as AudioBuffer;
	}

	it('should compute peaks from audio buffer', () => {
		// Create simple test data: alternating high and low values
		const samples = new Array(1000).fill(0).map((_, i) => (i % 2 === 0 ? 0.5 : -0.5));
		const buffer = createMockAudioBuffer(samples);

		const peaks = computePeaks(buffer, 10);

		expect(peaks).toHaveLength(10);
		// All peaks should be 0.5 (absolute max)
		peaks.forEach(peak => {
			expect(peak).toBeCloseTo(0.5, 1);
		});
	});

	it('should handle silence', () => {
		const samples = new Array(1000).fill(0);
		const buffer = createMockAudioBuffer(samples);

		const peaks = computePeaks(buffer, 10);

		expect(peaks).toHaveLength(10);
		peaks.forEach(peak => {
			expect(peak).toBe(0);
		});
	});

	it('should handle varying amplitudes', () => {
		const samples: number[] = [];
		// First half: low amplitude
		for (let i = 0; i < 500; i++) samples.push(0.1);
		// Second half: high amplitude
		for (let i = 0; i < 500; i++) samples.push(0.9);

		const buffer = createMockAudioBuffer(samples);
		const peaks = computePeaks(buffer, 10);

		expect(peaks).toHaveLength(10);
		// First 5 peaks should be ~0.1
		for (let i = 0; i < 5; i++) {
			expect(peaks[i]).toBeCloseTo(0.1, 1);
		}
		// Last 5 peaks should be ~0.9
		for (let i = 5; i < 10; i++) {
			expect(peaks[i]).toBeCloseTo(0.9, 1);
		}
	});

	it('should use absolute values for negative samples', () => {
		const samples = new Array(100).fill(-0.7);
		const buffer = createMockAudioBuffer(samples);

		const peaks = computePeaks(buffer, 5);

		peaks.forEach(peak => {
			expect(peak).toBeCloseTo(0.7, 1);
		});
	});
});

describe('Amplitude Color', () => {
	it('should return low color for quiet signals', () => {
		const color = getAmplitudeColor(0.1, 'dark');
		expect(color).toBe('#4a5568');
	});

	it('should return medium color for moderate signals', () => {
		const color = getAmplitudeColor(0.5, 'dark');
		expect(color).toBe('#48bb78');
	});

	it('should return high color for loud signals', () => {
		const color = getAmplitudeColor(0.8, 'dark');
		expect(color).toBe('#ed8936');
	});

	it('should handle light theme', () => {
		expect(getAmplitudeColor(0.1, 'light')).toBe('#a0aec0');
		expect(getAmplitudeColor(0.5, 'light')).toBe('#38a169');
		expect(getAmplitudeColor(0.8, 'light')).toBe('#dd6b20');
	});
});

describe('Time Formatting', () => {
	it('should format time in MM:SS', () => {
		expect(formatTime(0)).toBe('0:00');
		expect(formatTime(5)).toBe('0:05');
		expect(formatTime(65)).toBe('1:05');
		expect(formatTime(3661)).toBe('61:01');
	});

	it('should format time with milliseconds', () => {
		expect(formatTimeWithMs(0)).toBe('0:00.000');
		expect(formatTimeWithMs(5.5)).toBe('0:05.500');
		expect(formatTimeWithMs(65.123)).toBe('1:05.123');
	});
});

describe('Audio Annotations', () => {
	describe('Markers', () => {
		it('should create empty annotations', () => {
			const annotations = createEmptyAnnotations();
			expect(annotations.version).toBe(1);
			expect(annotations.markers).toEqual([]);
			expect(annotations.regions).toEqual([]);
			expect(annotations.notes).toEqual([]);
		});

		it('should add a marker', () => {
			let annotations = createEmptyAnnotations();
			annotations = addMarker(annotations, 10.5, 'Chorus', '#FF0000');

			expect(annotations.markers).toHaveLength(1);
			expect(annotations.markers[0].t).toBe(10.5);
			expect(decodeBase64(annotations.markers[0].labelEncoded)).toBe('Chorus');
			expect(annotations.markers[0].color).toBe('#FF0000');
		});

		it('should sort markers by time', () => {
			let annotations = createEmptyAnnotations();
			annotations = addMarker(annotations, 30, 'Third');
			annotations = addMarker(annotations, 10, 'First');
			annotations = addMarker(annotations, 20, 'Second');

			expect(annotations.markers[0].t).toBe(10);
			expect(annotations.markers[1].t).toBe(20);
			expect(annotations.markers[2].t).toBe(30);
		});

		it('should update a marker', () => {
			let annotations = createEmptyAnnotations();
			annotations = addMarker(annotations, 10, 'Original');
			const markerId = annotations.markers[0].id;

			annotations = updateMarker(annotations, markerId, { t: 15 });

			expect(annotations.markers[0].t).toBe(15);
		});

		it('should remove a marker', () => {
			let annotations = createEmptyAnnotations();
			annotations = addMarker(annotations, 10, 'To Remove');
			annotations = addMarker(annotations, 20, 'To Keep');
			const removeId = annotations.markers[0].id;

			annotations = removeMarker(annotations, removeId);

			expect(annotations.markers).toHaveLength(1);
			expect(decodeBase64(annotations.markers[0].labelEncoded)).toBe('To Keep');
		});
	});

	describe('Regions', () => {
		it('should add a region', () => {
			let annotations = createEmptyAnnotations();
			annotations = addRegion(annotations, 10, 20, 'Verse 1', '#00FF00');

			expect(annotations.regions).toHaveLength(1);
			expect(annotations.regions[0].t0).toBe(10);
			expect(annotations.regions[0].t1).toBe(20);
			expect(decodeBase64(annotations.regions[0].labelEncoded)).toBe('Verse 1');
		});

		it('should normalize region start/end times', () => {
			let annotations = createEmptyAnnotations();
			// Add with end before start
			annotations = addRegion(annotations, 30, 10, 'Reversed');

			// Should be normalized
			expect(annotations.regions[0].t0).toBe(10);
			expect(annotations.regions[0].t1).toBe(30);
		});

		it('should remove a region', () => {
			let annotations = createEmptyAnnotations();
			annotations = addRegion(annotations, 10, 20, 'Region');
			const regionId = annotations.regions[0].id;

			annotations = removeRegion(annotations, regionId);

			expect(annotations.regions).toHaveLength(0);
		});
	});

	describe('Notes', () => {
		it('should add an annotation note', () => {
			let annotations = createEmptyAnnotations();
			annotations = addAnnotationNote(annotations, 15, 'This is a note');

			expect(annotations.notes).toHaveLength(1);
			expect(annotations.notes[0].t).toBe(15);
			expect(decodeBase64(annotations.notes[0].bodyEncoded)).toBe('This is a note');
		});

		it('should remove an annotation note', () => {
			let annotations = createEmptyAnnotations();
			annotations = addAnnotationNote(annotations, 15, 'Note');
			const noteId = annotations.notes[0].id;

			annotations = removeAnnotationNote(annotations, noteId);

			expect(annotations.notes).toHaveLength(0);
		});
	});
});


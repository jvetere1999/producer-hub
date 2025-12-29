/**
 * Unit tests for Producer Hub encoding utilities.
 */

import { describe, it, expect } from 'vitest';
import { encodeBase64, decodeBase64, generateId, generateShortId, nowISO } from '$lib/hub';

describe('Base64 Encoding', () => {
	it('should encode and decode ASCII text', () => {
		const text = 'Hello, World!';
		const encoded = encodeBase64(text);
		const decoded = decodeBase64(encoded);
		expect(decoded).toBe(text);
	});

	it('should encode and decode Unicode text', () => {
		const text = 'Привет мир! 你好世界! 🎵🎹🎧';
		const encoded = encodeBase64(text);
		const decoded = decodeBase64(encoded);
		expect(decoded).toBe(text);
	});

	it('should encode and decode special characters', () => {
		const text = 'Line1\nLine2\tTabbed "quotes" & <symbols>';
		const encoded = encodeBase64(text);
		const decoded = decodeBase64(encoded);
		expect(decoded).toBe(text);
	});

	it('should handle empty strings', () => {
		expect(encodeBase64('')).toBe('');
		expect(decodeBase64('')).toBe('');
	});

	it('should handle emojis', () => {
		const text = '🎵 Music production notes 🎹';
		const encoded = encodeBase64(text);
		const decoded = decodeBase64(encoded);
		expect(decoded).toBe(text);
	});

	it('should handle multi-byte characters correctly', () => {
		const text = '日本語テスト';
		const encoded = encodeBase64(text);
		expect(encoded).not.toBe(text); // Should be different (encoded)
		const decoded = decodeBase64(encoded);
		expect(decoded).toBe(text);
	});

	it('should handle invalid base64 gracefully', () => {
		const result = decodeBase64('not-valid-base64!!!');
		expect(result).toBe('');
	});
});

describe('ID Generation', () => {
	it('should generate unique IDs', () => {
		const ids = new Set<string>();
		for (let i = 0; i < 100; i++) {
			ids.add(generateId());
		}
		expect(ids.size).toBe(100);
	});

	it('should generate IDs with proper format', () => {
		const id = generateId();
		expect(typeof id).toBe('string');
		expect(id.length).toBeGreaterThan(0);
	});

	it('should generate short IDs', () => {
		const id = generateShortId();
		expect(typeof id).toBe('string');
		expect(id.length).toBeGreaterThan(0);
		expect(id.length).toBeLessThan(20);
	});

	it('should generate unique short IDs', () => {
		const ids = new Set<string>();
		for (let i = 0; i < 50; i++) {
			ids.add(generateShortId());
		}
		expect(ids.size).toBe(50);
	});
});

describe('ISO Timestamp', () => {
	it('should return valid ISO string', () => {
		const iso = nowISO();
		expect(() => new Date(iso)).not.toThrow();
		const date = new Date(iso);
		expect(date.getTime()).toBeGreaterThan(0);
	});

	it('should be close to current time', () => {
		const before = Date.now();
		const iso = nowISO();
		const after = Date.now();
		const isoTime = new Date(iso).getTime();
		expect(isoTime).toBeGreaterThanOrEqual(before);
		expect(isoTime).toBeLessThanOrEqual(after);
	});
});


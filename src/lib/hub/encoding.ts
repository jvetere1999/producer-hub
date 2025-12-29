/**
 * Producer Hub Encoding Utilities
 *
 * Provides base64 encoding/decoding for obfuscation at rest.
 * All encoded fields use UTF-8 safe encoding.
 *
 * @module hub/encoding
 */

/**
 * Encodes a UTF-8 string to base64.
 */
export function encodeBase64(str: string): string {
	if (!str) return '';
	if (typeof window === 'undefined') {
		// Node.js environment (SSR)
		return Buffer.from(str, 'utf-8').toString('base64');
	}
	// Browser: handle Unicode by encoding to UTF-8 bytes first
	const bytes = new TextEncoder().encode(str);
	const binString = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
	return btoa(binString);
}

/**
 * Decodes a base64 string to UTF-8.
 */
export function decodeBase64(b64: string): string {
	if (!b64) return '';

	// Validate base64 format first (works in both Node and browser)
	if (!/^[A-Za-z0-9+/]*={0,2}$/.test(b64)) {
		return '';
	}

	try {
		if (typeof window === 'undefined') {
			// Node.js environment (SSR)
			return Buffer.from(b64, 'base64').toString('utf-8');
		}
		// Browser
		const binString = atob(b64);
		const bytes = new Uint8Array(binString.length);
		for (let i = 0; i < binString.length; i++) {
			bytes[i] = binString.charCodeAt(i);
		}
		return new TextDecoder().decode(bytes);
	} catch {
		// If decoding fails, return empty string
		return '';
	}
}

/**
 * Generates a unique ID (UUID v4-like).
 */
export function generateId(): string {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) {
		return crypto.randomUUID();
	}
	// Fallback for older environments
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 10);
	const random2 = Math.random().toString(36).substring(2, 10);
	return `${timestamp}-${random}-${random2}`;
}

/**
 * Generates a short ID for quick use.
 */
export function generateShortId(): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 6);
	return `${timestamp}-${random}`;
}

/**
 * Gets current ISO timestamp.
 */
export function nowISO(): string {
	return new Date().toISOString();
}


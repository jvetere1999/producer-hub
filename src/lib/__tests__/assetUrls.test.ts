import { describe, it, expect } from 'vitest';
import { buildIconUrl, buildManifestUrl } from '../assetUrls';

describe('Asset URL utilities', () => {
    describe('buildIconUrl', () => {
        it('returns correct URL with no base path', () => {
            expect(buildIconUrl('icons/products/ableton.svg', '')).toBe('/icons/products/ableton.svg');
        });

        it('returns correct URL with base path', () => {
            expect(buildIconUrl('icons/products/ableton.svg', '/producer-hub')).toBe('/producer-hub/icons/products/ableton.svg');
        });

        it('handles base path with trailing slash', () => {
            expect(buildIconUrl('icons/products/ableton.svg', '/producer-hub/')).toBe('/producer-hub/icons/products/ableton.svg');
        });

        it('handles icon path with leading slash', () => {
            expect(buildIconUrl('/icons/products/ableton.svg', '/producer-hub')).toBe('/producer-hub/icons/products/ableton.svg');
        });

        it('handles both trailing and leading slashes', () => {
            expect(buildIconUrl('/icons/products/ableton.svg', '/producer-hub/')).toBe('/producer-hub/icons/products/ableton.svg');
        });

        it('works with deep base paths', () => {
            expect(buildIconUrl('icons/products/serum2.svg', '/org/repo')).toBe('/org/repo/icons/products/serum2.svg');
        });
    });

    describe('buildManifestUrl', () => {
        it('returns correct manifest URL with no base path', () => {
            expect(buildManifestUrl('')).toBe('/manifest.webmanifest');
        });

        it('returns correct manifest URL with base path', () => {
            expect(buildManifestUrl('/producer-hub')).toBe('/producer-hub/manifest.webmanifest');
        });
    });
});


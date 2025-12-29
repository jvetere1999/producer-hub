/**
 * Asset URL utilities for base-path-aware URL construction
 *
 * These utilities ensure static assets work correctly on GitHub Pages
 * where the site is served under a subpath like /repo-name/
 */

/**
 * Build a product icon URL with the given base path
 * @param iconPath - Relative icon path (e.g., "icons/products/ableton.svg")
 * @param basePath - Base path for the deployment (e.g., "/producer-hub" or "")
 * @returns Full URL path (e.g., "/producer-hub/icons/products/ableton.svg")
 */
export function buildIconUrl(iconPath: string, basePath: string = ''): string {
    // Ensure basePath doesn't have trailing slash and iconPath doesn't have leading slash
    const cleanBase = basePath.replace(/\/$/, '');
    const cleanPath = iconPath.replace(/^\//, '');

    if (cleanBase) {
        return `${cleanBase}/${cleanPath}`;
    }
    return `/${cleanPath}`;
}

/**
 * Build a manifest URL with the given base path
 * @param basePath - Base path for the deployment
 * @returns Full manifest URL path
 */
export function buildManifestUrl(basePath: string = ''): string {
    return buildIconUrl('manifest.webmanifest', basePath);
}


/**
 * Fix manifest.webmanifest paths for GitHub Pages deployment
 *
 * This script updates the manifest file in the build directory to use
 * the correct base path for GitHub Pages deployments.
 *
 * Usage: node scripts/fix-manifest-paths.mjs
 *
 * Environment:
 *   BASE_PATH - The base path for the deployment (e.g., "/producer-hub")
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUILD_DIR = path.join(__dirname, '..', 'build');
const MANIFEST_PATH = path.join(BUILD_DIR, 'manifest.webmanifest');

const basePath = process.env.BASE_PATH || '';

console.log('🔧 Fixing manifest paths...');
console.log(`   Base path: "${basePath || '(none)'}"`);

if (!fs.existsSync(MANIFEST_PATH)) {
    console.log('⚠️  No manifest.webmanifest found in build directory, skipping');
    process.exit(0);
}

try {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));

    // Fix start_url and scope
    manifest.start_url = basePath ? `${basePath}/` : '/';
    manifest.scope = basePath ? `${basePath}/` : '/';

    // Fix icon paths
    if (manifest.icons && Array.isArray(manifest.icons)) {
        manifest.icons = manifest.icons.map(icon => ({
            ...icon,
            src: basePath ? `${basePath}/${icon.src}` : icon.src
        }));
    }

    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');

    console.log('✅ Manifest updated:');
    console.log(`   start_url: ${manifest.start_url}`);
    console.log(`   scope: ${manifest.scope}`);
    console.log(`   icons: ${manifest.icons?.length || 0} updated`);
} catch (err) {
    console.error('❌ Failed to update manifest:', err.message);
    process.exit(1);
}


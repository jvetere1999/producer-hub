/**
 * Sitemap Generator for Producer Hub
 *
 * Run after build to generate sitemap.xml in the build directory.
 *
 * Usage: node scripts/generate-sitemap.mjs
 *
 * This script:
 * 1. Scans the build directory for HTML files
 * 2. Generates a sitemap.xml with proper URLs
 * 3. Handles GitHub Pages base path
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUILD_DIR = path.join(__dirname, '..', 'build');

// Configuration
const SITE_URL = 'https://producerhub.ecent.online';
const BASE_PATH = process.env.BASE_PATH || '';

// Priority and change frequency settings per path pattern
const pathConfig = {
    '/': { priority: '1.0', changefreq: 'weekly' },
    '/privacy': { priority: '0.3', changefreq: 'monthly' },
    // Add more as you create pages
    '/guides/': { priority: '0.8', changefreq: 'weekly' },
    '/shortcuts/': { priority: '0.9', changefreq: 'weekly' },
};

/**
 * Get priority and changefreq for a path
 */
function getPathConfig(urlPath) {
    // Check for exact match first
    if (pathConfig[urlPath]) {
        return pathConfig[urlPath];
    }
    // Check for prefix match
    for (const [pattern, config] of Object.entries(pathConfig)) {
        if (pattern.endsWith('/') && urlPath.startsWith(pattern)) {
            return config;
        }
    }
    // Default
    return { priority: '0.5', changefreq: 'weekly' };
}

/**
 * Recursively find all HTML files in a directory
 */
function findHtmlFiles(dir, basePath = '') {
    const files = [];

    if (!fs.existsSync(dir)) {
        console.error(`Build directory not found: ${dir}`);
        console.error('Run "npm run build" first.');
        process.exit(1);
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(basePath, entry.name);

        if (entry.isDirectory()) {
            // Skip _app and other internal directories
            if (entry.name.startsWith('_') || entry.name === 'icons') {
                continue;
            }
            files.push(...findHtmlFiles(fullPath, relativePath));
        } else if (entry.name === 'index.html') {
            // Root or subdirectory index
            const urlPath = basePath ? `/${basePath.replace(/\\/g, '/')}` : '/';
            files.push(urlPath);
        } else if (entry.name.endsWith('.html') && entry.name !== 'index.html') {
            // Standalone HTML files (e.g., privacy.html -> /privacy)
            const pageName = entry.name.replace('.html', '');
            const urlPath = basePath ? `/${basePath.replace(/\\/g, '/')}/${pageName}` : `/${pageName}`;
            files.push(urlPath);
        }
    }

    return files;
}

/**
 * Generate XML sitemap content
 */
function generateSitemap(paths) {
    const lastmod = new Date().toISOString().split('T')[0];

    const urls = paths.map(urlPath => {
        const config = getPathConfig(urlPath);
        const fullUrl = `${SITE_URL}${BASE_PATH}${urlPath === '/' ? '' : urlPath}`;

        return `  <url>
    <loc>${fullUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${config.changefreq}</changefreq>
    <priority>${config.priority}</priority>
  </url>`;
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
}

// Main execution
console.log('🗺️  Generating sitemap...');
console.log(`   Build dir: ${BUILD_DIR}`);
console.log(`   Site URL: ${SITE_URL}`);
console.log(`   Base path: ${BASE_PATH || '(none)'}`);

const htmlFiles = findHtmlFiles(BUILD_DIR);
console.log(`   Found ${htmlFiles.length} pages:`);
htmlFiles.forEach(f => console.log(`      - ${f}`));

const sitemap = generateSitemap(htmlFiles);
const sitemapPath = path.join(BUILD_DIR, 'sitemap.xml');

fs.writeFileSync(sitemapPath, sitemap, 'utf-8');
console.log(`\n✅ Sitemap generated: ${sitemapPath}`);


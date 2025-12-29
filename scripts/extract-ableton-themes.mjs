#!/usr/bin/env node
/**
 * Ableton Live Theme Extractor
 *
 * Extracts color values from Ableton Live .ask theme files and generates
 * a theme manifest for use in Producer Hub.
 *
 * Usage:
 *   node scripts/extract-ableton-themes.mjs --in "/path/to/Themes" --out "src/lib/themes/ableton-live-12.manifest.json"
 *
 * The Themes folder is typically located at:
 *   macOS: /Applications/Ableton Live 12 Suite.app/Contents/App-Resources/Themes
 *   Windows: C:\ProgramData\Ableton\Live 12\Resources\Themes
 *
 * You can also provide a fallback JSON file with manually defined colors:
 *   node scripts/extract-ableton-themes.mjs --fallback "./theme-colors.json" --out "..."
 *
 * Fallback JSON format:
 * {
 *   "themes": [
 *     {
 *       "name": "Theme Name",
 *       "fileName": "ThemeName.ask",
 *       "mode": "dark",
 *       "colors": {
 *         "background": "#1e1e1e",
 *         "foreground": "#ffffff",
 *         ...
 *       }
 *     }
 *   ]
 * }
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { parseArgs } from 'util';

// Parse command line arguments
const { values: args } = parseArgs({
    options: {
        in: { type: 'string', short: 'i' },
        out: { type: 'string', short: 'o' },
        fallback: { type: 'string', short: 'f' }
    }
});

// Default variable mappings from Ableton theme keys to our CSS vars
const VAR_MAPPINGS = {
    // These are approximate mappings - actual .ask files use different key names
    'ControlBackground': '--bg-secondary',
    'ControlForeground': '--text-primary',
    'SurfaceBackground': '--surface-default',
    'SurfaceHighlight': '--surface-hover',
    'TextColor': '--text-primary',
    'AccentColor': '--accent-primary',
    'SelectionColor': '--selection-bg',
    // Add more mappings as needed
};

// Default colors for missing values
const DEFAULT_DARK_VARS = {
    '--bg-primary': '#1e1e1e',
    '--bg-secondary': '#2d2d2d',
    '--bg-tertiary': '#3d3d3d',
    '--bg-elevated': '#4d4d4d',
    '--surface-default': '#2d2d2d',
    '--surface-hover': '#3d3d3d',
    '--surface-active': '#4d4d4d',
    '--surface-selected': '#5d5d5d',
    '--text-primary': '#ffffff',
    '--text-secondary': '#b3b3b3',
    '--text-muted': '#808080',
    '--text-inverse': '#1e1e1e',
    '--border-default': '#4d4d4d',
    '--border-subtle': '#3d3d3d',
    '--border-strong': '#5d5d5d',
    '--accent-primary': '#ff764d',
    '--accent-secondary': '#50b8b8',
    '--accent-success': '#87c157',
    '--accent-warning': '#ffc107',
    '--accent-error': '#ff5252',
    '--selection-bg': '#ff764d33',
    '--selection-text': '#ffffff',
    '--focus-ring': '#ff764d',
    '--keycap-bg': '#3d3d3d',
    '--keycap-text': '#ffffff',
    '--keycap-border': '#5d5d5d',
    '--keycap-modifier-bg': '#4d4d4d',
    '--keycap-modifier-text': '#ff764d',
    '--waveform-bg': '#1e1e1e',
    '--waveform-wave': '#ff764d',
    '--waveform-playhead': '#ffffff',
    '--waveform-region': '#ff764d33',
    '--waveform-marker': '#ffc107',
    '--player-bg': '#2d2d2d',
    '--player-controls': '#ffffff',
    '--player-progress': '#ff764d',
    '--row-odd': '#2d2d2d',
    '--row-even': '#262626',
    '--row-hover': '#3d3d3d',
    '--row-selected': '#ff764d33',
    '--tag-bg': '#4d4d4d',
    '--tag-text': '#ffffff',
    '--badge-bg': '#ff764d',
    '--badge-text': '#ffffff'
};

const DEFAULT_LIGHT_VARS = {
    '--bg-primary': '#f5f5f5',
    '--bg-secondary': '#e8e8e8',
    '--bg-tertiary': '#dbdbdb',
    '--bg-elevated': '#ffffff',
    '--surface-default': '#e8e8e8',
    '--surface-hover': '#dbdbdb',
    '--surface-active': '#cecece',
    '--surface-selected': '#c1c1c1',
    '--text-primary': '#1e1e1e',
    '--text-secondary': '#4d4d4d',
    '--text-muted': '#808080',
    '--text-inverse': '#ffffff',
    '--border-default': '#c1c1c1',
    '--border-subtle': '#dbdbdb',
    '--border-strong': '#a8a8a8',
    '--accent-primary': '#ff5500',
    '--accent-secondary': '#00a8a8',
    '--accent-success': '#5ea030',
    '--accent-warning': '#e6a800',
    '--accent-error': '#e62c2c',
    '--selection-bg': '#ff550033',
    '--selection-text': '#1e1e1e',
    '--focus-ring': '#ff5500',
    '--keycap-bg': '#ffffff',
    '--keycap-text': '#1e1e1e',
    '--keycap-border': '#c1c1c1',
    '--keycap-modifier-bg': '#e8e8e8',
    '--keycap-modifier-text': '#ff5500',
    '--waveform-bg': '#e8e8e8',
    '--waveform-wave': '#ff5500',
    '--waveform-playhead': '#1e1e1e',
    '--waveform-region': '#ff550033',
    '--waveform-marker': '#e6a800',
    '--player-bg': '#f5f5f5',
    '--player-controls': '#1e1e1e',
    '--player-progress': '#ff5500',
    '--row-odd': '#f5f5f5',
    '--row-even': '#ebebeb',
    '--row-hover': '#dbdbdb',
    '--row-selected': '#ff550033',
    '--tag-bg': '#dbdbdb',
    '--tag-text': '#1e1e1e',
    '--badge-bg': '#ff5500',
    '--badge-text': '#ffffff'
};

/**
 * Generate a deterministic ID from theme name
 */
function generateThemeId(name) {
    return 'ableton-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Compute SHA256 hash of file content
 */
function computeSha256(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Detect theme mode from name or content
 */
function detectMode(name, content) {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('light') || nameLower.includes('mint')) {
        return 'light';
    }
    if (nameLower.includes('dark') || nameLower.includes('disco')) {
        return 'dark';
    }
    // Default to dark for ambiguous themes
    return 'dark';
}

/**
 * Attempt to parse an .ask file (XML/binary format)
 * Returns extracted colors or null if parsing fails
 */
function parseAskFile(filePath) {
    try {
        const content = fs.readFileSync(filePath);
        const textContent = content.toString('utf-8');

        // .ask files can be XML or binary
        // Try to extract color values from XML format
        const colors = {};

        // Look for color patterns in the file
        const colorRegex = /<(\w+).*?R="([\d.]+)".*?G="([\d.]+)".*?B="([\d.]+)"/g;
        let match;

        while ((match = colorRegex.exec(textContent)) !== null) {
            const [, name, r, g, b] = match;
            const hexR = Math.round(parseFloat(r) * 255).toString(16).padStart(2, '0');
            const hexG = Math.round(parseFloat(g) * 255).toString(16).padStart(2, '0');
            const hexB = Math.round(parseFloat(b) * 255).toString(16).padStart(2, '0');
            colors[name] = `#${hexR}${hexG}${hexB}`;
        }

        return Object.keys(colors).length > 0 ? colors : null;
    } catch (e) {
        console.warn(`  Warning: Could not parse ${path.basename(filePath)}: ${e.message}`);
        return null;
    }
}

/**
 * Map extracted colors to our CSS variable schema
 */
function mapColorsToVars(colors, mode) {
    const defaults = mode === 'light' ? DEFAULT_LIGHT_VARS : DEFAULT_DARK_VARS;
    const vars = { ...defaults };
    const missing = [];

    // Apply any mappings we can find
    for (const [askKey, cssVar] of Object.entries(VAR_MAPPINGS)) {
        if (colors && colors[askKey]) {
            vars[cssVar] = colors[askKey];
        }
    }

    // Track which variables we couldn't extract
    if (!colors) {
        missing.push('all-colors');
    }

    return { vars, missing };
}

/**
 * Process a theme directory
 */
function processThemeDirectory(inputDir) {
    const themes = [];

    if (!fs.existsSync(inputDir)) {
        console.error(`Error: Input directory not found: ${inputDir}`);
        console.log('\nThe Ableton Themes folder is typically located at:');
        console.log('  macOS: /Applications/Ableton Live 12 Suite.app/Contents/App-Resources/Themes');
        console.log('  Windows: C:\\ProgramData\\Ableton\\Live 12\\Resources\\Themes');
        process.exit(1);
    }

    const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.ask'));

    console.log(`Found ${files.length} .ask files in ${inputDir}`);

    for (const file of files) {
        const filePath = path.join(inputDir, file);
        const content = fs.readFileSync(filePath);
        const sha256 = computeSha256(content);
        const name = path.basename(file, '.ask');
        const mode = detectMode(name, content);

        console.log(`  Processing: ${file} (${mode})`);

        const extractedColors = parseAskFile(filePath);
        const { vars, missing } = mapColorsToVars(extractedColors, mode);

        const theme = {
            id: generateThemeId(name),
            name: name.replace(/([A-Z])/g, ' $1').trim(), // Add spaces before capitals
            mode,
            vars,
            meta: {
                sourceType: 'ableton-ask',
                fileName: file,
                sha256
            }
        };

        if (missing.length > 0) {
            theme.missing = missing;
        }

        themes.push(theme);
    }

    return themes;
}

/**
 * Process a fallback JSON file
 */
function processFallbackFile(fallbackPath) {
    if (!fs.existsSync(fallbackPath)) {
        console.error(`Error: Fallback file not found: ${fallbackPath}`);
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(fallbackPath, 'utf-8'));
    const themes = [];

    for (const entry of data.themes || []) {
        const mode = entry.mode || 'dark';
        const defaults = mode === 'light' ? DEFAULT_LIGHT_VARS : DEFAULT_DARK_VARS;

        const theme = {
            id: generateThemeId(entry.name),
            name: entry.name,
            mode,
            vars: { ...defaults, ...entry.colors },
            meta: {
                sourceType: 'custom',
                fileName: entry.fileName
            }
        };

        themes.push(theme);
    }

    return themes;
}

/**
 * Main extraction function
 */
function main() {
    console.log('Ableton Live Theme Extractor\n');

    let themes = [];

    if (args.in) {
        themes = processThemeDirectory(args.in);
    } else if (args.fallback) {
        themes = processFallbackFile(args.fallback);
    } else {
        console.log('Usage:');
        console.log('  node scripts/extract-ableton-themes.mjs --in "/path/to/Themes" --out "output.json"');
        console.log('  node scripts/extract-ableton-themes.mjs --fallback "colors.json" --out "output.json"');
        console.log('\nOptions:');
        console.log('  --in, -i      Path to Ableton Themes folder');
        console.log('  --out, -o     Output manifest file path');
        console.log('  --fallback, -f  Fallback JSON file with manual color definitions');
        process.exit(1);
    }

    const manifest = {
        version: 1,
        generatedAt: new Date().toISOString(),
        themes
    };

    const outputPath = args.out || 'src/lib/themes/ableton-live-12.manifest.json';
    fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));

    console.log(`\nGenerated manifest with ${themes.length} themes: ${outputPath}`);

    const withMissing = themes.filter(t => t.missing && t.missing.length > 0);
    if (withMissing.length > 0) {
        console.log(`\nNote: ${withMissing.length} themes have missing/approximated values.`);
        console.log('Consider providing a fallback JSON to fill in missing colors.');
    }
}

main();


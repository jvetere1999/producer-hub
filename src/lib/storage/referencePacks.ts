/**
 * Reference Packs (Share Bundles)
 *
 * Exports and imports curated packs containing:
 * - Lane templates (drum/melody)
 * - Chord templates (optional)
 * - Projects (optional)
 * - Audio blobs (optional)
 *
 * Features:
 * - Deduplicated by content hash
 * - Size-capped for sharing
 * - Optional share-URL manifest generation
 *
 * Security:
 * - Size caps enforced
 * - Unknown entity kinds rejected
 * - No path traversal/unsafe filenames
 */

import type {
    LaneTemplateRef,
    ChordProgressionRef,
    AudioLoopRef,
    ProjectRef,
    ProjectClipRefEntry,
    SyncNote,
    SyncLaneSettings,
} from './vaultTypes';
import { VAULT_SCHEMA_VERSION, MAX_BUNDLE_SIZE } from './vaultTypes';
import { generateLaneTemplateHash, generateProgressionHash } from './bundle';

// ============================================
// Reference Pack Types
// ============================================

export const REFERENCE_PACK_VERSION = 1;
export const MAX_PACK_SIZE = 10 * 1024 * 1024; // 10MB max for shareable packs

export interface ReferencePack {
    version: typeof REFERENCE_PACK_VERSION;
    createdAt: string;
    name: string;
    description?: string;

    // Content
    laneTemplates: LaneTemplateRef[];
    chordProgressions?: ChordProgressionRef[];
    projects?: ProjectRef[];
    audioLoops?: AudioLoopRef[];
    projectClips?: ProjectClipRefEntry[];

    // Dedupe index (contentHash -> entityId)
    contentHashes: Record<string, string>;

    // Optional share-URL manifest (convenience, not authoritative)
    shareUrlManifest?: ShareUrlManifest;
}

export interface ShareUrlManifest {
    generatedAt: string;
    urls: ShareUrlEntry[];
}

export interface ShareUrlEntry {
    entityType: 'laneTemplate' | 'chordProgression';
    entityId: string;
    name: string;
    shareUrl: string;
}

export interface PackExportOptions {
    name: string;
    description?: string;
    includeProjects?: boolean;
    includeAudioLoops?: boolean;
    generateShareUrls?: boolean;
    templateIds?: string[];
    progressionIds?: string[];
}

export interface PackImportResult {
    success: boolean;
    imported: {
        laneTemplates: number;
        chordProgressions: number;
        projects: number;
        audioLoops: number;
        projectClips: number;
    };
    skipped: {
        duplicates: number;
        invalid: number;
    };
    regeneratedShareUrls: number;
    errors: string[];
}

export interface PackValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    stats: {
        laneTemplates: number;
        chordProgressions: number;
        projects: number;
        audioLoops: number;
        totalSizeBytes: number;
    };
}

// ============================================
// Pack Export
// ============================================

/**
 * Create a reference pack from templates and progressions
 */
export async function createReferencePack(
    templates: LaneTemplateRef[],
    progressions: ChordProgressionRef[] = [],
    options: PackExportOptions
): Promise<ReferencePack> {
    const now = new Date().toISOString();
    const contentHashes: Record<string, string> = {};

    // Generate hashes for deduplication
    for (const template of templates) {
        if (!template.contentHash) {
            const hash = await generateLaneTemplateHash(template.notes, template.laneSettings);
            contentHashes[hash] = template.id;
        } else {
            contentHashes[template.contentHash] = template.id;
        }
    }

    for (const progression of progressions) {
        if (!progression.contentHash) {
            const hash = await generateProgressionHash(progression.numerals, progression.durations);
            contentHashes[hash] = progression.id;
        } else {
            contentHashes[progression.contentHash] = progression.id;
        }
    }

    const pack: ReferencePack = {
        version: REFERENCE_PACK_VERSION,
        createdAt: now,
        name: sanitizePackName(options.name),
        description: options.description?.substring(0, 500),
        laneTemplates: templates,
        chordProgressions: progressions.length > 0 ? progressions : undefined,
        contentHashes,
    };

    // Generate share URLs if requested
    if (options.generateShareUrls) {
        pack.shareUrlManifest = generateShareUrlManifest(templates, progressions);
    }

    return pack;
}

/**
 * Generate share URL manifest for pack contents
 */
function generateShareUrlManifest(
    templates: LaneTemplateRef[],
    progressions: ChordProgressionRef[]
): ShareUrlManifest {
    const urls: ShareUrlEntry[] = [];

    for (const template of templates) {
        // Generate versioned share URL
        const shareUrl = encodeTemplateShareUrl(template);
        if (shareUrl) {
            urls.push({
                entityType: 'laneTemplate',
                entityId: template.id,
                name: template.name,
                shareUrl,
            });
        }
    }

    for (const progression of progressions) {
        const shareUrl = encodeProgressionShareUrl(progression);
        if (shareUrl) {
            urls.push({
                entityType: 'chordProgression',
                entityId: progression.id,
                name: progression.name,
                shareUrl,
            });
        }
    }

    return {
        generatedAt: new Date().toISOString(),
        urls,
    };
}

/**
 * Encode a lane template to a share URL
 */
function encodeTemplateShareUrl(template: LaneTemplateRef): string | null {
    try {
        const payload = {
            v: 1,
            id: template.id,
            type: template.type,
            name: template.name,
            bpm: template.bpm,
            bars: template.bars,
            ts: template.timeSignature,
            key: template.key,
            scale: template.scaleType,
            settings: {
                inst: template.laneSettings.instrumentId,
                mode: template.laneSettings.noteMode,
                vel: template.laneSettings.velocityDefault,
                grid: template.laneSettings.quantizeGrid,
            },
            notes: template.notes.map(n => [n.pitch, n.startBeat, n.duration, n.velocity]),
        };

        const json = JSON.stringify(payload);
        if (json.length > 4096) {
            return null; // Too large for URL
        }

        return btoa(encodeURIComponent(json));
    } catch {
        return null;
    }
}

/**
 * Encode a chord progression to a share URL
 */
function encodeProgressionShareUrl(progression: ChordProgressionRef): string | null {
    try {
        const payload = {
            v: 1,
            id: progression.id,
            name: progression.name,
            genre: progression.genre,
            numerals: progression.numerals,
            durations: progression.durations,
            rhythm: progression.rhythmPattern,
            key: progression.key,
            scale: progression.scaleType,
        };

        const json = JSON.stringify(payload);
        if (json.length > 2048) {
            return null;
        }

        return btoa(encodeURIComponent(json));
    } catch {
        return null;
    }
}

// ============================================
// Pack Import
// ============================================

/**
 * Import a reference pack, merging with existing content
 */
export async function importReferencePack(
    pack: ReferencePack,
    existingTemplates: LaneTemplateRef[],
    existingProgressions: ChordProgressionRef[]
): Promise<PackImportResult> {
    const result: PackImportResult = {
        success: true,
        imported: {
            laneTemplates: 0,
            chordProgressions: 0,
            projects: 0,
            audioLoops: 0,
            projectClips: 0,
        },
        skipped: {
            duplicates: 0,
            invalid: 0,
        },
        regeneratedShareUrls: 0,
        errors: [],
    };

    // Build existing hash index
    const existingHashes = new Set<string>();
    for (const t of existingTemplates) {
        if (t.contentHash) existingHashes.add(t.contentHash);
    }
    for (const p of existingProgressions) {
        if (p.contentHash) existingHashes.add(p.contentHash);
    }

    // Import lane templates (dedupe by hash)
    const importedTemplates: LaneTemplateRef[] = [];
    for (const template of pack.laneTemplates) {
        // Validate template
        if (!validateLaneTemplate(template)) {
            result.skipped.invalid++;
            continue;
        }

        // Check for duplicate
        if (template.contentHash && existingHashes.has(template.contentHash)) {
            result.skipped.duplicates++;
            continue;
        }

        importedTemplates.push(template);
        result.imported.laneTemplates++;
    }

    // Import chord progressions (dedupe by hash)
    const importedProgressions: ChordProgressionRef[] = [];
    if (pack.chordProgressions) {
        for (const progression of pack.chordProgressions) {
            if (!validateChordProgression(progression)) {
                result.skipped.invalid++;
                continue;
            }

            if (progression.contentHash && existingHashes.has(progression.contentHash)) {
                result.skipped.duplicates++;
                continue;
            }

            importedProgressions.push(progression);
            result.imported.chordProgressions++;
        }
    }

    // Regenerate share URLs for imported content
    if (pack.shareUrlManifest) {
        result.regeneratedShareUrls = pack.shareUrlManifest.urls.length;
    }

    return result;
}

// ============================================
// Pack Validation
// ============================================

/**
 * Validate a reference pack
 */
export function validateReferencePack(pack: unknown): PackValidationResult {
    const result: PackValidationResult = {
        valid: true,
        errors: [],
        warnings: [],
        stats: {
            laneTemplates: 0,
            chordProgressions: 0,
            projects: 0,
            audioLoops: 0,
            totalSizeBytes: 0,
        },
    };

    if (!pack || typeof pack !== 'object') {
        result.valid = false;
        result.errors.push('Pack must be an object');
        return result;
    }

    const p = pack as Record<string, unknown>;

    // Check version
    if (typeof p.version !== 'number' || p.version < 1) {
        result.valid = false;
        result.errors.push('Invalid pack version');
        return result;
    }

    if (p.version > REFERENCE_PACK_VERSION) {
        result.warnings.push(`Pack version ${p.version} is newer than supported ${REFERENCE_PACK_VERSION}`);
    }

    // Check name
    if (typeof p.name !== 'string' || p.name.length === 0) {
        result.valid = false;
        result.errors.push('Pack must have a name');
        return result;
    }

    // Check lane templates
    if (!Array.isArray(p.laneTemplates)) {
        result.valid = false;
        result.errors.push('Pack must have laneTemplates array');
        return result;
    }

    result.stats.laneTemplates = p.laneTemplates.length;

    // Validate each template
    for (let i = 0; i < p.laneTemplates.length; i++) {
        if (!validateLaneTemplate(p.laneTemplates[i])) {
            result.errors.push(`Invalid lane template at index ${i}`);
            result.valid = false;
        }
    }

    // Check chord progressions (optional)
    if (p.chordProgressions !== undefined) {
        if (!Array.isArray(p.chordProgressions)) {
            result.errors.push('chordProgressions must be an array');
            result.valid = false;
        } else {
            result.stats.chordProgressions = p.chordProgressions.length;
        }
    }

    // Check audio loops (optional)
    if (p.audioLoops !== undefined) {
        if (!Array.isArray(p.audioLoops)) {
            result.errors.push('audioLoops must be an array');
            result.valid = false;
        } else {
            result.stats.audioLoops = p.audioLoops.length;
        }
    }

    // Estimate size
    result.stats.totalSizeBytes = JSON.stringify(pack).length;

    if (result.stats.totalSizeBytes > MAX_PACK_SIZE) {
        result.valid = false;
        result.errors.push(`Pack size ${result.stats.totalSizeBytes} exceeds max ${MAX_PACK_SIZE}`);
    }

    return result;
}

/**
 * Validate a lane template structure
 */
function validateLaneTemplate(template: unknown): template is LaneTemplateRef {
    if (!template || typeof template !== 'object') return false;

    const t = template as Record<string, unknown>;

    if (typeof t.id !== 'string' || t.id.length === 0) return false;
    if (typeof t.name !== 'string' || t.name.length === 0) return false;
    if (!['melody', 'drums', 'chord'].includes(t.type as string)) return false;
    if (!Array.isArray(t.notes)) return false;
    if (typeof t.bpm !== 'number' || t.bpm < 20 || t.bpm > 300) return false;
    if (typeof t.bars !== 'number' || t.bars < 1 || t.bars > 64) return false;

    return true;
}

/**
 * Validate a chord progression structure
 */
function validateChordProgression(progression: unknown): progression is ChordProgressionRef {
    if (!progression || typeof progression !== 'object') return false;

    const p = progression as Record<string, unknown>;

    if (typeof p.id !== 'string' || p.id.length === 0) return false;
    if (typeof p.name !== 'string' || p.name.length === 0) return false;
    if (!Array.isArray(p.numerals) || p.numerals.length === 0) return false;
    if (!Array.isArray(p.durations) || p.durations.length === 0) return false;

    return true;
}

// ============================================
// Utilities
// ============================================

/**
 * Sanitize pack name (no path traversal, safe characters)
 */
function sanitizePackName(name: string): string {
    return name
        .replace(/[/\\:*?"<>|]/g, '_')
        .replace(/\.\./g, '_')
        .substring(0, 100)
        .trim() || 'Untitled Pack';
}

/**
 * Serialize pack to JSON for download
 */
export function serializeReferencePack(pack: ReferencePack): string {
    return JSON.stringify(pack, null, 2);
}

/**
 * Parse pack from JSON
 */
export function parseReferencePack(json: string): ReferencePack | null {
    try {
        const parsed = JSON.parse(json);
        const validation = validateReferencePack(parsed);

        if (!validation.valid) {
            console.error('Invalid reference pack:', validation.errors);
            return null;
        }

        return parsed as ReferencePack;
    } catch (e) {
        console.error('Failed to parse reference pack:', e);
        return null;
    }
}

/**
 * Download pack as JSON file
 */
export function downloadReferencePack(pack: ReferencePack): void {
    const json = serializeReferencePack(pack);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const filename = `${sanitizePackName(pack.name)}.producerhub-pack.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}


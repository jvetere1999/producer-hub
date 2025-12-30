/**
 * Vault Bundle Export/Import
 *
 * Handles exporting and importing vault bundles with Lane Builder entities.
 * Bundles are encrypted containers that can be transferred between devices.
 *
 * Security:
 * - Never stores passphrases
 * - Validates bundle schema and sizes
 * - Enforces blob/type allowlists
 */

import type {
    VaultMeta,
    VaultManifest,
    BlobEntry,
    LaneTemplateRef,
    ChordProgressionRef,
    AudioLoopRef,
    ProjectClipRefEntry,
    SyncNote,
    SyncLaneSettings,
} from './vaultTypes';
import {
    VAULT_SCHEMA_VERSION,
    ALLOWED_BLOB_MIME_TYPES,
    MAX_BLOB_SIZE,
    MAX_BUNDLE_SIZE,
} from './vaultTypes';
import { encryptJson, decryptJson } from './crypto';
import type { StorageAdapter } from './adapter';

// ============================================
// Bundle Types
// ============================================

export interface VaultBundle {
    version: typeof VAULT_SCHEMA_VERSION;
    createdAt: string;
    deviceId: string;

    // Encrypted metadata envelope
    metadataEnvelope: string; // Base64 encrypted VaultMeta

    // Blob manifest
    manifest: VaultManifest;

    // Blob data (base64 encoded)
    blobs: Record<string, string>;
}

export interface BundleValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    stats: {
        projects: number;
        laneTemplates: number;
        chordProgressions: number;
        audioLoops: number;
        projectClips: number;
        blobs: number;
        totalSize: number;
    };
}

export interface ExportOptions {
    includeBlobs?: boolean;
    includeProjects?: boolean;
    includeLaneTemplates?: boolean;
    includeChordProgressions?: boolean;
    includeAudioLoops?: boolean;
    includeProjectClips?: boolean;
    projectIds?: string[]; // Specific projects to export
}

export interface ImportResult {
    success: boolean;
    imported: {
        projects: number;
        laneTemplates: number;
        chordProgressions: number;
        audioLoops: number;
        projectClips: number;
        blobs: number;
    };
    skipped: {
        duplicates: number;
        invalid: number;
    };
    errors: string[];
}

// ============================================
// Content Hash Generation
// ============================================

/**
 * Generate content hash for lane template (for conflict detection)
 */
export async function generateLaneTemplateHash(
    notes: SyncNote[],
    settings: SyncLaneSettings
): Promise<string> {
    const content = JSON.stringify({
        notes: notes.map(n => ({
            p: n.pitch,
            s: n.startBeat,
            d: n.duration,
            v: n.velocity
        })),
        settings: {
            i: settings.instrumentId,
            m: settings.noteMode,
            v: settings.velocityDefault,
            q: settings.quantizeGrid
        }
    });

    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

/**
 * Generate content hash for chord progression
 */
export async function generateProgressionHash(
    numerals: string[],
    durations: number[]
): Promise<string> {
    const content = JSON.stringify({ n: numerals, d: durations });
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

// ============================================
// Bundle Export
// ============================================

/**
 * Export vault data to a bundle
 */
export async function exportBundle(
    adapter: StorageAdapter,
    passphrase: string,
    options: ExportOptions = {}
): Promise<VaultBundle> {
    const {
        includeBlobs = true,
        includeProjects = true,
        includeLaneTemplates = true,
        includeChordProgressions = true,
        includeAudioLoops = true,
        includeProjectClips = true,
        projectIds,
    } = options;

    // Get metadata
    const meta = await adapter.get<VaultMeta>('vault_meta');
    if (!meta) {
        throw new Error('No vault metadata found');
    }

    // Filter metadata based on options
    const filteredMeta: VaultMeta = {
        schemaVersion: VAULT_SCHEMA_VERSION,
        deviceId: meta.deviceId,
        updatedAt: meta.updatedAt,
        settings: meta.settings,
    };

    if (includeProjects) {
        let projects = meta.projects || [];
        if (projectIds && projectIds.length > 0) {
            projects = projects.filter(p => projectIds.includes(p.id));
        }
        filteredMeta.projects = projects;
    }

    if (includeLaneTemplates) {
        filteredMeta.laneTemplates = meta.laneTemplates;
    }

    if (includeChordProgressions) {
        filteredMeta.chordProgressions = meta.chordProgressions;
    }

    if (includeAudioLoops) {
        filteredMeta.audioLoops = meta.audioLoops;
    }

    if (includeProjectClips) {
        // Filter clips to only those referencing included projects
        let clips = meta.projectClips || [];
        if (projectIds && projectIds.length > 0) {
            clips = clips.filter(c => projectIds.includes(c.projectId));
        }
        filteredMeta.projectClips = clips;
    }

    // Encrypt metadata
    const metadataEnvelope = await encryptJson(filteredMeta, passphrase);

    // Build blob manifest and export blobs
    const blobs: Record<string, string> = {};
    const manifest: VaultManifest = {
        schemaVersion: VAULT_SCHEMA_VERSION,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        blobs: {},
    };

    if (includeBlobs) {
        const blobRefs = await adapter.listBlobs();

        // Collect blob IDs to include
        const blobIdsToInclude = new Set<string>();

        // Add project blobs
        if (filteredMeta.projects) {
            for (const project of filteredMeta.projects) {
                for (const blobId of project.blobIds) {
                    blobIdsToInclude.add(blobId);
                }
            }
        }

        // Add audio loop blobs
        if (filteredMeta.audioLoops) {
            for (const loop of filteredMeta.audioLoops) {
                blobIdsToInclude.add(loop.blobId);
            }
        }

        // Export blobs
        for (const ref of blobRefs) {
            if (blobIdsToInclude.has(ref.id)) {
                // Validate blob type
                if (!isAllowedBlobType(ref.mimeType)) {
                    continue;
                }

                // Validate size
                if (ref.size > MAX_BLOB_SIZE) {
                    continue;
                }

                const data = await adapter.getBlob(ref.id);
                if (data) {
                    blobs[ref.id] = arrayBufferToBase64(data);
                    manifest.blobs[ref.id] = {
                        id: ref.id,
                        size: ref.size,
                        mimeType: ref.mimeType,
                        createdAt: ref.createdAt,
                        checksum: ref.id, // ID is the hash
                    };
                }
            }
        }
    }

    const bundle: VaultBundle = {
        version: VAULT_SCHEMA_VERSION,
        createdAt: new Date().toISOString(),
        deviceId: meta.deviceId,
        metadataEnvelope: JSON.stringify(metadataEnvelope),
        manifest,
        blobs,
    };

    // Validate bundle size
    const bundleSize = JSON.stringify(bundle).length;
    if (bundleSize > MAX_BUNDLE_SIZE) {
        throw new Error(`Bundle size (${bundleSize}) exceeds maximum allowed (${MAX_BUNDLE_SIZE})`);
    }

    return bundle;
}

// ============================================
// Bundle Import
// ============================================

/**
 * Import a vault bundle
 */
export async function importBundle(
    adapter: StorageAdapter,
    bundle: VaultBundle,
    passphrase: string
): Promise<ImportResult> {
    const result: ImportResult = {
        success: false,
        imported: {
            projects: 0,
            laneTemplates: 0,
            chordProgressions: 0,
            audioLoops: 0,
            projectClips: 0,
            blobs: 0,
        },
        skipped: {
            duplicates: 0,
            invalid: 0,
        },
        errors: [],
    };

    try {
        // Validate bundle
        const validation = validateBundle(bundle);
        if (!validation.valid) {
            result.errors = validation.errors;
            return result;
        }

        // Decrypt metadata
        const envelope = JSON.parse(bundle.metadataEnvelope);
        const importedMeta = await decryptJson<VaultMeta>(envelope, passphrase);

        if (!importedMeta) {
            result.errors.push('Failed to decrypt bundle - incorrect passphrase?');
            return result;
        }

        // Get existing metadata
        const existingMeta = await adapter.get<VaultMeta>('vault_meta') || {
            schemaVersion: VAULT_SCHEMA_VERSION,
            deviceId: '',
            updatedAt: new Date().toISOString(),
        };

        // Import blobs first (they're referenced by entities)
        for (const [blobId, blobData] of Object.entries(bundle.blobs)) {
            const blobMeta = bundle.manifest.blobs[blobId];

            // Validate blob type
            if (!blobMeta || !isAllowedBlobType(blobMeta.mimeType)) {
                result.skipped.invalid++;
                continue;
            }

            // Check if blob already exists
            if (await adapter.hasBlob(blobId)) {
                result.skipped.duplicates++;
                continue;
            }

            // Import blob
            const data = base64ToArrayBuffer(blobData);
            await adapter.putBlob(data, blobMeta.mimeType);
            result.imported.blobs++;
        }

        // Merge entities
        const mergedMeta = mergeImportedMeta(existingMeta, importedMeta, result);

        // Save merged metadata
        mergedMeta.updatedAt = new Date().toISOString();
        await adapter.set('vault_meta', mergedMeta);

        result.success = true;
        return result;
    } catch (error) {
        result.errors.push(error instanceof Error ? error.message : 'Unknown error');
        return result;
    }
}

/**
 * Merge imported metadata into existing
 */
function mergeImportedMeta(
    existing: VaultMeta,
    imported: VaultMeta,
    result: ImportResult
): VaultMeta {
    const merged: VaultMeta = { ...existing };

    // Merge projects
    if (imported.projects) {
        const existingIds = new Set((existing.projects || []).map(p => p.id));
        const newProjects = imported.projects.filter(p => !existingIds.has(p.id));
        merged.projects = [...(existing.projects || []), ...newProjects];
        result.imported.projects = newProjects.length;
        result.skipped.duplicates += imported.projects.length - newProjects.length;
    }

    // Merge lane templates
    if (imported.laneTemplates) {
        const existingIds = new Set((existing.laneTemplates || []).map(t => t.id));
        const newTemplates = imported.laneTemplates.filter(t => !existingIds.has(t.id));
        merged.laneTemplates = [...(existing.laneTemplates || []), ...newTemplates];
        result.imported.laneTemplates = newTemplates.length;
    }

    // Merge chord progressions
    if (imported.chordProgressions) {
        const existingIds = new Set((existing.chordProgressions || []).map(p => p.id));
        const newProgressions = imported.chordProgressions.filter(p => !existingIds.has(p.id));
        merged.chordProgressions = [...(existing.chordProgressions || []), ...newProgressions];
        result.imported.chordProgressions = newProgressions.length;
    }

    // Merge audio loops (dedupe by hash)
    if (imported.audioLoops) {
        const existingHashes = new Set((existing.audioLoops || []).map(l => l.blobHash));
        const newLoops = imported.audioLoops.filter(l => !existingHashes.has(l.blobHash));
        merged.audioLoops = [...(existing.audioLoops || []), ...newLoops];
        result.imported.audioLoops = newLoops.length;
    }

    // Merge project clips
    if (imported.projectClips) {
        const existingIds = new Set((existing.projectClips || []).map(c => c.id));
        const newClips = imported.projectClips.filter(c => !existingIds.has(c.id));
        merged.projectClips = [...(existing.projectClips || []), ...newClips];
        result.imported.projectClips = newClips.length;
    }

    return merged;
}

// ============================================
// Bundle Validation
// ============================================

/**
 * Validate a bundle before import
 */
export function validateBundle(bundle: unknown): BundleValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const stats = {
        projects: 0,
        laneTemplates: 0,
        chordProgressions: 0,
        audioLoops: 0,
        projectClips: 0,
        blobs: 0,
        totalSize: 0,
    };

    if (!bundle || typeof bundle !== 'object') {
        errors.push('Bundle is not a valid object');
        return { valid: false, errors, warnings, stats };
    }

    const b = bundle as Record<string, unknown>;

    // Check version
    if (typeof b.version !== 'number') {
        errors.push('Bundle version is missing or invalid');
    } else if (b.version > VAULT_SCHEMA_VERSION) {
        errors.push(`Bundle version ${b.version} is newer than supported ${VAULT_SCHEMA_VERSION}`);
    }

    // Check metadata envelope
    if (typeof b.metadataEnvelope !== 'string') {
        errors.push('Metadata envelope is missing or invalid');
    }

    // Check manifest
    if (!b.manifest || typeof b.manifest !== 'object') {
        errors.push('Manifest is missing or invalid');
    } else {
        const manifest = b.manifest as VaultManifest;
        if (manifest.blobs) {
            stats.blobs = Object.keys(manifest.blobs).length;

            // Validate blob entries
            for (const [id, entry] of Object.entries(manifest.blobs)) {
                if (!isAllowedBlobType(entry.mimeType)) {
                    warnings.push(`Blob ${id} has disallowed MIME type: ${entry.mimeType}`);
                }
                if (entry.size > MAX_BLOB_SIZE) {
                    warnings.push(`Blob ${id} exceeds maximum size: ${entry.size}`);
                }
            }
        }
    }

    // Check blobs
    if (b.blobs && typeof b.blobs === 'object') {
        const blobs = b.blobs as Record<string, string>;
        for (const [id, data] of Object.entries(blobs)) {
            if (typeof data !== 'string') {
                errors.push(`Blob ${id} data is not a string`);
            } else {
                stats.totalSize += data.length;
            }
        }
    }

    // Check total size
    if (stats.totalSize > MAX_BUNDLE_SIZE) {
        errors.push(`Bundle total size (${stats.totalSize}) exceeds maximum (${MAX_BUNDLE_SIZE})`);
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
        stats,
    };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Check if MIME type is allowed for blobs
 */
export function isAllowedBlobType(mimeType: string): boolean {
    return (ALLOWED_BLOB_MIME_TYPES as readonly string[]).includes(mimeType);
}

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Generate a blob ID (SHA-256 hash)
 */
export async function generateBlobId(data: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}


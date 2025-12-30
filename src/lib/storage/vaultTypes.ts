/**
 * Vault Type Definitions
 *
 * Defines the structure for encrypted vault storage format.
 * Includes Lane Builder entities for unified templater sync.
 */

// ============================================
// Schema Version
// ============================================

export const VAULT_SCHEMA_VERSION = 2;

// ============================================
// Blob Allowlists for Security
// ============================================

export const ALLOWED_BLOB_MIME_TYPES = [
    'audio/wav',
    'audio/mpeg',
    'audio/mp3',
    'audio/ogg',
    'audio/webm',
    'audio/aac',
    'audio/flac',
    'application/octet-stream', // For binary audio data
] as const;

export const MAX_BLOB_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_BUNDLE_SIZE = 500 * 1024 * 1024; // 500MB

/**
 * Vault metadata - synced state information
 */
export interface VaultMeta {
    schemaVersion: typeof VAULT_SCHEMA_VERSION;
    deviceId: string;
    updatedAt: string;

    // State references
    projects?: ProjectRef[];
    referenceLibraries?: LibraryRef[];
    infobase?: InfobaseRef[];
    settings?: SettingsRef;

    // Lane Builder entities (new in v2)
    laneTemplates?: LaneTemplateRef[];
    chordProgressions?: ChordProgressionRef[];
    audioLoops?: AudioLoopRef[];
    projectClips?: ProjectClipRefEntry[];
}

/**
 * Project reference in vault
 */
export interface ProjectRef {
    id: string;
    name: string;
    updatedAt: string;
    blobIds: string[];
    // New: attached clip references
    clipRefs?: string[]; // IDs of attached ProjectClipRefEntry
}

/**
 * Reference library entry
 */
export interface LibraryRef {
    id: string;
    name: string;
    updatedAt: string;
    trackIds: string[];
}

/**
 * Infobase entry reference
 */
export interface InfobaseRef {
    id: string;
    title: string;
    updatedAt: string;
}

/**
 * Settings reference
 */
export interface SettingsRef {
    updatedAt: string;
    themeId: string;
    selectedProductIds: string[];
}

// ============================================
// Lane Builder Entity Types
// ============================================

export type LaneTemplateType = 'melody' | 'drums' | 'chord';

/**
 * Standardized note model for all lane types
 */
export interface SyncNote {
    pitch: number;      // MIDI note number
    startBeat: number;  // Position in beats
    duration: number;   // Duration in beats
    velocity: number;   // 1-127
}

/**
 * Lane settings for templates
 */
export interface SyncLaneSettings {
    instrumentId: string;
    noteMode: 'oneShot' | 'sustain';
    velocityDefault: number;
    quantizeGrid: '1/4' | '1/8' | '1/16' | '1/32' | 'off';
    color: string;
}

/**
 * Lane template reference (drum/melody patterns)
 */
export interface LaneTemplateRef {
    id: string;
    name: string;
    type: LaneTemplateType;
    updatedAt: string;
    createdAt: string;

    // Lane settings
    laneSettings: SyncLaneSettings;

    // Standardized note model
    notes: SyncNote[];

    // Metadata
    bpm: number;
    bars: number;
    timeSignature: [number, number];
    key: string;
    scaleType: string;

    // Tags for organization
    tags?: string[];
    genre?: string;

    // Content hash for merge conflict detection
    contentHash: string;
}

/**
 * Chord progression template reference
 */
export interface ChordProgressionRef {
    id: string;
    name: string;
    updatedAt: string;
    createdAt: string;

    // Progression data
    numerals: string[];      // e.g., ['I', 'V', 'vi', 'IV']
    durations: number[];     // Duration of each chord in beats
    rhythmPattern: string;   // Pattern identifier

    // Metadata
    genre: string;
    description: string;
    key: string;
    scaleType: string;

    // Content hash
    contentHash: string;
}

/**
 * Audio loop reference
 */
export interface AudioLoopRef {
    id: string;
    name: string;
    updatedAt: string;
    createdAt: string;

    // Blob reference
    blobId: string;
    blobHash: string;

    // Audio metadata
    mimeType: string;
    durationMs: number;
    sampleRate: number;
    channels: number;

    // Musical metadata
    bpm?: number;
    key?: string;
    bars?: number;

    // Organization
    tags?: string[];
}

/**
 * Project clip reference entry (links to lanes)
 */
export interface ProjectClipRefEntry {
    id: string;
    projectId: string;
    updatedAt: string;
    createdAt: string;

    // Reference to source
    sourceType: 'laneTemplate' | 'audioLoop';
    sourceId: string;

    // Position in project
    startBar: number;
    lengthBars: number;

    // Override settings (optional)
    laneSettingsOverride?: Partial<SyncLaneSettings>;
}

/**
 * Vault manifest - blob index
 */
export interface VaultManifest {
    schemaVersion: typeof VAULT_SCHEMA_VERSION;
    createdAt: string;
    updatedAt: string;

    // Blob index: id -> metadata
    blobs: Record<string, BlobEntry>;
}

/**
 * Blob entry in manifest
 */
export interface BlobEntry {
    id: string;
    size: number;
    mimeType: string;
    createdAt: string;
    checksum: string;
    // New: type hint for blob content
    contentType?: 'audioLoop' | 'reference' | 'other';
}

/**
 * KDF (Key Derivation Function) parameters
 */
export interface KDFParams {
    algorithm: 'PBKDF2';
    hash: 'SHA-256';
    iterations: number;
    salt: string; // Base64 encoded
}

/**
 * Vault envelope - encrypted container
 */
export interface VaultEnvelope {
    version: 1;
    kdf: KDFParams;
    iv: string;           // Base64 encoded initialization vector
    ciphertext: string;   // Base64 encoded encrypted payload
    tag: string;          // Base64 encoded auth tag (for AES-GCM)
}

/**
 * Conflict record
 */
export interface ConflictRecord {
    entityType: 'project' | 'library' | 'infobase' | 'settings' | 'laneTemplate' | 'chordProgression' | 'audioLoop' | 'projectClip';
    entityId: string;
    localValue: unknown;
    remoteValue: unknown;
    localDeviceId: string;
    remoteDeviceId: string;
    localUpdatedAt: string;
    remoteUpdatedAt: string;
    resolvedAt?: string;
    resolution?: 'local' | 'remote' | 'merged';
    conflictReason?: 'notes_diverged' | 'settings_conflict' | 'content_hash_mismatch' | 'concurrent_edit';
}

/**
 * Sync operation result
 */
export interface SyncResult {
    success: boolean;
    timestamp: string;
    uploaded: number;
    downloaded: number;
    conflicts: ConflictRecord[];
    error?: string;
}

/**
 * Default KDF parameters (secure defaults)
 */
export const DEFAULT_KDF_PARAMS: Omit<KDFParams, 'salt'> = {
    algorithm: 'PBKDF2',
    hash: 'SHA-256',
    iterations: 100000
};

/**
 * Generate a unique device ID
 */
export function generateDeviceId(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get or create device ID
 */
export function getDeviceId(): string {
    const key = 'ph_device_id';
    let deviceId = localStorage.getItem(key);

    if (!deviceId) {
        deviceId = generateDeviceId();
        localStorage.setItem(key, deviceId);
    }

    return deviceId;
}


/**
 * Vault Type Definitions
 *
 * Defines the structure for encrypted vault storage format.
 */

/**
 * Vault metadata - synced state information
 */
export interface VaultMeta {
    schemaVersion: 1;
    deviceId: string;
    updatedAt: string;

    // State references
    projects?: ProjectRef[];
    referenceLibraries?: LibraryRef[];
    infobase?: InfobaseRef[];
    settings?: SettingsRef;
}

/**
 * Project reference in vault
 */
export interface ProjectRef {
    id: string;
    name: string;
    updatedAt: string;
    blobIds: string[];
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

/**
 * Vault manifest - blob index
 */
export interface VaultManifest {
    schemaVersion: 1;
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
    entityType: 'project' | 'library' | 'infobase' | 'settings';
    entityId: string;
    localValue: unknown;
    remoteValue: unknown;
    localDeviceId: string;
    remoteDeviceId: string;
    localUpdatedAt: string;
    remoteUpdatedAt: string;
    resolvedAt?: string;
    resolution?: 'local' | 'remote' | 'merged';
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


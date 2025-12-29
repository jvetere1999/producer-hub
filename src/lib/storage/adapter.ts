/**
 * Storage Adapter Interface
 *
 * Defines the contract for storage adapters (Local, iCloud Folder, Vault Bundle).
 * All adapters must implement this interface.
 */

/**
 * Blob reference with metadata
 */
export interface BlobRef {
    id: string;           // SHA256 hash
    size: number;
    mimeType: string;
    createdAt: string;
}

/**
 * Sync status for tracking sync state
 */
export interface SyncStatus {
    lastSyncAt: string | null;
    lastError: string | null;
    conflictsCount: number;
    pendingChanges: number;
}

/**
 * Storage adapter capabilities
 */
export interface AdapterCapabilities {
    supportsBlobs: boolean;
    supportsEncryption: boolean;
    supportsSync: boolean;
    maxBlobSize: number;
}

/**
 * Storage adapter interface
 */
export interface StorageAdapter {
    /** Adapter identifier */
    readonly kind: 'local' | 'icloud-folder' | 'vault-bundle';

    /** Adapter capabilities */
    readonly capabilities: AdapterCapabilities;

    /** Initialize the adapter */
    init(): Promise<void>;

    /** Check if adapter is ready for operations */
    isReady(): boolean;

    // ============================================
    // Key-Value Operations
    // ============================================

    /** Get a value by key */
    get<T>(key: string): Promise<T | null>;

    /** Set a value by key */
    set<T>(key: string, value: T): Promise<void>;

    /** Delete a key */
    delete(key: string): Promise<void>;

    /** Check if key exists */
    has(key: string): Promise<boolean>;

    /** List all keys with optional prefix */
    keys(prefix?: string): Promise<string[]>;

    // ============================================
    // Blob Operations (for audio files, etc.)
    // ============================================

    /** Store a blob and return its reference */
    putBlob(data: ArrayBuffer, mimeType: string): Promise<BlobRef>;

    /** Get a blob by ID */
    getBlob(id: string): Promise<ArrayBuffer | null>;

    /** Delete a blob */
    deleteBlob(id: string): Promise<void>;

    /** Check if blob exists */
    hasBlob(id: string): Promise<boolean>;

    /** List all blob references */
    listBlobs(): Promise<BlobRef[]>;

    // ============================================
    // Sync Operations
    // ============================================

    /** Get current sync status */
    getSyncStatus(): Promise<SyncStatus>;

    /** Trigger a sync operation */
    sync(): Promise<void>;

    /** Get pending changes count */
    getPendingChanges(): Promise<number>;
}

/**
 * Base adapter class with common utilities
 */
export abstract class BaseAdapter implements StorageAdapter {
    abstract readonly kind: 'local' | 'icloud-folder' | 'vault-bundle';
    abstract readonly capabilities: AdapterCapabilities;

    protected initialized = false;

    abstract init(): Promise<void>;

    isReady(): boolean {
        return this.initialized;
    }

    abstract get<T>(key: string): Promise<T | null>;
    abstract set<T>(key: string, value: T): Promise<void>;
    abstract delete(key: string): Promise<void>;
    abstract has(key: string): Promise<boolean>;
    abstract keys(prefix?: string): Promise<string[]>;

    abstract putBlob(data: ArrayBuffer, mimeType: string): Promise<BlobRef>;
    abstract getBlob(id: string): Promise<ArrayBuffer | null>;
    abstract deleteBlob(id: string): Promise<void>;
    abstract hasBlob(id: string): Promise<boolean>;
    abstract listBlobs(): Promise<BlobRef[]>;

    abstract getSyncStatus(): Promise<SyncStatus>;
    abstract sync(): Promise<void>;
    abstract getPendingChanges(): Promise<number>;

    /**
     * Compute SHA256 hash of data
     */
    protected async computeHash(data: ArrayBuffer): Promise<string> {
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
}


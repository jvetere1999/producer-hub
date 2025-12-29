/**
 * Local Storage Adapter
 *
 * Implements the StorageAdapter interface using localStorage for key-value
 * storage and IndexedDB for blob storage.
 */

import { BaseAdapter, type BlobRef, type SyncStatus, type AdapterCapabilities } from './adapter';

const KV_PREFIX = 'ph_kv_';
const BLOB_DB_NAME = 'producer_hub_blobs';
const BLOB_STORE_NAME = 'blobs';
const BLOB_META_KEY = 'ph_blob_meta';

/**
 * Local adapter using localStorage + IndexedDB
 */
export class LocalAdapter extends BaseAdapter {
    readonly kind = 'local' as const;

    readonly capabilities: AdapterCapabilities = {
        supportsBlobs: true,
        supportsEncryption: false,
        supportsSync: false,
        maxBlobSize: 100 * 1024 * 1024 // 100MB
    };

    private db: IDBDatabase | null = null;
    private blobMeta: Map<string, BlobRef> = new Map();

    async init(): Promise<void> {
        if (this.initialized) return;

        // Load blob metadata from localStorage
        this.loadBlobMeta();

        // Open IndexedDB for blob storage
        await this.openDatabase();

        this.initialized = true;
    }

    private loadBlobMeta(): void {
        try {
            const stored = localStorage.getItem(BLOB_META_KEY);
            if (stored) {
                const entries = JSON.parse(stored) as [string, BlobRef][];
                this.blobMeta = new Map(entries);
            }
        } catch (e) {
            console.warn('Failed to load blob metadata:', e);
        }
    }

    private saveBlobMeta(): void {
        try {
            const entries = Array.from(this.blobMeta.entries());
            localStorage.setItem(BLOB_META_KEY, JSON.stringify(entries));
        } catch (e) {
            console.warn('Failed to save blob metadata:', e);
        }
    }

    private openDatabase(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (typeof indexedDB === 'undefined') {
                // IndexedDB not available, blobs won't persist
                resolve();
                return;
            }

            const request = indexedDB.open(BLOB_DB_NAME, 1);

            request.onerror = () => {
                console.warn('IndexedDB not available, blobs won\'t persist');
                resolve();
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(BLOB_STORE_NAME)) {
                    db.createObjectStore(BLOB_STORE_NAME);
                }
            };
        });
    }

    // ============================================
    // Key-Value Operations
    // ============================================

    async get<T>(key: string): Promise<T | null> {
        try {
            const stored = localStorage.getItem(KV_PREFIX + key);
            return stored ? JSON.parse(stored) : null;
        } catch (e) {
            console.warn(`Failed to get key ${key}:`, e);
            return null;
        }
    }

    async set<T>(key: string, value: T): Promise<void> {
        try {
            localStorage.setItem(KV_PREFIX + key, JSON.stringify(value));
        } catch (e) {
            console.warn(`Failed to set key ${key}:`, e);
            throw e;
        }
    }

    async delete(key: string): Promise<void> {
        localStorage.removeItem(KV_PREFIX + key);
    }

    async has(key: string): Promise<boolean> {
        return localStorage.getItem(KV_PREFIX + key) !== null;
    }

    async keys(prefix?: string): Promise<string[]> {
        const fullPrefix = KV_PREFIX + (prefix || '');
        const result: string[] = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(fullPrefix)) {
                result.push(key.slice(KV_PREFIX.length));
            }
        }

        return result;
    }

    // ============================================
    // Blob Operations
    // ============================================

    async putBlob(data: ArrayBuffer, mimeType: string): Promise<BlobRef> {
        const id = await this.computeHash(data);

        const ref: BlobRef = {
            id,
            size: data.byteLength,
            mimeType,
            createdAt: new Date().toISOString()
        };

        // Store in IndexedDB
        if (this.db) {
            await new Promise<void>((resolve, reject) => {
                const tx = this.db!.transaction(BLOB_STORE_NAME, 'readwrite');
                const store = tx.objectStore(BLOB_STORE_NAME);
                const request = store.put(data, id);

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }

        // Store metadata
        this.blobMeta.set(id, ref);
        this.saveBlobMeta();

        return ref;
    }

    async getBlob(id: string): Promise<ArrayBuffer | null> {
        if (!this.db) return null;

        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction(BLOB_STORE_NAME, 'readonly');
            const store = tx.objectStore(BLOB_STORE_NAME);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteBlob(id: string): Promise<void> {
        if (this.db) {
            await new Promise<void>((resolve, reject) => {
                const tx = this.db!.transaction(BLOB_STORE_NAME, 'readwrite');
                const store = tx.objectStore(BLOB_STORE_NAME);
                const request = store.delete(id);

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }

        this.blobMeta.delete(id);
        this.saveBlobMeta();
    }

    async hasBlob(id: string): Promise<boolean> {
        return this.blobMeta.has(id);
    }

    async listBlobs(): Promise<BlobRef[]> {
        return Array.from(this.blobMeta.values());
    }

    // ============================================
    // Sync Operations (no-op for local)
    // ============================================

    async getSyncStatus(): Promise<SyncStatus> {
        return {
            lastSyncAt: null,
            lastError: null,
            conflictsCount: 0,
            pendingChanges: 0
        };
    }

    async sync(): Promise<void> {
        // No-op for local storage
    }

    async getPendingChanges(): Promise<number> {
        return 0;
    }
}

/**
 * Singleton instance
 */
let localAdapter: LocalAdapter | null = null;

export function getLocalAdapter(): LocalAdapter {
    if (!localAdapter) {
        localAdapter = new LocalAdapter();
    }
    return localAdapter;
}


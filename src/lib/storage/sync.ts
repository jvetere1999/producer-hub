/**
 * Sync Engine
 *
 * Handles synchronization between local storage and remote vault.
 * Implements last-write-wins merge strategy with conflict detection.
 */

import type { StorageAdapter } from './adapter';
import type { VaultMeta, ConflictRecord, SyncResult, ProjectRef, LibraryRef, InfobaseRef } from './vaultTypes';
import { getDeviceId } from './vaultTypes';


/**
 * Sync engine configuration
 */
export interface SyncConfig {
    localAdapter: StorageAdapter;
    remoteAdapter: StorageAdapter;
    onConflict?: (conflict: ConflictRecord) => Promise<'local' | 'remote' | 'skip'>;
    onProgress?: (stage: string, progress: number) => void;
}

/**
 * Sync engine class
 */
export class SyncEngine {
    private local: StorageAdapter;
    private remote: StorageAdapter;
    private onConflict: SyncConfig['onConflict'];
    private onProgress: SyncConfig['onProgress'];
    private deviceId: string;

    constructor(config: SyncConfig) {
        this.local = config.localAdapter;
        this.remote = config.remoteAdapter;
        this.onConflict = config.onConflict;
        this.onProgress = config.onProgress;
        this.deviceId = getDeviceId();
    }

    /**
     * Perform a full sync operation
     */
    async sync(): Promise<SyncResult> {
        const startTime = new Date().toISOString();
        const conflicts: ConflictRecord[] = [];
        let uploaded = 0;
        let downloaded = 0;

        try {
            this.progress('Initializing', 0);

            // Ensure both adapters are ready
            if (!this.local.isReady()) await this.local.init();
            if (!this.remote.isReady()) await this.remote.init();

            this.progress('Loading metadata', 0.1);

            // Get local and remote metadata
            const localMeta = await this.local.get<VaultMeta>('vault_meta');
            const remoteMeta = await this.remote.get<VaultMeta>('vault_meta');

            this.progress('Merging data', 0.3);

            // Merge metadata
            const { merged, conflictsFound } = await this.mergeMeta(localMeta, remoteMeta);
            conflicts.push(...conflictsFound);

            this.progress('Syncing blobs', 0.5);

            // Sync blobs
            const blobResult = await this.syncBlobs();
            uploaded += blobResult.uploaded;
            downloaded += blobResult.downloaded;

            this.progress('Saving changes', 0.8);

            // Save merged metadata to both
            merged.updatedAt = new Date().toISOString();
            merged.deviceId = this.deviceId;

            await this.local.set('vault_meta', merged);
            await this.remote.set('vault_meta', merged);

            this.progress('Complete', 1);

            return {
                success: true,
                timestamp: startTime,
                uploaded,
                downloaded,
                conflicts
            };
        } catch (error) {
            return {
                success: false,
                timestamp: startTime,
                uploaded,
                downloaded,
                conflicts,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Merge metadata from local and remote
     */
    private async mergeMeta(
        local: VaultMeta | null,
        remote: VaultMeta | null
    ): Promise<{ merged: VaultMeta; conflictsFound: ConflictRecord[] }> {
        const conflicts: ConflictRecord[] = [];

        // If only one exists, use it
        if (!local && !remote) {
            return {
                merged: this.createEmptyMeta(),
                conflictsFound: []
            };
        }

        if (!local) {
            return { merged: remote!, conflictsFound: [] };
        }

        if (!remote) {
            return { merged: local, conflictsFound: [] };
        }

        // Both exist - merge with last-write-wins
        const merged: VaultMeta = {
            schemaVersion: 1,
            deviceId: this.deviceId,
            updatedAt: new Date().toISOString()
        };

        // Merge projects
        if (local.projects || remote.projects) {
            const { merged: mergedProjects, conflicts: projectConflicts } =
                this.mergeEntityList<ProjectRef>(local.projects || [], remote.projects || [], 'project', local.deviceId, remote.deviceId);
            merged.projects = mergedProjects;
            conflicts.push(...projectConflicts);
        }

        // Merge libraries
        if (local.referenceLibraries || remote.referenceLibraries) {
            const { merged: mergedLibraries, conflicts: libraryConflicts } =
                this.mergeEntityList<LibraryRef>(local.referenceLibraries || [], remote.referenceLibraries || [], 'library', local.deviceId, remote.deviceId);
            merged.referenceLibraries = mergedLibraries;
            conflicts.push(...libraryConflicts);
        }

        // Merge infobase
        if (local.infobase || remote.infobase) {
            const { merged: mergedInfobase, conflicts: infobaseConflicts } =
                this.mergeEntityList<InfobaseRef>(local.infobase || [], remote.infobase || [], 'infobase', local.deviceId, remote.deviceId);
            merged.infobase = mergedInfobase;
            conflicts.push(...infobaseConflicts);
        }

        // Merge settings (last-write-wins for the whole object)
        if (local.settings && remote.settings) {
            const localTime = new Date(local.settings.updatedAt).getTime();
            const remoteTime = new Date(remote.settings.updatedAt).getTime();

            if (localTime >= remoteTime) {
                merged.settings = local.settings;
            } else {
                merged.settings = remote.settings;
            }
        } else {
            merged.settings = local.settings || remote.settings;
        }

        return { merged, conflictsFound: conflicts };
    }

    /**
     * Merge a list of entities using last-write-wins
     */
    private mergeEntityList<T extends { id: string; updatedAt: string }>(
        local: T[],
        remote: T[],
        entityType: ConflictRecord['entityType'],
        localDeviceId: string,
        remoteDeviceId: string
    ): { merged: T[]; conflicts: ConflictRecord[] } {
        const conflicts: ConflictRecord[] = [];
        const merged = new Map<string, T>();

        // Add all local entities
        for (const entity of local) {
            merged.set(entity.id, entity);
        }

        // Merge remote entities
        for (const remoteEntity of remote) {
            const localEntity = merged.get(remoteEntity.id);

            if (!localEntity) {
                // Only exists remotely
                merged.set(remoteEntity.id, remoteEntity);
            } else {
                // Exists in both - compare timestamps
                const localTime = new Date(localEntity.updatedAt).getTime();
                const remoteTime = new Date(remoteEntity.updatedAt).getTime();

                if (Math.abs(localTime - remoteTime) < 1000) {
                    // Same time (within 1 second) but different content = conflict
                    if (JSON.stringify(localEntity) !== JSON.stringify(remoteEntity)) {
                        conflicts.push({
                            entityType,
                            entityId: localEntity.id,
                            localValue: localEntity,
                            remoteValue: remoteEntity,
                            localDeviceId,
                            remoteDeviceId,
                            localUpdatedAt: localEntity.updatedAt,
                            remoteUpdatedAt: remoteEntity.updatedAt
                        });
                        // Keep local by default
                    }
                } else if (remoteTime > localTime) {
                    // Remote is newer
                    merged.set(remoteEntity.id, remoteEntity);
                }
                // Otherwise keep local (already in map)
            }
        }

        return { merged: Array.from(merged.values()), conflicts };
    }

    /**
     * Sync blobs between local and remote
     */
    private async syncBlobs(): Promise<{ uploaded: number; downloaded: number }> {
        let uploaded = 0;
        let downloaded = 0;

        const localBlobs = await this.local.listBlobs();
        const remoteBlobs = await this.remote.listBlobs();

        const localIds = new Set(localBlobs.map(b => b.id));
        const remoteIds = new Set(remoteBlobs.map(b => b.id));

        // Upload blobs that exist locally but not remotely
        for (const blob of localBlobs) {
            if (!remoteIds.has(blob.id)) {
                const data = await this.local.getBlob(blob.id);
                if (data) {
                    await this.remote.putBlob(data, blob.mimeType);
                    uploaded++;
                }
            }
        }

        // Download blobs that exist remotely but not locally
        for (const blob of remoteBlobs) {
            if (!localIds.has(blob.id)) {
                const data = await this.remote.getBlob(blob.id);
                if (data) {
                    await this.local.putBlob(data, blob.mimeType);
                    downloaded++;
                }
            }
        }

        return { uploaded, downloaded };
    }

    /**
     * Create empty metadata
     */
    private createEmptyMeta(): VaultMeta {
        return {
            schemaVersion: 1,
            deviceId: this.deviceId,
            updatedAt: new Date().toISOString()
        };
    }

    /**
     * Report progress
     */
    private progress(stage: string, progress: number): void {
        if (this.onProgress) {
            this.onProgress(stage, progress);
        }
    }
}

/**
 * Create a sync engine instance
 */
export function createSyncEngine(config: SyncConfig): SyncEngine {
    return new SyncEngine(config);
}


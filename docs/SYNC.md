# Sync System Documentation

This document describes the iCloud sync implementation for Producer Hub.

## Overview

Producer Hub uses a **local-first** architecture where all data is stored locally and can optionally be synced to iCloud Drive. The sync system uses encrypted vault files to protect user data.

## Architecture

### Storage Adapters

The sync system uses pluggable storage adapters:

| Adapter | Description | Use Case |
|---------|-------------|----------|
| `LocalAdapter` | localStorage + IndexedDB | Primary local storage |
| `ICloudFolderAdapter` | File System Access API | Direct folder access (Chrome/Edge) |
| `VaultBundleAdapter` | Single file import/export | Fallback for Safari/Firefox |

### Vault Format

Data is stored in an encrypted vault with the following structure:

```
vault/
├── manifest.json         # Blob index (unencrypted)
├── meta.envelope.json    # Encrypted metadata
└── blobs/
    ├── <sha256>.<ext>    # Audio files, images, etc.
    └── ...
```

### Encryption

- **Key Derivation:** PBKDF2 with SHA-256, 100,000 iterations
- **Encryption:** AES-256-GCM
- **Passphrase:** Never stored; only KDF parameters + salt are saved

## Data Model

### VaultMeta

Contains references to all synced entities:

```typescript
interface VaultMeta {
    schemaVersion: 1;
    deviceId: string;
    updatedAt: string;
    projects?: ProjectRef[];
    referenceLibraries?: LibraryRef[];
    infobase?: InfobaseRef[];
    settings?: SettingsRef;
}
```

### Blob Storage

Large files (audio, images) are stored as content-addressed blobs:

- ID = SHA256 hash of content
- Deduplicated automatically
- Synced independently of metadata

## Sync Algorithm

### Merge Strategy: Last-Write-Wins

1. Compare `updatedAt` timestamps for each entity
2. Keep the entity with the newer timestamp
3. If timestamps match but content differs → conflict

### Conflict Handling

Conflicts are recorded with both versions:

```typescript
interface ConflictRecord {
    entityType: 'project' | 'library' | 'infobase' | 'settings';
    entityId: string;
    localValue: unknown;
    remoteValue: unknown;
    localDeviceId: string;
    remoteDeviceId: string;
    // ...
}
```

Users can resolve conflicts manually in Settings.

## Limitations

### Browser API Limitations

| Browser | Folder Access | File Picker | Notes |
|---------|--------------|-------------|-------|
| Chrome/Edge | ✅ Full | ✅ | Best experience |
| Safari | ❌ | ✅ | Bundle import/export only |
| Firefox | ❌ | ✅ | Bundle import/export only |

### iCloud Limitations

- **No Direct API:** Web apps cannot access iCloud APIs directly
- **User Action Required:** User must select vault folder/file
- **Manual Sync:** Automatic background sync not possible

### Size Limits

- **localStorage:** ~5-10 MB per origin
- **IndexedDB:** ~50 MB default, can request more
- **iCloud:** No practical limit for vault files

## Usage

### Enabling Sync

1. Go to Settings → Sync
2. Toggle "Enable iCloud Sync"
3. Click "Select Vault Folder" (or "Select Vault File")
4. Enter a passphrase (required for encryption)
5. Click "Sync Now"

### Manual Sync

Sync is triggered manually by clicking "Sync Now" in Settings.

### Importing/Exporting

For browsers without folder access:

1. Click "Export Vault" to save a `.vault` file
2. Store this file in iCloud Drive manually
3. On another device, click "Import Vault" and select the file

## Security

### What is encrypted:

- All metadata (projects, libraries, notes, settings)
- User-generated content

### What is NOT encrypted:

- Blob manifest (file sizes, MIME types)
- Vault structure (folder/file names)

### Passphrase Best Practices

- Use a strong, unique passphrase
- Producer Hub **never** stores your passphrase
- If you forget your passphrase, vault data cannot be recovered

## Troubleshooting

### "Sync failed" error

1. Check internet connection
2. Verify iCloud Drive is enabled on your device
3. Try selecting the vault folder/file again
4. Check browser console for detailed errors

### Conflicts appearing

1. Review conflicts in Settings → Sync → Conflicts
2. Choose which version to keep
3. Consider syncing more frequently to reduce conflicts

### Large vault size

1. Delete unused projects and reference tracks
2. Blobs are automatically cleaned up when no longer referenced
3. Export a new vault to reclaim space


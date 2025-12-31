# Sync System Documentation

This document describes the iCloud sync implementation for Producer Hub.

**Last Updated:** December 2024  
**Schema Version:** 2

## Overview

Producer Hub uses a **local-first** architecture where all data is stored locally and can optionally be synced to iCloud Drive. The sync system uses encrypted vault files to protect user data.

### What Gets Synced

- **Projects** - Project metadata, notes, checklists, timelines
- **Reference Libraries** - Reference track metadata and audio blobs
- **Info Base** - Knowledge notes and categories
- **Settings** - Theme, product selection preferences
- **Lane Templates** - Melody, drum, and chord patterns (Schema v2)
- **Chord Progressions** - Saved chord progression templates (Schema v2)
- **Audio Loops** - User audio loops with metadata (Schema v2)
- **Project Clips** - Lane/loop references attached to projects (Schema v2)

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

### VaultMeta (Schema v2)

Contains references to all synced entities:

```typescript
interface VaultMeta {
    schemaVersion: 2;
    deviceId: string;
    updatedAt: string;

    // Core entities (v1)
    projects?: ProjectRef[];
    referenceLibraries?: LibraryRef[];
    infobase?: InfobaseRef[];
    settings?: SettingsRef;

    // Lane Builder entities (v2)
    laneTemplates?: LaneTemplateRef[];
    chordProgressions?: ChordProgressionRef[];
    audioLoops?: AudioLoopRef[];
    projectClips?: ProjectClipRefEntry[];
}
```

### Lane Template Types

Lane templates use a standardized note model for all pattern types:

```typescript
interface LaneTemplateRef {
    id: string;
    name: string;
    type: 'melody' | 'drums' | 'chord';
    updatedAt: string;
    createdAt: string;

    // Lane settings
    laneSettings: SyncLaneSettings;

    // Standardized note model
    notes: SyncNote[];

    // Musical metadata
    bpm: number;
    bars: number;
    timeSignature: [number, number];
    key: string;
    scaleType: string;

    // Organization
    tags?: string[];
    genre?: string;

    // Content hash for merge conflict detection
    contentHash: string;
}

interface SyncNote {
    pitch: number;      // MIDI note number
    startBeat: number;  // Position in beats
    duration: number;   // Duration in beats
    velocity: number;   // 1-127
}

interface SyncLaneSettings {
    instrumentId: string;
    noteMode: 'oneShot' | 'sustain';
    velocityDefault: number;
    quantizeGrid: '1/4' | '1/8' | '1/16' | '1/32' | 'off';
    color: string;
}
```

### Chord Progressions

Chord progression templates store reusable chord patterns:

```typescript
interface ChordProgressionRef {
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

    // Content hash for merge conflict detection
    contentHash: string;
}
```

### Audio Loops

Audio loops store user-imported audio with metadata:

```typescript
interface AudioLoopRef {
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

    // Musical metadata (optional)
    bpm?: number;
    key?: string;
    bars?: number;

    // Organization
    tags?: string[];
}
```

### Project Clips

Project clips link lane templates or audio loops to projects:

```typescript
interface ProjectClipRefEntry {
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
```

### Blob Storage

Large files (audio, images) are stored as content-addressed blobs:

- **ID**: SHA256 hash of content
- **Deduplication**: Automatic (same content = same ID)
- **Synced Independently**: Blobs sync separately from metadata

```typescript
interface BlobEntry {
    id: string;           // SHA256 hash
    size: number;
    mimeType: string;
    createdAt: string;
    checksum: string;
    contentType?: 'audioLoop' | 'reference' | 'other';
}
```

**Allowed MIME Types:**
- `audio/wav`, `audio/mpeg`, `audio/mp3`, `audio/ogg`
- `audio/webm`, `audio/aac`, `audio/flac`
- `application/octet-stream` (binary audio data)

**Size Limits:**
- Max blob size: 50 MB
- Max bundle size: 500 MB

## Sync Algorithm

### Merge Strategy: Last-Write-Wins

1. Compare `updatedAt` timestamps for each entity
2. Keep the entity with the newer timestamp
3. If timestamps match but content differs → conflict

### Conflict Handling

Conflicts are recorded with both versions:

```typescript
interface ConflictRecord {
    entityType: 'project' | 'library' | 'infobase' | 'settings' 
              | 'laneTemplate' | 'chordProgression' | 'audioLoop' | 'projectClip';
    entityId: string;
    localValue: unknown;
    remoteValue: unknown;
    localDeviceId: string;
    remoteDeviceId: string;
    localTimestamp: string;
    remoteTimestamp: string;
}
```

Users can resolve conflicts manually in Settings.

### Conflict Resolution

The `ConflictResolver.svelte` component provides a UI for reviewing and resolving conflicts:

- **Conflict Summaries**: Sanitized display of changes (no raw sensitive data shown)
- **Side-by-side Comparison**: View local vs remote versions
- **Resolution Options**: Keep local, keep remote, or merge manually
- **Batch Resolution**: Apply resolution to similar conflicts

Conflict summaries categorize changes by type:
- `settings` - Lane/template settings changes
- `notes` - Note content changes
- `clips` - Clip reference changes
- `metadata` - Name, tags, genre changes
- `position` - Position/timing changes

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


# Architecture

This document describes the overall architecture of Producer Hub, including the data model, module structure, and key design decisions.

**Last Updated:** December 2024

## Overview

Producer Hub is a **SvelteKit static PWA** that provides a comprehensive music production workspace with:

- **Searchable shortcuts** for 5 DAWs/plugins (Ableton Live 12, FL Studio, Logic Pro, Reason Rack, Serum 2)
- **Audio analysis** with waveform visualization and BPM detection
- **Project management** (local-first hub with projects, inbox, collections, references)
- **Creative tools** including a Lane Builder (melody/chord/drum template generator with MIDI export)
- **iCloud sync** with encrypted vault files and conflict resolution

The app uses a dropdown navigation system organized into three categories: **Shortcuts**, **Tools**, and **Create**.

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│                    (src/routes/+page.svelte)                    │
├─────────────────────────────────────────────────────────────────┤
│  Fixed Header: [Logo] Producer Hub                              │
│  Navigation: [⌨ Shortcuts ▼] [⚙ Tools ▼] [♪ Create ▼] [⚙]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Shortcuts Menu:           Tools Menu:           Create Menu:   │
│  ├─ Keyboard Shortcuts     ├─ Projects           ├─ Templates   │
│  └─ Info Base              ├─ Inbox              ├─ Drums       │
│                            ├─ Collections        ├─ Chords      │
│                            ├─ References         ├─ Melody      │
│                            └─ Global Search      └─ Arrange     │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│               Scrollable Content Area                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Active content based on dropdown selection              │   │
│  │  - Keyboard shortcuts with filters and search            │   │
│  │  - Info Base with notes and categories                   │   │
│  │  - Projects/Inbox/References management                  │   │
│  │  - Lane Builder with Piano Roll / MIDI Roll              │   │
│  │  - Built-in templates (prerendered for SEO)              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  Fixed Bottom: Audio Player (queue, waveform, transport)        │
├─────────────────────────────────────────────────────────────────┤
│                    Core Library (src/lib/)                      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │shortcuts│ │ search  │ │ filter  │ │ melody/ │ │  hub/   │   │
│  │   .ts   │ │   .ts   │ │   .ts   │ │   /*    │ │  *      │   │
│  └────┬────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
│       │                                                         │
│  ┌────┴────────────────────────────────────────┐               │
│  │              Data Modules (src/lib/data/)    │               │
│  │  ┌──────────────┐ ┌──────────────────────┐  │               │
│  │  │ *Shortcuts   │ │ *PowerFeatures       │  │               │
│  │  │ (Keyboard)   │ │ (Mouse/Workflow)     │  │               │
│  │  └──────────────┘ └──────────────────────┘  │               │
│  └──────────────────────────────────────────────┘               │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                 Storage Layer (src/lib/storage/)          │  │
│  │  ┌──────────┐ ┌─────────────┐ ┌────────┐ ┌────────────┐   │  │
│  │  │ adapter  │ │localAdapter │ │ crypto │ │   sync     │   │  │
│  │  │   .ts    │ │    .ts      │ │  .ts   │ │    .ts     │   │  │
│  │  └──────────┘ └─────────────┘ └────────┘ └────────────┘   │  │
│  │  ┌─────────────────┐ ┌─────────────────────────────────┐  │  │
│  │  │ conflictResol.  │ │    builtinTemplates.ts          │  │  │
│  │  └─────────────────┘ └─────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                 Player Module (src/lib/player/)           │  │
│  │  ┌────────┐ ┌─────────┐ ┌──────────┐ ┌──────────────┐     │  │
│  │  │ store  │ │  audio  │ │ waveform │ │   persist    │     │  │
│  │  └────────┘ └─────────┘ └──────────┘ └──────────────┘     │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Supported Products

| Product | File | Entries |
|---------|------|---------|
| Ableton Live 12 Suite | `ableton12suite.ts` | Keyboard shortcuts |
| FL Studio | `flstudio.ts` | Keyboard shortcuts |
| Logic Pro | `logicpro.ts` | Keyboard shortcuts |
| Reason Rack | `reasonrack.ts` | Keyboard shortcuts |
| Serum 2 | `serum2PowerFeatures.ts` | Power features (mouse/workflow) |

All products are defined in `src/lib/products.ts` with metadata (vendor, category, icon path).

## Data Model

### Entry Types

The app supports two types of entries, defined in `src/lib/entries.ts`:

#### BaseEntry (shared fields)

```typescript
interface BaseEntry {
    id: string;           // Namespaced: `${productId}:slug`
    productId: string;    // e.g., "ableton12suite"
    type: string;         // Category: "edit", "view", "transport"
    command: string;      // Human-readable action name
    description?: string; // 1-2 sentence practical explanation
    descriptionSource?: string; // URL to authoritative source
    keys: string;         // Mac keys or mouse action
    keysWin?: string;     // Windows keys
    context?: string;     // When applicable
    tags?: string[];      // Searchable keywords
}
```

#### ShortcutEntry

Traditional keyboard shortcuts with clear key bindings.

```typescript
interface ShortcutEntry extends BaseEntry {
    kind: 'shortcut';
    group?: string;       // Primary grouping (section header)
    facets?: string[];    // Cross-cutting categories
}
```

#### FeatureEntry

Power features including mouse actions, workflow tips, and hidden features.

```typescript
interface FeatureEntry extends BaseEntry {
    kind: 'feature';
    group: string;        // Required for features
    facets: string[];     // Required (can be empty array)
    note?: string;        // Detailed explanation
    default?: string;     // Default value/state
}
```

### Products

Products are defined in `src/lib/products.ts`:

```typescript
interface Product {
    productId: string;    // Unique identifier
    name: string;         // Display name
    vendor?: string;      // e.g., "Ableton", "Xfer Records"
    category?: string;    // e.g., "DAW", "Plugin"
    website?: string;     // Product URL
    icon?: string;        // Path to icon (e.g., "icons/products/ableton.svg")
}
```

**Current products:**
- `serum2` - Serum 2 (Xfer Records, Plugin)
- `ableton12suite` - Ableton Live 12 Suite (Ableton, DAW)
- `reasonrack` - Reason Rack (Reason Studios, DAW)
- `flstudio` - FL Studio (Image-Line, DAW)
- `logicpro` - Logic Pro (Apple, DAW)

## Module Structure

### Core Modules (`src/lib/`)

| Module | Purpose |
|--------|---------|
| `entries.ts` | Entry type definitions (ShortcutEntry, FeatureEntry, BaseEntry) |
| `types.ts` | Re-exports and legacy type aliases |
| `products.ts` | Product definitions and lookup |
| `shortcuts.ts` | Aggregation, validation, and derived collections |
| `search.ts` | FlexSearch-based full-text search |
| `filter.ts` | Filtering utilities (product, type, group, facets, kind) |
| `favorites.ts` | LocalStorage-based favorites persistence |
| `theme.ts` | Theme management (light/dark/system) |
| `platform.ts` | Platform detection and key display |
| `grouping.ts` | Group normalization and resolution |
| `onboarding.ts` | First-run onboarding flow logic |
| `seo.ts` | SEO utilities and metadata helpers |
| `assetUrls.ts` | Asset URL resolution utilities |
| `index.ts` | Barrel exports for convenient imports |

### Info Base Modules (`src/lib/infobase/`)

| Module | Purpose |
|--------|---------|
| `types.ts` | Type definitions, templates, categories |
| `storage.ts` | LocalStorage CRUD operations with migrations |
| `obfuscate.ts` | Export/import with XOR obfuscation |

### Key Parsing Module (`src/lib/keys/`)

| Module | Purpose |
|--------|---------|
| `parse.ts` | Parse key strings into tokens for keycap rendering |

### Producer Hub Modules (`src/lib/hub/`)

| Module | Purpose |
|--------|---------|
| `types.ts` | Type definitions for Projects, Inbox, References, Collections |
| `encoding.ts` | Base64 encoding/decoding for obfuscation at rest |
| `storage.ts` | localStorage CRUD operations for all hub entities |
| `idb.ts` | IndexedDB operations for blobs and file handles |
| `search.ts` | FlexSearch index for hub entities |
| `audio.ts` | Waveform generation, BPM analysis, annotation helpers |
| `commands.ts` | Command palette registration and keyboard shortcuts |
| `index.ts` | Barrel exports for hub modules |

### Melody/Lane Builder Modules (`src/lib/melody/`)

| Module | Purpose |
|--------|---------|
| `model.ts` | Core types: notes, chords, scales, progressions, voicings |
| `generator.ts` | Pattern generation algorithms |
| `arpEngine.ts` | Arpeggiator engine for note sequences |
| `chordDetection.ts` | Chord detection from note arrays |
| `lanes.ts` | Lane management and operations |
| `clipRef.ts` | Clip reference handling |
| `packs.ts` | Genre pack definitions |
| `templates.ts` | Template management |
| `storage.ts` | Persistence for melody/lane data |
| `audio.ts` | Audio preview synthesis |
| `index.ts` | Barrel exports |

**Melody Svelte Components:**
- `PianoRoll.svelte` - Piano roll note editor
- `MidiRoll.svelte` - MIDI roll visualization
- `ArpControls.svelte` - Arpeggiator settings
- `VoicingControls.svelte` - Chord voicing options
- `ScaleSelector.svelte` - Scale/key selection
- `ProgressionSelector.svelte` - Chord progression builder
- `GenrePackSelector.svelte` - Genre pack browser
- `HumanizeControls.svelte` - Humanization settings
- `LaneOverview.svelte` - Lane overview display
- `ControlInfo.svelte` - Control help display
- `InfoBlurb.svelte` - Info tooltips

### Player Module (`src/lib/player/`)

| Module | Purpose |
|--------|---------|
| `store.ts` | Svelte stores for player state, queue, settings |
| `audio.ts` | Audio playback engine |
| `waveform.ts` | Waveform computation and peak extraction |
| `persist.ts` | Queue and settings persistence |
| `index.ts` | Barrel exports |

**Player Svelte Components:**
- `Waveform.svelte` - Waveform visualization component

### Storage Layer (`src/lib/storage/`)

| Module | Purpose |
|--------|---------|
| `adapter.ts` | Storage adapter interface definition |
| `localAdapter.ts` | Local storage implementation (localStorage + IndexedDB) |
| `crypto.ts` | PBKDF2/AES-256-GCM encryption for vault files |
| `sync.ts` | Sync engine with last-write-wins merge |
| `conflictResolution.ts` | Conflict detection and resolution logic |
| `bundle.ts` | Vault bundle pack/unpack operations |
| `builtinTemplates.ts` | Read-only built-in lane templates for SEO |
| `midiExport.ts` | MIDI file export functionality |
| `referencePacks.ts` | Reference pack management |
| `vaultTypes.ts` | Type definitions for vault data structures |

**Storage Svelte Components:**
- `ConflictResolver.svelte` - Conflict resolution UI

### Components (`src/lib/components/`)

| Component | Purpose |
|-----------|---------|
| `AppShell.svelte` | Main app layout wrapper |
| `KeyCaps.svelte` | Render keys as styled keyboard keycaps |
| `InfoBase.svelte` | Full Info Base UI (notes CRUD, search, export) |
| `CommandPalette.svelte` | Global command palette (Cmd/Ctrl+K) |
| `Projects.svelte` | Project management split view |
| `Inbox.svelte` | Quick capture and triage |
| `References.svelte` | Reference track library with audio player |
| `Collections.svelte` | Moodboards and cross-linking |
| `GlobalSearch.svelte` | Unified search across all entities |
| `Waveform.svelte` | Audio waveform visualization |
| `BottomPlayer.svelte` | Fixed bottom audio player bar |
| `AudioAnalysisPanel.svelte` | Audio analysis display (BPM, etc.) |
| `SettingsPanel.svelte` | App settings and preferences |
| `SEOHead.svelte` | SEO meta tags component |
| `ErrorBoundary.svelte` | Error boundary wrapper |
| `InlineError.svelte` | Inline error display |
| `ProducerHubLogo.svelte` | Logo component |

### UI Components (`src/lib/components/ui/`)

| Component | Purpose |
|-----------|---------|
| `Button.svelte` | Standard button component |
| `IconButton.svelte` | Icon-only button |
| `Sheet.svelte` | Slide-out sheet/drawer component |
| `PageHeader.svelte` | Page header with title |
| `EmptyState.svelte` | Empty state placeholder |
| `ToastContainer.svelte` | Toast notification container |
| `index.ts` | Barrel exports |

### Data Modules (`src/lib/data/`)

| Module | Description |
|--------|-------------|
| `ableton12suite.ts` | Ableton Live 12 keyboard shortcuts |
| `flstudio.ts` | FL Studio keyboard shortcuts |
| `logicpro.ts` | Logic Pro keyboard shortcuts |
| `reasonrack.ts` | Reason Rack keyboard shortcuts |
| `serum2PowerFeatures.ts` | Serum 2 power features |
| `importers/rawShortcuts.ts` | Raw shortcut data importers |

### Themes (`src/lib/themes/`)

| File | Purpose |
|------|---------|
| `index.ts` | Theme registry and utilities |
| `types.ts` | Theme type definitions |
| `ableton-live-12.manifest.json` | Ableton Live 12 theme colors |

### Stores (`src/lib/stores/`)

| Store | Purpose |
|-------|---------|
| `toast.ts` | Toast notification store |

## Search Architecture

Search uses [FlexSearch](https://github.com/nextapps-de/flexsearch) for fast, fuzzy full-text search.

### Indexed Fields
- `command` - Action name
- `keys` - Mac and Windows key combinations
- `type` - Category
- `context` - Context/location
- `tags` - Keywords
- `productName` - Product display name
- `group` - Group name
- `facets` - Facet names
- `note` - Feature notes (power features only)
- `defaultVal` - Default values (power features only)

### Search Flow
1. User types query
2. Query is normalized (lowercase, trimmed)
3. FlexSearch returns matching entry IDs
4. IDs are used to filter/sort the result set
5. Results are grouped by group name for display

## Filter Architecture

Filtering is handled by `src/lib/filter.ts`:

```typescript
interface FilterOptions {
    productId?: string | 'all';
    type?: string | 'all';
    group?: string | 'all';
    kind?: 'shortcut' | 'feature' | 'all';
    facets?: string[];           // AND semantics
    favoriteIds?: Set<string>;
    favoritesOnly?: boolean;
}
```

**Facet Filtering**: Uses AND semantics - when multiple facets are selected, entries must have ALL selected facets.

## Info Base Architecture

The Info Base is a local knowledge base for music production notes.

### Components

```
┌─────────────────────────────────────────────────────────┐
│                  InfoBase.svelte                        │
│                (UI Component)                           │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  storage.ts │  │ obfuscate.ts│  │   types.ts  │     │
│  │ (CRUD Ops)  │  │ (Export/    │  │ (Types,     │     │
│  │             │  │  Import)    │  │  Templates) │     │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┘     │
│         │                │                              │
│         └────────┬───────┘                              │
│                  │                                      │
│         ┌────────▼────────┐                             │
│         │   localStorage  │                             │
│         │ daw_infobase_v1 │                             │
│         └─────────────────┘                             │
└─────────────────────────────────────────────────────────┘
```

### Data Model

```typescript
interface KnowledgeNote {
    id: string;                // Unique identifier
    title: string;             // Note title
    body: string;              // Markdown content
    tags: string[];            // Searchable tags
    category?: NoteCategory;   // Optional category
    createdAt: string;         // ISO date string
    updatedAt: string;         // ISO date string
}

interface InfoBaseState {
    version: number;           // Schema version
    entries: Record<string, KnowledgeNote>;
    order: string[];           // Display order
}
```

### Export/Import

Notes can be exported to an obfuscated Markdown file:
1. State is serialized to structured Markdown
2. Markdown is XOR'd with a per-install key
3. Result is base64 encoded with a header

Import reverses this process with validation.

See [INFOBASE.md](./INFOBASE.md) for full documentation.

## Producer Hub Architecture

The Producer Hub is a local-first project management system for music producers.

### Storage Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                     Producer Hub Storage                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  localStorage (metadata, small data)                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  hub_projects_v1    - Projects with encoded notes        │   │
│  │  hub_inbox_v1       - Inbox items with encoded body      │   │
│  │  hub_refs_v1        - Reference libraries + track meta   │   │
│  │  hub_collections_v1 - Collections with item refs         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  IndexedDB (large/binary data)                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  blobs store    - Audio files, cover images              │   │
│  │  handles store  - FileSystemHandles (when available)     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Model Overview

| Entity | Key Fields | Storage |
|--------|------------|---------|
| Project | name, status, notes, checklist, milestones, timeline | localStorage |
| InboxItem | title, body, kind, tags, archived | localStorage |
| ReferenceLibrary | name, tracks[] | localStorage (meta) + IndexedDB (audio) |
| ReferenceTrack | name, waveform, annotations, analysis | localStorage |
| Collection | name, items[], coverImage | localStorage (meta) + IndexedDB (cover) |

### Obfuscation at Rest

All user-generated text content uses base64 encoding:
- Project notes: `notesEncoded`
- Inbox body: `bodyEncoded`
- Annotation labels: `labelEncoded`
- Collection descriptions: `descriptionEncoded`

Encoding is decoded only for display and search indexing.

### Audio Processing

```
┌─────────────────────────────────────────────────────────────────┐
│                     Audio Pipeline                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Import: File → Blob → IndexedDB                             │
│                                                                  │
│  2. Waveform: ArrayBuffer → AudioContext.decodeAudioData        │
│              → Float32Array → computePeaks → peaks[]            │
│              → localStorage (cached in track metadata)          │
│                                                                  │
│  3. Analysis: ArrayBuffer → onset detection → autocorrelation   │
│              → BPM estimate (heuristic, labeled as such)        │
│                                                                  │
│  4. Playback: IndexedDB → Blob → URL.createObjectURL → <audio>  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### File System Access

When available (Chromium browsers), uses File System Access API:
- `showDirectoryPicker()` for folder import
- FileSystemHandles stored in IndexedDB

Fallback for other browsers:
- `<input type="file" webkitdirectory multiple>`
- Files stored directly as blobs

### Command Palette

Global keyboard-driven command system:
- `Cmd/Ctrl+K`: Open palette
- Search and execute commands
- Navigate between tabs
- Create new entities

## Player Architecture

The player module (`src/lib/player/`) provides a global audio player with queue management.

### Player State

```typescript
interface PlayerState {
    currentTrack: QueueTrack | null;
    status: 'idle' | 'loading' | 'playing' | 'paused' | 'error';
    currentTime: number;
    duration: number;
    queue: QueueTrack[];
    queueIndex: number;
    settings: PlayerSettings;
    error: string | null;
    isVisible: boolean;
}

interface PlayerSettings {
    autoplayNext: boolean;
    repeatMode: 'off' | 'one' | 'all';
    volume: number;
    shuffle: boolean;
}
```

### Player Components

- `BottomPlayer.svelte` - Fixed bottom bar with transport controls
- `Waveform.svelte` - Interactive waveform visualization
- Queue management with shuffle and repeat modes

### Persistence

Player queue and settings are persisted to localStorage:
- `daw_player_queue` - Current queue state
- `daw_player_settings` - User preferences

## Sync Layer Architecture

The sync layer (`src/lib/storage/`) enables iCloud sync with encrypted vault files.

### Storage Adapters

| Adapter | Description | Use Case |
|---------|-------------|----------|
| `LocalAdapter` | localStorage + IndexedDB | Primary local storage |
| `ICloudFolderAdapter` | File System Access API | Direct folder access (Chrome/Edge) |
| `VaultBundleAdapter` | Single file import/export | Fallback for Safari/Firefox |

### Vault Format

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

### Merge Strategy: Last-Write-Wins

1. Compare `updatedAt` timestamps for each entity
2. Keep the entity with the newer timestamp
3. If timestamps match but content differs → conflict

### Conflict Handling

Conflicts are recorded with both versions and resolved via `ConflictResolver.svelte`. See [SYNC.md](./SYNC.md) for full documentation.

## State Management

The app uses Svelte's reactive statements and stores for state management:

- **URL State**: Not persisted (search/filter resets on reload)
- **Favorites**: Persisted in localStorage (`daw_favorites`)
- **Theme**: Persisted in localStorage (`daw_theme`)
- **Platform**: Persisted in localStorage (`daw_keyos`)
- **Onboarding**: Persisted in localStorage (`daw_onboarding`)
- **Info Base**: Persisted in localStorage (`daw_infobase_v1`)
- **Hub Projects**: Persisted in localStorage (`hub_projects_v1`)
- **Hub Inbox**: Persisted in localStorage (`hub_inbox_v1`)
- **Hub References**: Persisted in localStorage (`hub_refs_v1`)
- **Hub Collections**: Persisted in localStorage (`hub_collections_v1`)
- **Player Queue**: Persisted in localStorage (`daw_player_queue`)
- **Player Settings**: Persisted in localStorage (`daw_player_settings`)
- **Audio Blobs**: Persisted in IndexedDB (`daw_hub_db`)
- **Melody/Lane Data**: Persisted in localStorage (`daw_melody_*`)

## Routing

The app uses SvelteKit's file-based routing:

| Route | Description |
|-------|-------------|
| `/` | Homepage with shortcuts browser |
| `/arrange` | Arrangement/lane view |
| `/onboarding` | First-run onboarding flow |
| `/privacy` | Privacy policy page |
| `/templates` | Template browser/listing |
| `/templates/drums` | Drum template category |
| `/templates/chords` | Chord template category |
| `/templates/melody` | Melody template category |
| `/templates/[slug]` | Dynamic route for individual template |

### Prerendered Pages

The following pages are prerendered for SEO:
- Homepage (`index.html`)
- All template pages (`templates/*.html`)
- Onboarding, Privacy, Arrange

### Built-in Templates

Templates in `src/lib/storage/builtinTemplates.ts` are curated, read-only templates that are:
- Prerendered as static HTML pages for SEO
- Available at `/templates/[slug]` routes
- Categorized as `drums`, `chords`, or `melody`
- Include musical metadata (BPM, key, scale, time signature)

## Build & Deployment

The app is built as a static site using `@sveltejs/adapter-static`:

1. Vite builds the SvelteKit app
2. Static adapter generates HTML/CSS/JS with prerendered pages
3. vite-plugin-pwa generates service worker with Workbox
4. Output is in `build/` directory

### Deployment Targets

- **GitHub Pages**: Via `scripts/deploy-github-pages.sh`
- **Cloudflare Workers/Pages**: Via `wrangler.toml`

### CI/CD Workflows

| Workflow | Purpose |
|----------|---------|
| `buildtest.yml` | Build validation and unit tests on PRs |
| `deploy.yml` | Production deployment |
| `e2e.yml` | Playwright end-to-end tests |

## Testing Strategy

See [TESTING.md](./TESTING.md) for comprehensive testing documentation.

### Unit Tests (Vitest)

Located in `src/lib/__tests__/` and module-level `__tests__/` directories:
- Storage/crypto: `crypto.test.ts`, `hub-storage.test.ts`
- Melody engine: `arpEngine.test.ts`, `chordDetection.test.ts`, `model.test.ts`
- Player: `player.test.ts`, `queuePersist.test.ts`, `waveform.test.ts`
- Data validation: `flstudio.test.ts`, `powerFeatures.test.ts`, `rawShortcuts.test.ts`

### E2E Tests (Playwright)

Located in `tests/`:
- Feature tests: `melody.spec.ts`, `player.spec.ts`, `templates.spec.ts`, `hub.spec.ts`
- Quality gates: `accessibility.spec.ts`, `security.spec.ts`
- Core flows: `onboarding.spec.ts`, `homepage.spec.ts`, `settings.spec.ts`

### Type Checking

TypeScript strict mode is enabled across the codebase.


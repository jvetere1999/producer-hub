# Architecture

This document describes the overall architecture of Producer Hub, including the data model, module structure, and key design decisions.

## Overview

Producer Hub is a SvelteKit static PWA that provides a comprehensive music production workspace with searchable shortcuts, audio analysis, project management, and creative tools. It uses a dropdown navigation system organized into three categories: Shortcuts, Tools, and Create.

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
│  ├─ Keyboard Shortcuts     ├─ Projects           ├─ Drum        │
│  └─ Info Base              ├─ Inbox                  Patterns   │
│                            ├─ Collections        └─ Piano Roll  │
│                            ├─ References             (soon)     │
│                            └─ Global Search                     │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│               Scrollable Content Area                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Active content based on dropdown selection              │   │
│  │  - Keyboard shortcuts with filters and search            │   │
│  │  - Info Base with notes and categories                   │   │
│  │  - Projects/Inbox/References management                  │   │
│  │  - Pattern Builder with MIDI roll                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  Fixed Bottom: Audio Player (when active)                       │
├─────────────────────────────────────────────────────────────────┤
│                    Core Library (src/lib/)                      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │shortcuts│ │ search  │ │ filter  │ │patterns │ │  hub/   │   │
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
└─────────────────────────────────────────────────────────────────┘
```

## Data Model

### Entry Types

The app supports two types of entries, defined in `src/lib/entries.ts`:

#### ShortcutEntry
Traditional keyboard shortcuts with clear key bindings.

```typescript
interface ShortcutEntry {
    kind: 'shortcut';
    id: string;           // e.g., "ableton12suite:copy"
    productId: string;    // e.g., "ableton12suite"
    type: string;         // Category: "edit", "view", "transport"
    command: string;      // Human-readable action
    keys: string;         // Mac keys (e.g., "⌘C")
    keysWin?: string;     // Windows keys (e.g., "Ctrl+C")
    context?: string;     // When applicable (e.g., "MIDI Clip Editor")
    tags?: string[];      // Searchable keywords
    group?: string;       // Primary categorization
    facets?: string[];    // Cross-cutting categories
}
```

#### FeatureEntry
Power features including mouse actions, workflow tips, and hidden features.

```typescript
interface FeatureEntry {
    kind: 'feature';
    id: string;
    productId: string;
    type: string;
    command: string;
    keys: string;         // e.g., "Right Click", "Double-click"
    keysWin?: string;
    context?: string;
    tags?: string[];
    group: string;        // Required for features
    facets: string[];     // Required for features
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
    category?: string;    // e.g., "DAW", "Synthesizer"
    website?: string;     // Product URL
}
```

## Module Structure

### Core Modules

| Module | Purpose |
|--------|---------|
| `entries.ts` | Entry type definitions (ShortcutEntry, FeatureEntry) |
| `types.ts` | Re-exports and legacy type aliases |
| `products.ts` | Product definitions and lookup |
| `shortcuts.ts` | Aggregation, validation, and derived collections |
| `search.ts` | FlexSearch-based full-text search |
| `filter.ts` | Filtering utilities (product, type, group, facets, kind) |
| `favorites.ts` | LocalStorage-based favorites persistence |
| `theme.ts` | Theme management (light/dark/system) |
| `platform.ts` | Platform detection and key display |
| `grouping.ts` | Group normalization and resolution |
| `index.ts` | Barrel exports for convenient imports |

### Info Base Modules

Located in `src/lib/infobase/`:

| Module | Purpose |
|--------|---------|
| `types.ts` | Type definitions, templates, categories |
| `storage.ts` | LocalStorage CRUD operations with migrations |
| `obfuscate.ts` | Export/import with XOR obfuscation |

### Key Parsing Module

Located in `src/lib/keys/`:

| Module | Purpose |
|--------|---------|
| `parse.ts` | Parse key strings into tokens for keycap rendering |

### Producer Hub Modules

Located in `src/lib/hub/`:

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

### Components

Located in `src/lib/components/`:

| Component | Purpose |
|-----------|---------|
| `KeyCaps.svelte` | Render keys as styled keyboard keycaps |
| `InfoBase.svelte` | Full Info Base UI (notes CRUD, search, export) |
| `CommandPalette.svelte` | Global command palette (Cmd/Ctrl+K) |
| `Projects.svelte` | Project management split view |
| `Inbox.svelte` | Quick capture and triage |
| `References.svelte` | Reference track library with audio player |
| `Collections.svelte` | Moodboards and cross-linking |
| `GlobalSearch.svelte` | Unified search across all entities |
| `Waveform.svelte` | Audio waveform visualization |

### Data Modules

Located in `src/lib/data/`:

| Module | Description |
|--------|-------------|
| `ableton12suite.ts` | 204 Ableton Live 12 keyboard shortcuts |
| `serum2.ts` | Serum 2 keyboard shortcuts |
| `serum2PowerFeatures.ts` | 114 Serum 2 power features |
| `reasonrack.ts` | Reason Rack keyboard shortcuts |

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

## State Management

The app uses Svelte's reactive statements for state management:

- **URL State**: Not persisted (search/filter resets on reload)
- **Favorites**: Persisted in localStorage (`daw_favorites`)
- **Theme**: Persisted in localStorage (`daw_theme`)
- **Platform**: Persisted in localStorage (`daw_keyos`)
- **Info Base**: Persisted in localStorage (`daw_infobase_v1`)
- **Hub Projects**: Persisted in localStorage (`hub_projects_v1`)
- **Hub Inbox**: Persisted in localStorage (`hub_inbox_v1`)
- **Hub References**: Persisted in localStorage (`hub_refs_v1`)
- **Hub Collections**: Persisted in localStorage (`hub_collections_v1`)
- **Audio Blobs**: Persisted in IndexedDB (`daw_hub_db`)

## Build & Deployment

The app is built as a static site using `@sveltejs/adapter-static`:

1. Vite builds the SvelteKit app
2. Static adapter generates HTML/CSS/JS
3. vite-plugin-pwa generates service worker
4. Output is in `build/` directory

## Testing Strategy

See [TESTING.md](./TESTING.md) for comprehensive testing documentation.

- **Unit Tests**: Vitest for lib modules
- **E2E Tests**: Playwright for user flows
- **Type Checking**: TypeScript strict mode


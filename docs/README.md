# Documentation

Welcome to DAW Shortcuts documentation. Here you'll find everything you need to understand, use, and contribute to the project.

## Overview

| Document | Description |
|----------|-------------|
| [Main README](../README.md) | Project overview, features, quick start |
| [Wiki](./WIKI.md) | Guide to each tab and how to use them |
| [Architecture](./ARCHITECTURE.md) | System design, data model, module structure |
| [Deployment](./DEPLOYMENT.md) | GitHub Pages & Cloudflare deployment, PWA, base paths |
| [Patterns](./PATTERNS.md) | Drum pattern builder, templates, ghost kicks |
| [Player](./PLAYER.md) | Global audio player, queue management |
| [Info Base](./INFOBASE.md) | Local knowledge base for music production notes |
| [Contributing](./CONTRIBUTING.md) | Development setup, code style, PR process |
| [Testing](./TESTING.md) | Test framework, patterns, and examples |
| [Quick Reference](./QUICK_REFERENCE.md) | Command cheat sheet |
| [AdSense](./ADSENSE.md) | Google AdSense setup, configuration, troubleshooting |
| [SEO](./SEO.md) | SEO implementation, content strategy, keyword clusters |

## Quick Start for New Users

1. **Start Here**: Read the [Main README](../README.md) to understand the project
2. **Learn the Tabs**: Check out [Wiki](./WIKI.md) to see what each tab does and how to use them
3. **Deep Dive**: Review [Architecture](./ARCHITECTURE.md) to understand the technical design

## Quick Start for Contributors

1. **Read** the [Main README](../README.md) to understand the project
2. **Review** [Architecture](./ARCHITECTURE.md) to understand the codebase
3. **Follow** [Contributing](./CONTRIBUTING.md) to set up your environment
4. **Use** [Quick Reference](./QUICK_REFERENCE.md) while developing

## Key Concepts

### Entry Types
- **Shortcuts** (`kind: 'shortcut'`): Traditional keyboard shortcuts
- **Features** (`kind: 'feature'`): Power features, mouse actions, workflow tips

### Info Base
A local knowledge base for storing personal music production notes:
- Create, edit, delete notes with Markdown support
- Organize with categories and tags
- Quick templates for common note types
- Export/import with obfuscated Markdown

### Producer Hub (New)
A local-first project management system for music producers:

#### Projects
- Track projects through stages: idea → active → arrangement → mix → master → released
- Notes, checklists, milestones with due dates
- Automatic timeline of project events
- Export projects to Markdown

#### Inbox
- Quick capture for ideas, notes, and tasks
- Promote items to full projects
- Resurface stale items (>14 days old)

#### References
- Import reference tracks from folders
- Audio playback with waveform visualization
- Markers and regions for annotations
- Basic BPM estimation (heuristic)

#### Collections / Moodboards
- Cross-link projects, references, notes, shortcuts
- Cover images for visual organization
- Reorderable items with notes

#### Global Search
- Unified search across all entities
- Keyboard-driven with Cmd/Ctrl+K command palette
- Filter by shortcuts, projects, or everything

### Categorization
- **Groups**: Primary categorization mirroring source documentation sections
- **Facets**: Cross-cutting categories (e.g., "MIDI Control", "Navigation")
- **Types**: Functional categories (e.g., "edit", "view", "transport")

### Products
Each entry belongs to a product (e.g., `ableton12suite`, `serum2`, `reasonrack`).

## Project Structure

```
daw-shortcuts/
├── docs/                     # Documentation
│   ├── README.md            # This file
│   ├── ARCHITECTURE.md      # System design
│   ├── INFOBASE.md          # Info Base documentation
│   ├── CONTRIBUTING.md      # Contribution guide
│   ├── TESTING.md           # Testing guide
│   ├── QUICK_REFERENCE.md   # Command cheat sheet
│   ├── DEPLOYMENT.md        # GitHub Pages deployment guide
│   ├── ADSENSE.md           # Google AdSense guide
│   └── SEO.md               # SEO implementation guide
├── src/
│   ├── lib/                 # Core library
│   │   ├── data/           # Data modules (shortcuts, features)
│   │   ├── infobase/       # Info Base modules
│   │   │   ├── types.ts    # Types, templates, categories
│   │   │   ├── storage.ts  # LocalStorage persistence
│   │   │   └── obfuscate.ts # Export/import obfuscation
│   │   ├── hub/            # Producer Hub modules
│   │   │   ├── types.ts    # Hub data types
│   │   │   ├── encoding.ts # Base64 encoding utilities
│   │   │   ├── storage.ts  # localStorage persistence
│   │   │   ├── idb.ts      # IndexedDB for blobs
│   │   │   ├── search.ts   # Hub search index
│   │   │   ├── audio.ts    # Waveform & analysis
│   │   │   ├── commands.ts # Command palette
│   │   │   └── index.ts    # Barrel exports
│   │   ├── keys/           # Key parsing
│   │   │   └── parse.ts    # Parse key strings for keycaps
│   │   ├── components/     # Reusable components
│   │   │   ├── KeyCaps.svelte      # Keycap renderer
│   │   │   ├── InfoBase.svelte     # Info Base UI
│   │   │   ├── CommandPalette.svelte # Global commands
│   │   │   ├── Projects.svelte     # Project management
│   │   │   ├── Inbox.svelte        # Quick capture
│   │   │   ├── References.svelte   # Audio references
│   │   │   ├── Collections.svelte  # Moodboards
│   │   │   ├── GlobalSearch.svelte # Unified search
│   │   │   └── Waveform.svelte     # Audio visualization
│   │   ├── __tests__/      # Unit tests
│   │   └── *.ts            # Core modules
│   └── routes/             # SvelteKit pages
├── tests/                   # E2E tests (Playwright)
├── scripts/                 # Utility scripts
├── static/                  # Static assets
│   └── icons/products/     # Product icons
└── build/                   # Production output
```

## Need Help?

- Check the relevant documentation file above
- Review existing code for patterns
- Open a GitHub issue for bugs or questions



# DAW Shortcuts (SvelteKit Static PWA)

Installable, offline-capable PWA for searching and filtering keyboard shortcuts and power features across multiple audio products (initially: Serum 2, Ableton Live 12 Suite, Reason Rack). Includes a local **Info Base** for storing music production notes.

## ✨ Key Features

- **Tabbed interface** - Shortcuts and Info Base in separate tabs
- **Full-text search** across commands, keys, tags, notes, and more
- **Multi-product support** with product icons and filtering
- **Power features** - mouse actions, workflow tips, hidden features
- **Keycap rendering** - keys displayed as styled keyboard caps
- **Info Base** - local knowledge base for music production notes
- **Offline capable** - works without internet as a PWA
- **Dark/Light themes** with system preference support

## 🖥️ Interface

The app uses a clean tabbed layout:

| Tab | Description |
|-----|-------------|
| **📋 Shortcuts** | Browse, search, and filter all keyboard shortcuts and power features |
| **📝 Info Base** | Personal knowledge base for music production notes |

### Shortcuts Tab
- Search across all entries (commands, keys, tags, context, product)
- Filter by product, type, group, kind, and facets
- Star favorites for quick access
- Keys displayed as styled keycaps (Mac/Windows toggle)

### Info Base Tab
- Create, edit, delete notes with Markdown support
- Organize with categories and tags
- Quick templates for common note types
- Export/import with obfuscation

## 📖 Documentation

- **[docs/README.md](./docs/README.md)** - Documentation index (start here)
- **[docs/WIKI.md](./docs/WIKI.md)** - Wiki guide describing each tab and how to use them
- **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - System architecture
- **[docs/INFOBASE.md](./docs/INFOBASE.md)** - Info Base documentation
- **[docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md)** - How to contribute
- **[docs/TESTING.md](./docs/TESTING.md)** - Testing guide
- **[docs/QUICK_REFERENCE.md](./docs/QUICK_REFERENCE.md)** - Command cheat sheet

**Want to contribute?** See [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md) for a complete guide on setup, development, and adding new shortcuts.

---

## Entry Types

The app supports two types of entries:

### Shortcuts (kind: 'shortcut')
Traditional keyboard shortcuts with keys and optional Windows variants. These are the core entries for quick access to commands.

### Power Features (kind: 'feature')
Advanced features that go beyond simple keyboard shortcuts, including:
- Mouse actions (right-click menus, drag operations)
- Workflow tips and hidden features
- UI interactions and gestures

Power features include additional fields:
- **note**: Detailed explanation of the feature
- **default**: Default value or state (e.g., "ON", "OFF")

---

## Info Base (Local Knowledge Base)

The app includes a built-in **Info Base** for storing personal music production notes:

- **Create & edit notes** with Markdown support
- **Categorize** by category (Mixing, Sound Design, Synthesis, etc.)
- **Tag** for easy searching
- **Quick templates** for common note types:
  - Patch Recipe
  - Mix Checklist
  - Drum Processing Chain
  - Arrangement Notes
  - FX Chain
  - Mastering Notes

### Export/Import

Notes can be exported to an obfuscated Markdown file and imported back. The obfuscation uses a per-install XOR key stored in localStorage, ensuring your notes are not plain-readable but can be restored in your app.

---

## Groups and Facets

Entries support two levels of categorization:

### Groups (Primary Categorization)

Groups mirror the source document's section headers. They provide the primary way to organize entries by topic (e.g., "Editing", "Transport", "Browser", "View Controls").

**Numbering Stripping Rule**: When importing from source documentation, leading numbering is automatically stripped:
- `"3. MIDI Editing"` → `"MIDI Editing"`
- `"12) Arrangement View"` → `"Arrangement View"`
- `"1 - Transport Controls"` → `"Transport Controls"`

If no group is specified, entries default to `"General"`.

### Facets (Cross-Cutting Categories)

Facets are secondary, cross-cutting categories that can apply to entries regardless of their group. An entry can have multiple facets. Examples include:
- `"MIDI Control"` - entries related to MIDI
- `"Navigation"` - entries for moving around the interface
- `"Editing"` - entries for editing operations
- `"Browser"` - entries for browsing/preset management
- `"Transport"` - playback and recording controls
- `"Sound Design"` - entries for sound design workflows
- `"Workflow"` - productivity and workflow tips

**Filter Semantics**: When multiple facets are selected, entries must have ALL selected facets to match (AND logic).

---

## Adding New Power Features

To add a power features dataset for a new product:

1. **Create the data file**: `src/lib/data/{productId}PowerFeatures.ts`
   ```typescript
   import type { FeatureEntry } from '../entries';
   
   export const myProductPowerFeatures: FeatureEntry[] = [
       {
           kind: 'feature',
           id: 'myproduct:power-feature-slug',
           productId: 'myproduct',
           type: 'ui',
           command: 'My Feature Name',
           keys: 'Right Click',
           context: 'Where this applies',
           tags: ['power-feature'],
           group: 'SECTION NAME',
           facets: ['Workflow', 'Sound Design'],
           note: 'Detailed explanation of what this does...',
           default: 'OFF'  // optional
       }
   ];
   ```

2. **Register in shortcuts.ts**:
   ```typescript
   import { myProductPowerFeatures } from './data/myProductPowerFeatures';
   
   // Add to featureModules array:
   const featureModules: FeatureEntry[] = [...serum2PowerFeatures, ...myProductPowerFeatures];
   ```

3. **Run validation**: `npm run test:unit` to verify the data passes validation.

---

- macOS
- Node.js **>= 20.19.0**
- npm (comes with Node)
- Recommended: JetBrains WebStorm

---

## Quick Start

```bash
cd /Users/Shared/daw-shortcuts
npm install
npm run dev -- --open
```

### Before you commit: run full test suite

```bash
npm run test  # Runs type check + build + e2e tests
```

### Build and preview (static output)

```bash
npm run build
npm run preview
```

---

## Project Structure

```
.
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI
├── docs/
│   ├── README.md               # Documentation index
│   ├── ARCHITECTURE.md         # System design
│   ├── CONTRIBUTING.md         # Contribution guide
│   ├── TESTING.md              # Testing guide
│   └── QUICK_REFERENCE.md      # Command cheat sheet
├── src/
│   ├── app.html                # HTML template
│   ├── lib/
│   │   ├── index.ts            # Barrel exports
│   │   ├── entries.ts          # Entry type definitions
│   │   ├── types.ts            # Type re-exports + legacy types
│   │   ├── products.ts         # Product registry
│   │   ├── shortcuts.ts        # Aggregation + validation
│   │   ├── search.ts           # FlexSearch integration
│   │   ├── filter.ts           # Filtering utilities
│   │   ├── favorites.ts        # Favorites persistence
│   │   ├── platform.ts         # OS detection + key display
│   │   ├── theme.ts            # Theme management
│   │   ├── grouping.ts         # Group normalization
│   │   ├── __tests__/          # Unit tests
│   │   └── data/
│   │       ├── serum2.ts                # Serum 2 shortcuts
│   │       ├── serum2PowerFeatures.ts   # Serum 2 power features (114)
│   │       ├── ableton12suite.ts        # Ableton Live 12 shortcuts (204)
│   │       └── reasonrack.ts            # Reason Rack shortcuts
│   └── routes/
│       ├── +layout.svelte      # App layout + PWA registration
│       └── +page.svelte        # Main UI
├── tests/
│   └── homepage.spec.ts        # E2E tests (Playwright)
├── scripts/
│   ├── gen-icons.mjs           # Icon generation
│   └── convert-serum-features.mjs  # JSON to TS converter
├── static/                     # Static assets
├── build/                      # Production output
├── playwright.config.ts        # E2E test config
├── svelte.config.js            # SvelteKit config
├── vite.config.ts              # Vite config
└── package.json                # Dependencies + scripts
```

### Key Modules

| Module | Purpose |
|--------|---------|
| `entries.ts` | Entry type definitions (ShortcutEntry, FeatureEntry, type guards) |
| `shortcuts.ts` | Aggregates all data modules, validates entries, enriches with product info |
| `search.ts` | FlexSearch-based full-text search across all entry fields |
| `filter.ts` | Pure functions for filtering by product, type, group, facets, kind |
| `favorites.ts` | Cookie + localStorage persistence for starred entries |
| `platform.ts` | OS detection, key display conversion (Mac ↔ Windows) |
| `theme.ts` | Theme management (system/light/dark) with flash-free initialization |
| `grouping.ts` | Group title normalization (strips leading numbering) |

### Data Modules

| Module | Entries | Description |
|--------|---------|-------------|
| `ableton12suite.ts` | 204 | Ableton Live 12 Suite keyboard shortcuts |
| `serum2.ts` | 9 | Serum 2 keyboard shortcuts |
| `serum2PowerFeatures.ts` | 114 | Serum 2 power features (mouse, workflow) |
| `reasonrack.ts` | 9 | Reason Rack keyboard shortcuts |

---

## Design Goals

### Modularity (adding new products should be trivial)

The app is structured so each product’s shortcut set is isolated in its own file:

* Add a new product to `src/lib/products.ts`
* Create a new data module in `src/lib/data/<productId>.ts`
* Import and append it in `src/lib/shortcuts.ts`

### Stable identifiers

Each shortcut has a stable unique ID:

* Format: `${productId}:${kebab-slug}`
* IDs must never collide across products.
* IDs should not be derived from key combos (keys can change).

### Data-driven UI

Filters are derived from data rather than hardcoded:

* Product filter: registry-driven
* Type filter: derived from shortcut data for the currently selected product (or all products)

### Search that scales

FlexSearch Document index across:

* command
* keys (indexes both mac + win representations)
* tags
* context
* type
* product name

Search returns ranked IDs; UI applies filters after search.

### Favorites across products

Favorites are global across the app:

* Stored by shortcut ID (namespaced)
* Persisted to cookies (portable), mirrored to localStorage (reliability)

### OS-aware key display

* Detects OS (macOS vs Windows) on the client
* Allows user override (stored in localStorage)
* Displays appropriate modifier conventions

---

## OS-aware Keys: Storage Convention

Current shortcut model:

* `keys`: mac-style display (e.g. `⇧⌘Z`, `⌘⌥M`, `Space`)
* optional `keysWin`: windows-specific string (e.g. `Ctrl+Shift+Z`)

If `keysWin` is missing, the app derives it from `keys` using simple modifier mapping.

---

## PWA / Offline

Configured via `vite-plugin-pwa`:

* `registerType: "autoUpdate"` for automatic service worker updates
* Static build output via `@sveltejs/adapter-static`
* `fallback: 200.html` supports client-side routing on static hosts

### Generating icons (if needed)

Icons are expected at:

* `static/icons/icon-192.png`
* `static/icons/icon-512.png`
* `static/icons/icon-512-maskable.png`
* `static/favicon.svg`

If you have `scripts/gen-icons.mjs` set up (using `sharp`), run:

```bash
node scripts/gen-icons.mjs
```

---

## Testing (Playwright)

**→ See [docs/TESTING.md](./docs/TESTING.md) for comprehensive testing guide**

Quick reference:

### Install browsers locally

```bash
npx playwright install
```

### Run all checks + build + tests (recommended before commit)

```bash
npm run test
```

Or separately:

```bash
npm run check       # Type checking + Svelte validation
npm run build       # Build the static output
npm run test:e2e    # Run e2e tests against built output
```

### Run tests in UI mode (interactive)

Great for development and debugging:

```bash
npm run test:e2e:ui
```

### Run tests in debug mode (step-by-step)

```bash
npm run test:e2e:debug
```

### View HTML report (after a test run)

```bash
npm run test:e2e:report
```

### Test Coverage

The test suite verifies:

* **Page loading**: Heading, results count, and controls are visible
* **Search functionality**:
  - Filters results by command name
  - Filters by keyboard shortcuts
  - Shows "no results" message appropriately
  - Clears search properly
* **Product filtering**:
  - Filters by Ableton Live 12 Suite
  - Filters by Serum 2
  - Filters by Reason Rack
  - Resets to "All products"
* **Favorites**:
  - Star/unstar individual commands
  - Filter to "Favorites only"
  - Persist across page reloads (localStorage + cookies)
  - Multiple favorites can be toggled
* **UI Controls**:
  - Theme toggle (light/dark/system)
  - Key OS toggle (macOS/Windows)
* **Combined filters**:
  - Search + product filter together
  - Type filter shows appropriate options

---

## CI (GitHub Actions)

The workflow at `.github/workflows/ci.yml` runs automatically on every push/PR to `main`:

**Workflow steps:**

1. **Checkout** the code
2. **Setup Node.js 22** (required for Vite + dependencies)
3. **Install dependencies** (`npm ci` for reproducible installs)
4. **Type check** (`npm run check`) - validates Svelte + TypeScript
5. **Build project** (`npm run build`) - creates static output
6. **Verify build artifacts** - ensures HTML and assets were created
7. **Install Playwright browsers** - sets up Chromium for testing
8. **Run Playwright tests** - executes all e2e tests against preview server
9. **Upload test report** - stores HTML report as artifact (30-day retention)

**What this means for contributors:**

* All PRs must pass type checking and all tests
* Test report is available as a workflow artifact for any failing test
* Build output is verified to contain required files
* Tests run in a clean Ubuntu environment to ensure consistency

**For local development, run:**

```bash
npm run test  # Equivalent to CI: check + build + test:e2e
```

---

## Deployment

### Cloudflare Pages (recommended)

* Build command: `npm run build`
* Output directory: `build`

### GitHub Pages (static, base path required)

Set base path to match repo name:

```bash
BASE_PATH="/<repo-name>" npm run build
```

Deploy the `build/` directory.

---

## Adding a New Product (Contributor Guide)

1. Add to registry:

    * Edit `src/lib/products.ts`
    * Add `{ productId, name, vendor?, category?, website? }`

2. Add shortcut module:

    * Create `src/lib/data/<productId>.ts`
    * Export `const <productId>Shortcuts: Shortcut[] = [...]`

3. Aggregate:

    * Import the new module in `src/lib/shortcuts.ts`
    * Append into the aggregated list

4. Validate:

    * `npm run dev`
    * Ensure no validation errors (unknown productId, duplicate ids, missing fields)

---

## Key Formatting Conventions

macOS glyphs:

* ⌘ Command
* ⌥ Option
* ⌃ Control
* ⇧ Shift

Use consistent ordering and compact representation:

* `⇧⌘Z`, `⌘⌥M`, `Space`, `Tab`

---

## Notes / Known Data Tasks

Later ingestion planned:

* Serum 2 cheat sheet
* Ableton Live 12 full shortcut list (mac + windows)

These will be converted into the per-product storage format used by `src/lib/data/*`.


# Info Base

The **Info Base** is a local knowledge base for storing personal music production and sound design notes. All data is stored locally in your browser's localStorage - no account required, no cloud sync.

## Features

### Note Management

- **Create**: Click "+ New Note" to create a new note
- **Edit**: Click on any note title to edit it
- **Delete**: Click the delete button and confirm to remove a note
- **Search**: Search notes by title, body text, or tags
- **Filter**: Filter by category or tag

### Note Structure

Each note contains:
- **Title**: Required, displayed in the list
- **Body**: Markdown-supported content area
- **Category**: Optional categorization (Mixing, Sound Design, etc.)
- **Tags**: Comma-separated keywords for organization
- **Timestamps**: Automatically tracked created and updated dates

### Categories

Available categories for organizing notes:
- **Mixing**: Mix techniques, EQ, compression, levels
- **Sound Design**: Synthesis, patch creation, textures
- **Synthesis**: Oscillators, modulation, waveforms
- **Sampling**: Sample editing, slicing, layering
- **Arrangement**: Song structure, transitions, builds
- **Mastering**: Final processing, loudness, polish
- **Workflow**: DAW tips, efficiency, organization
- **Recording**: Audio capture, mic techniques
- **FX Processing**: Effects chains, spatial effects
- **MIDI & Automation**: Controllers, automation lanes

### Quick Templates

Pre-built note templates to get started quickly:

| Template | Description |
|----------|-------------|
| **Patch Recipe** | Document synth patch creation steps |
| **Mix Checklist** | Checklist for mixing process |
| **Drum Processing Chain** | Document drum processing signal flow |
| **Arrangement Notes** | Track song structure and arrangement |
| **FX Chain** | Document effects chain settings |
| **Mastering Notes** | Final mastering process documentation |

## Export & Import

### Export
Click the "Export" button to download all notes as an obfuscated Markdown file. The file includes:
- All note content
- Metadata (dates, categories, tags)
- Entry count and export timestamp

**Note**: The export is obfuscated using a reversible XOR encryption with a per-install key. This prevents casual reading but is NOT secure encryption - do not rely on it for sensitive data.

### Import
Click "Import" and select a previously exported file to restore notes. The import:
- Validates the file format
- Merges with existing notes
- Newer entries win on ID conflicts
- Maximum file size: 1MB

## Data Storage

### Storage Location
Notes are stored in browser localStorage under the key `daw_infobase_v1`.

### Data Format
```typescript
interface InfoBaseState {
    version: number;           // Schema version for migrations
    entries: Record<string, KnowledgeNote>;  // Notes by ID
    order: string[];           // Display order (IDs)
}

interface KnowledgeNote {
    id: string;                // Unique identifier
    title: string;             // Note title
    body: string;              // Markdown content
    tags: string[];            // Searchable tags
    category?: NoteCategory;   // Optional category
    createdAt: string;         // ISO date string
    updatedAt: string;         // ISO date string
}
```

### Persistence
- Notes are saved immediately after create/edit/delete
- Data persists across browser sessions
- Clearing browser data will delete all notes

## Technical Implementation

### Files

| File | Purpose |
|------|---------|
| `src/lib/infobase/types.ts` | Type definitions, templates, categories |
| `src/lib/infobase/storage.ts` | LocalStorage persistence, CRUD operations |
| `src/lib/infobase/obfuscate.ts` | Export/import with obfuscation |
| `src/lib/components/InfoBase.svelte` | UI component |

### Security Considerations

- All data is stored locally - no network calls
- Export obfuscation is NOT cryptographically secure
- Imported files are validated and size-limited
- No executable code is processed from imports

## Best Practices

1. **Regular Exports**: Periodically export your notes as a backup
2. **Use Tags**: Add relevant tags for better searchability
3. **Categories**: Use categories to organize notes by topic
4. **Templates**: Start with templates for consistent note structure
5. **Markdown**: Use Markdown formatting for rich content

## Limitations

- No cloud sync or backup (local only)
- No real-time collaboration
- Browser storage limits apply
- No rich media attachments (text only)
- Single-user (per browser profile)


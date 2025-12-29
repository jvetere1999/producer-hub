# Wiki: Tab Guide

This wiki provides a comprehensive guide to each tab in the DAW Shortcuts application. The app uses a tabbed interface to organize different tools and features for music production workflow.

---

## 📋 Shortcuts Tab

### Purpose
The core feature of DAW Shortcuts. This tab allows you to browse, search, and explore keyboard shortcuts and power features across multiple audio products.

### Key Features

**Full-Text Search**
- Search across all entries: command names, keyboard shortcuts, tags, context, and more
- Real-time results as you type
- Ranked by relevance using FlexSearch

**Multi-Product Support**
- Filter shortcuts by product (Ableton Live 12 Suite, Serum 2, Reason Rack, etc.)
- View all products at once or focus on a single DAW
- Product icons for quick visual identification

**Advanced Filtering**
- **Type Filter**: Narrow down by entry type (e.g., Editing, Transport, Browser)
- **Group Filter**: Organize by topic groups from the source documentation
- **Facets Filter**: Cross-cutting categories (Navigation, MIDI Control, Sound Design, Workflow, etc.)
- **Kind Filter**: Distinguish between traditional shortcuts and power features
- **Favorites Only**: Show only your starred entries

**Entry Types**
- **Shortcuts**: Traditional keyboard shortcuts with Mac/Windows variants
- **Power Features**: Advanced workflows including mouse actions, hidden features, and workflow tips

**Key Display**
- **OS-Aware Rendering**: Automatically detects your operating system
- **Mac Glyphs**: ⌘ (Command), ⌥ (Option), ⌃ (Control), ⇧ (Shift)
- **Windows Notation**: Ctrl, Alt, Shift, Win
- **Toggle Platform**: Override OS detection to view Mac or Windows shortcuts
- **Keycap Style**: Keys rendered as styled keyboard caps for clarity

**Favorites Management**
- Star (⭐) individual shortcuts to build your personal quick-reference
- Filter to show only favorited entries
- Favorites persist across sessions in localStorage
- Works across all products simultaneously

### Workflow Tips

1. **Quick Learning**: Use search to find a command you just heard about
2. **Power Features Discovery**: Browse power features in your main DAW to uncover hidden workflows
3. **Quick Reference**: Star your most-used shortcuts, then filter to favorites-only mode
4. **Cross-DAW**: Compare shortcuts across different products to spot workflow differences
5. **Context Browsing**: Use group filter to explore all commands in a specific area (e.g., "Editing")

---

## 📝 Info Base Tab

### Purpose
A personal, local knowledge base for storing and organizing music production notes, recipes, and reference materials. Think of it as your personal wiki for production knowledge.

### Key Features

**Create & Edit Notes**
- Create new notes with a simple form
- Edit existing notes inline
- Delete notes when no longer needed
- Full Markdown support for rich formatting
- Auto-save functionality

**Categorization**
- **Categories**: Organize notes by music production focus
  - Mixing
  - Sound Design
  - Synthesis
  - Arrangement
  - Mastering
  - Production Tips
  - Other
- **Tags**: Apply multiple tags to notes for cross-cutting organization and search
- Custom categories support for specialized workflows

**Quick Templates**
Built-in templates for common music production note types:

- **Patch Recipe**: Document interesting synth patches and their creation process
  ```
  Patch Name: [name]
  Synth: [which synthesizer]
  Key Elements: [describe main features]
  Notes: [usage tips and variations]
  ```

- **Mix Checklist**: Create reusable mixing workflows
  ```
  Track Name: [track type]
  EQ: [frequencies to cut/boost]
  Compression: [settings]
  Effects: [reverb, delay, saturation, etc.]
  ```

- **Drum Processing Chain**: Document drum bus processing
  ```
  Kick: [processing chain]
  Snare: [processing chain]
  Hat: [processing chain]
  Bus Processing: [overall chain]
  ```

- **Arrangement Notes**: Track arrangement ideas and structure
  ```
  Section: [Intro/Verse/Chorus/Bridge/Outro]
  Duration: [bar count]
  Elements: [what plays here]
  Transition: [how you move to next section]
  ```

- **FX Chain**: Document effect chain configurations
  ```
  Effect Order: [order matters!]
  Settings: [parameters for each effect]
  Use Case: [when to use this chain]
  ```

- **Mastering Notes**: Record mastering chain settings
  ```
  Genre: [target genre]
  Reference Tracks: [what you're matching]
  Chain: [effects in order]
  Loudness Target: [LUFS value]
  ```

**Search & Discovery**
- Search notes by title and content
- Filter by category
- Filter by tags
- Combine filters for precise discovery

**Export/Import**
- **Export**: Save notes as an obfuscated Markdown file
  - Uses per-installation XOR key stored in localStorage
  - Notes are not plain-readable in the exported file
  - Portable across devices
  
- **Import**: Restore previously exported notes
  - Can import notes exported from another installation
  - Obfuscation ensures privacy while remaining portable

### Workflow Tips

1. **Pattern Library**: Create patch recipes for your favorite wavetable/harmonic combinations
2. **Workflow Standardization**: Document your mixing checklist and reuse it on every session
3. **Learning Log**: Keep notes on techniques you discover, so you can replicate them later
4. **Backup Your Knowledge**: Periodically export notes as a backup of your production knowledge
5. **Cross-Session Continuity**: When returning to a project, consult your arrangement notes for context

---

## 🗂️ Projects Tab

### Purpose
Organize and manage your music projects. Track project metadata, versions, and related files in one place.

### Key Features

- **Project Creation**: Start new projects with templates or from scratch
- **Project Metadata**: Track project name, genre, BPM, key, and status
- **File Management**: Link to or store project files within the app
- **Version History**: Keep track of project iterations and versions
- **Quick Access**: Jump to projects from the main interface
- **Sorting & Filtering**: Find projects by name, date, or status

### Workflow Tips

1. **Session Planning**: Create a project entry before starting a session
2. **Reference Tracking**: Link reference tracks to your project entry
3. **Status Tracking**: Mark projects as "In Progress", "Completed", or "Archived"
4. **Template Reuse**: Use successful project setups as templates for future projects

---

## 📥 Inbox Tab

### Purpose
A capture zone for ideas, audio snippets, reference links, and quick notes during creative sessions. Think of it as a digital notepad that captures inspiration in the moment.

### Key Features

- **Quick Capture**: Rapidly add ideas without full organization
- **Audio Attachments**: Attach audio files or links to inspiration
- **Timestamps**: Automatic timestamps for when ideas were captured
- **Tags**: Label items for later categorization
- **Batch Processing**: Move items from inbox to proper locations (projects, references, etc.)
- **Search**: Find captured ideas across all captures

### Workflow Tips

1. **Inspiration Capture**: Use Inbox during sketching sessions to record ideas without breaking focus
2. **Reference Collection**: Quickly add reference tracks you want to learn from
3. **Problem Solving**: Capture technical questions or mixing problems to solve later
4. **Session Notes**: Record observations about what worked or didn't work in a session
5. **Weekly Review**: Schedule time to process inbox and move items to permanent locations

---

## 🔗 References Tab

### Purpose
Curate and organize reference materials: reference tracks, YouTube tutorials, articles, plugins, and learning resources. Includes built-in audio player with waveform visualization for analyzing reference tracks.

### Key Features

**Reference Organization**
- Organize references by category (Tracks, Videos, Articles, Plugins, Tools)
- Metadata tracking: artist, title, link, notes, and tags
- Genre/style tagging for mood and production technique organization
- Quick access with sorting and filtering capabilities
- Personal annotations explaining why each reference is valuable

**Audio Playback & Waveform Visualization**
- **Waveform Display**: Visual representation of audio amplitude over time
- **Peak Detection**: Color-coded amplitude peaks (low/medium/high)
- **Playhead**: Real-time position indicator during playback
- **Click-to-Seek**: Click anywhere on the waveform to jump to that position
- **Automatic Generation**: Waveforms auto-generate when audio files are imported
- **Manual Generation**: Regenerate waveforms with the 📊 button if needed
- **File Support**: MP3, WAV, FLAC, OGG, M4A, AAC, WebM formats
- **Progress Indicator**: Shows decoding and processing status during generation

**Audio Analysis**
- **BPM Estimation**: Automatic heuristic-based BPM detection (for reference)
- **Key Detection**: Analyzes harmonic content (heuristic method)
- **Duration Tracking**: Displays total track length
- **Detailed Metadata**: Sample rate, channels, file size information

**Annotations & Markers**
- **Markers**: Add timestamped markers during playback (🏷️ button or M key)
- **Regions**: Mark sections of interest for study
- **Color Coding**: Visually distinguish different marker types
- **Notes**: Add context to markers (why this moment is important)
- **Region Highlighting**: Visual shading for marked sections on waveform

**Import Options**
- **Folder Import**: Import entire folders of audio files at once
- **File System Access**: Direct folder import (if browser supports it)
- **Fallback Import**: File picker dialog for all browsers
- **Batch Processing**: All files in a folder are automatically processed

### Waveform Generation Details

**How It Works**
1. Upload audio file to a reference library
2. Waveform automatically generates in background (non-blocking)
3. Audio peaks are computed at 1500 resolution points
4. Peaks are normalized using logarithmic scaling for better visual balance
5. Peak colors indicate amplitude levels:
   - **Gray**: Low amplitude (< 0.3)
   - **Green**: Medium amplitude (0.3 - 0.7)
   - **Orange**: High amplitude (> 0.7)

**Waveform Normalization**
- Peaks are automatically normalized to 0-1 range using max-based normalization
- Logarithmic scaling (log base 11) applied for better visual representation
- Formula: `normalized = log(1 + peak/max * 10) / log(11)`
- This ensures quiet sections are visible while loud sections fill the display

**Manual Waveform Generation**
If waveform fails or you want to regenerate:
1. Select the reference track
2. Click the 📊 button in the track actions
3. Wait for decoding and peak computation to complete
4. Waveform displays with progress updates

**Limitations**
- Waveform generation requires browser audio context (modern browsers only)
- Very long files (>90 seconds) may take longer to analyze
- Some rare audio formats may not decode (fallback message shown)

### Advanced Audio Analysis Panel

Click on any reference track to open the **Audio Analysis Panel** above the waveform. This detailed analysis tool provides in-depth frequency spectrum information.

**Frequency Spectrum Analysis**

When you click "🎵 Analyze Audio", the system performs a comprehensive FFT (Fast Fourier Transform) analysis of your audio:

**Three Frequency Bands:**

1. **Lows (Red)** - 20 Hz to 250 Hz
   - Contains bass, sub-bass, and low-end frequencies
   - Measured in: Energy %, Peak amplitude, Average level
   - Use for: Checking bass clarity and presence

2. **Mids (Orange)** - 250 Hz to 4 kHz
   - Contains most vocal and instrument frequencies
   - Critical range for clarity and definition
   - Use for: Analyzing presence and body of sounds

3. **Highs (Green)** - 4 kHz to Nyquist (22.05 kHz)
   - Contains brightness, air, and detail
   - Affects perceived clarity and presence
   - Use for: Checking treble presence and harshness

**Energy Visualization**
- Each band shows a color-coded energy bar (0-100%)
- Visual representation helps identify frequency imbalance
- Quick way to spot EQ issues

**Overall Statistics**

| Metric | Description | Typical Use |
|--------|-------------|------------|
| **RMS Energy** | Root Mean Square - average loudness (0-100%) | Gauge overall level consistency |
| **Peak Amplitude** | Loudest point in the spectrum (0-100%) | Identify peaks and clipping |
| **Dynamic Range** | Difference between loud/quiet (dB) | Higher = more dynamic |
| **Crest Factor** | Peak to average power ratio | Higher = more transient-heavy |

**Dynamic Range Example:**
- 6 dB = Compressed, narrow range
- 12 dB = Moderate range
- 18+ dB = Very dynamic, wide range

**Crest Factor Example:**
- 1.0 = Constant tone (sine wave)
- 2-4 = Most audio material
- 6+ = Highly dynamic (drums, percussive)

### How to Use Audio Analysis

**Step 1: Select a Reference Track**
- Click on a track in the References list
- Analysis panel appears above the waveform

**Step 2: Generate Frequency Analysis**
- Click "🎵 Analyze Audio" button
- System performs FFT analysis (2-5 seconds typically)
- Results display with color-coded frequency bands

**Step 3: Interpret Results**
- Red energy bar = Bass content
- Orange energy bar = Midrange presence
- Green energy bar = Treble and air
- Check RMS vs Peak for dynamic range
- Compare Crest Factor for transient content

**Step 4: Use for Referencing**
- Compare analysis across multiple reference tracks
- Note which band is dominant in professional mixes
- Use as EQ target for your own mixes

### Frequency Analysis Workflow Examples

**Example 1: Reference Track Analysis**
1. Import a professional mix you love
2. Click to select it
3. Click "Analyze Audio"
4. Note the frequency band distribution
5. Try to match this balance in your own mix

**Example 2: A/B Comparison**
1. Import your mix
2. Import a reference mix
3. Select your mix → note frequency balance
4. Select reference → compare directly
5. Identify which bands need adjustment

**Example 3: Identifying Problems**
1. Load a mix that sounds harsh
2. Analyze and note if Highs are excessive
3. Apply subtle EQ cut in 4-6kHz range
4. Re-analyze to confirm improvement

### Player Controls

| Control | Action |
|---------|--------|
| ▶️ | Play/Pause |
| ⏹️ | Stop |
| 🏷️ or M | Add marker at current position |
| Click waveform | Seek to clicked position |
| Volume slider | Adjust playback volume |
| Spacebar | Play/Pause (when player focused) |

### Workflow Tips

1. **Genre Reference Library**: Build a curated collection of reference tracks for each genre you work in
2. **Learning Collection**: Gather tutorials and articles on specific techniques you're studying
3. **Plugin Database**: Keep notes on plugins you own or want to try
4. **Mood Board**: Use references to establish the vibe you're going for in a new track
5. **Study System**: Organize references by technique (compression, reverb, sound design, etc.)
6. **A/B Comparison**: Import multiple versions of a mix and compare waveforms and frequency spectrum side-by-side
7. **Structure Analysis**: Use markers to annotate song sections (intro, verse, chorus, bridge, outro)
8. **Detail Examination**: Zoom into specific moments using click-to-seek for detailed study
9. **BPM Reference**: Use automatic BPM detection as a starting point (verify manually as it's heuristic)
10. **Playback Loop**: Repeatedly play sections with markers to internalize structure and vibe
11. **Frequency Analysis**: Analyze professional mixes to understand target EQ balance for your genres
12. **EQ Targeting**: Use frequency spectrum to see exactly where problems exist before EQing
13. **Loudness Comparison**: Compare RMS energy and dynamic range across multiple mixes
14. **Transient Study**: Use Crest Factor to understand how percussive different mixes are
15. **Archive Analysis**: Save analysis screenshots or notes alongside reference tracks for future reference

---

## 🏷️ Collections Tab

### Purpose
Create themed bundles of shortcuts, notes, and resources that work together. Collections let you group related items for specific workflows or projects.

### Key Features

- **Create Collections**: Group related shortcuts, notes, and references by workflow
- **Smart Collections**: Auto-populate collections based on tags or filters
- **Manual Collections**: Curate specific items that work well together
- **Share Collections**: Export collections to share with collaborators
- **Import Collections**: Use community-created or shared collections
- **Versioning**: Track collection versions as your workflow evolves

### Example Collections

- **Ableton Arrangement Workflow**: All shortcuts needed for arranging + arrangement note templates
- **Serum Sound Design Masterclass**: Shortcuts + references + patch recipes
- **Mixing Essentials**: Mixing shortcuts + mixing checklists + reference tracks
- **Daily Workflow**: Your most-used shortcuts + quick capture inbox

### Workflow Tips

1. **Workflow Bundles**: Create a collection for each of your common project types
2. **Learning Paths**: Group shortcuts and references for learning a new tool
3. **Collaboration**: Share collections with bandmates or mixing engineers
4. **Seasonal Updates**: Refresh collections as your workflow evolves
5. **Template Export**: Export successful collections to reuse in future projects

---

## 🔍 Search Tab

### Purpose
Global search across all content in the app: shortcuts, notes, projects, references, and more. Unified search that transcends individual features.

### Key Features

- **Cross-Feature Search**: Search simultaneously across:
  - Shortcuts and power features
  - Info Base notes
  - Project names and descriptions
  - Reference metadata
  - Collection names and descriptions
  
- **Advanced Operators**:
  - `type:shortcut` - Search only shortcuts
  - `type:note` - Search only notes
  - `product:serum` - Search only Serum results
  - `tag:mixing` - Search by tag
  - `category:mixing` - Search by category
  
- **Relevance Ranking**: Results ranked by relevance across different content types
- **Result Preview**: Quick preview of each result
- **Jump Navigation**: Navigate directly to the context of any result
- **Saved Searches**: Save frequently-used search queries

### Workflow Tips

1. **Concept Exploration**: Search a production concept to find related shortcuts, notes, and references
2. **Troubleshooting**: Search a problem ("sidechain") to find shortcuts, tutorials, and notes
3. **Technique Deep Dive**: Comprehensive search across all learning materials on a technique
4. **Feature Comparison**: Search to find where features exist across your DAWs
5. **Knowledge Recall**: Search saved questions or problems you've solved before

---

## 🎹 Keyboard Shortcuts Within the App

Global shortcuts available throughout the app:

| Shortcut | Action |
|----------|--------|
| `Cmd+K` (Mac) or `Ctrl+K` (Windows) | Open Command Palette |
| `Cmd+/` (Mac) or `Ctrl+/` (Windows) | Global Search |
| `Cmd+1` through `Cmd+7` | Jump to specific tab |
| `?` | Show keyboard shortcuts help |

---

## 💡 Tips for Getting the Most Out of DAW Shortcuts

### For Learning a New DAW
1. Start with the Shortcuts tab, search for commands you know from your current DAW
2. Compare the difference in workflow
3. Star shortcuts that differ from what you expect
4. Create a Collection called "New DAW Learning" with those starred shortcuts
5. Reference this collection during your first sessions with the new DAW

### For Sound Design Workflows
1. Pin Serum 2 power features related to sound design to your Favorites
2. Create "Patch Recipe" notes for interesting discoveries
3. Link these to References (tutorial videos on that technique)
4. Build a Collection combining all three for a complete learning path

### For Mixing Workflows
1. Document your mixing chain as a "Mix Checklist" template
2. Use the Shortcuts tab to pin EQ, compression, and automation shortcuts
3. Create a "Mixing Essentials" Collection bundling all these elements
4. Reuse this collection for every mixing session

### For Organization
1. Regularly review your Info Base to keep notes current
2. Archive old Projects that are finished
3. Export your Info Base monthly as a backup
4. Review your Inbox weekly and move items to permanent homes

---

## Accessibility & Settings

### Theme Support
- **System**: Follows your OS theme preference (Light/Dark)
- **Light**: Light theme with high contrast
- **Dark**: Dark theme optimized for low-light environments
- Theme choice persists across sessions

### Key Display Options
- **Auto-detect**: Automatically shows Mac or Windows shortcuts
- **Mac**: Force display of macOS keyboard notation (⌘⌥⌃⇧)
- **Windows**: Force display of Windows keyboard notation (Ctrl+Alt+Shift+Win)
- Platform preference persists across sessions

### Offline Support
The app works fully offline:
- Load it once while online
- Works completely offline after first load
- Service worker handles offline support
- Perfect for use on airplanes, in studios without Wi-Fi, or on unreliable connections

---

## FAQ

**Q: Where is my data stored?**
A: All data is stored locally on your device in browser storage (localStorage). Nothing is sent to servers.

**Q: Can I sync data across devices?**
A: Use the Export/Import feature in Info Base to transfer notes between devices.

**Q: Is there a web version?**
A: Yes! Visit the web version to access shortcuts from any device. Your Info Base notes sync via export/import.

**Q: Can I contribute new shortcuts?**
A: Yes! See [CONTRIBUTING.md](./CONTRIBUTING.md) for the contribution guide.

**Q: How often are shortcuts updated?**
A: Shortcuts are updated whenever DAW versions are released. The app updates automatically via service worker.

**Q: What if a shortcut is wrong?**
A: File an issue on GitHub or submit a correction through the contribution process. See [CONTRIBUTING.md](./CONTRIBUTING.md).


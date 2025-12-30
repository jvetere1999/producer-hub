# Pattern Builder

A compact drum pattern builder for learning rhythm patterns in various EDM genres.

## Features

### MIDI Roll Grid
- **Steps x Lanes**: 16-step grid (configurable) with 8 drum lanes
- **Click/Tap**: Toggle notes on/off
- **Drag**: Paint multiple notes
- **Visual feedback**: Current step highlighted during playback

### Drum Rack
Built-in drum sounds:
- **Kick**: Sine pitch drop + envelope
- **Snare**: Noise burst + tone
- **Clap**: Layered noise bursts
- **Hi-Hat**: Filtered noise (closed)
- **Open Hat**: Filtered noise (open, longer decay)
- **Perc**: Triangle wave pitch drop
- **Tom**: Sine wave with decay
- **Rim**: Square wave click

### Templates
Pre-built patterns for learning common EDM rhythms:

| Template | BPM | Description |
|----------|-----|-------------|
| **House** | 124 | 4-on-the-floor kick, offbeat hats, clap on 2/4 |
| **Techno** | 130 | Driving 4/4 with 8th-note hats |
| **Dubstep** | 140 | Half-time snare, syncopated kick |
| **Riddim** | 150 | Triplet-influenced, sparse for bass stabs |
| **Drum & Bass** | 174 | 2-step pattern with ghost kicks |
| **Trap** | 140 | 808-style with snare on 3, hat rolls |

Each template includes an educational explanation of why the pattern works.

### Ghost Kicks
Ghost notes add groove by placing quieter hits around main beats.

**Modes:**
- **Offbeat**: Ghost notes on the "&" of each beat
- **Pre-Snare**: Ghost notes just before snare hits
- **Rolling**: More frequent ghost notes for energy
- **Manual**: Place ghost notes yourself

**Settings:**
- **Velocity**: 20, 40, or 60 (quiet to medium)
- **Density**: 0-100% (how many ghost notes)
- **Apply to**: Select which lanes get ghost notes

Ghost notes render with reduced opacity and play at lower volume.

### Playback
- **Tempo**: 60-200 BPM
- **Swing**: 0-100% (affects offbeat timing)
- **Audio**: Uses WebAudio synthesis (no samples required)

## Usage

### Getting Started
1. Navigate to `/patterns`
2. Click "Tap to Enable" to initialize audio
3. Select a template or start from scratch
4. Click cells to add/remove notes
5. Press Play to hear your pattern

### Keyboard Navigation
- **Arrow keys**: Move between cells
- **Space/Enter**: Toggle current cell
- **Tab**: Move between controls

### Saving
Patterns auto-save to localStorage with the key `producerhub_patterns_v1`.

## Verification

### Manual Testing
1. Load `/patterns`
2. Select "House" template
3. Verify kick on beats 1-4 (steps 1, 5, 9, 13)
4. Enable Ghost Kicks → Pre-Snare mode
5. Verify ghost notes appear with lower opacity
6. Click Play → verify audio plays

### Playwright Tests
```bash
npm run test:e2e -- --grep "Pattern Builder"
```

Expected results:
- ✓ Page loads with grid and controls
- ✓ Template selection updates pattern
- ✓ Cell click toggles hit
- ✓ Ghost toggle changes rendering
- ✓ Mobile: No horizontal overflow
- ✓ Mobile: Transport is usable (44px targets)

## Data Model

```typescript
interface DrumPattern {
    id: string;
    name: string;
    genre: string;
    bpm: number;
    swing: number;            // 0-1
    stepsPerBar: number;      // 16 default
    bars: number;             // 1-4
    lanes: PatternLane[];
    ghost: GhostConfig;
    createdAt: string;
    updatedAt: string;
}

interface PatternLane {
    laneId: string;
    name: string;
    hits: boolean[];
    velocity: number[];       // 0-127 per step
    muted: boolean;
    solo: boolean;
}

interface GhostConfig {
    enabled: boolean;
    mode: 'offbeat' | 'pre-snare' | 'rolling' | 'user-defined';
    velocity: number;
    applyToLaneIds: string[];
    density: number;          // 0-1
}
```

## Limitations

- **No MIDI export**: Patterns cannot be exported as MIDI files (future feature)
- **Synthesis only**: Uses WebAudio synthesis, no sample loading
- **Single pattern**: Only one pattern loaded at a time
- **No undo**: Changes are immediate (pattern saved on each change)

## Files

```
src/lib/patterns/
├── model.ts            # Data types and utilities
├── templates.ts        # Built-in pattern templates
├── ghost.ts            # Ghost kick logic
├── storage.ts          # LocalStorage persistence
├── audio.ts            # WebAudio synthesis
├── index.ts            # Module exports
├── DrumRack.svelte     # Lane list component
├── MidiRoll.svelte     # Grid component
├── Transport.svelte    # Playback controls
├── GhostControls.svelte # Ghost configuration
└── TemplateSelector.svelte

src/routes/patterns/
└── +page.svelte        # Main page

tests/
└── patterns.spec.ts    # Playwright tests
```


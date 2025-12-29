/**
 * Info Base Types
 *
 * Defines the data model for the local knowledge base feature.
 *
 * @module infobase/types
 */

/**
 * Categories for knowledge entries.
 */
export type NoteCategory =
    | 'Mixing'
    | 'Sound Design'
    | 'Synthesis'
    | 'Sampling'
    | 'Arrangement'
    | 'Mastering'
    | 'Recording'
    | 'General';

/**
 * A link reference in a knowledge entry.
 */
export interface NoteLink {
    title: string;
    url: string;
}

/**
 * A knowledge base entry.
 */
export interface KnowledgeNote {
    /** Unique identifier (UUID or slug+timestamp) */
    id: string;
    /** Entry title */
    title: string;
    /** Body content (Markdown or plaintext) */
    body: string;
    /** Searchable tags */
    tags: string[];
    /** Optional category */
    category?: NoteCategory;
    /** Optional reference links */
    links?: NoteLink[];
    /** ISO timestamp of creation */
    createdAt: string;
    /** ISO timestamp of last update */
    updatedAt: string;
}

/**
 * The complete Info Base state stored in localStorage.
 */
export interface InfoBaseState {
    /** Schema version for migrations */
    version: number;
    /** Map of entry ID to entry */
    entries: Record<string, KnowledgeNote>;
    /** Ordered list of entry IDs for display */
    order: string[];
}

/**
 * Quick templates for creating new entries.
 */
export interface NoteTemplate {
    id: string;
    name: string;
    category: NoteCategory;
    title: string;
    body: string;
    tags: string[];
}

/**
 * Available note templates.
 */
export const NOTE_TEMPLATES: NoteTemplate[] = [
    {
        id: 'patch-recipe',
        name: 'Patch Recipe',
        category: 'Sound Design',
        title: 'New Patch Recipe',
        body: `## Sound Description
[Describe the sound you're creating]

## Oscillators
- OSC 1:
- OSC 2:

## Filter
- Type:
- Cutoff:
- Resonance:

## Modulation
- LFO 1:
- Envelope:

## Effects
-

## Notes
`,
        tags: ['patch', 'sound-design']
    },
    {
        id: 'mix-checklist',
        name: 'Mix Checklist',
        category: 'Mixing',
        title: 'Mix Checklist',
        body: `## Pre-Mix
- [ ] Gain staging complete
- [ ] All tracks labeled and organized
- [ ] Reference track loaded

## Balance
- [ ] Rough volume balance
- [ ] Panning decisions
- [ ] Frequency balance check

## Processing
- [ ] EQ adjustments
- [ ] Compression applied
- [ ] Saturation/color added

## Space
- [ ] Reverb sends
- [ ] Delay sends
- [ ] Width/stereo imaging

## Final Checks
- [ ] Mono compatibility
- [ ] Headroom for mastering
- [ ] No clipping
`,
        tags: ['mixing', 'checklist']
    },
    {
        id: 'drum-processing',
        name: 'Drum Processing Chain',
        category: 'Mixing',
        title: 'Drum Processing Notes',
        body: `## Kick
- EQ:
- Compression:
- Other:

## Snare
- EQ:
- Compression:
- Other:

## Hi-Hats
- EQ:
- Processing:

## Bus Processing
- Glue compression:
- Parallel compression:
- Saturation:

## Notes
`,
        tags: ['drums', 'mixing', 'processing']
    },
    {
        id: 'arrangement-notes',
        name: 'Arrangement Notes',
        category: 'Arrangement',
        title: 'Track Arrangement',
        body: `## Song Structure
| Section | Bars | Notes |
|---------|------|-------|
| Intro   |      |       |
| Verse   |      |       |
| Chorus  |      |       |
| Bridge  |      |       |
| Outro   |      |       |

## Key & Tempo
- Key:
- BPM:
- Time Signature:

## Instrumentation
-

## Energy Map
-

## Reference Tracks
-
`,
        tags: ['arrangement', 'structure']
    },
    {
        id: 'fx-chain',
        name: 'FX Chain',
        category: 'Sound Design',
        title: 'FX Chain Notes',
        body: `## Purpose
[What is this chain for?]

## Signal Chain
1.
2.
3.
4.

## Settings
### Effect 1
-

### Effect 2
-

### Effect 3
-

## Automation Ideas
-

## Notes
`,
        tags: ['fx', 'effects', 'chain']
    },
    {
        id: 'mastering-notes',
        name: 'Mastering Notes',
        category: 'Mastering',
        title: 'Mastering Session Notes',
        body: `## Source Mix
- Peak level:
- LUFS:
- Issues to address:

## Processing Chain
1.
2.
3.
4.

## Target Specs
- LUFS target:
- True peak:
- Format:

## Reference Tracks
-

## A/B Notes
-

## Final Settings
`,
        tags: ['mastering', 'final-mix']
    }
];

/**
 * All available categories.
 */
export const NOTE_CATEGORIES: NoteCategory[] = [
    'Mixing',
    'Sound Design',
    'Synthesis',
    'Sampling',
    'Arrangement',
    'Mastering',
    'Recording',
    'General'
];


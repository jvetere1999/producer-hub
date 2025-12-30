/**
 * Built-in Lane Templates
 *
 * Curated, pre-made templates for the Lane Builder.
 * These are NOT user-private - they are publicly available for SEO pages.
 *
 * Security:
 * - These templates are read-only and cannot be modified
 * - User data is never mixed with built-in templates
 * - Share URLs are validated and size-capped
 */

import type { SyncNote, SyncLaneSettings, LaneTemplateType } from './vaultTypes';

// ============================================
// Types
// ============================================

export interface BuiltInTemplate {
    id: string;
    slug: string; // URL-friendly identifier
    name: string;
    type: LaneTemplateType;
    description: string;
    longDescription?: string;

    // Musical metadata
    bpm: number;
    bars: number;
    timeSignature: [number, number];
    key: string;
    scaleType: string;

    // Settings
    laneSettings: SyncLaneSettings;

    // Notes
    notes: SyncNote[];

    // SEO & Organization
    tags: string[];
    genre: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    relatedTemplates?: string[]; // IDs of related templates

    // Metadata
    createdAt: string;
    author: string;
}

// ============================================
// Share URL Encoding
// ============================================

export const SHARE_URL_VERSION = 1;
export const MAX_SHARE_URL_SIZE = 4096; // 4KB max for URL

/**
 * Encode template data for share URL
 */
export function encodeTemplateForShare(template: BuiltInTemplate): string {
    const payload = {
        v: SHARE_URL_VERSION,
        id: template.id,
        type: template.type,
        name: template.name,
        bpm: template.bpm,
        bars: template.bars,
        ts: template.timeSignature,
        key: template.key,
        scale: template.scaleType,
        settings: {
            inst: template.laneSettings.instrumentId,
            mode: template.laneSettings.noteMode,
            vel: template.laneSettings.velocityDefault,
            grid: template.laneSettings.quantizeGrid,
            color: template.laneSettings.color,
        },
        notes: template.notes.map(n => [n.pitch, n.startBeat, n.duration, n.velocity]),
    };

    const json = JSON.stringify(payload);
    const encoded = btoa(encodeURIComponent(json));

    if (encoded.length > MAX_SHARE_URL_SIZE) {
        throw new Error('Template too large for share URL');
    }

    return encoded;
}

/**
 * Decode and validate share URL payload
 */
export function decodeShareUrl(encoded: string): BuiltInTemplate | null {
    try {
        if (encoded.length > MAX_SHARE_URL_SIZE) {
            console.warn('Share URL exceeds size limit');
            return null;
        }

        const json = decodeURIComponent(atob(encoded));
        const payload = JSON.parse(json);

        // Validate version
        if (payload.v !== SHARE_URL_VERSION) {
            console.warn('Unsupported share URL version:', payload.v);
            return null;
        }

        // Validate required fields
        if (!payload.id || !payload.type || !payload.name) {
            return null;
        }

        // Validate notes array
        if (!Array.isArray(payload.notes)) {
            return null;
        }

        // Reconstruct template
        const template: BuiltInTemplate = {
            id: String(payload.id).substring(0, 64),
            slug: String(payload.id).substring(0, 64).toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            name: String(payload.name).substring(0, 128),
            type: ['melody', 'drums', 'chord'].includes(payload.type) ? payload.type : 'melody',
            description: '',
            bpm: Math.max(40, Math.min(300, Number(payload.bpm) || 120)),
            bars: Math.max(1, Math.min(64, Number(payload.bars) || 4)),
            timeSignature: Array.isArray(payload.ts) ? [
                Math.max(1, Math.min(16, payload.ts[0] || 4)),
                Math.max(1, Math.min(16, payload.ts[1] || 4)),
            ] as [number, number] : [4, 4],
            key: String(payload.key || 'C').substring(0, 8),
            scaleType: String(payload.scale || 'major').substring(0, 32),
            laneSettings: {
                instrumentId: String(payload.settings?.inst || 'piano').substring(0, 64),
                noteMode: payload.settings?.mode === 'oneShot' ? 'oneShot' : 'sustain',
                velocityDefault: Math.max(1, Math.min(127, Number(payload.settings?.vel) || 100)),
                quantizeGrid: ['1/4', '1/8', '1/16', '1/32', 'off'].includes(payload.settings?.grid)
                    ? payload.settings.grid
                    : 'off',
                color: String(payload.settings?.color || '#4a9eff').substring(0, 16),
            },
            notes: payload.notes.slice(0, 256).map((n: number[]) => ({
                pitch: Math.max(0, Math.min(127, n[0] || 60)),
                startBeat: Math.max(0, n[1] || 0),
                duration: Math.max(0.0625, n[2] || 1),
                velocity: Math.max(1, Math.min(127, n[3] || 100)),
            })),
            tags: [],
            genre: 'custom',
            difficulty: 'intermediate',
            createdAt: new Date().toISOString(),
            author: 'Shared',
        };

        return template;
    } catch (e) {
        console.error('Failed to decode share URL:', e);
        return null;
    }
}

/**
 * Generate "Open in Lane Builder" URL
 */
export function getOpenInLaneBuilderUrl(template: BuiltInTemplate, baseUrl: string = ''): string {
    try {
        const encoded = encodeTemplateForShare(template);
        return `${baseUrl}/arrange?template=${encoded}`;
    } catch (e) {
        console.error('Failed to generate Lane Builder URL:', e);
        return `${baseUrl}/arrange`;
    }
}

// ============================================
// Built-in Drum Templates
// ============================================

export const BUILTIN_DRUM_TEMPLATES: BuiltInTemplate[] = [
    {
        id: 'basic-rock-beat',
        slug: 'basic-rock-beat',
        name: 'Basic Rock Beat',
        type: 'drums',
        description: 'A classic 4/4 rock drum pattern with kick, snare, and hi-hat.',
        longDescription: 'This fundamental rock beat features a driving kick drum on beats 1 and 3, a solid snare on beats 2 and 4, and steady eighth-note hi-hats. Perfect for learning drum programming basics or as a foundation for rock and pop productions.',
        bpm: 120,
        bars: 2,
        timeSignature: [4, 4],
        key: 'C',
        scaleType: 'major',
        laneSettings: {
            instrumentId: 'drums-acoustic',
            noteMode: 'oneShot',
            velocityDefault: 100,
            quantizeGrid: '1/8',
            color: '#ff6b6b',
        },
        notes: [
            // Bar 1
            { pitch: 36, startBeat: 0, duration: 0.5, velocity: 100 },     // Kick
            { pitch: 42, startBeat: 0, duration: 0.25, velocity: 80 },    // Hi-hat
            { pitch: 42, startBeat: 0.5, duration: 0.25, velocity: 70 },  // Hi-hat
            { pitch: 38, startBeat: 1, duration: 0.5, velocity: 100 },    // Snare
            { pitch: 42, startBeat: 1, duration: 0.25, velocity: 80 },    // Hi-hat
            { pitch: 42, startBeat: 1.5, duration: 0.25, velocity: 70 },  // Hi-hat
            { pitch: 36, startBeat: 2, duration: 0.5, velocity: 100 },    // Kick
            { pitch: 42, startBeat: 2, duration: 0.25, velocity: 80 },    // Hi-hat
            { pitch: 42, startBeat: 2.5, duration: 0.25, velocity: 70 },  // Hi-hat
            { pitch: 38, startBeat: 3, duration: 0.5, velocity: 100 },    // Snare
            { pitch: 42, startBeat: 3, duration: 0.25, velocity: 80 },    // Hi-hat
            { pitch: 42, startBeat: 3.5, duration: 0.25, velocity: 70 },  // Hi-hat
            // Bar 2
            { pitch: 36, startBeat: 4, duration: 0.5, velocity: 100 },
            { pitch: 42, startBeat: 4, duration: 0.25, velocity: 80 },
            { pitch: 42, startBeat: 4.5, duration: 0.25, velocity: 70 },
            { pitch: 38, startBeat: 5, duration: 0.5, velocity: 100 },
            { pitch: 42, startBeat: 5, duration: 0.25, velocity: 80 },
            { pitch: 42, startBeat: 5.5, duration: 0.25, velocity: 70 },
            { pitch: 36, startBeat: 6, duration: 0.5, velocity: 100 },
            { pitch: 42, startBeat: 6, duration: 0.25, velocity: 80 },
            { pitch: 42, startBeat: 6.5, duration: 0.25, velocity: 70 },
            { pitch: 38, startBeat: 7, duration: 0.5, velocity: 100 },
            { pitch: 42, startBeat: 7, duration: 0.25, velocity: 80 },
            { pitch: 42, startBeat: 7.5, duration: 0.25, velocity: 70 },
        ],
        tags: ['rock', 'basic', 'beginner', 'drum-pattern', '4/4'],
        genre: 'Rock',
        difficulty: 'beginner',
        relatedTemplates: ['four-on-the-floor', 'syncopated-funk'],
        createdAt: '2024-01-01T00:00:00Z',
        author: 'ProducerHub',
    },
    {
        id: 'four-on-the-floor',
        slug: 'four-on-the-floor',
        name: 'Four on the Floor',
        type: 'drums',
        description: 'Classic EDM/house kick pattern with off-beat hi-hats.',
        longDescription: 'The quintessential dance music beat featuring a kick drum on every quarter note. Off-beat hi-hats create forward momentum while snares accent beats 2 and 4. Essential for house, techno, and EDM productions.',
        bpm: 128,
        bars: 2,
        timeSignature: [4, 4],
        key: 'C',
        scaleType: 'major',
        laneSettings: {
            instrumentId: 'drums-electronic',
            noteMode: 'oneShot',
            velocityDefault: 100,
            quantizeGrid: '1/8',
            color: '#4ecdc4',
        },
        notes: [
            // Bar 1
            { pitch: 36, startBeat: 0, duration: 0.5, velocity: 110 },
            { pitch: 42, startBeat: 0.5, duration: 0.25, velocity: 75 },
            { pitch: 36, startBeat: 1, duration: 0.5, velocity: 100 },
            { pitch: 39, startBeat: 1, duration: 0.5, velocity: 90 },     // Clap
            { pitch: 42, startBeat: 1.5, duration: 0.25, velocity: 75 },
            { pitch: 36, startBeat: 2, duration: 0.5, velocity: 100 },
            { pitch: 42, startBeat: 2.5, duration: 0.25, velocity: 75 },
            { pitch: 36, startBeat: 3, duration: 0.5, velocity: 100 },
            { pitch: 39, startBeat: 3, duration: 0.5, velocity: 90 },
            { pitch: 42, startBeat: 3.5, duration: 0.25, velocity: 75 },
            // Bar 2
            { pitch: 36, startBeat: 4, duration: 0.5, velocity: 110 },
            { pitch: 42, startBeat: 4.5, duration: 0.25, velocity: 75 },
            { pitch: 36, startBeat: 5, duration: 0.5, velocity: 100 },
            { pitch: 39, startBeat: 5, duration: 0.5, velocity: 90 },
            { pitch: 42, startBeat: 5.5, duration: 0.25, velocity: 75 },
            { pitch: 36, startBeat: 6, duration: 0.5, velocity: 100 },
            { pitch: 42, startBeat: 6.5, duration: 0.25, velocity: 75 },
            { pitch: 36, startBeat: 7, duration: 0.5, velocity: 100 },
            { pitch: 39, startBeat: 7, duration: 0.5, velocity: 90 },
            { pitch: 42, startBeat: 7.5, duration: 0.25, velocity: 75 },
        ],
        tags: ['edm', 'house', 'electronic', 'dance', '4/4'],
        genre: 'Electronic',
        difficulty: 'beginner',
        relatedTemplates: ['basic-rock-beat', 'syncopated-funk'],
        createdAt: '2024-01-01T00:00:00Z',
        author: 'ProducerHub',
    },
    {
        id: 'syncopated-funk',
        slug: 'syncopated-funk',
        name: 'Syncopated Funk',
        type: 'drums',
        description: 'Groovy funk pattern with ghost notes and syncopation.',
        longDescription: 'A funky drum pattern featuring syncopated kick placement, ghost notes on the snare, and a tight hi-hat groove. The off-beat accents create the characteristic funk feel that drives R&B, soul, and funk productions.',
        bpm: 100,
        bars: 2,
        timeSignature: [4, 4],
        key: 'C',
        scaleType: 'major',
        laneSettings: {
            instrumentId: 'drums-acoustic',
            noteMode: 'oneShot',
            velocityDefault: 100,
            quantizeGrid: '1/16',
            color: '#9b59b6',
        },
        notes: [
            // Bar 1
            { pitch: 36, startBeat: 0, duration: 0.25, velocity: 100 },
            { pitch: 42, startBeat: 0, duration: 0.125, velocity: 80 },
            { pitch: 42, startBeat: 0.25, duration: 0.125, velocity: 60 },
            { pitch: 42, startBeat: 0.5, duration: 0.125, velocity: 80 },
            { pitch: 38, startBeat: 0.75, duration: 0.25, velocity: 40 },  // Ghost note
            { pitch: 38, startBeat: 1, duration: 0.5, velocity: 100 },
            { pitch: 42, startBeat: 1, duration: 0.125, velocity: 80 },
            { pitch: 36, startBeat: 1.5, duration: 0.25, velocity: 80 },
            { pitch: 42, startBeat: 1.5, duration: 0.125, velocity: 60 },
            { pitch: 42, startBeat: 1.75, duration: 0.125, velocity: 80 },
            { pitch: 36, startBeat: 2.25, duration: 0.25, velocity: 90 },
            { pitch: 42, startBeat: 2, duration: 0.125, velocity: 80 },
            { pitch: 42, startBeat: 2.5, duration: 0.125, velocity: 60 },
            { pitch: 38, startBeat: 2.75, duration: 0.25, velocity: 40 },
            { pitch: 38, startBeat: 3, duration: 0.5, velocity: 100 },
            { pitch: 42, startBeat: 3, duration: 0.125, velocity: 80 },
            { pitch: 42, startBeat: 3.5, duration: 0.125, velocity: 60 },
            { pitch: 36, startBeat: 3.75, duration: 0.25, velocity: 70 },
            // Bar 2 (similar with variation)
            { pitch: 36, startBeat: 4, duration: 0.25, velocity: 100 },
            { pitch: 42, startBeat: 4, duration: 0.125, velocity: 80 },
            { pitch: 42, startBeat: 4.25, duration: 0.125, velocity: 60 },
            { pitch: 42, startBeat: 4.5, duration: 0.125, velocity: 80 },
            { pitch: 38, startBeat: 4.75, duration: 0.25, velocity: 40 },
            { pitch: 38, startBeat: 5, duration: 0.5, velocity: 100 },
            { pitch: 42, startBeat: 5, duration: 0.125, velocity: 80 },
            { pitch: 36, startBeat: 5.5, duration: 0.25, velocity: 80 },
            { pitch: 42, startBeat: 5.5, duration: 0.125, velocity: 60 },
            { pitch: 42, startBeat: 5.75, duration: 0.125, velocity: 80 },
            { pitch: 36, startBeat: 6.25, duration: 0.25, velocity: 90 },
            { pitch: 42, startBeat: 6, duration: 0.125, velocity: 80 },
            { pitch: 42, startBeat: 6.5, duration: 0.125, velocity: 60 },
            { pitch: 38, startBeat: 6.75, duration: 0.25, velocity: 40 },
            { pitch: 38, startBeat: 7, duration: 0.5, velocity: 100 },
            { pitch: 42, startBeat: 7, duration: 0.125, velocity: 80 },
            { pitch: 46, startBeat: 7.5, duration: 0.25, velocity: 90 }, // Open hi-hat
        ],
        tags: ['funk', 'groove', 'syncopation', 'ghost-notes', 'r&b'],
        genre: 'Funk',
        difficulty: 'intermediate',
        relatedTemplates: ['basic-rock-beat', 'four-on-the-floor'],
        createdAt: '2024-01-01T00:00:00Z',
        author: 'ProducerHub',
    },
];

// ============================================
// Built-in Melody Templates
// ============================================

export const BUILTIN_MELODY_TEMPLATES: BuiltInTemplate[] = [
    {
        id: 'simple-c-major-scale',
        slug: 'simple-c-major-scale',
        name: 'C Major Scale',
        type: 'melody',
        description: 'Ascending C major scale for practicing and learning.',
        longDescription: 'A simple ascending C major scale from C4 to C5. Perfect for beginners learning note placement, understanding the major scale intervals, or as a starting point for melodic development.',
        bpm: 100,
        bars: 2,
        timeSignature: [4, 4],
        key: 'C',
        scaleType: 'major',
        laneSettings: {
            instrumentId: 'soft-grand-piano',
            noteMode: 'sustain',
            velocityDefault: 80,
            quantizeGrid: '1/4',
            color: '#4a9eff',
        },
        notes: [
            { pitch: 60, startBeat: 0, duration: 1, velocity: 80 },   // C4
            { pitch: 62, startBeat: 1, duration: 1, velocity: 80 },   // D4
            { pitch: 64, startBeat: 2, duration: 1, velocity: 80 },   // E4
            { pitch: 65, startBeat: 3, duration: 1, velocity: 80 },   // F4
            { pitch: 67, startBeat: 4, duration: 1, velocity: 80 },   // G4
            { pitch: 69, startBeat: 5, duration: 1, velocity: 80 },   // A4
            { pitch: 71, startBeat: 6, duration: 1, velocity: 80 },   // B4
            { pitch: 72, startBeat: 7, duration: 1, velocity: 85 },   // C5
        ],
        tags: ['scale', 'major', 'beginner', 'c-major', 'piano'],
        genre: 'Educational',
        difficulty: 'beginner',
        relatedTemplates: ['simple-arpeggio', 'pop-melody-hook'],
        createdAt: '2024-01-01T00:00:00Z',
        author: 'ProducerHub',
    },
    {
        id: 'simple-arpeggio',
        slug: 'simple-arpeggio',
        name: 'Simple Arpeggio',
        type: 'melody',
        description: 'Basic C major arpeggio pattern for chord-based melodies.',
        longDescription: 'A gentle arpeggiated pattern using the notes of a C major chord. This template demonstrates how chord tones can create flowing melodic motion, perfect for ambient pads, intro sections, or as accompaniment.',
        bpm: 90,
        bars: 2,
        timeSignature: [4, 4],
        key: 'C',
        scaleType: 'major',
        laneSettings: {
            instrumentId: 'soft-grand-piano',
            noteMode: 'sustain',
            velocityDefault: 70,
            quantizeGrid: '1/8',
            color: '#81c784',
        },
        notes: [
            // Bar 1 - C major arpeggio
            { pitch: 48, startBeat: 0, duration: 0.5, velocity: 70 },    // C3
            { pitch: 52, startBeat: 0.5, duration: 0.5, velocity: 65 },  // E3
            { pitch: 55, startBeat: 1, duration: 0.5, velocity: 65 },    // G3
            { pitch: 60, startBeat: 1.5, duration: 0.5, velocity: 75 },  // C4
            { pitch: 55, startBeat: 2, duration: 0.5, velocity: 65 },    // G3
            { pitch: 52, startBeat: 2.5, duration: 0.5, velocity: 65 },  // E3
            { pitch: 48, startBeat: 3, duration: 0.5, velocity: 70 },    // C3
            { pitch: 52, startBeat: 3.5, duration: 0.5, velocity: 65 },  // E3
            // Bar 2 - Continue pattern
            { pitch: 55, startBeat: 4, duration: 0.5, velocity: 65 },
            { pitch: 60, startBeat: 4.5, duration: 0.5, velocity: 75 },
            { pitch: 64, startBeat: 5, duration: 0.5, velocity: 70 },    // E4
            { pitch: 60, startBeat: 5.5, duration: 0.5, velocity: 75 },
            { pitch: 55, startBeat: 6, duration: 0.5, velocity: 65 },
            { pitch: 52, startBeat: 6.5, duration: 0.5, velocity: 65 },
            { pitch: 48, startBeat: 7, duration: 1, velocity: 80 },
        ],
        tags: ['arpeggio', 'chord', 'piano', 'ambient', 'beginner'],
        genre: 'Ambient',
        difficulty: 'beginner',
        relatedTemplates: ['simple-c-major-scale', 'pop-melody-hook'],
        createdAt: '2024-01-01T00:00:00Z',
        author: 'ProducerHub',
    },
    {
        id: 'pop-melody-hook',
        slug: 'pop-melody-hook',
        name: 'Pop Melody Hook',
        type: 'melody',
        description: 'Catchy pop-style melodic hook with memorable phrasing.',
        longDescription: 'A contemporary pop-style melodic phrase with strong rhythmic accents and singable intervals. Features stepwise motion mixed with strategic leaps to create an earworm-worthy hook suitable for verses or choruses.',
        bpm: 120,
        bars: 4,
        timeSignature: [4, 4],
        key: 'C',
        scaleType: 'major',
        laneSettings: {
            instrumentId: 'soft-grand-piano',
            noteMode: 'sustain',
            velocityDefault: 85,
            quantizeGrid: '1/8',
            color: '#ff9800',
        },
        notes: [
            // Bar 1
            { pitch: 64, startBeat: 0, duration: 0.5, velocity: 90 },    // E4
            { pitch: 67, startBeat: 0.5, duration: 0.5, velocity: 85 },  // G4
            { pitch: 69, startBeat: 1, duration: 1, velocity: 95 },      // A4
            { pitch: 67, startBeat: 2, duration: 0.5, velocity: 80 },
            { pitch: 64, startBeat: 2.5, duration: 0.5, velocity: 75 },
            { pitch: 62, startBeat: 3, duration: 1, velocity: 85 },      // D4
            // Bar 2
            { pitch: 64, startBeat: 4, duration: 0.5, velocity: 90 },
            { pitch: 67, startBeat: 4.5, duration: 0.5, velocity: 85 },
            { pitch: 72, startBeat: 5, duration: 1.5, velocity: 100 },   // C5 (high point)
            { pitch: 71, startBeat: 6.5, duration: 0.5, velocity: 80 },  // B4
            { pitch: 69, startBeat: 7, duration: 1, velocity: 85 },
            // Bar 3
            { pitch: 67, startBeat: 8, duration: 0.5, velocity: 85 },
            { pitch: 64, startBeat: 8.5, duration: 0.5, velocity: 80 },
            { pitch: 62, startBeat: 9, duration: 1, velocity: 85 },
            { pitch: 64, startBeat: 10, duration: 1, velocity: 90 },
            { pitch: 67, startBeat: 11, duration: 1, velocity: 85 },
            // Bar 4 - Resolution
            { pitch: 69, startBeat: 12, duration: 0.5, velocity: 90 },
            { pitch: 67, startBeat: 12.5, duration: 0.5, velocity: 80 },
            { pitch: 64, startBeat: 13, duration: 1, velocity: 85 },
            { pitch: 60, startBeat: 14, duration: 2, velocity: 95 },     // C4 (resolution)
        ],
        tags: ['pop', 'hook', 'melody', 'catchy', 'singable'],
        genre: 'Pop',
        difficulty: 'intermediate',
        relatedTemplates: ['simple-arpeggio', 'simple-c-major-scale'],
        createdAt: '2024-01-01T00:00:00Z',
        author: 'ProducerHub',
    },
];

// ============================================
// Built-in Chord Templates
// ============================================

export const BUILTIN_CHORD_TEMPLATES: BuiltInTemplate[] = [
    {
        id: 'i-v-vi-iv-progression',
        slug: 'i-v-vi-iv-progression',
        name: 'I-V-vi-IV Progression',
        type: 'chord',
        description: 'The most popular chord progression in pop music.',
        longDescription: 'This iconic progression (I-V-vi-IV) has powered countless hit songs from "Let It Be" to "Someone Like You". Each chord lasts one bar, creating a satisfying cycle of tension and release that works in virtually any genre.',
        bpm: 120,
        bars: 4,
        timeSignature: [4, 4],
        key: 'C',
        scaleType: 'major',
        laneSettings: {
            instrumentId: 'soft-grand-piano',
            noteMode: 'sustain',
            velocityDefault: 75,
            quantizeGrid: '1/4',
            color: '#e91e63',
        },
        notes: [
            // Bar 1 - C major (I)
            { pitch: 48, startBeat: 0, duration: 4, velocity: 80 },    // C3
            { pitch: 52, startBeat: 0, duration: 4, velocity: 75 },    // E3
            { pitch: 55, startBeat: 0, duration: 4, velocity: 75 },    // G3
            // Bar 2 - G major (V)
            { pitch: 43, startBeat: 4, duration: 4, velocity: 80 },    // G2
            { pitch: 47, startBeat: 4, duration: 4, velocity: 75 },    // B2
            { pitch: 50, startBeat: 4, duration: 4, velocity: 75 },    // D3
            // Bar 3 - A minor (vi)
            { pitch: 45, startBeat: 8, duration: 4, velocity: 80 },    // A2
            { pitch: 48, startBeat: 8, duration: 4, velocity: 75 },    // C3
            { pitch: 52, startBeat: 8, duration: 4, velocity: 75 },    // E3
            // Bar 4 - F major (IV)
            { pitch: 41, startBeat: 12, duration: 4, velocity: 80 },   // F2
            { pitch: 45, startBeat: 12, duration: 4, velocity: 75 },   // A2
            { pitch: 48, startBeat: 12, duration: 4, velocity: 75 },   // C3
        ],
        tags: ['pop', 'progression', 'classic', 'major', 'hit'],
        genre: 'Pop',
        difficulty: 'beginner',
        relatedTemplates: ['sad-minor-progression', 'jazz-ii-v-i'],
        createdAt: '2024-01-01T00:00:00Z',
        author: 'ProducerHub',
    },
    {
        id: 'sad-minor-progression',
        slug: 'sad-minor-progression',
        name: 'Sad Minor Progression',
        type: 'chord',
        description: 'Emotional minor key progression for ballads and sad songs.',
        longDescription: 'A melancholic progression in A minor (i-VI-III-VII) that evokes deep emotion and introspection. Perfect for ballads, film scores, or any production needing an emotional undertone.',
        bpm: 72,
        bars: 4,
        timeSignature: [4, 4],
        key: 'Am',
        scaleType: 'minor',
        laneSettings: {
            instrumentId: 'soft-grand-piano',
            noteMode: 'sustain',
            velocityDefault: 70,
            quantizeGrid: '1/4',
            color: '#5c6bc0',
        },
        notes: [
            // Bar 1 - A minor (i)
            { pitch: 45, startBeat: 0, duration: 4, velocity: 75 },
            { pitch: 48, startBeat: 0, duration: 4, velocity: 70 },
            { pitch: 52, startBeat: 0, duration: 4, velocity: 70 },
            // Bar 2 - F major (VI)
            { pitch: 41, startBeat: 4, duration: 4, velocity: 75 },
            { pitch: 45, startBeat: 4, duration: 4, velocity: 70 },
            { pitch: 48, startBeat: 4, duration: 4, velocity: 70 },
            // Bar 3 - C major (III)
            { pitch: 48, startBeat: 8, duration: 4, velocity: 75 },
            { pitch: 52, startBeat: 8, duration: 4, velocity: 70 },
            { pitch: 55, startBeat: 8, duration: 4, velocity: 70 },
            // Bar 4 - G major (VII)
            { pitch: 43, startBeat: 12, duration: 4, velocity: 75 },
            { pitch: 47, startBeat: 12, duration: 4, velocity: 70 },
            { pitch: 50, startBeat: 12, duration: 4, velocity: 70 },
        ],
        tags: ['minor', 'sad', 'emotional', 'ballad', 'cinematic'],
        genre: 'Ballad',
        difficulty: 'beginner',
        relatedTemplates: ['i-v-vi-iv-progression', 'jazz-ii-v-i'],
        createdAt: '2024-01-01T00:00:00Z',
        author: 'ProducerHub',
    },
    {
        id: 'jazz-ii-v-i',
        slug: 'jazz-ii-v-i',
        name: 'Jazz ii-V-I',
        type: 'chord',
        description: 'The essential jazz chord progression with seventh chords.',
        longDescription: 'The ii-V-I progression is the backbone of jazz harmony. This template uses seventh chords (Dm7-G7-Cmaj7) for authentic jazz voicings. Essential for jazz standards, smooth jazz, and sophisticated pop productions.',
        bpm: 110,
        bars: 4,
        timeSignature: [4, 4],
        key: 'C',
        scaleType: 'major',
        laneSettings: {
            instrumentId: 'soft-grand-piano',
            noteMode: 'sustain',
            velocityDefault: 70,
            quantizeGrid: '1/4',
            color: '#795548',
        },
        notes: [
            // Bar 1-2 - Dm7 (ii)
            { pitch: 50, startBeat: 0, duration: 8, velocity: 70 },    // D3
            { pitch: 53, startBeat: 0, duration: 8, velocity: 65 },    // F3
            { pitch: 57, startBeat: 0, duration: 8, velocity: 65 },    // A3
            { pitch: 60, startBeat: 0, duration: 8, velocity: 65 },    // C4
            // Bar 3 - G7 (V)
            { pitch: 43, startBeat: 8, duration: 4, velocity: 75 },    // G2
            { pitch: 47, startBeat: 8, duration: 4, velocity: 65 },    // B2
            { pitch: 53, startBeat: 8, duration: 4, velocity: 65 },    // F3
            { pitch: 55, startBeat: 8, duration: 4, velocity: 65 },    // G3 (doubled)
            // Bar 4 - Cmaj7 (I)
            { pitch: 48, startBeat: 12, duration: 4, velocity: 75 },   // C3
            { pitch: 52, startBeat: 12, duration: 4, velocity: 65 },   // E3
            { pitch: 55, startBeat: 12, duration: 4, velocity: 65 },   // G3
            { pitch: 59, startBeat: 12, duration: 4, velocity: 65 },   // B3
        ],
        tags: ['jazz', 'ii-v-i', 'seventh-chords', 'sophisticated', 'harmony'],
        genre: 'Jazz',
        difficulty: 'intermediate',
        relatedTemplates: ['i-v-vi-iv-progression', 'sad-minor-progression'],
        createdAt: '2024-01-01T00:00:00Z',
        author: 'ProducerHub',
    },
];

// ============================================
// Combined Template Index
// ============================================

export const ALL_BUILTIN_TEMPLATES: BuiltInTemplate[] = [
    ...BUILTIN_DRUM_TEMPLATES,
    ...BUILTIN_MELODY_TEMPLATES,
    ...BUILTIN_CHORD_TEMPLATES,
];

/**
 * Get template by ID
 */
export function getTemplateById(id: string): BuiltInTemplate | undefined {
    return ALL_BUILTIN_TEMPLATES.find(t => t.id === id);
}

/**
 * Get template by slug
 */
export function getTemplateBySlug(slug: string): BuiltInTemplate | undefined {
    return ALL_BUILTIN_TEMPLATES.find(t => t.slug === slug);
}

/**
 * Get templates by type
 */
export function getTemplatesByType(type: LaneTemplateType): BuiltInTemplate[] {
    return ALL_BUILTIN_TEMPLATES.filter(t => t.type === type);
}

/**
 * Get related templates
 */
export function getRelatedTemplates(template: BuiltInTemplate): BuiltInTemplate[] {
    if (!template.relatedTemplates) return [];
    return template.relatedTemplates
        .map(id => getTemplateById(id))
        .filter((t): t is BuiltInTemplate => t !== undefined);
}


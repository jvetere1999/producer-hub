/**
 * Chord Progression Templates
 *
 * Built-in progression presets organized by genre and style.
 */

import type { ChordProgressionTemplate, ChordRhythmPattern } from './model';

export const PROGRESSION_TEMPLATES: ChordProgressionTemplate[] = [
    // Pop / Rock
    {
        id: 'pop-i-v-vi-iv',
        name: 'Pop Classic (I-V-vi-IV)',
        genre: 'Pop',
        description: 'The most common pop progression',
        numerals: ['I', 'V', 'vi', 'IV'],
        durations: [4, 4, 4, 4],
        rhythmPattern: 'whole',
    },
    {
        id: 'pop-vi-iv-i-v',
        name: 'Emotional Pop (vi-IV-I-V)',
        genre: 'Pop',
        description: 'Minor start for emotional feel',
        numerals: ['vi', 'IV', 'I', 'V'],
        durations: [4, 4, 4, 4],
        rhythmPattern: 'whole',
    },
    {
        id: 'pop-i-vi-iv-v',
        name: '50s Progression (I-vi-IV-V)',
        genre: 'Pop',
        description: 'Classic doo-wop progression',
        numerals: ['I', 'vi', 'IV', 'V'],
        durations: [4, 4, 4, 4],
        rhythmPattern: 'whole',
    },

    // House / Electronic
    {
        id: 'house-i-vi',
        name: 'House Two Chord',
        genre: 'House',
        description: 'Minimal two-chord loop',
        numerals: ['i', 'VI'],
        durations: [8, 8],
        rhythmPattern: 'stabs',
    },
    {
        id: 'house-i-iv-v-i',
        name: 'House Build',
        genre: 'House',
        description: 'Building progression for drops',
        numerals: ['i', 'iv', 'v', 'i'],
        durations: [4, 4, 4, 4],
        rhythmPattern: 'offbeat',
    },
    {
        id: 'house-vi-iv-i-v',
        name: 'Deep House',
        genre: 'House',
        description: 'Melancholic deep house vibe',
        numerals: ['vi', 'IV', 'I', 'V'],
        durations: [4, 4, 4, 4],
        rhythmPattern: 'pads',
    },

    // Techno
    {
        id: 'techno-i',
        name: 'Techno Drone',
        genre: 'Techno',
        description: 'Single chord drone',
        numerals: ['i'],
        durations: [16],
        rhythmPattern: 'pads',
    },
    {
        id: 'techno-i-ii',
        name: 'Techno Tension',
        genre: 'Techno',
        description: 'Dissonant two-chord loop',
        numerals: ['i', 'ii°'],
        durations: [8, 8],
        rhythmPattern: 'stabs',
    },

    // Dubstep / Bass
    {
        id: 'dubstep-i-vi-iv-v',
        name: 'Dubstep Epic',
        genre: 'Dubstep',
        description: 'Epic buildup progression',
        numerals: ['i', 'VI', 'IV', 'V'],
        durations: [4, 4, 4, 4],
        rhythmPattern: 'stabs',
    },
    {
        id: 'dubstep-i-v',
        name: 'Dubstep Drop',
        genre: 'Dubstep',
        description: 'Simple drop progression',
        numerals: ['i', 'V'],
        durations: [8, 8],
        rhythmPattern: 'stabs',
    },

    // DnB
    {
        id: 'dnb-i-vi-iv',
        name: 'Liquid DnB',
        genre: 'DnB',
        description: 'Smooth liquid progression',
        numerals: ['i', 'VI', 'iv'],
        durations: [4, 4, 8],
        rhythmPattern: 'pads',
    },
    {
        id: 'dnb-i-v-vi-iv',
        name: 'DnB Anthem',
        genre: 'DnB',
        description: 'Anthemic drum and bass',
        numerals: ['i', 'V', 'VI', 'iv'],
        durations: [4, 4, 4, 4],
        rhythmPattern: 'offbeat',
    },

    // Trap / Hip Hop
    {
        id: 'trap-i-vi',
        name: 'Trap Dark',
        genre: 'Trap',
        description: 'Dark trap vibe',
        numerals: ['i', 'VI'],
        durations: [8, 8],
        rhythmPattern: 'stabs',
    },
    {
        id: 'trap-i-iv-vi-v',
        name: 'Trap Melodic',
        genre: 'Trap',
        description: 'Melodic trap progression',
        numerals: ['i', 'iv', 'VI', 'V'],
        durations: [4, 4, 4, 4],
        rhythmPattern: 'pads',
    },

    // Jazz
    {
        id: 'jazz-ii-v-i',
        name: 'Jazz ii-V-I',
        genre: 'Jazz',
        description: 'The classic jazz turnaround',
        numerals: ['ii7', 'V7', 'Imaj7'],
        durations: [4, 4, 8],
        rhythmPattern: 'whole',
    },
    {
        id: 'jazz-i-vi-ii-v',
        name: 'Jazz Rhythm Changes',
        genre: 'Jazz',
        description: 'Standard rhythm changes',
        numerals: ['Imaj7', 'vi7', 'ii7', 'V7'],
        durations: [4, 4, 4, 4],
        rhythmPattern: 'whole',
    },

    // Lo-fi
    {
        id: 'lofi-i-v-vi-iii',
        name: 'Lo-fi Chill',
        genre: 'Lo-fi',
        description: 'Chill lo-fi hip hop',
        numerals: ['Imaj7', 'V7', 'vi7', 'iii7'],
        durations: [4, 4, 4, 4],
        rhythmPattern: 'pads',
    },
    {
        id: 'lofi-vi-ii-v-i',
        name: 'Lo-fi Nostalgic',
        genre: 'Lo-fi',
        description: 'Nostalgic feel',
        numerals: ['vi7', 'ii7', 'V7', 'Imaj7'],
        durations: [4, 4, 4, 4],
        rhythmPattern: 'pads',
    },
];

/**
 * Gets all unique genres from templates
 */
export function getGenres(): string[] {
    const genres = new Set(PROGRESSION_TEMPLATES.map(t => t.genre));
    return Array.from(genres);
}

/**
 * Gets templates filtered by genre
 */
export function getTemplatesByGenre(genre: string): ChordProgressionTemplate[] {
    return PROGRESSION_TEMPLATES.filter(t => t.genre === genre);
}

/**
 * Gets a template by ID
 */
export function getTemplateById(id: string): ChordProgressionTemplate | undefined {
    return PROGRESSION_TEMPLATES.find(t => t.id === id);
}

/**
 * Roman numeral to scale degree mapping
 */
const NUMERAL_TO_DEGREE: Record<string, { degree: number; quality: 'major' | 'minor' | 'diminished' | 'augmented' | 'dominant7' | 'major7' | 'minor7' | 'halfDiminished7' }> = {
    'I': { degree: 0, quality: 'major' },
    'i': { degree: 0, quality: 'minor' },
    'Imaj7': { degree: 0, quality: 'major7' },
    'II': { degree: 2, quality: 'major' },
    'ii': { degree: 2, quality: 'minor' },
    'ii7': { degree: 2, quality: 'minor7' },
    'ii°': { degree: 2, quality: 'diminished' },
    'III': { degree: 4, quality: 'major' },
    'iii': { degree: 4, quality: 'minor' },
    'iii7': { degree: 4, quality: 'minor7' },
    'IV': { degree: 5, quality: 'major' },
    'iv': { degree: 5, quality: 'minor' },
    'V': { degree: 7, quality: 'major' },
    'v': { degree: 7, quality: 'minor' },
    'V7': { degree: 7, quality: 'dominant7' },
    'VI': { degree: 9, quality: 'major' },
    'vi': { degree: 9, quality: 'minor' },
    'vi7': { degree: 9, quality: 'minor7' },
    'VII': { degree: 11, quality: 'major' },
    'vii': { degree: 11, quality: 'minor' },
    'vii°': { degree: 11, quality: 'diminished' },
    'viiø7': { degree: 11, quality: 'halfDiminished7' },
};

/**
 * Converts a roman numeral to a chord type and root offset
 */
export function parseNumeral(numeral: string): { degreeOffset: number; chordType: 'major' | 'minor' | 'diminished' | 'augmented' | 'dominant7' | 'major7' | 'minor7' | 'halfDiminished7' } | null {
    const mapping = NUMERAL_TO_DEGREE[numeral];
    if (!mapping) return null;
    return { degreeOffset: mapping.degree, chordType: mapping.quality };
}


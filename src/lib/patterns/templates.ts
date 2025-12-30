/**
 * Pattern Templates
 *
 * Built-in drum patterns for common EDM genres.
 * Each template includes educational explanations.
 */

import type { PatternTemplate } from './model';
import { DEFAULT_GHOST_CONFIG } from './model';

/** Multiplier for converting single digit (1-9) to MIDI velocity (0-127) */
const VELOCITY_MULTIPLIER = 14;

/**
 * Convert step string to boolean array
 * 'x' = hit, '.' = no hit
 */
function parseSteps(pattern: string, totalSteps: number = 16): boolean[] {
    const hits = new Array(totalSteps).fill(false);
    const chars = pattern.replace(/\s/g, '').split('');

    for (let i = 0; i < Math.min(chars.length, totalSteps); i++) {
        hits[i] = chars[i] === 'x' || chars[i] === 'X';
    }

    return hits;
}

/**
 * Create velocity array from pattern
 * Numbers represent velocity (1-9 maps to 14-126)
 */
function parseVelocity(pattern: string, totalSteps: number = 16): number[] {
    const velocity = new Array(totalSteps).fill(100);
    const chars = pattern.replace(/\s/g, '').split('');

    for (let i = 0; i < Math.min(chars.length, totalSteps); i++) {
        const char = chars[i];
        if (char >= '1' && char <= '9') {
            velocity[i] = Math.round(VELOCITY_MULTIPLIER * parseInt(char));
        } else if (char === 'x' || char === 'X') {
            velocity[i] = 100;
        }
    }

    return velocity;
}

/**
 * House template - Classic 4-on-the-floor
 */
const houseTemplate: PatternTemplate = {
    id: 'template_house',
    name: 'House',
    genre: 'House',
    bpm: 124,
    stepsPerBar: 16,
    bars: 1,
    swing: 0,
    lanes: [
        {
            laneId: 'kick',
            name: 'Kick',
            hits: parseSteps('x...x...x...x...'),
            velocity: parseVelocity('9...9...9...9...')
        },
        {
            laneId: 'snare',
            name: 'Snare',
            hits: parseSteps('................'),
            velocity: parseVelocity('................')
        },
        {
            laneId: 'clap',
            name: 'Clap',
            hits: parseSteps('....x.......x...'),
            velocity: parseVelocity('....9.......9...')
        },
        {
            laneId: 'hihat',
            name: 'Hi-Hat',
            hits: parseSteps('..x...x...x...x.'),
            velocity: parseVelocity('..7...7...7...7.')
        },
        {
            laneId: 'openhat',
            name: 'Open Hat',
            hits: parseSteps('................'),
            velocity: parseVelocity('................')
        },
        {
            laneId: 'perc',
            name: 'Perc',
            hits: parseSteps('................'),
            velocity: parseVelocity('................')
        }
    ],
    ghost: { ...DEFAULT_GHOST_CONFIG },
    explanation: 'Classic house beat: kick on every quarter note (4-on-the-floor), clap on 2 and 4, offbeat hi-hats. This driving rhythm is the foundation of house music since the 80s.'
};

/**
 * Techno template - Driving industrial sound
 */
const technoTemplate: PatternTemplate = {
    id: 'template_techno',
    name: 'Techno',
    genre: 'Techno',
    bpm: 130,
    stepsPerBar: 16,
    bars: 1,
    swing: 0,
    lanes: [
        {
            laneId: 'kick',
            name: 'Kick',
            hits: parseSteps('x...x...x...x...'),
            velocity: parseVelocity('9...9...9...9...')
        },
        {
            laneId: 'snare',
            name: 'Snare',
            hits: parseSteps('................'),
            velocity: parseVelocity('................')
        },
        {
            laneId: 'clap',
            name: 'Clap',
            hits: parseSteps('....x.......x...'),
            velocity: parseVelocity('....8.......8...')
        },
        {
            laneId: 'hihat',
            name: 'Hi-Hat',
            hits: parseSteps('x.x.x.x.x.x.x.x.'),
            velocity: parseVelocity('7.5.7.5.7.5.7.5.')
        },
        {
            laneId: 'openhat',
            name: 'Open Hat',
            hits: parseSteps('..........x.....'),
            velocity: parseVelocity('..........6.....')
        },
        {
            laneId: 'perc',
            name: 'Perc',
            hits: parseSteps('......x.......x.'),
            velocity: parseVelocity('......5.......5.')
        }
    ],
    ghost: { ...DEFAULT_GHOST_CONFIG },
    explanation: 'Minimal techno beat: straight 4/4 kick, driving 8th-note hi-hats with velocity variation, sparse claps. The relentless pulse creates hypnotic energy.'
};

/**
 * Dubstep template - Half-time feel
 */
const dubstepTemplate: PatternTemplate = {
    id: 'template_dubstep',
    name: 'Dubstep',
    genre: 'Dubstep',
    bpm: 140,
    stepsPerBar: 16,
    bars: 1,
    swing: 0,
    lanes: [
        {
            laneId: 'kick',
            name: 'Kick',
            hits: parseSteps('x.....x.........'),
            velocity: parseVelocity('9.....7.........')
        },
        {
            laneId: 'snare',
            name: 'Snare',
            hits: parseSteps('........x.......'),
            velocity: parseVelocity('........9.......')
        },
        {
            laneId: 'clap',
            name: 'Clap',
            hits: parseSteps('................'),
            velocity: parseVelocity('................')
        },
        {
            laneId: 'hihat',
            name: 'Hi-Hat',
            hits: parseSteps('....x.......x...'),
            velocity: parseVelocity('....6.......6...')
        },
        {
            laneId: 'openhat',
            name: 'Open Hat',
            hits: parseSteps('................'),
            velocity: parseVelocity('................')
        },
        {
            laneId: 'perc',
            name: 'Perc',
            hits: parseSteps('..........x.....'),
            velocity: parseVelocity('..........5.....')
        }
    ],
    ghost: {
        enabled: true,
        mode: 'pre-snare',
        velocity: 40,
        applyToLaneIds: ['kick'],
        density: 0.3
    },
    explanation: 'Dubstep half-time feel: sparse kick pattern, snare on beat 3 (half-time), minimal hats. The space between hits leaves room for heavy bass wobbles.'
};

/**
 * Riddim template - Aggressive stabs
 */
const riddimTemplate: PatternTemplate = {
    id: 'template_riddim',
    name: 'Riddim',
    genre: 'Riddim',
    bpm: 150,
    stepsPerBar: 16,
    bars: 1,
    swing: 0,
    lanes: [
        {
            laneId: 'kick',
            name: 'Kick',
            hits: parseSteps('x.....x...x.....'),
            velocity: parseVelocity('9.....8...7.....')
        },
        {
            laneId: 'snare',
            name: 'Snare',
            hits: parseSteps('........x.......'),
            velocity: parseVelocity('........9.......')
        },
        {
            laneId: 'clap',
            name: 'Clap',
            hits: parseSteps('................'),
            velocity: parseVelocity('................')
        },
        {
            laneId: 'hihat',
            name: 'Hi-Hat',
            hits: parseSteps('..x...x...x...x.'),
            velocity: parseVelocity('..5...5...5...6.')
        },
        {
            laneId: 'openhat',
            name: 'Open Hat',
            hits: parseSteps('................'),
            velocity: parseVelocity('................')
        },
        {
            laneId: 'perc',
            name: 'Perc',
            hits: parseSteps('....x.......x...'),
            velocity: parseVelocity('....7.......7...')
        }
    ],
    ghost: {
        enabled: true,
        mode: 'rolling',
        velocity: 30,
        applyToLaneIds: ['kick'],
        density: 0.4
    },
    explanation: 'Riddim pattern: triplet-influenced kick placement, half-time snare, sparse hats. The syncopated rhythm creates space for aggressive bass stabs.'
};

/**
 * Drum & Bass template - Breakbeat feel
 */
const dnbTemplate: PatternTemplate = {
    id: 'template_dnb',
    name: 'Drum & Bass',
    genre: 'Drum & Bass',
    bpm: 174,
    stepsPerBar: 16,
    bars: 1,
    swing: 0.1,
    lanes: [
        {
            laneId: 'kick',
            name: 'Kick',
            hits: parseSteps('x.........x...x.'),
            velocity: parseVelocity('9.........8...7.')
        },
        {
            laneId: 'snare',
            name: 'Snare',
            hits: parseSteps('....x.......x...'),
            velocity: parseVelocity('....9.......9...')
        },
        {
            laneId: 'clap',
            name: 'Clap',
            hits: parseSteps('................'),
            velocity: parseVelocity('................')
        },
        {
            laneId: 'hihat',
            name: 'Hi-Hat',
            hits: parseSteps('x.x.x.x.x.x.x.x.'),
            velocity: parseVelocity('6.4.6.4.6.4.6.5.')
        },
        {
            laneId: 'openhat',
            name: 'Open Hat',
            hits: parseSteps('......x.......x.'),
            velocity: parseVelocity('......5.......5.')
        },
        {
            laneId: 'perc',
            name: 'Perc',
            hits: parseSteps('..x.......x.....'),
            velocity: parseVelocity('..4.......4.....')
        }
    ],
    ghost: {
        enabled: true,
        mode: 'offbeat',
        velocity: 50,
        applyToLaneIds: ['kick'],
        density: 0.5
    },
    explanation: 'Classic D&B 2-step: kick on 1, ghost kick before snare, snares on 2 and 4. The syncopated kick pattern and fast tempo create the signature rolling feel.'
};

/**
 * Trap template - 808 influenced
 */
const trapTemplate: PatternTemplate = {
    id: 'template_trap',
    name: 'Trap',
    genre: 'Trap',
    bpm: 140,
    stepsPerBar: 16,
    bars: 1,
    swing: 0,
    lanes: [
        {
            laneId: 'kick',
            name: 'Kick',
            hits: parseSteps('x.......x.x.....'),
            velocity: parseVelocity('9.......8.7.....')
        },
        {
            laneId: 'snare',
            name: 'Snare',
            hits: parseSteps('........x.......'),
            velocity: parseVelocity('........9.......')
        },
        {
            laneId: 'clap',
            name: 'Clap',
            hits: parseSteps('............x...'),
            velocity: parseVelocity('............8...')
        },
        {
            laneId: 'hihat',
            name: 'Hi-Hat',
            hits: parseSteps('x.x.x.x.x.x.x.x.'),
            velocity: parseVelocity('6.4.6.4.6.4.7.5.')
        },
        {
            laneId: 'openhat',
            name: 'Open Hat',
            hits: parseSteps('..............x.'),
            velocity: parseVelocity('..............6.')
        },
        {
            laneId: 'perc',
            name: 'Perc',
            hits: parseSteps('....x.......x...'),
            velocity: parseVelocity('....5.......5...')
        }
    ],
    ghost: { ...DEFAULT_GHOST_CONFIG },
    explanation: 'Trap beat: 808-style kick with syncopation, snare on 3 (half-time), hi-hat rolls. The spacious kick pattern leaves room for 808 bass slides.'
};

/**
 * All available templates
 */
export const PATTERN_TEMPLATES: PatternTemplate[] = [
    houseTemplate,
    technoTemplate,
    dubstepTemplate,
    riddimTemplate,
    dnbTemplate,
    trapTemplate
];

/**
 * Get a template by ID
 */
export function getTemplateById(id: string): PatternTemplate | undefined {
    return PATTERN_TEMPLATES.find(t => t.id === id);
}

/**
 * Get templates by genre
 */
export function getTemplatesByGenre(genre: string): PatternTemplate[] {
    return PATTERN_TEMPLATES.filter(t => t.genre.toLowerCase() === genre.toLowerCase());
}


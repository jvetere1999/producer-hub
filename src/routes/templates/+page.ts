/**
 * Templates Index Page - Server Load
 * Provides data for the main templates listing page
 */

import {
    ALL_BUILTIN_TEMPLATES,
    BUILTIN_DRUM_TEMPLATES,
    BUILTIN_MELODY_TEMPLATES,
    BUILTIN_CHORD_TEMPLATES,
} from '$lib/storage/builtinTemplates';

export const prerender = true;

export function load() {
    return {
        drums: BUILTIN_DRUM_TEMPLATES,
        melody: BUILTIN_MELODY_TEMPLATES,
        chords: BUILTIN_CHORD_TEMPLATES,
        total: ALL_BUILTIN_TEMPLATES.length,
    };
}


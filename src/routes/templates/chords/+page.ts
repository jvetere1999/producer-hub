/**
 * Chord Templates Category Page
 */

import { BUILTIN_CHORD_TEMPLATES } from '$lib/storage/builtinTemplates';

export const prerender = true;

export function load() {
    return {
        templates: BUILTIN_CHORD_TEMPLATES,
    };
}


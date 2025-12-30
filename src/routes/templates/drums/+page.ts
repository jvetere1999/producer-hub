/**
 * Drum Templates Category Page
 */

import { BUILTIN_DRUM_TEMPLATES } from '$lib/storage/builtinTemplates';

export const prerender = true;

export function load() {
    return {
        templates: BUILTIN_DRUM_TEMPLATES,
    };
}


/**
 * Melody Templates Category Page
 */

import { BUILTIN_MELODY_TEMPLATES } from '$lib/storage/builtinTemplates';

export const prerender = true;

export function load() {
    return {
        templates: BUILTIN_MELODY_TEMPLATES,
    };
}


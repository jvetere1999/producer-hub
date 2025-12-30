/**
 * Template Detail Page - Server Load
 * Loads individual template data by slug
 */

import { error } from '@sveltejs/kit';
import {
    getTemplateBySlug,
    getRelatedTemplates,
    ALL_BUILTIN_TEMPLATES,
} from '$lib/storage/builtinTemplates';

export const prerender = true;

// Generate static paths for all templates
export function entries() {
    return ALL_BUILTIN_TEMPLATES.map(t => ({ slug: t.slug }));
}

export function load({ params }) {
    const template = getTemplateBySlug(params.slug);

    if (!template) {
        throw error(404, {
            message: 'Template not found'
        });
    }

    const relatedTemplates = getRelatedTemplates(template);

    return {
        template,
        relatedTemplates,
    };
}


/**
 * Melody Template Storage
 *
 * Handles persistence of melody templates to localStorage with schema versioning.
 */

import type { MelodyTemplate, MelodyStorageV1 } from './model';

const STORAGE_KEY = 'daw_melody_templates_v1';
const CURRENT_VERSION = 1;

/**
 * Creates empty storage state
 */
function createEmptyStorage(): MelodyStorageV1 {
    return {
        version: CURRENT_VERSION,
        templates: [],
        lastOpenedId: null,
    };
}

/**
 * Validates a template has required fields
 */
function isValidTemplate(t: unknown): t is MelodyTemplate {
    if (!t || typeof t !== 'object') return false;
    const obj = t as Record<string, unknown>;
    return (
        typeof obj.id === 'string' &&
        typeof obj.name === 'string' &&
        typeof obj.bpm === 'number' &&
        Array.isArray(obj.melodyNotes) &&
        Array.isArray(obj.chordBlocks) &&
        obj.scale !== undefined &&
        obj.humanize !== undefined
    );
}

/**
 * Migrates storage from older versions
 */
function migrateStorage(data: unknown): MelodyStorageV1 {
    if (!data || typeof data !== 'object') {
        return createEmptyStorage();
    }

    const obj = data as Record<string, unknown>;
    const version = typeof obj.version === 'number' ? obj.version : 0;

    // Version 1 is current - no migration needed
    if (version === 1) {
        const templates = Array.isArray(obj.templates)
            ? obj.templates.filter(isValidTemplate)
            : [];
        return {
            version: 1,
            templates,
            lastOpenedId: typeof obj.lastOpenedId === 'string' ? obj.lastOpenedId : null,
        };
    }

    // Unknown version - start fresh
    return createEmptyStorage();
}

/**
 * Loads melody templates from localStorage
 */
export function loadMelodyTemplates(): MelodyStorageV1 {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return createEmptyStorage();

        const parsed = JSON.parse(raw);
        return migrateStorage(parsed);
    } catch {
        return createEmptyStorage();
    }
}

/**
 * Saves melody templates to localStorage
 */
export function saveMelodyTemplates(state: MelodyStorageV1): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        // Storage full or unavailable - fail silently
        console.warn('Failed to save melody templates:', e);
    }
}

/**
 * Adds a new template
 */
export function addTemplate(state: MelodyStorageV1, template: MelodyTemplate): MelodyStorageV1 {
    return {
        ...state,
        templates: [...state.templates, template],
        lastOpenedId: template.id,
    };
}

/**
 * Updates an existing template
 */
export function updateTemplate(state: MelodyStorageV1, template: MelodyTemplate): MelodyStorageV1 {
    const updatedTemplate = {
        ...template,
        updatedAt: new Date().toISOString(),
    };

    return {
        ...state,
        templates: state.templates.map(t =>
            t.id === template.id ? updatedTemplate : t
        ),
    };
}

/**
 * Deletes a template
 */
export function deleteTemplate(state: MelodyStorageV1, templateId: string): MelodyStorageV1 {
    return {
        ...state,
        templates: state.templates.filter(t => t.id !== templateId),
        lastOpenedId: state.lastOpenedId === templateId ? null : state.lastOpenedId,
    };
}

/**
 * Gets a template by ID
 */
export function getTemplate(state: MelodyStorageV1, templateId: string): MelodyTemplate | undefined {
    return state.templates.find(t => t.id === templateId);
}

/**
 * Sets the last opened template ID
 */
export function setLastOpened(state: MelodyStorageV1, templateId: string | null): MelodyStorageV1 {
    return {
        ...state,
        lastOpenedId: templateId,
    };
}

/**
 * Lists all templates
 */
export function listTemplates(state: MelodyStorageV1): MelodyTemplate[] {
    return state.templates;
}


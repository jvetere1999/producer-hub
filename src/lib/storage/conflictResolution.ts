/**
 * Conflict Resolution Utilities
 *
 * Provides utilities for analyzing, summarizing, and resolving sync conflicts.
 * Handles lane templates, projects with clip refs, and audio loops.
 *
 * Security:
 * - Summaries do not leak sensitive data (no raw values shown)
 * - Entity shapes are validated before applying resolution
 */

import type {
    ConflictRecord,
    LaneTemplateRef,
    ChordProgressionRef,
    AudioLoopRef,
    ProjectClipRefEntry,
    ProjectRef,
    SyncNote,
    SyncLaneSettings,
} from './vaultTypes';

// ============================================
// Conflict Summary Types
// ============================================

export interface ConflictSummary {
    entityType: ConflictRecord['entityType'];
    entityId: string;
    entityName: string;
    localTimestamp: string;
    remoteTimestamp: string;
    localDeviceId: string;
    remoteDeviceId: string;
    conflictReason?: string;
    changes: ChangeDescription[];
}

export interface ChangeDescription {
    category: 'settings' | 'notes' | 'clips' | 'metadata' | 'position';
    field: string;
    localValue: string;  // Sanitized display string
    remoteValue: string; // Sanitized display string
    severity: 'low' | 'medium' | 'high';
}

export interface ConflictResolution {
    conflictId: string;
    choice: 'local' | 'remote';
    resolvedAt: string;
    resolvedBy: string; // deviceId
}

// ============================================
// Conflict Analysis
// ============================================

/**
 * Generate a human-readable summary of a conflict
 * Note: Summaries are sanitized to not leak sensitive data
 */
export function summarizeConflict(conflict: ConflictRecord): ConflictSummary {
    const changes: ChangeDescription[] = [];
    let entityName = 'Unknown';

    switch (conflict.entityType) {
        case 'laneTemplate':
            return summarizeLaneTemplateConflict(conflict);
        case 'chordProgression':
            return summarizeChordProgressionConflict(conflict);
        case 'audioLoop':
            return summarizeAudioLoopConflict(conflict);
        case 'projectClip':
            return summarizeProjectClipConflict(conflict);
        case 'project':
            return summarizeProjectConflict(conflict);
        default:
            entityName = getEntityName(conflict.localValue) || conflict.entityId;
    }

    return {
        entityType: conflict.entityType,
        entityId: conflict.entityId,
        entityName,
        localTimestamp: conflict.localUpdatedAt,
        remoteTimestamp: conflict.remoteUpdatedAt,
        localDeviceId: sanitizeDeviceId(conflict.localDeviceId),
        remoteDeviceId: sanitizeDeviceId(conflict.remoteDeviceId),
        conflictReason: conflict.conflictReason,
        changes,
    };
}

/**
 * Summarize lane template conflict
 */
function summarizeLaneTemplateConflict(conflict: ConflictRecord): ConflictSummary {
    const local = conflict.localValue as LaneTemplateRef | null;
    const remote = conflict.remoteValue as LaneTemplateRef | null;
    const changes: ChangeDescription[] = [];

    // Compare lane settings
    if (local?.laneSettings && remote?.laneSettings) {
        const localSettings = local.laneSettings;
        const remoteSettings = remote.laneSettings;

        if (localSettings.instrumentId !== remoteSettings.instrumentId) {
            changes.push({
                category: 'settings',
                field: 'Instrument',
                localValue: formatInstrumentName(localSettings.instrumentId),
                remoteValue: formatInstrumentName(remoteSettings.instrumentId),
                severity: 'medium',
            });
        }

        if (localSettings.noteMode !== remoteSettings.noteMode) {
            changes.push({
                category: 'settings',
                field: 'Note Mode',
                localValue: localSettings.noteMode === 'oneShot' ? 'One-Shot' : 'Sustain',
                remoteValue: remoteSettings.noteMode === 'oneShot' ? 'One-Shot' : 'Sustain',
                severity: 'medium',
            });
        }

        if (localSettings.quantizeGrid !== remoteSettings.quantizeGrid) {
            changes.push({
                category: 'settings',
                field: 'Quantize Grid',
                localValue: localSettings.quantizeGrid,
                remoteValue: remoteSettings.quantizeGrid,
                severity: 'low',
            });
        }
    }

    // Compare notes
    if (local?.notes && remote?.notes) {
        const notesDiff = compareNoteLists(local.notes, remote.notes);
        if (notesDiff.added > 0 || notesDiff.removed > 0 || notesDiff.modified > 0) {
            changes.push({
                category: 'notes',
                field: 'Notes',
                localValue: `${local.notes.length} notes`,
                remoteValue: `${remote.notes.length} notes (+${notesDiff.added}/-${notesDiff.removed})`,
                severity: notesDiff.modified > 0 ? 'high' : 'medium',
            });
        }
    }

    // Compare metadata
    if (local?.bpm !== remote?.bpm) {
        changes.push({
            category: 'metadata',
            field: 'BPM',
            localValue: String(local?.bpm || '?'),
            remoteValue: String(remote?.bpm || '?'),
            severity: 'low',
        });
    }

    if (local?.key !== remote?.key) {
        changes.push({
            category: 'metadata',
            field: 'Key',
            localValue: local?.key || '?',
            remoteValue: remote?.key || '?',
            severity: 'low',
        });
    }

    return {
        entityType: 'laneTemplate',
        entityId: conflict.entityId,
        entityName: local?.name || remote?.name || 'Lane Template',
        localTimestamp: conflict.localUpdatedAt,
        remoteTimestamp: conflict.remoteUpdatedAt,
        localDeviceId: sanitizeDeviceId(conflict.localDeviceId),
        remoteDeviceId: sanitizeDeviceId(conflict.remoteDeviceId),
        conflictReason: conflict.conflictReason,
        changes,
    };
}

/**
 * Summarize chord progression conflict
 */
function summarizeChordProgressionConflict(conflict: ConflictRecord): ConflictSummary {
    const local = conflict.localValue as ChordProgressionRef | null;
    const remote = conflict.remoteValue as ChordProgressionRef | null;
    const changes: ChangeDescription[] = [];

    if (local?.numerals && remote?.numerals) {
        if (JSON.stringify(local.numerals) !== JSON.stringify(remote.numerals)) {
            changes.push({
                category: 'notes',
                field: 'Chord Sequence',
                localValue: local.numerals.join(' → '),
                remoteValue: remote.numerals.join(' → '),
                severity: 'high',
            });
        }
    }

    if (local?.rhythmPattern !== remote?.rhythmPattern) {
        changes.push({
            category: 'settings',
            field: 'Rhythm Pattern',
            localValue: local?.rhythmPattern || '?',
            remoteValue: remote?.rhythmPattern || '?',
            severity: 'medium',
        });
    }

    return {
        entityType: 'chordProgression',
        entityId: conflict.entityId,
        entityName: local?.name || remote?.name || 'Chord Progression',
        localTimestamp: conflict.localUpdatedAt,
        remoteTimestamp: conflict.remoteUpdatedAt,
        localDeviceId: sanitizeDeviceId(conflict.localDeviceId),
        remoteDeviceId: sanitizeDeviceId(conflict.remoteDeviceId),
        conflictReason: conflict.conflictReason,
        changes,
    };
}

/**
 * Summarize audio loop conflict
 */
function summarizeAudioLoopConflict(conflict: ConflictRecord): ConflictSummary {
    const local = conflict.localValue as AudioLoopRef | null;
    const remote = conflict.remoteValue as AudioLoopRef | null;
    const changes: ChangeDescription[] = [];

    if (local?.bpm !== remote?.bpm) {
        changes.push({
            category: 'metadata',
            field: 'BPM',
            localValue: String(local?.bpm || 'Not set'),
            remoteValue: String(remote?.bpm || 'Not set'),
            severity: 'medium',
        });
    }

    if (local?.key !== remote?.key) {
        changes.push({
            category: 'metadata',
            field: 'Key',
            localValue: local?.key || 'Not set',
            remoteValue: remote?.key || 'Not set',
            severity: 'low',
        });
    }

    if (local?.bars !== remote?.bars) {
        changes.push({
            category: 'metadata',
            field: 'Bars',
            localValue: String(local?.bars || 'Not set'),
            remoteValue: String(remote?.bars || 'Not set'),
            severity: 'low',
        });
    }

    return {
        entityType: 'audioLoop',
        entityId: conflict.entityId,
        entityName: local?.name || remote?.name || 'Audio Loop',
        localTimestamp: conflict.localUpdatedAt,
        remoteTimestamp: conflict.remoteUpdatedAt,
        localDeviceId: sanitizeDeviceId(conflict.localDeviceId),
        remoteDeviceId: sanitizeDeviceId(conflict.remoteDeviceId),
        conflictReason: conflict.conflictReason,
        changes,
    };
}

/**
 * Summarize project clip conflict
 */
function summarizeProjectClipConflict(conflict: ConflictRecord): ConflictSummary {
    const local = conflict.localValue as ProjectClipRefEntry | null;
    const remote = conflict.remoteValue as ProjectClipRefEntry | null;
    const changes: ChangeDescription[] = [];

    if (local?.startBar !== remote?.startBar) {
        changes.push({
            category: 'position',
            field: 'Start Bar',
            localValue: `Bar ${local?.startBar || '?'}`,
            remoteValue: `Bar ${remote?.startBar || '?'}`,
            severity: 'medium',
        });
    }

    if (local?.lengthBars !== remote?.lengthBars) {
        changes.push({
            category: 'position',
            field: 'Length',
            localValue: `${local?.lengthBars || '?'} bars`,
            remoteValue: `${remote?.lengthBars || '?'} bars`,
            severity: 'medium',
        });
    }

    if (local?.sourceId !== remote?.sourceId) {
        changes.push({
            category: 'clips',
            field: 'Source',
            localValue: 'Different source',
            remoteValue: 'Different source',
            severity: 'high',
        });
    }

    // Compare override settings
    if (local?.laneSettingsOverride || remote?.laneSettingsOverride) {
        const localOverrides = Object.keys(local?.laneSettingsOverride || {}).length;
        const remoteOverrides = Object.keys(remote?.laneSettingsOverride || {}).length;
        if (localOverrides !== remoteOverrides) {
            changes.push({
                category: 'settings',
                field: 'Overrides',
                localValue: `${localOverrides} setting(s)`,
                remoteValue: `${remoteOverrides} setting(s)`,
                severity: 'low',
            });
        }
    }

    return {
        entityType: 'projectClip',
        entityId: conflict.entityId,
        entityName: `Clip in project`,
        localTimestamp: conflict.localUpdatedAt,
        remoteTimestamp: conflict.remoteUpdatedAt,
        localDeviceId: sanitizeDeviceId(conflict.localDeviceId),
        remoteDeviceId: sanitizeDeviceId(conflict.remoteDeviceId),
        conflictReason: conflict.conflictReason,
        changes,
    };
}

/**
 * Summarize project conflict
 */
function summarizeProjectConflict(conflict: ConflictRecord): ConflictSummary {
    const local = conflict.localValue as ProjectRef | null;
    const remote = conflict.remoteValue as ProjectRef | null;
    const changes: ChangeDescription[] = [];

    if (local?.name !== remote?.name) {
        changes.push({
            category: 'metadata',
            field: 'Name',
            localValue: local?.name || '?',
            remoteValue: remote?.name || '?',
            severity: 'low',
        });
    }

    const localClips = local?.clipRefs?.length || 0;
    const remoteClips = remote?.clipRefs?.length || 0;
    if (localClips !== remoteClips) {
        changes.push({
            category: 'clips',
            field: 'Attached Clips',
            localValue: `${localClips} clip(s)`,
            remoteValue: `${remoteClips} clip(s)`,
            severity: 'medium',
        });
    }

    const localBlobs = local?.blobIds?.length || 0;
    const remoteBlobs = remote?.blobIds?.length || 0;
    if (localBlobs !== remoteBlobs) {
        changes.push({
            category: 'metadata',
            field: 'Assets',
            localValue: `${localBlobs} asset(s)`,
            remoteValue: `${remoteBlobs} asset(s)`,
            severity: 'medium',
        });
    }

    return {
        entityType: 'project',
        entityId: conflict.entityId,
        entityName: local?.name || remote?.name || 'Project',
        localTimestamp: conflict.localUpdatedAt,
        remoteTimestamp: conflict.remoteUpdatedAt,
        localDeviceId: sanitizeDeviceId(conflict.localDeviceId),
        remoteDeviceId: sanitizeDeviceId(conflict.remoteDeviceId),
        conflictReason: conflict.conflictReason,
        changes,
    };
}

// ============================================
// Validation
// ============================================

/**
 * Validate entity shape before applying resolution
 */
export function validateEntityForResolution(
    entityType: ConflictRecord['entityType'],
    value: unknown
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!value || typeof value !== 'object') {
        errors.push('Value must be a non-null object');
        return { valid: false, errors };
    }

    const obj = value as Record<string, unknown>;

    // Common validations
    if (typeof obj.id !== 'string' || obj.id.length === 0) {
        errors.push('Missing or invalid id');
    }

    if (typeof obj.updatedAt !== 'string') {
        errors.push('Missing or invalid updatedAt');
    }

    // Entity-specific validations
    switch (entityType) {
        case 'laneTemplate':
            validateLaneTemplate(obj, errors);
            break;
        case 'chordProgression':
            validateChordProgression(obj, errors);
            break;
        case 'audioLoop':
            validateAudioLoop(obj, errors);
            break;
        case 'projectClip':
            validateProjectClip(obj, errors);
            break;
        case 'project':
            validateProject(obj, errors);
            break;
    }

    return { valid: errors.length === 0, errors };
}

function validateLaneTemplate(obj: Record<string, unknown>, errors: string[]): void {
    if (typeof obj.name !== 'string') {
        errors.push('Missing or invalid name');
    }
    if (!['melody', 'drums', 'chord'].includes(obj.type as string)) {
        errors.push('Invalid lane type');
    }
    if (!obj.laneSettings || typeof obj.laneSettings !== 'object') {
        errors.push('Missing or invalid laneSettings');
    }
    if (!Array.isArray(obj.notes)) {
        errors.push('Notes must be an array');
    }
}

function validateChordProgression(obj: Record<string, unknown>, errors: string[]): void {
    if (typeof obj.name !== 'string') {
        errors.push('Missing or invalid name');
    }
    if (!Array.isArray(obj.numerals)) {
        errors.push('Numerals must be an array');
    }
    if (!Array.isArray(obj.durations)) {
        errors.push('Durations must be an array');
    }
}

function validateAudioLoop(obj: Record<string, unknown>, errors: string[]): void {
    if (typeof obj.name !== 'string') {
        errors.push('Missing or invalid name');
    }
    if (typeof obj.blobId !== 'string') {
        errors.push('Missing or invalid blobId');
    }
    if (typeof obj.blobHash !== 'string') {
        errors.push('Missing or invalid blobHash');
    }
}

function validateProjectClip(obj: Record<string, unknown>, errors: string[]): void {
    if (typeof obj.projectId !== 'string') {
        errors.push('Missing or invalid projectId');
    }
    if (!['laneTemplate', 'audioLoop'].includes(obj.sourceType as string)) {
        errors.push('Invalid sourceType');
    }
    if (typeof obj.startBar !== 'number' || obj.startBar < 1) {
        errors.push('Invalid startBar');
    }
    if (typeof obj.lengthBars !== 'number' || obj.lengthBars < 1) {
        errors.push('Invalid lengthBars');
    }
}

function validateProject(obj: Record<string, unknown>, errors: string[]): void {
    if (typeof obj.name !== 'string') {
        errors.push('Missing or invalid name');
    }
    if (!Array.isArray(obj.blobIds)) {
        errors.push('blobIds must be an array');
    }
}

// ============================================
// Resolution
// ============================================

/**
 * Apply a conflict resolution
 */
export function applyResolution(
    conflict: ConflictRecord,
    choice: 'local' | 'remote',
    deviceId: string
): { resolved: unknown; resolution: ConflictResolution } {
    const resolvedValue = choice === 'local' ? conflict.localValue : conflict.remoteValue;

    // Validate the resolved value
    const validation = validateEntityForResolution(conflict.entityType, resolvedValue);
    if (!validation.valid) {
        throw new Error(`Invalid entity for resolution: ${validation.errors.join(', ')}`);
    }

    const resolution: ConflictResolution = {
        conflictId: `${conflict.entityType}_${conflict.entityId}`,
        choice,
        resolvedAt: new Date().toISOString(),
        resolvedBy: deviceId,
    };

    return { resolved: resolvedValue, resolution };
}

// ============================================
// Helper Functions
// ============================================

/**
 * Compare two note lists and return diff stats
 */
function compareNoteLists(
    local: SyncNote[],
    remote: SyncNote[]
): { added: number; removed: number; modified: number } {
    const localKeys = new Set(local.map(n => `${n.pitch}_${n.startBeat}`));
    const remoteKeys = new Set(remote.map(n => `${n.pitch}_${n.startBeat}`));

    let added = 0;
    let removed = 0;
    let modified = 0;

    // Count added (in remote but not local)
    for (const key of remoteKeys) {
        if (!localKeys.has(key)) added++;
    }

    // Count removed (in local but not remote)
    for (const key of localKeys) {
        if (!remoteKeys.has(key)) removed++;
    }

    // Count modified (same position but different duration/velocity)
    for (const ln of local) {
        const key = `${ln.pitch}_${ln.startBeat}`;
        if (remoteKeys.has(key)) {
            const rn = remote.find(n => n.pitch === ln.pitch && n.startBeat === ln.startBeat);
            if (rn && (ln.duration !== rn.duration || ln.velocity !== rn.velocity)) {
                modified++;
            }
        }
    }

    return { added, removed, modified };
}

/**
 * Get entity name safely
 */
function getEntityName(value: unknown): string | null {
    if (value && typeof value === 'object' && 'name' in value) {
        return String((value as { name: unknown }).name);
    }
    return null;
}

/**
 * Sanitize device ID for display (show only last 8 chars)
 */
function sanitizeDeviceId(deviceId: string): string {
    if (!deviceId || deviceId.length <= 8) return deviceId || 'Unknown';
    return `...${deviceId.slice(-8)}`;
}

/**
 * Format instrument name for display
 */
function formatInstrumentName(instrumentId: string): string {
    const names: Record<string, string> = {
        'grand-piano': 'Grand Piano',
        'electric-piano': 'Electric Piano',
        'synth-lead': 'Synth Lead',
        'synth-pad': 'Synth Pad',
        'bass': 'Bass',
        'strings': 'Strings',
        'acoustic-kit': 'Acoustic Kit',
        'electronic-kit': 'Electronic Kit',
    };
    return names[instrumentId] || instrumentId;
}

/**
 * Get entity type display name
 */
export function getEntityTypeDisplayName(entityType: ConflictRecord['entityType']): string {
    const names: Record<ConflictRecord['entityType'], string> = {
        project: 'Project',
        library: 'Reference Library',
        infobase: 'Info Entry',
        settings: 'Settings',
        laneTemplate: 'Lane Template',
        chordProgression: 'Chord Progression',
        audioLoop: 'Audio Loop',
        projectClip: 'Project Clip',
    };
    return names[entityType] || entityType;
}

/**
 * Get severity badge color
 */
export function getSeverityColor(severity: ChangeDescription['severity']): string {
    switch (severity) {
        case 'high': return 'var(--accent-destructive, #ef4444)';
        case 'medium': return 'var(--accent-warning, #f59e0b)';
        case 'low': return 'var(--text-muted, #666)';
    }
}


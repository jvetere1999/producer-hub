<!--
  ConflictResolver Component

  Displays sync conflicts and allows users to resolve them per-entity.
  Supports lane templates, projects with clip refs, and audio loops.

  Usage:
  <ConflictResolver
    conflicts={conflicts}
    onResolve={(conflictId, choice) => handleResolve(conflictId, choice)}
    onResolveAll={(choice) => handleResolveAll(choice)}
  />
-->
<script lang="ts">
    import type { ConflictRecord } from './vaultTypes';
    import {
        summarizeConflict,
        applyResolution,
        getEntityTypeDisplayName,
        getSeverityColor,
        type ConflictSummary,
        type ChangeDescription,
    } from './conflictResolution';

    export let conflicts: ConflictRecord[] = [];
    export let onResolve: ((conflictId: string, choice: 'local' | 'remote', resolved: unknown) => void) | undefined = undefined;
    export let onResolveAll: ((choice: 'local' | 'remote') => void) | undefined = undefined;
    export let onDismiss: (() => void) | undefined = undefined;

    // State
    let expandedConflictId: string | null = null;
    let resolving = false;
    let error: string | null = null;

    // Computed
    $: summaries = conflicts.map(c => ({
        conflict: c,
        summary: summarizeConflict(c),
    }));

    $: unresolvedCount = conflicts.filter(c => !c.resolvedAt).length;

    function toggleExpand(conflictId: string) {
        expandedConflictId = expandedConflictId === conflictId ? null : conflictId;
    }

    function handleResolve(conflict: ConflictRecord, choice: 'local' | 'remote') {
        if (resolving) return;
        resolving = true;
        error = null;

        try {
            // Get device ID from localStorage
            const deviceId = localStorage.getItem('ph_device_id') || 'unknown';
            const { resolved } = applyResolution(conflict, choice, deviceId);
            const conflictId = `${conflict.entityType}_${conflict.entityId}`;
            onResolve?.(conflictId, choice, resolved);
        } catch (e) {
            error = e instanceof Error ? e.message : 'Failed to resolve conflict';
        } finally {
            resolving = false;
        }
    }

    function handleResolveAll(choice: 'local' | 'remote') {
        if (resolving) return;
        onResolveAll?.(choice);
    }

    function formatTimestamp(iso: string): string {
        try {
            const date = new Date(iso);
            return date.toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return iso;
        }
    }

    function getEntityIcon(entityType: ConflictRecord['entityType']): string {
        const icons: Record<ConflictRecord['entityType'], string> = {
            project: '📁',
            library: '📚',
            infobase: '📝',
            settings: '⚙️',
            laneTemplate: '🎹',
            chordProgression: '🎵',
            audioLoop: '🔊',
            projectClip: '📎',
        };
        return icons[entityType] || '📄';
    }

    function getCategoryIcon(category: ChangeDescription['category']): string {
        const icons: Record<ChangeDescription['category'], string> = {
            settings: '⚙️',
            notes: '🎵',
            clips: '📎',
            metadata: '📋',
            position: '📍',
        };
        return icons[category] || '•';
    }
</script>

<div class="conflict-resolver" role="dialog" aria-label="Sync Conflicts">
    <div class="resolver-header">
        <h2>🔄 Sync Conflicts</h2>
        <p class="conflict-count">
            {unresolvedCount} conflict{unresolvedCount === 1 ? '' : 's'} to resolve
        </p>
        {#if onDismiss}
            <button class="close-btn" onclick={onDismiss} aria-label="Close">×</button>
        {/if}
    </div>

    {#if error}
        <div class="error-banner" role="alert">
            ⚠️ {error}
            <button onclick={() => error = null}>Dismiss</button>
        </div>
    {/if}

    {#if conflicts.length === 0}
        <div class="no-conflicts">
            <span class="success-icon">✓</span>
            <p>No conflicts to resolve</p>
        </div>
    {:else}
        <!-- Bulk actions -->
        <div class="bulk-actions">
            <button
                class="bulk-btn local"
                onclick={() => handleResolveAll('local')}
                disabled={resolving || unresolvedCount === 0}
            >
                Keep All Local
            </button>
            <button
                class="bulk-btn remote"
                onclick={() => handleResolveAll('remote')}
                disabled={resolving || unresolvedCount === 0}
            >
                Accept All Remote
            </button>
        </div>

        <!-- Conflict list -->
        <div class="conflict-list">
            {#each summaries as { conflict, summary }}
                {@const conflictId = `${conflict.entityType}_${conflict.entityId}`}
                {@const isExpanded = expandedConflictId === conflictId}
                {@const isResolved = !!conflict.resolvedAt}

                <div
                    class="conflict-item"
                    class:expanded={isExpanded}
                    class:resolved={isResolved}
                >
                    <button
                        class="conflict-header"
                        onclick={() => toggleExpand(conflictId)}
                        aria-expanded={isExpanded}
                    >
                        <span class="entity-icon">{getEntityIcon(conflict.entityType)}</span>
                        <div class="conflict-info">
                            <span class="entity-name">{summary.entityName}</span>
                            <span class="entity-type">{getEntityTypeDisplayName(conflict.entityType)}</span>
                        </div>
                        <div class="conflict-meta">
                            <span class="change-count">{summary.changes.length} change{summary.changes.length === 1 ? '' : 's'}</span>
                            {#if isResolved}
                                <span class="resolved-badge">✓ Resolved</span>
                            {/if}
                        </div>
                        <span class="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                    </button>

                    {#if isExpanded}
                        <div class="conflict-details">
                            <!-- Timestamps -->
                            <div class="timestamp-row">
                                <div class="timestamp local">
                                    <span class="label">Local</span>
                                    <span class="device">Device {summary.localDeviceId}</span>
                                    <span class="time">{formatTimestamp(summary.localTimestamp)}</span>
                                </div>
                                <div class="vs">vs</div>
                                <div class="timestamp remote">
                                    <span class="label">Remote</span>
                                    <span class="device">Device {summary.remoteDeviceId}</span>
                                    <span class="time">{formatTimestamp(summary.remoteTimestamp)}</span>
                                </div>
                            </div>

                            {#if summary.conflictReason}
                                <div class="conflict-reason">
                                    ℹ️ {formatConflictReason(summary.conflictReason)}
                                </div>
                            {/if}

                            <!-- Changes -->
                            <div class="changes-list">
                                <h4>Changes</h4>
                                {#each summary.changes as change}
                                    <div class="change-item">
                                        <span class="change-icon">{getCategoryIcon(change.category)}</span>
                                        <span class="change-field">{change.field}</span>
                                        <div class="change-values">
                                            <span class="local-value" title="Local value">{change.localValue}</span>
                                            <span class="arrow">→</span>
                                            <span class="remote-value" title="Remote value">{change.remoteValue}</span>
                                        </div>
                                        <span
                                            class="severity-badge"
                                            style="background: {getSeverityColor(change.severity)}"
                                        >
                                            {change.severity}
                                        </span>
                                    </div>
                                {/each}
                            </div>

                            <!-- Resolution buttons -->
                            {#if !isResolved}
                                <div class="resolution-actions">
                                    <button
                                        class="resolve-btn local"
                                        onclick={() => handleResolve(conflict, 'local')}
                                        disabled={resolving}
                                    >
                                        Keep Local
                                    </button>
                                    <button
                                        class="resolve-btn remote"
                                        onclick={() => handleResolve(conflict, 'remote')}
                                        disabled={resolving}
                                    >
                                        Accept Remote
                                    </button>
                                </div>
                            {:else}
                                <div class="resolution-info">
                                    Resolved: Kept {conflict.resolution}
                                </div>
                            {/if}
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}
</div>

<script context="module" lang="ts">
    function formatConflictReason(reason: string): string {
        const reasons: Record<string, string> = {
            notes_diverged: 'Note lists have diverged between devices',
            settings_conflict: 'Lane settings were changed on both devices',
            content_hash_mismatch: 'Content was modified on both devices',
            concurrent_edit: 'Concurrent edits detected',
        };
        return reasons[reason] || reason;
    }
</script>

<style>
    .conflict-resolver {
        background: var(--bg-secondary, #1e1e1e);
        border: 1px solid var(--border-primary, #333);
        border-radius: 12px;
        padding: 16px;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
    }

    .resolver-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
        flex-wrap: wrap;
    }

    .resolver-header h2 {
        margin: 0;
        font-size: 18px;
        color: var(--text-primary, #fff);
    }

    .conflict-count {
        margin: 0;
        font-size: 14px;
        color: var(--text-muted, #888);
        flex: 1;
    }

    .close-btn {
        background: transparent;
        border: none;
        font-size: 24px;
        color: var(--text-muted, #666);
        cursor: pointer;
        padding: 0 8px;
    }

    .close-btn:hover {
        color: var(--text-primary, #fff);
    }

    .error-banner {
        background: var(--accent-destructive, #ef4444);
        color: white;
        padding: 8px 12px;
        border-radius: 8px;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .error-banner button {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        margin-left: auto;
    }

    .no-conflicts {
        text-align: center;
        padding: 40px 20px;
        color: var(--text-muted, #888);
    }

    .success-icon {
        font-size: 48px;
        display: block;
        margin-bottom: 16px;
        color: var(--accent-primary, #92d36e);
    }

    .bulk-actions {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
    }

    .bulk-btn {
        flex: 1;
        padding: 10px 16px;
        border: 1px solid var(--border-primary, #333);
        border-radius: 8px;
        background: var(--bg-tertiary, #2a2a2a);
        color: var(--text-primary, #fff);
        font-size: 13px;
        cursor: pointer;
        transition: background 0.15s, border-color 0.15s;
    }

    .bulk-btn:hover:not(:disabled) {
        background: var(--bg-hover, #333);
    }

    .bulk-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .bulk-btn.local:hover:not(:disabled) {
        border-color: var(--accent-primary, #3b82f6);
    }

    .bulk-btn.remote:hover:not(:disabled) {
        border-color: var(--accent-secondary, #8b5cf6);
    }

    .conflict-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .conflict-item {
        background: var(--bg-tertiary, #252525);
        border: 1px solid var(--border-secondary, #3a3a3a);
        border-radius: 8px;
        overflow: hidden;
    }

    .conflict-item.resolved {
        opacity: 0.6;
    }

    .conflict-header {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        padding: 12px;
        background: transparent;
        border: none;
        color: var(--text-primary, #fff);
        cursor: pointer;
        text-align: left;
    }

    .conflict-header:hover {
        background: var(--bg-hover, #333);
    }

    .entity-icon {
        font-size: 20px;
    }

    .conflict-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
    }

    .entity-name {
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .entity-type {
        font-size: 12px;
        color: var(--text-muted, #888);
    }

    .conflict-meta {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 4px;
    }

    .change-count {
        font-size: 12px;
        color: var(--text-muted, #888);
    }

    .resolved-badge {
        font-size: 11px;
        padding: 2px 6px;
        background: var(--accent-primary, #92d36e);
        color: black;
        border-radius: 4px;
    }

    .expand-icon {
        font-size: 12px;
        color: var(--text-muted, #666);
    }

    .conflict-details {
        padding: 0 12px 12px;
        border-top: 1px solid var(--border-secondary, #3a3a3a);
    }

    .timestamp-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 0;
        font-size: 12px;
    }

    .timestamp {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .timestamp .label {
        font-weight: 600;
        color: var(--text-primary, #fff);
    }

    .timestamp .device {
        color: var(--text-muted, #888);
    }

    .timestamp .time {
        color: var(--text-secondary, #aaa);
    }

    .timestamp.local .label {
        color: var(--accent-primary, #3b82f6);
    }

    .timestamp.remote .label {
        color: var(--accent-secondary, #8b5cf6);
    }

    .vs {
        color: var(--text-muted, #666);
        font-weight: 600;
    }

    .conflict-reason {
        padding: 8px 12px;
        background: var(--bg-secondary, #1e1e1e);
        border-radius: 6px;
        font-size: 12px;
        color: var(--text-secondary, #aaa);
        margin-bottom: 12px;
    }

    .changes-list {
        margin-bottom: 12px;
    }

    .changes-list h4 {
        margin: 0 0 8px;
        font-size: 13px;
        color: var(--text-secondary, #aaa);
    }

    .change-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        background: var(--bg-secondary, #1e1e1e);
        border-radius: 6px;
        margin-bottom: 4px;
        font-size: 12px;
    }

    .change-icon {
        font-size: 14px;
    }

    .change-field {
        font-weight: 500;
        color: var(--text-primary, #fff);
        min-width: 80px;
    }

    .change-values {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--text-muted, #888);
        overflow: hidden;
    }

    .local-value,
    .remote-value {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100px;
    }

    .local-value {
        color: var(--accent-primary, #3b82f6);
    }

    .remote-value {
        color: var(--accent-secondary, #8b5cf6);
    }

    .arrow {
        color: var(--text-muted, #666);
    }

    .severity-badge {
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        text-transform: uppercase;
        color: white;
    }

    .resolution-actions {
        display: flex;
        gap: 8px;
        padding-top: 8px;
    }

    .resolve-btn {
        flex: 1;
        padding: 10px 16px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.15s;
    }

    .resolve-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .resolve-btn.local {
        background: var(--accent-primary, #3b82f6);
        color: white;
    }

    .resolve-btn.local:hover:not(:disabled) {
        background: var(--accent-primary-hover, #2563eb);
    }

    .resolve-btn.remote {
        background: var(--accent-secondary, #8b5cf6);
        color: white;
    }

    .resolve-btn.remote:hover:not(:disabled) {
        background: var(--accent-secondary-hover, #7c3aed);
    }

    .resolution-info {
        padding: 8px 12px;
        background: var(--accent-primary, #92d36e);
        color: black;
        border-radius: 6px;
        font-size: 12px;
        text-align: center;
    }

    @media (max-width: 480px) {
        .conflict-resolver {
            border-radius: 0;
            max-height: 100vh;
        }

        .timestamp-row {
            flex-direction: column;
            gap: 8px;
        }

        .vs {
            display: none;
        }

        .change-values {
            flex-direction: column;
            align-items: flex-start;
            gap: 2px;
        }

        .arrow {
            display: none;
        }
    }
</style>


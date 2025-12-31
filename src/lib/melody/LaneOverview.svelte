<!--
  LaneOverview.svelte - Unified Lane Builder Overview

  Ableton-style arrangement view with:
  - Vertically stacked lanes (drum/melody/chord)
  - Program-style layout with Share, Save, Export, Settings
  - Consistent MIDI roll primitives across lanes
  - Info tooltips for lane types and controls
-->
<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { Arrangement, Lane, LaneType, MelodyLane, DrumLane } from '$lib/melody/lanes';
    import type { MelodyNote } from '$lib/melody/model';

    export let arrangement: Arrangement;
    export let selectedLaneId: string | null = null;
    export let currentBeat: number = -1;
    export let isMobile: boolean = false;

    const dispatch = createEventDispatcher<{
        selectLane: { laneId: string };
        addLane: { type: LaneType };
        deleteLane: { laneId: string };
        toggleMute: { laneId: string };
        toggleSolo: { laneId: string };
        toggleCollapse: { laneId: string };
        share: void;
        save: void;
        export: void;
        settings: void;
        help: void;
    }>();

    // Lane type colors
    const LANE_COLORS: Record<LaneType, string> = {
        melody: '#4a9eff',
        drums: '#ff6b6b',
        chord: '#9b59b6',
    };

    // Lane type icons
    function getLaneIcon(type: LaneType): string {
        switch (type) {
            case 'melody': return '🎹';
            case 'drums': return '🥁';
            case 'chord': return '🎵';
        }
    }

    // Calculate lane height based on type
    function getLaneHeight(lane: Lane): number {
        if (lane.collapsed) return 32;
        return lane.type === 'drums' ? 120 : 80;
    }

    // Get notes from lane (handle different lane types)
    function getLaneNotes(lane: Lane): MelodyNote[] {
        if (lane.type === 'chord') {
            return []; // Chord lanes don't have notes array
        }
        return (lane as MelodyLane | DrumLane).notes || [];
    }

    // Get visible notes in current viewport
    function getVisibleNotes(lane: Lane): MelodyNote[] {
        const totalBeats = arrangement.bars * arrangement.timeSignature[0];
        const notes = getLaneNotes(lane);
        return notes.filter((n: MelodyNote) => n.startBeat < totalBeats);
    }

    // Calculate note position as percentage
    function getNotePosition(note: MelodyNote): { left: string; width: string } {
        const totalBeats = arrangement.bars * arrangement.timeSignature[0];
        const left = (note.startBeat / totalBeats) * 100;
        const width = Math.max(0.5, (note.duration / totalBeats) * 100);
        return { left: `${left}%`, width: `${width}%` };
    }

    // Get note vertical position (pitch-based for melody, fixed rows for drums)
    function getNoteTop(lane: Lane, note: MelodyNote): string {
        if (lane.type === 'drums') {
            // Fixed row positions for common drum pitches
            const drumRows: Record<number, number> = {
                49: 0, 46: 1, 42: 2, 39: 3, 38: 4, 36: 5,
            };
            const row = drumRows[note.pitch] ?? 2;
            return `${(row / 6) * 100}%`;
        }
        // Melody: scale pitch to visible range
        const minPitch = 36;
        const maxPitch = 84;
        const normalized = 1 - (note.pitch - minPitch) / (maxPitch - minPitch);
        return `${Math.max(0, Math.min(100, normalized * 100))}%`;
    }

    // Add lane menu state
    let showAddLaneMenu = false;
    let showMobileActions = false;

    function handleAddLane(type: LaneType) {
        dispatch('addLane', { type });
        showAddLaneMenu = false;
    }

    function closeAddMenu() {
        showAddLaneMenu = false;
    }

    function closeMobileActions() {
        showMobileActions = false;
    }
</script>

<div class="lane-overview" class:mobile={isMobile}>
    <!-- Top Toolbar -->
    <header class="toolbar">
        <div class="toolbar-left">
            <h2 class="arrangement-name">{arrangement.name}</h2>
            <span class="meta">{arrangement.bpm} BPM • {arrangement.bars} bars • {arrangement.key}</span>
        </div>

        {#if isMobile}
            <button
                class="icon-btn"
                aria-label="Actions"
                on:click={() => showMobileActions = true}
            >
                ☰
            </button>
        {:else}
            <div class="toolbar-right">
                <button class="btn btn-ghost" on:click={() => dispatch('share')}>
                    <span class="btn-icon">↗</span> Share
                </button>
                <button class="btn btn-ghost" on:click={() => dispatch('save')}>
                    <span class="btn-icon">💾</span> Save
                </button>
                <button class="btn btn-ghost" on:click={() => dispatch('export')}>
                    <span class="btn-icon">📥</span> Export
                </button>
                <button
                    class="icon-btn"
                    aria-label="Settings"
                    on:click={() => dispatch('settings')}
                >
                    ⚙️
                </button>
                <button
                    class="icon-btn"
                    aria-label="Help"
                    on:click={() => dispatch('help')}
                >
                    ❓
                </button>
            </div>
        {/if}
    </header>

    <!-- Lane List -->
    <div class="lanes-container">
        <!-- Timeline ruler -->
        <div class="timeline-ruler">
            <div class="ruler-labels">
                {#each Array(arrangement.bars) as _, i}
                    <span class="bar-label">{i + 1}</span>
                {/each}
            </div>
            {#if currentBeat >= 0}
                <div
                    class="playhead"
                    style="left: {(currentBeat / (arrangement.bars * arrangement.timeSignature[0])) * 100}%"
                ></div>
            {/if}
        </div>

        <!-- Lanes -->
        <div class="lanes-list">
            {#each arrangement.lanes as lane (lane.id)}
                <div
                    class="lane"
                    class:selected={selectedLaneId === lane.id}
                    class:muted={lane.muted}
                    class:collapsed={lane.collapsed}
                    style="--lane-color: {lane.color || LANE_COLORS[lane.type]}; height: {getLaneHeight(lane)}px"
                    on:click={() => dispatch('selectLane', { laneId: lane.id })}
                    on:keydown={(e) => e.key === 'Enter' && dispatch('selectLane', { laneId: lane.id })}
                    role="button"
                    tabindex="0"
                >
                    <!-- Lane Header -->
                    <div class="lane-header">
                        <button
                            class="collapse-btn"
                            aria-label={lane.collapsed ? 'Expand lane' : 'Collapse lane'}
                            on:click|stopPropagation={() => dispatch('toggleCollapse', { laneId: lane.id })}
                        >
                            {lane.collapsed ? '▸' : '▾'}
                        </button>
                        <span class="lane-icon">{getLaneIcon(lane.type)}</span>
                        <span class="lane-name">{lane.name}</span>
                        <div class="lane-controls">
                            <button
                                class="mute-btn"
                                class:active={lane.muted}
                                aria-label={lane.muted ? 'Unmute' : 'Mute'}
                                on:click|stopPropagation={() => dispatch('toggleMute', { laneId: lane.id })}
                            >M</button>
                            <button
                                class="solo-btn"
                                class:active={lane.solo}
                                aria-label={lane.solo ? 'Unsolo' : 'Solo'}
                                on:click|stopPropagation={() => dispatch('toggleSolo', { laneId: lane.id })}
                            >S</button>
                            <button
                                class="delete-btn"
                                aria-label="Delete lane"
                                on:click|stopPropagation={() => dispatch('deleteLane', { laneId: lane.id })}
                            >×</button>
                        </div>
                    </div>

                    <!-- Lane Content (mini piano roll) -->
                    {#if !lane.collapsed}
                        <div class="lane-content">
                            <!-- Grid lines -->
                            <div class="grid-lines">
                                {#each Array(arrangement.bars * 4) as _, i}
                                    <div
                                        class="grid-line"
                                        class:bar={i % 4 === 0}
                                        style="left: {(i / (arrangement.bars * 4)) * 100}%"
                                    ></div>
                                {/each}
                            </div>

                            <!-- Notes -->
                            <div class="notes-container">
                                {#each getVisibleNotes(lane) as note (note.id)}
                                    {@const pos = getNotePosition(note)}
                                    <div
                                        class="note"
                                        style="
                                            left: {pos.left};
                                            width: {pos.width};
                                            top: {getNoteTop(lane, note)};
                                            opacity: {0.5 + (note.velocity / 254)};
                                        "
                                    ></div>
                                {/each}
                            </div>

                            <!-- Playhead indicator -->
                            {#if currentBeat >= 0}
                                <div
                                    class="lane-playhead"
                                    style="left: {(currentBeat / (arrangement.bars * arrangement.timeSignature[0])) * 100}%"
                                ></div>
                            {/if}
                        </div>
                    {/if}
                </div>
            {/each}

            <!-- Add Lane Button -->
            <div class="add-lane-row">
                <div class="add-lane-container">
                    <button
                        class="add-lane-btn"
                        aria-label="Add lane"
                        on:click={() => showAddLaneMenu = !showAddLaneMenu}
                    >
                        + Add Lane
                    </button>
                    {#if showAddLaneMenu}
                        <div class="add-lane-menu">
                            <button on:click={() => handleAddLane('drums')}>
                                🥁 Drum Lane
                            </button>
                            <button on:click={() => handleAddLane('melody')}>
                                🎹 Melody Lane
                            </button>
                            <button on:click={() => handleAddLane('chord')}>
                                🎵 Chord Lane
                            </button>
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    </div>

    <!-- Empty State -->
    {#if arrangement.lanes.length === 0}
        <div class="empty-state">
            <span class="empty-icon">🎼</span>
            <h3>No lanes yet</h3>
            <p>Add a drum or melody lane to start building your arrangement.</p>
            <button class="btn btn-primary" on:click={() => showAddLaneMenu = true}>
                + Add Lane
            </button>
        </div>
    {/if}
</div>

<!-- Mobile Actions Sheet (simplified) -->
{#if isMobile && showMobileActions}
    <div class="sheet-backdrop" on:click={closeMobileActions} on:keydown={(e) => e.key === 'Escape' && closeMobileActions()} role="button" tabindex="0"></div>
    <div class="mobile-sheet">
        <div class="mobile-actions">
            <button on:click={() => { dispatch('share'); closeMobileActions(); }}>
                <span>↗</span> Share
            </button>
            <button on:click={() => { dispatch('save'); closeMobileActions(); }}>
                <span>💾</span> Save
            </button>
            <button on:click={() => { dispatch('export'); closeMobileActions(); }}>
                <span>📥</span> Export MIDI
            </button>
            <button on:click={() => { dispatch('settings'); closeMobileActions(); }}>
                <span>⚙️</span> Settings
            </button>
            <button on:click={() => { dispatch('help'); closeMobileActions(); }}>
                <span>❓</span> Help
            </button>
        </div>
    </div>
{/if}

<style>
    .lane-overview {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--bg-primary);
        color: var(--fg-primary);
    }

    /* Toolbar */
    .toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--space-3) var(--space-4);
        background: var(--bg-secondary);
        border-bottom: 1px solid var(--border-default);
        gap: var(--space-3);
    }

    .toolbar-left {
        display: flex;
        align-items: baseline;
        gap: var(--space-3);
        min-width: 0;
    }

    .arrangement-name {
        font-size: var(--font-lg);
        font-weight: 600;
        margin: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .meta {
        font-size: var(--font-xs);
        color: var(--fg-tertiary);
        white-space: nowrap;
    }

    .toolbar-right {
        display: flex;
        align-items: center;
        gap: var(--space-2);
    }

    .btn {
        display: inline-flex;
        align-items: center;
        gap: var(--space-1);
        padding: var(--space-2) var(--space-3);
        border: none;
        border-radius: var(--radius-md);
        font-size: var(--font-sm);
        cursor: pointer;
        min-height: 36px;
    }

    .btn-ghost {
        background: transparent;
        color: var(--fg-primary);
    }

    .btn-ghost:hover {
        background: var(--bg-tertiary);
    }

    .btn-primary {
        background: var(--accent-primary);
        color: white;
    }

    .icon-btn {
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        border-radius: var(--radius-md);
        cursor: pointer;
        font-size: 16px;
    }

    .icon-btn:hover {
        background: var(--bg-tertiary);
    }

    .btn-icon {
        margin-right: var(--space-1);
    }

    /* Lanes Container */
    .lanes-container {
        flex: 1;
        overflow: auto;
        position: relative;
    }

    /* Timeline Ruler */
    .timeline-ruler {
        height: 24px;
        background: var(--bg-tertiary);
        border-bottom: 1px solid var(--border-default);
        position: sticky;
        top: 0;
        z-index: 10;
        display: flex;
        align-items: flex-end;
        padding-left: 120px;
    }

    .ruler-labels {
        display: flex;
        flex: 1;
    }

    .bar-label {
        flex: 1;
        font-size: 10px;
        color: var(--fg-tertiary);
        padding-left: var(--space-1);
    }

    .playhead {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 2px;
        background: var(--accent-primary);
        z-index: 11;
        margin-left: 120px;
    }

    /* Lanes List */
    .lanes-list {
        min-height: 200px;
    }

    /* Individual Lane */
    .lane {
        display: flex;
        border-bottom: 1px solid var(--border-default);
        cursor: pointer;
        transition: background-color 0.15s;
    }

    .lane:hover {
        background: var(--bg-secondary);
    }

    .lane.selected {
        background: color-mix(in srgb, var(--lane-color) 10%, var(--bg-primary));
    }

    .lane.muted {
        opacity: 0.5;
    }

    /* Lane Header */
    .lane-header {
        width: 120px;
        min-width: 120px;
        padding: var(--space-2);
        background: var(--bg-secondary);
        border-right: 3px solid var(--lane-color);
        display: flex;
        align-items: center;
        gap: var(--space-1);
    }

    .collapse-btn {
        background: none;
        border: none;
        color: var(--fg-tertiary);
        cursor: pointer;
        padding: 0;
        width: 16px;
    }

    .lane-icon {
        font-size: 14px;
    }

    .lane-name {
        flex: 1;
        font-size: var(--font-sm);
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .lane-controls {
        display: flex;
        gap: 2px;
    }

    .mute-btn, .solo-btn, .delete-btn {
        width: 18px;
        height: 18px;
        border: none;
        border-radius: var(--radius-sm);
        font-size: 10px;
        font-weight: 600;
        cursor: pointer;
        background: var(--bg-tertiary);
        color: var(--fg-secondary);
    }

    .mute-btn.active {
        background: #f39c12;
        color: white;
    }

    .solo-btn.active {
        background: #27ae60;
        color: white;
    }

    .delete-btn:hover {
        background: #e74c3c;
        color: white;
    }

    /* Lane Content (mini piano roll) */
    .lane-content {
        flex: 1;
        position: relative;
        overflow: hidden;
    }

    .grid-lines {
        position: absolute;
        inset: 0;
        pointer-events: none;
    }

    .grid-line {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 1px;
        background: var(--border-subtle, rgba(0,0,0,0.1));
    }

    .grid-line.bar {
        background: var(--border-default);
    }

    .notes-container {
        position: absolute;
        inset: 4px 0;
    }

    .note {
        position: absolute;
        height: 6px;
        min-width: 2px;
        background: var(--lane-color);
        border-radius: 2px;
    }

    .lane-playhead {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 2px;
        background: var(--accent-primary);
        z-index: 5;
    }

    /* Add Lane */
    .add-lane-row {
        padding: var(--space-3);
        padding-left: 120px;
    }

    .add-lane-container {
        position: relative;
    }

    .add-lane-btn {
        padding: var(--space-2) var(--space-4);
        background: var(--bg-secondary);
        border: 1px dashed var(--border-default);
        border-radius: var(--radius-md);
        color: var(--fg-secondary);
        cursor: pointer;
        font-size: var(--font-sm);
    }

    .add-lane-btn:hover {
        border-color: var(--accent-primary);
        color: var(--accent-primary);
    }

    .add-lane-menu {
        position: absolute;
        top: 100%;
        left: 0;
        margin-top: var(--space-1);
        background: var(--bg-secondary);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-lg);
        z-index: 100;
        overflow: hidden;
    }

    .add-lane-menu button {
        display: block;
        width: 100%;
        padding: var(--space-2) var(--space-4);
        text-align: left;
        background: none;
        border: none;
        color: var(--fg-primary);
        cursor: pointer;
        font-size: var(--font-sm);
    }

    .add-lane-menu button:hover {
        background: var(--bg-tertiary);
    }

    /* Empty State */
    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--space-10);
        text-align: center;
    }

    .empty-icon {
        font-size: 48px;
        margin-bottom: var(--space-4);
    }

    .empty-state h3 {
        font-size: var(--font-lg);
        margin: 0 0 var(--space-2);
    }

    .empty-state p {
        color: var(--fg-secondary);
        margin: 0 0 var(--space-4);
    }

    /* Mobile Sheet */
    .sheet-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 1000;
    }

    .mobile-sheet {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: var(--bg-secondary);
        border-radius: var(--radius-lg) var(--radius-lg) 0 0;
        z-index: 1001;
        padding-bottom: env(safe-area-inset-bottom);
    }

    .mobile-actions {
        display: flex;
        flex-direction: column;
        padding: var(--space-4);
    }

    .mobile-actions button {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        padding: var(--space-4);
        background: none;
        border: none;
        border-bottom: 1px solid var(--border-default);
        color: var(--fg-primary);
        font-size: var(--font-base);
        cursor: pointer;
        text-align: left;
        min-height: 48px;
    }

    .mobile-actions button:last-child {
        border-bottom: none;
    }

    .mobile-actions button:hover {
        background: var(--bg-tertiary);
    }

    .mobile-actions button span {
        font-size: 20px;
        width: 28px;
    }

    /* Mobile adjustments */
    .lane-overview.mobile .toolbar-left {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--space-1);
    }

    .lane-overview.mobile .timeline-ruler,
    .lane-overview.mobile .add-lane-row {
        padding-left: 80px;
    }

    .lane-overview.mobile .lane-header {
        width: 80px;
        min-width: 80px;
    }

    .lane-overview.mobile .lane-name {
        display: none;
    }

    .lane-overview.mobile .playhead {
        margin-left: 80px;
    }
</style>


<!--
  DrumRack Component

  Displays the drum rack lanes with controls for each lane.
  Supports mute/solo and visual lane management.

  @component
-->
<script lang="ts">
    import { DRUM_LANES, type PatternLane } from '$lib/patterns';

    export let lanes: PatternLane[] = [];
    export let selectedLaneId: string | null = null;
    export let onSelectLane: (laneId: string) => void = () => {};
    export let onToggleMute: (laneId: string) => void = () => {};
    export let onToggleSolo: (laneId: string) => void = () => {};

    function getLaneName(laneId: string): string {
        return DRUM_LANES.find(l => l.id === laneId)?.name || laneId;
    }

    function getLaneKey(laneId: string): string {
        return DRUM_LANES.find(l => l.id === laneId)?.key || '';
    }
</script>

<div class="drum-rack" role="list" aria-label="Drum rack lanes" aria-live="polite">
    {#each lanes as lane}
        <div
            class="lane"
            class:selected={selectedLaneId === lane.laneId}
            class:muted={lane.muted}
            class:solo={lane.solo}
            role="listitem"
            aria-label="{lane.name} lane {lane.muted ? 'Muted' : ''} {lane.solo ? 'Solo' : ''}"
        >
            <button
                class="lane-select"
                onclick={() => onSelectLane(lane.laneId)}
                onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectLane(lane.laneId); } }}
                aria-pressed={selectedLaneId === lane.laneId}
            >
                <span class="lane-name">{lane.name}</span>
                <span class="lane-key">{getLaneKey(lane.laneId)}</span>
            </button>
            <div class="lane-controls">
                <button
                    class="control-btn mute-btn"
                    class:active={lane.muted}
                    onclick={() => onToggleMute(lane.laneId)}
                    onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleMute(lane.laneId); } }}
                    aria-label="Mute {lane.name}"
                    aria-pressed={lane.muted}
                >
                    M
                </button>
                <button
                    class="control-btn solo-btn"
                    class:active={lane.solo}
                    onclick={() => onToggleSolo(lane.laneId)}
                    onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleSolo(lane.laneId); } }}
                    aria-label="Solo {lane.name}"
                    aria-pressed={lane.solo}
                >
                    S
                </button>
            </div>
        </div>
    {/each}
</div>

<style>
    .drum-rack {
        display: flex;
        flex-direction: column;
        gap: 2px;
        background: var(--bg-tertiary, #333);
        padding: 4px;
        border-radius: 8px;
        min-width: 140px;
    }

    .lane {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--bg-secondary, #2d2d2d);
        border: 1px solid transparent;
        border-radius: 6px;
        transition: all 0.15s;
        min-height: 44px;
    }

    .lane:hover {
        background: var(--surface-hover, #3d3d3d);
    }

    .lane.selected {
        border-color: var(--accent-primary, #ff764d);
        background: var(--surface-active, #3d3d3d);
    }

    .lane.muted {
        opacity: 0.5;
    }

    .lane.solo {
        border-color: var(--accent-secondary, #50b8b8);
    }

    .lane-select {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 8px 10px;
        background: none;
        border: none;
        cursor: pointer;
        text-align: left;
    }


    .lane-name {
        font-size: 13px;
        font-weight: 500;
        color: var(--text-primary, #fff);
    }

    .lane-key {
        font-size: 10px;
        color: var(--text-muted, #888);
        font-family: monospace;
    }

    .lane-controls {
        display: flex;
        gap: 4px;
    }

    .control-btn {
        width: 24px;
        height: 24px;
        border: none;
        border-radius: 4px;
        font-size: 10px;
        font-weight: bold;
        cursor: pointer;
        background: var(--bg-tertiary, #444);
        color: var(--text-muted, #888);
        transition: all 0.15s;
    }

    .control-btn:hover {
        color: var(--text-primary, #fff);
    }

    .mute-btn.active {
        background: var(--accent-error, #ff5252);
        color: white;
    }

    .solo-btn.active {
        background: var(--accent-warning, #ffc107);
        color: black;
    }
</style>


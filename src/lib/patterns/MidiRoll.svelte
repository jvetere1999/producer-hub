<!--
  MidiRoll Component

  Grid-based MIDI step sequencer for drum patterns.
  Supports click/drag to toggle notes, velocity display, and ghost notes.

  @component
-->
<script lang="ts">
    import type { DrumPattern } from '$lib/patterns';
    import { isGhostNote } from '$lib/patterns';

    export let pattern: DrumPattern;
    export let currentStep: number = -1;
    export let showVelocity: boolean = false;
    export let ontoggleHit: ((detail: { laneId: string; step: number }) => void) | undefined = undefined;

    let isDragging = false;
    let dragValue = false;
    let dragLaneId: string | null = null;

    $: totalSteps = pattern.stepsPerBar * pattern.bars;
    $: stepWidth = Math.max(24, Math.min(40, 600 / totalSteps));

    function handleCellClick(laneId: string, step: number) {
        ontoggleHit?.({ laneId, step });
    }

    function handleMouseDown(e: MouseEvent, laneId: string, step: number) {
        isDragging = true;
        dragLaneId = laneId;
        const lane = pattern.lanes.find(l => l.laneId === laneId);
        dragValue = lane ? !lane.hits[step] : true;
        ontoggleHit?.({ laneId, step });
    }

    function handleMouseEnter(laneId: string, step: number) {
        if (isDragging && dragLaneId === laneId) {
            const lane = pattern.lanes.find(l => l.laneId === laneId);
            if (!lane) return;

            // Ensure step is within valid bounds
            if (step < 0 || step >= totalSteps) return;

            if (lane.hits[step] !== dragValue) {
                ontoggleHit?.({ laneId, step });
            }
        }
    }

    function handleMouseUp() {
        isDragging = false;
        dragLaneId = null;
    }

    function handleKeydown(e: KeyboardEvent, laneId: string, step: number) {
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            ontoggleHit?.({ laneId, step });
        }
    }

    function getVelocityHeight(velocity: number): number {
        return Math.round((velocity / 127) * 100);
    }

    function isDownbeat(step: number): boolean {
        return step % (pattern.stepsPerBar / 4) === 0;
    }

    function isBarStart(step: number): boolean {
        return step % pattern.stepsPerBar === 0;
    }
</script>

<svelte:window onmouseup={handleMouseUp} />

<div
    class="midi-roll-container"
    role="grid"
    aria-label="MIDI step sequencer"
>
    <div class="midi-roll" style="--step-width: {stepWidth}px;">
        <!-- Step numbers header -->
        <div class="step-header">
            <div class="header-spacer"></div>
            {#each Array(totalSteps) as _, step}
                <div
                    class="step-number"
                    class:downbeat={isDownbeat(step)}
                    class:bar-start={isBarStart(step)}
                    class:playing={currentStep === step}
                >
                    {step + 1}
                </div>
            {/each}
        </div>

        <!-- Lanes -->
        {#each pattern.lanes as lane}
            <div class="lane-row" role="row" aria-label="{lane.name} steps">
                <div class="lane-label">{lane.name}</div>

                {#each Array(totalSteps) as _, step}
                    {@const isHit = lane.hits[step]}
                    {@const isGhost = isGhostNote(pattern, lane.laneId, step)}
                    {@const velocity = lane.velocity[step]}

                    <button
                        class="cell"
                        class:active={isHit}
                        class:ghost={isGhost}
                        class:downbeat={isDownbeat(step)}
                        class:bar-start={isBarStart(step)}
                        class:playing={currentStep === step}
                        class:muted={lane.muted}
                        role="gridcell"
                        aria-label="{lane.name} step {step + 1}, {isHit ? 'on' : 'off'}"
                        tabindex="0"
                        onmousedown={(e) => handleMouseDown(e, lane.laneId, step)}
                        onmouseenter={() => handleMouseEnter(lane.laneId, step)}
                        onkeydown={(e) => handleKeydown(e, lane.laneId, step)}
                    >
                        {#if isHit && showVelocity}
                            <div
                                class="velocity-bar"
                                style="height: {getVelocityHeight(velocity)}%"
                            ></div>
                        {/if}
                    </button>
                {/each}
            </div>
        {/each}
    </div>
</div>

<style>
    .midi-roll-container {
        overflow-x: auto;
        overflow-y: hidden;
        -webkit-overflow-scrolling: touch;
        padding-bottom: 8px;
    }

    .midi-roll {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: fit-content;
    }

    .step-header {
        display: flex;
        gap: 2px;
        padding-bottom: 4px;
    }

    .header-spacer {
        width: 60px;
        flex-shrink: 0;
    }

    .step-number {
        width: var(--step-width);
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        color: var(--text-muted, #888);
        flex-shrink: 0;
    }

    .step-number.downbeat {
        color: var(--text-secondary, #aaa);
        font-weight: 500;
    }

    .step-number.bar-start {
        color: var(--text-primary, #fff);
        font-weight: 600;
    }

    .step-number.playing {
        color: var(--accent-primary, #ff764d);
    }

    .lane-row {
        display: flex;
        gap: 2px;
        align-items: stretch;
    }

    .lane-label {
        width: 60px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        font-size: 11px;
        color: var(--text-secondary, #aaa);
        padding-right: 8px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .cell {
        width: var(--step-width);
        height: 32px;
        flex-shrink: 0;
        background: var(--bg-tertiary, #333);
        border: 1px solid var(--border-subtle, #444);
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.1s;
        position: relative;
        overflow: hidden;
        padding: 0;
    }

    .cell:hover {
        border-color: var(--text-muted, #888);
    }

    .cell:focus {
        outline: 2px solid var(--accent-primary, #ff764d);
        outline-offset: 1px;
    }

    .cell.downbeat {
        background: var(--bg-secondary, #2d2d2d);
    }

    .cell.bar-start {
        border-left: 2px solid var(--text-muted, #888);
    }

    .cell.active {
        background: var(--accent-primary, #ff764d);
        border-color: var(--accent-primary, #ff764d);
    }

    .cell.active.ghost {
        background: var(--accent-primary, #ff764d);
        opacity: 0.4;
    }

    .cell.playing {
        box-shadow: inset 0 0 0 2px var(--accent-secondary, #50b8b8);
    }

    .cell.muted {
        opacity: 0.3;
    }

    .velocity-bar {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: rgba(0, 0, 0, 0.3);
        pointer-events: none;
    }
</style>


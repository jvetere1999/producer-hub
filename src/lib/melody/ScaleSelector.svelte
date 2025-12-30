<!--
  ScaleSelector Component

  Key and scale type selection with snap-to-scale toggle.

  @component
-->
<script lang="ts">
    import {
        type ScaleConfig,
        type NoteName,
        type ScaleType,
        NOTE_NAMES,
        SCALE_TYPES,
    } from '$lib/melody';

    export let scale: ScaleConfig;
    export let onchange: ((scale: ScaleConfig) => void) | undefined = undefined;

    const scaleTypeLabels: Record<ScaleType, string> = {
        major: 'Major',
        minor: 'Minor (Natural)',
        dorian: 'Dorian',
        phrygian: 'Phrygian',
        lydian: 'Lydian',
        mixolydian: 'Mixolydian',
        aeolian: 'Aeolian',
        locrian: 'Locrian',
        harmonicMinor: 'Harmonic Minor',
        melodicMinor: 'Melodic Minor',
        pentatonicMajor: 'Pentatonic Major',
        pentatonicMinor: 'Pentatonic Minor',
        blues: 'Blues',
    };

    function handleRootChange(e: Event) {
        const value = (e.target as HTMLSelectElement).value as NoteName;
        onchange?.({ ...scale, root: value });
    }

    function handleTypeChange(e: Event) {
        const value = (e.target as HTMLSelectElement).value as ScaleType;
        onchange?.({ ...scale, type: value });
    }

    function handleSnapChange(e: Event) {
        const checked = (e.target as HTMLInputElement).checked;
        onchange?.({ ...scale, snapToScale: checked });
    }
</script>

<div class="scale-selector">
    <div class="scale-row">
        <div class="control-group">
            <label for="scale-root">Key</label>
            <select
                id="scale-root"
                value={scale.root}
                onchange={handleRootChange}
                aria-label="Scale root note"
            >
                {#each NOTE_NAMES as note}
                    <option value={note}>{note}</option>
                {/each}
            </select>
        </div>

        <div class="control-group">
            <label for="scale-type">Scale</label>
            <select
                id="scale-type"
                value={scale.type}
                onchange={handleTypeChange}
                aria-label="Scale type"
            >
                {#each Object.keys(SCALE_TYPES) as type}
                    <option value={type}>{scaleTypeLabels[type as ScaleType]}</option>
                {/each}
            </select>
        </div>
    </div>

    <label class="snap-toggle">
        <input
            type="checkbox"
            checked={scale.snapToScale}
            onchange={handleSnapChange}
        />
        <span>Snap to scale</span>
    </label>
</div>

<style>
    .scale-selector {
        display: flex;
        flex-direction: column;
        gap: var(--space-3, 12px);
        padding: var(--space-3, 12px);
        background: var(--bg-secondary, #2d2d2d);
        border-radius: var(--radius-lg, 12px);
    }

    .scale-row {
        display: flex;
        gap: var(--space-3, 12px);
    }

    .control-group {
        display: flex;
        flex-direction: column;
        gap: var(--space-1, 4px);
        flex: 1;
    }

    .control-group label {
        font-size: var(--text-xs, 11px);
        color: var(--text-muted, #888);
        font-weight: 500;
    }

    .control-group select {
        padding: var(--space-2, 8px);
        background: var(--bg-tertiary, #333);
        border: 1px solid var(--border-default, #444);
        border-radius: var(--radius-md, 8px);
        color: var(--text-primary, #fff);
        font-size: var(--text-sm, 13px);
        min-height: var(--touch-target, 44px);
    }

    .control-group select:focus {
        outline: 2px solid var(--accent-primary, #ff764d);
        outline-offset: 1px;
    }

    .snap-toggle {
        display: flex;
        align-items: center;
        gap: var(--space-2, 8px);
        font-size: var(--text-sm, 13px);
        color: var(--text-secondary, #aaa);
        cursor: pointer;
    }

    .snap-toggle input {
        width: 18px;
        height: 18px;
        accent-color: var(--accent-primary, #ff764d);
    }

    @media (max-width: 480px) {
        .scale-row {
            flex-direction: column;
        }
    }
</style>


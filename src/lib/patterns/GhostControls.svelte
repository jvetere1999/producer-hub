<!--
  GhostControls Component

  Controls for ghost kick configuration.
  Allows toggling, mode selection, velocity, and density.

  @component
-->
<script lang="ts">
    import type { GhostConfig, GhostMode } from '$lib/patterns';

    export let config: GhostConfig;
    export let laneNames: { id: string; name: string }[] = [];
    export let onupdate: ((update: Partial<GhostConfig>) => void) | undefined = undefined;

    const GHOST_MODES: { value: GhostMode; label: string; description: string }[] = [
        { value: 'offbeat', label: 'Offbeat', description: 'Ghost notes on the "&" of each beat' },
        { value: 'pre-snare', label: 'Pre-Snare', description: 'Ghost notes just before snare hits' },
        { value: 'rolling', label: 'Rolling', description: 'More frequent ghost notes for energy' },
        { value: 'user-defined', label: 'Manual', description: 'Place ghost notes manually' }
    ];

    const VELOCITY_PRESETS = [20, 40, 60];

    function handleToggle() {
        onupdate?.({ enabled: !config.enabled });
    }

    function handleModeChange(mode: GhostMode) {
        onupdate?.({ mode });
    }

    function handleVelocityChange(velocity: number) {
        onupdate?.({ velocity });
    }

    function handleDensityChange(e: Event) {
        const parsedValue = parseFloat((e.target as HTMLInputElement).value);
        const value = Math.max(0, Math.min(1, isNaN(parsedValue) ? 0 : parsedValue));
        onupdate?.({ density: value });
    }

    function handleLaneToggle(laneId: string) {
        // Validate lane ID exists
        if (!laneNames.some(lane => lane.id === laneId)) {
            console.warn(`Invalid lane ID: ${laneId}`);
            return;
        }

        const current = config.applyToLaneIds;
        const updated = current.includes(laneId)
            ? current.filter(id => id !== laneId)
            : [...current, laneId];
        onupdate?.({ applyToLaneIds: updated });
    }
</script>

<div class="ghost-controls">
    <div class="ghost-header">
        <h4>Ghost Kicks</h4>
        <button
            class="toggle-btn"
            class:active={config.enabled}
            onclick={handleToggle}
            aria-pressed={config.enabled}
            aria-label="Toggle ghost kicks"
        >
            {config.enabled ? 'ON' : 'OFF'}
        </button>
    </div>

    {#if config.enabled}
        <div class="ghost-options">
            <!-- Mode selector -->
            <div class="option-group">
                <span class="option-label">Mode</span>
                <div class="mode-buttons" role="group" aria-label="Ghost mode">
                    {#each GHOST_MODES as mode}
                        <button
                            class="mode-btn"
                            class:active={config.mode === mode.value}
                            onclick={() => handleModeChange(mode.value)}
                            title={mode.description}
                            aria-pressed={config.mode === mode.value}
                        >
                            {mode.label}
                        </button>
                    {/each}
                </div>
            </div>

            <!-- Velocity selector -->
            <div class="option-group">
                <span class="option-label">Velocity</span>
                <div class="velocity-buttons" role="group" aria-label="Ghost velocity">
                    {#each VELOCITY_PRESETS as vel}
                        <button
                            class="velocity-btn"
                            class:active={config.velocity === vel}
                            onclick={() => handleVelocityChange(vel)}
                            aria-pressed={config.velocity === vel}
                        >
                            {vel}
                        </button>
                    {/each}
                </div>
            </div>

            <!-- Density slider -->
            <div class="option-group">
                <label class="option-label" for="ghost-density">Density</label>
                <div class="density-control">
                    <input
                        id="ghost-density"
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={config.density}
                        oninput={handleDensityChange}
                        class="density-slider"
                        aria-label="Ghost note density"
                    />
                    <span class="density-value">{Math.round(config.density * 100)}%</span>
                </div>
            </div>

            <!-- Lane selector -->
            <div class="option-group">
                <span class="option-label">Apply to</span>
                <div class="lane-checkboxes" role="group" aria-label="Apply ghost notes to lanes">
                    {#each laneNames as lane}
                        <label class="lane-checkbox">
                            <input
                                type="checkbox"
                                checked={config.applyToLaneIds.includes(lane.id)}
                                aria-label="Toggle ghost notes for {lane.name}"
                                onchange={() => handleLaneToggle(lane.id)}
                            />
                            <span>{lane.name}</span>
                        </label>
                    {/each}
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    .ghost-controls {
        background: var(--bg-secondary, #2d2d2d);
        border-radius: 8px;
        padding: 12px;
    }

    .ghost-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
    }

    .ghost-header h4 {
        margin: 0;
        font-size: 14px;
        color: var(--text-primary, #fff);
    }

    .toggle-btn {
        padding: 6px 12px;
        border: none;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        background: var(--bg-tertiary, #444);
        color: var(--text-muted, #888);
        transition: all 0.15s;
    }

    .toggle-btn.active {
        background: var(--accent-primary, #ff764d);
        color: white;
    }

    .ghost-options {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .option-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .option-label {
        font-size: 11px;
        color: var(--text-muted, #888);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .mode-buttons,
    .velocity-buttons {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
    }

    .mode-btn,
    .velocity-btn {
        padding: 6px 10px;
        border: 1px solid var(--border-default, #444);
        border-radius: 4px;
        background: var(--bg-tertiary, #333);
        color: var(--text-secondary, #aaa);
        font-size: 11px;
        cursor: pointer;
        transition: all 0.15s;
    }

    .mode-btn:hover,
    .velocity-btn:hover {
        border-color: var(--text-muted, #888);
    }

    .mode-btn.active,
    .velocity-btn.active {
        background: var(--accent-primary, #ff764d);
        border-color: var(--accent-primary, #ff764d);
        color: white;
    }

    .density-control {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .density-slider {
        flex: 1;
        accent-color: var(--accent-primary, #ff764d);
    }

    .density-value {
        font-size: 12px;
        color: var(--text-secondary, #aaa);
        min-width: 35px;
        text-align: right;
    }

    .lane-checkboxes {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }

    .lane-checkbox {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        color: var(--text-secondary, #aaa);
        cursor: pointer;
    }

    .lane-checkbox input {
        accent-color: var(--accent-primary, #ff764d);
    }
</style>


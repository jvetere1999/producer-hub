<!--
  HumanizeControls Component

  Controls for humanization: timing, velocity, swing.

  @component
-->
<script lang="ts">
    import type { HumanizeConfig } from '$lib/melody';

    export let config: HumanizeConfig;
    export let globalSwing: number = 0;
    export let onchange: ((config: HumanizeConfig) => void) | undefined = undefined;

    function handleToggle() {
        onchange?.({ ...config, enabled: !config.enabled });
    }

    function handleTimingChange(e: Event) {
        const value = parseFloat((e.target as HTMLInputElement).value);
        onchange?.({ ...config, timingRange: value });
    }

    function handleVelocityChange(e: Event) {
        const value = parseInt((e.target as HTMLInputElement).value);
        onchange?.({ ...config, velocityRange: value });
    }

    function handleSwingChange(e: Event) {
        const value = parseFloat((e.target as HTMLInputElement).value);
        onchange?.({ ...config, swingAmount: value });
    }

    function handleLinkToggle(e: Event) {
        const checked = (e.target as HTMLInputElement).checked;
        onchange?.({ ...config, linkToGlobalSwing: checked, swingAmount: checked ? globalSwing : config.swingAmount });
    }
</script>

<div class="humanize-controls">
    <div class="humanize-header">
        <h4>Humanize</h4>
        <button
            class="toggle-btn"
            class:active={config.enabled}
            onclick={handleToggle}
            aria-pressed={config.enabled}
            aria-label="Toggle humanization"
        >
            {config.enabled ? 'ON' : 'OFF'}
        </button>
    </div>

    {#if config.enabled}
        <div class="controls">
            <!-- Timing -->
            <div class="control-row">
                <label for="timing-range">Timing</label>
                <input
                    id="timing-range"
                    type="range"
                    min="0"
                    max="0.1"
                    step="0.005"
                    value={config.timingRange}
                    oninput={handleTimingChange}
                    class="slider"
                    aria-label="Timing variation"
                />
                <span class="value">{Math.round(config.timingRange * 1000)}ms</span>
            </div>

            <!-- Velocity -->
            <div class="control-row">
                <label for="velocity-range">Velocity</label>
                <input
                    id="velocity-range"
                    type="range"
                    min="0"
                    max="40"
                    step="1"
                    value={config.velocityRange}
                    oninput={handleVelocityChange}
                    class="slider"
                    aria-label="Velocity variation"
                />
                <span class="value">±{config.velocityRange}</span>
            </div>

            <!-- Swing -->
            <div class="control-row">
                <label for="swing-amount">Swing</label>
                <input
                    id="swing-amount"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={config.linkToGlobalSwing ? globalSwing : config.swingAmount}
                    oninput={handleSwingChange}
                    disabled={config.linkToGlobalSwing}
                    class="slider"
                    aria-label="Swing amount"
                />
                <span class="value">{Math.round((config.linkToGlobalSwing ? globalSwing : config.swingAmount) * 100)}%</span>
            </div>

            <label class="link-toggle">
                <input
                    type="checkbox"
                    checked={config.linkToGlobalSwing}
                    onchange={handleLinkToggle}
                />
                <span>Link to global tempo/swing</span>
            </label>
        </div>
    {/if}
</div>

<style>
    .humanize-controls {
        display: flex;
        flex-direction: column;
        gap: var(--space-3, 12px);
        padding: var(--space-3, 12px);
        background: var(--bg-secondary, #2d2d2d);
        border-radius: var(--radius-lg, 12px);
    }

    .humanize-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .humanize-header h4 {
        margin: 0;
        font-size: var(--text-sm, 13px);
        font-weight: 600;
        color: var(--text-primary, #fff);
    }

    .toggle-btn {
        padding: var(--space-1, 4px) var(--space-3, 12px);
        background: var(--bg-tertiary, #333);
        border: 1px solid var(--border-default, #444);
        border-radius: var(--radius-full, 999px);
        color: var(--text-muted, #888);
        font-size: var(--text-xs, 11px);
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
    }

    .toggle-btn.active {
        background: var(--accent-primary, #ff764d);
        border-color: var(--accent-primary, #ff764d);
        color: white;
    }

    .toggle-btn:focus-visible {
        outline: 2px solid var(--accent-primary, #ff764d);
        outline-offset: 2px;
    }

    .controls {
        display: flex;
        flex-direction: column;
        gap: var(--space-3, 12px);
    }

    .control-row {
        display: grid;
        grid-template-columns: 60px 1fr 50px;
        align-items: center;
        gap: var(--space-2, 8px);
    }

    .control-row label {
        font-size: var(--text-xs, 11px);
        color: var(--text-muted, #888);
        font-weight: 500;
    }

    .slider {
        width: 100%;
        accent-color: var(--accent-primary, #ff764d);
    }

    .slider:disabled {
        opacity: 0.5;
    }

    .value {
        font-size: var(--text-xs, 11px);
        color: var(--text-secondary, #aaa);
        text-align: right;
        font-family: monospace;
    }

    .link-toggle {
        display: flex;
        align-items: center;
        gap: var(--space-2, 8px);
        font-size: var(--text-sm, 13px);
        color: var(--text-secondary, #aaa);
        cursor: pointer;
    }

    .link-toggle input {
        width: 16px;
        height: 16px;
        accent-color: var(--accent-primary, #ff764d);
    }

    @media (max-width: 480px) {
        .control-row {
            grid-template-columns: 50px 1fr 40px;
        }
    }
</style>


<!--
  Transport Component

  Playback controls for the pattern sequencer.
  Includes play/stop, tempo, and swing controls.

  @component
-->
<script lang="ts">
    export let isPlaying: boolean = false;
    export let bpm: number = 120;
    export let swing: number = 0;
    export let currentStep: number = -1;
    export let totalSteps: number = 16;
    export let audioEnabled: boolean = false;

    export let onplay: (() => void) | undefined = undefined;
    export let onstop: (() => void) | undefined = undefined;
    export let onbpmChange: ((detail: { bpm: number }) => void) | undefined = undefined;
    export let onswingChange: ((detail: { swing: number }) => void) | undefined = undefined;
    export let onenableAudio: (() => void) | undefined = undefined;

    function handlePlay() {
        if (!audioEnabled) {
            onenableAudio?.();
            return;
        }
        onplay?.();
    }

    function handleStop() {
        onstop?.();
    }

    function handleBpmChange(e: Event) {
        const value = parseInt((e.target as HTMLInputElement).value);
        if (!isNaN(value) && value >= 60 && value <= 200) {
            onbpmChange?.({ bpm: value });
        }
    }

    function handleSwingChange(e: Event) {
        const value = parseFloat((e.target as HTMLInputElement).value);
        onswingChange?.({ swing: value });
    }

    function formatStep(): string {
        if (currentStep < 0) return '-- / --';
        return `${currentStep + 1} / ${totalSteps}`;
    }
</script>

<div class="transport" role="toolbar" aria-label="Transport controls">
    <!-- Play/Stop -->
    <div class="transport-group main-controls">
        <button
            class="transport-btn play-btn"
            class:playing={isPlaying}
            onclick={isPlaying ? handleStop : handlePlay}
            aria-label={isPlaying ? 'Stop' : 'Play'}
            aria-pressed={isPlaying}
        >
            {#if !audioEnabled}
                <span class="icon">🔊</span>
                <span class="label">Tap to Enable</span>
            {:else if isPlaying}
                <span class="icon">⏹</span>
                <span class="label">Stop</span>
            {:else}
                <span class="icon">▶</span>
                <span class="label">Play</span>
            {/if}
        </button>
    </div>

    <!-- Step display -->
    <div class="transport-group step-display">
        <span class="step-text">{formatStep()}</span>
    </div>

    <!-- Tempo -->
    <div class="transport-group tempo-control">
        <label for="bpm-input" class="control-label">BPM</label>
        <input
            id="bpm-input"
            type="number"
            min="60"
            max="200"
            value={bpm}
            onchange={handleBpmChange}
            class="tempo-input"
            aria-label="Tempo in BPM"
        />
    </div>

    <!-- Swing -->
    <div class="transport-group swing-control">
        <label for="swing-input" class="control-label">Swing</label>
        <input
            id="swing-input"
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={swing}
            oninput={handleSwingChange}
            class="swing-slider"
            aria-label="Swing amount"
        />
        <span class="swing-value">{Math.round(swing * 100)}%</span>
    </div>
</div>

<style>
    .transport {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 12px 16px;
        background: var(--bg-secondary, #2d2d2d);
        border-radius: 12px;
        flex-wrap: wrap;
    }

    .transport-group {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .main-controls {
        flex-shrink: 0;
    }

    .transport-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 20px;
        border: none;
        border-radius: 8px;
        background: var(--accent-primary, #ff764d);
        color: white;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
        min-height: 48px;
    }

    .transport-btn:hover {
        filter: brightness(1.1);
    }

    .transport-btn.playing {
        background: var(--accent-error, #ff5252);
    }

    .transport-btn .icon {
        font-size: 18px;
    }

    .step-display {
        background: var(--bg-tertiary, #333);
        padding: 8px 16px;
        border-radius: 6px;
        min-width: 80px;
        justify-content: center;
    }

    .step-text {
        font-family: monospace;
        font-size: 14px;
        color: var(--text-primary, #fff);
    }

    .control-label {
        font-size: 12px;
        color: var(--text-muted, #888);
        white-space: nowrap;
    }

    .tempo-input {
        width: 60px;
        padding: 8px;
        border: 1px solid var(--border-default, #444);
        border-radius: 6px;
        background: var(--bg-tertiary, #333);
        color: var(--text-primary, #fff);
        font-size: 14px;
        text-align: center;
    }

    .tempo-input:focus {
        outline: 2px solid var(--accent-primary, #ff764d);
        outline-offset: 1px;
    }

    .swing-slider {
        width: 80px;
        accent-color: var(--accent-primary, #ff764d);
    }

    .swing-value {
        font-size: 12px;
        color: var(--text-secondary, #aaa);
        min-width: 35px;
        text-align: right;
    }

    @media (max-width: 600px) {
        .transport {
            flex-direction: column;
            align-items: stretch;
        }

        .transport-group {
            justify-content: center;
        }

        .main-controls {
            order: -1;
        }

        .transport-btn {
            width: 100%;
            justify-content: center;
        }
    }
</style>


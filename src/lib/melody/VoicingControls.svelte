<!--
  VoicingControls Component

  Controls for chord voicing: inversion, voicing style, bass note, rhythm pattern.

  @component
-->
<script lang="ts">
    import type { VoicingStyle, ChordRhythmPattern } from '$lib/melody';

    export let inversion: number = 0;
    export let voicingStyle: VoicingStyle = 'close';
    export let rhythmPattern: ChordRhythmPattern = 'whole';
    export let hasBass: boolean = false;

    export let onInversionChange: ((inversion: number) => void) | undefined = undefined;
    export let onVoicingChange: ((style: VoicingStyle) => void) | undefined = undefined;
    export let onRhythmChange: ((pattern: ChordRhythmPattern) => void) | undefined = undefined;
    export let onBassToggle: ((hasBass: boolean) => void) | undefined = undefined;
    export let onRegenerate: (() => void) | undefined = undefined;

    const voicingStyles: { value: VoicingStyle; label: string }[] = [
        { value: 'close', label: 'Close' },
        { value: 'open', label: 'Open' },
        { value: 'spread', label: 'Spread' },
        { value: 'drop2', label: 'Drop 2' },
        { value: 'drop3', label: 'Drop 3' },
    ];

    const rhythmPatterns: { value: ChordRhythmPattern; label: string; description: string }[] = [
        { value: 'whole', label: 'Sustained', description: 'Full chord duration' },
        { value: 'half', label: 'Half', description: 'Two hits per chord' },
        { value: 'stabs', label: 'Stabs', description: 'Short staccato hits' },
        { value: 'offbeat', label: 'Offbeat', description: 'Syncopated rhythm' },
        { value: 'pads', label: 'Pads', description: 'Long sustained with overlap' },
        { value: 'arpeggiated', label: 'Arp', description: 'Arpeggiated (coming soon)' },
    ];

    function handleInversionClick(delta: number) {
        const newInversion = Math.max(0, Math.min(3, inversion + delta));
        onInversionChange?.(newInversion);
    }
</script>

<div class="voicing-controls">
    <div class="section-header">
        <h4>Voicing</h4>
        <button class="regenerate-btn" onclick={onRegenerate} aria-label="Regenerate voicings">
            ↻ Regenerate
        </button>
    </div>

    <!-- Inversion -->
    <div class="control-row">
        <span class="control-label">Inversion</span>
        <div class="inversion-control">
            <button
                class="inversion-btn"
                onclick={() => handleInversionClick(-1)}
                disabled={inversion === 0}
                aria-label="Decrease inversion"
            >
                −
            </button>
            <span class="inversion-value">{inversion}</span>
            <button
                class="inversion-btn"
                onclick={() => handleInversionClick(1)}
                disabled={inversion >= 3}
                aria-label="Increase inversion"
            >
                +
            </button>
        </div>
    </div>

    <!-- Voicing Style -->
    <div class="control-row">
        <span class="control-label">Style</span>
        <div class="style-buttons" role="group" aria-label="Voicing style">
            {#each voicingStyles as style}
                <button
                    class="style-btn"
                    class:active={voicingStyle === style.value}
                    onclick={() => onVoicingChange?.(style.value)}
                    aria-pressed={voicingStyle === style.value}
                >
                    {style.label}
                </button>
            {/each}
        </div>
    </div>

    <!-- Bass note toggle -->
    <label class="bass-toggle">
        <input
            type="checkbox"
            checked={hasBass}
            onchange={(e) => onBassToggle?.((e.target as HTMLInputElement).checked)}
        />
        <span>Add bass note</span>
    </label>

    <!-- Rhythm Pattern -->
    <div class="control-group">
        <span class="control-label">Rhythm</span>
        <div class="rhythm-buttons" role="group" aria-label="Chord rhythm pattern">
            {#each rhythmPatterns as pattern}
                <button
                    class="rhythm-btn"
                    class:active={rhythmPattern === pattern.value}
                    onclick={() => onRhythmChange?.(pattern.value)}
                    title={pattern.description}
                    aria-pressed={rhythmPattern === pattern.value}
                >
                    {pattern.label}
                </button>
            {/each}
        </div>
    </div>
</div>

<style>
    .voicing-controls {
        display: flex;
        flex-direction: column;
        gap: var(--space-3, 12px);
        padding: var(--space-3, 12px);
        background: var(--bg-secondary, #2d2d2d);
        border-radius: var(--radius-lg, 12px);
    }

    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .section-header h4 {
        margin: 0;
        font-size: var(--text-sm, 13px);
        font-weight: 600;
        color: var(--text-primary, #fff);
    }

    .regenerate-btn {
        padding: var(--space-1, 4px) var(--space-2, 8px);
        background: var(--bg-tertiary, #333);
        border: 1px solid var(--border-default, #444);
        border-radius: var(--radius-md, 6px);
        color: var(--text-secondary, #aaa);
        font-size: var(--text-xs, 11px);
        cursor: pointer;
        transition: all 0.15s;
    }

    .regenerate-btn:hover {
        border-color: var(--accent-primary, #ff764d);
        color: var(--text-primary, #fff);
    }

    .control-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-2, 8px);
    }

    .control-group {
        display: flex;
        flex-direction: column;
        gap: var(--space-2, 8px);
    }

    .control-label {
        font-size: var(--text-xs, 11px);
        color: var(--text-muted, #888);
        font-weight: 500;
    }

    .inversion-control {
        display: flex;
        align-items: center;
        gap: var(--space-1, 4px);
    }

    .inversion-btn {
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg-tertiary, #333);
        border: 1px solid var(--border-default, #444);
        border-radius: var(--radius-md, 6px);
        color: var(--text-primary, #fff);
        font-size: 16px;
        cursor: pointer;
        transition: all 0.15s;
    }

    .inversion-btn:hover:not(:disabled) {
        border-color: var(--accent-primary, #ff764d);
    }

    .inversion-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    .inversion-value {
        min-width: 24px;
        text-align: center;
        font-size: var(--text-sm, 13px);
        font-weight: 600;
        color: var(--text-primary, #fff);
    }

    .style-buttons,
    .rhythm-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-1, 4px);
    }

    .style-btn,
    .rhythm-btn {
        padding: var(--space-1, 4px) var(--space-2, 8px);
        background: var(--bg-tertiary, #333);
        border: 1px solid var(--border-default, #444);
        border-radius: var(--radius-md, 6px);
        color: var(--text-secondary, #aaa);
        font-size: var(--text-xs, 11px);
        cursor: pointer;
        transition: all 0.15s;
    }

    .style-btn:hover,
    .rhythm-btn:hover {
        border-color: var(--accent-secondary, #50b8b8);
        color: var(--text-primary, #fff);
    }

    .style-btn.active,
    .rhythm-btn.active {
        background: var(--accent-secondary, #50b8b8);
        border-color: var(--accent-secondary, #50b8b8);
        color: white;
    }

    .style-btn:focus-visible,
    .rhythm-btn:focus-visible {
        outline: 2px solid var(--accent-secondary, #50b8b8);
        outline-offset: 2px;
    }

    .bass-toggle {
        display: flex;
        align-items: center;
        gap: var(--space-2, 8px);
        font-size: var(--text-sm, 13px);
        color: var(--text-secondary, #aaa);
        cursor: pointer;
    }

    .bass-toggle input {
        width: 18px;
        height: 18px;
        accent-color: var(--accent-secondary, #50b8b8);
    }

    @media (max-width: 480px) {
        .control-row {
            flex-direction: column;
            align-items: flex-start;
        }

        .style-buttons,
        .rhythm-buttons {
            width: 100%;
        }

        .style-btn,
        .rhythm-btn {
            flex: 1;
            text-align: center;
        }
    }
</style>


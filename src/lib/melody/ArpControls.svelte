<!--
  ArpControls Component

  UI for configuring the arpeggiator and strum engine.
  Provides controls for pattern, rate, gate, strum timing, and preview/commit.

  @component
-->
<script lang="ts">
    import {
        type ArpEngineConfig,
        type ArpPattern,
        type ArpRate,
        type StrumDirection,
        type ArpPreviewResult,
        type ChordBlock,
        type MelodyNote,
        type ScaleConfig,
        type HumanizeConfig,
        DEFAULT_ARP_ENGINE_CONFIG,
        generateArpPreview,
        commitArpPreview,
        validateArpConfig,
    } from '$lib/melody';

    export let chords: ChordBlock[] = [];
    export let bpm: number = 120;
    export let scale: ScaleConfig | undefined = undefined;
    export let humanize: HumanizeConfig | undefined = undefined;
    export let onCommit: ((notes: MelodyNote[]) => void) | undefined = undefined;
    export let onPreviewChange: ((preview: ArpPreviewResult | null) => void) | undefined = undefined;

    // Engine config
    let config: ArpEngineConfig = { ...DEFAULT_ARP_ENGINE_CONFIG };

    // Preview state
    let preview: ArpPreviewResult | null = null;
    let errors: string[] = [];

    // Pattern options
    const patterns: { value: ArpPattern; label: string }[] = [
        { value: 'up', label: '↑ Up' },
        { value: 'down', label: '↓ Down' },
        { value: 'upDown', label: '↑↓ Up/Down' },
        { value: 'downUp', label: '↓↑ Down/Up' },
        { value: 'random', label: '⟷ Random' },
        { value: 'played', label: '→ As Played' },
    ];

    // Rate options
    const rates: { value: ArpRate; label: string }[] = [
        { value: '1/1', label: '1/1' },
        { value: '1/2', label: '1/2' },
        { value: '1/4', label: '1/4' },
        { value: '1/8', label: '1/8' },
        { value: '1/16', label: '1/16' },
        { value: '1/32', label: '1/32' },
    ];

    // Strum direction options
    const strumDirections: { value: StrumDirection; label: string }[] = [
        { value: 'up', label: '↑ Up' },
        { value: 'down', label: '↓ Down' },
        { value: 'alternate', label: '⟷ Alternate' },
    ];

    // Velocity curve options
    const velocityCurves: { value: string; label: string }[] = [
        { value: 'flat', label: 'Flat' },
        { value: 'accentFirst', label: 'Accent First' },
        { value: 'accentLast', label: 'Accent Last' },
        { value: 'crescendo', label: 'Crescendo' },
        { value: 'decrescendo', label: 'Decrescendo' },
    ];

    $: hasChords = chords.length > 0;
    $: noteCount = preview?.notes.length ?? 0;

    function updateConfig() {
        errors = validateArpConfig(config);
        if (errors.length === 0 && hasChords) {
            preview = generateArpPreview(chords, config, bpm, scale, humanize, Date.now());
            onPreviewChange?.(preview);
        } else {
            preview = null;
            onPreviewChange?.(null);
        }
    }

    function handlePatternChange(e: Event) {
        config.arp.pattern = (e.target as HTMLSelectElement).value as ArpPattern;
        updateConfig();
    }

    function handleRateChange(e: Event) {
        config.arp.rate = (e.target as HTMLSelectElement).value as ArpRate;
        updateConfig();
    }

    function handleGateChange(e: Event) {
        config.arp.gate = parseInt((e.target as HTMLInputElement).value, 10);
        updateConfig();
    }

    function handleOctavesChange(e: Event) {
        config.arp.octaves = parseInt((e.target as HTMLInputElement).value, 10);
        updateConfig();
    }

    function handleIncludeRootChange(e: Event) {
        config.arp.includeRoot = (e.target as HTMLInputElement).checked;
        updateConfig();
    }

    function handleStrumEnabledChange(e: Event) {
        config.strum.enabled = (e.target as HTMLInputElement).checked;
        updateConfig();
    }

    function handleStrumTimeMsChange(e: Event) {
        config.strum.timeMs = parseInt((e.target as HTMLInputElement).value, 10);
        updateConfig();
    }

    function handleStrumDirectionChange(e: Event) {
        config.strum.direction = (e.target as HTMLSelectElement).value as StrumDirection;
        updateConfig();
    }

    function handleVelocityCurveChange(e: Event) {
        config.strum.velocityCurve = (e.target as HTMLSelectElement).value as 'flat' | 'accentFirst' | 'accentLast' | 'crescendo' | 'decrescendo';
        updateConfig();
    }

    function handleCommit() {
        if (preview && onCommit) {
            const notes = commitArpPreview([], preview);
            onCommit(notes);
            preview = null;
            onPreviewChange?.(null);
        }
    }

    function handleClearPreview() {
        preview = null;
        onPreviewChange?.(null);
    }

    // Generate preview when chords change
    $: if (chords.length > 0) {
        updateConfig();
    }

    // Info toggle
    let showInfo = false;
</script>

<div class="arp-controls">
    <div class="arp-header">
        <h3>Arp / Strum</h3>
        <div class="header-actions">
            <button
                type="button"
                class="info-toggle"
                class:active={showInfo}
                onclick={() => showInfo = !showInfo}
                aria-label="Toggle help info"
            >?</button>
            <label class="toggle-label">
                <input
                    type="checkbox"
                    checked={config.strum.enabled}
                    onchange={handleStrumEnabledChange}
                />
                <span>Strum</span>
            </label>
        </div>
    </div>

    {#if showInfo}
        <div class="info-section">
            <p class="info-text">
                {#if config.strum.enabled}
                    <strong>Strum Mode:</strong> Plays chord notes with slight timing offsets, like strumming a guitar. Adjust time to control speed and direction for up/down strums.
                {:else}
                    <strong>Arpeggiator:</strong> Converts chords into sequential note patterns. Choose pattern direction, speed (rate), and note length (gate).
                {/if}
            </p>
        </div>
    {/if}

    {#if !config.strum.enabled}
        <!-- Arpeggiator Controls -->
        <div class="control-section">
            <div class="control-row">
                <label class="control-label">
                    <span>Pattern</span>
                    <select
                        onchange={handlePatternChange}
                        aria-label="Arp pattern"
                    >
                        {#each patterns as pattern}
                            <option value={pattern.value} selected={config.arp.pattern === pattern.value}>{pattern.label}</option>
                        {/each}
                    </select>
                </label>

                <label class="control-label">
                    <span>Rate</span>
                    <select
                        onchange={handleRateChange}
                        aria-label="Arp rate"
                    >
                        {#each rates as rate}
                            <option value={rate.value} selected={config.arp.rate === rate.value}>{rate.label}</option>
                        {/each}
                    </select>
                </label>
            </div>

            <div class="control-row">
                <label class="control-label">
                    <span>Gate {config.arp.gate}%</span>
                    <input
                        type="range"
                        min="10"
                        max="200"
                        value={config.arp.gate}
                        oninput={handleGateChange}
                        aria-label="Gate percentage"
                    />
                </label>

                <label class="control-label">
                    <span>Octaves</span>
                    <select
                        onchange={handleOctavesChange}
                        aria-label="Octave range"
                    >
                        <option value={1} selected={config.arp.octaves === 1}>1</option>
                        <option value={2} selected={config.arp.octaves === 2}>2</option>
                        <option value={3} selected={config.arp.octaves === 3}>3</option>
                        <option value={4} selected={config.arp.octaves === 4}>4</option>
                    </select>
                </label>
            </div>

            <label class="checkbox-label">
                <input
                    type="checkbox"
                    checked={config.arp.includeRoot}
                    onchange={handleIncludeRootChange}
                />
                <span>Include root at end</span>
            </label>
        </div>
    {:else}
        <!-- Strum Controls -->
        <div class="control-section">
            <div class="control-row">
                <label class="control-label">
                    <span>Time {config.strum.timeMs}ms</span>
                    <input
                        type="range"
                        min="5"
                        max="200"
                        value={config.strum.timeMs}
                        oninput={handleStrumTimeMsChange}
                        aria-label="Strum time in milliseconds"
                    />
                </label>

                <label class="control-label">
                    <span>Direction</span>
                    <select
                        onchange={handleStrumDirectionChange}
                        aria-label="Strum direction"
                    >
                        {#each strumDirections as dir}
                            <option value={dir.value} selected={config.strum.direction === dir.value}>{dir.label}</option>
                        {/each}
                    </select>
                </label>
            </div>

            <label class="control-label full-width">
                <span>Velocity Curve</span>
                <select
                    onchange={handleVelocityCurveChange}
                    aria-label="Velocity curve"
                >
                    {#each velocityCurves as curve}
                        <option value={curve.value} selected={config.strum.velocityCurve === curve.value}>{curve.label}</option>
                    {/each}
                </select>
            </label>
        </div>
    {/if}

    <!-- Errors -->
    {#if errors.length > 0}
        <div class="errors">
            {#each errors as error}
                <p class="error">{error}</p>
            {/each}
        </div>
    {/if}

    <!-- Preview / Commit -->
    <div class="preview-section">
        {#if !hasChords}
            <p class="hint">Add chord blocks to use arpeggiator</p>
        {:else if preview}
            <p class="preview-info">
                Preview: {noteCount} notes generated
            </p>
            <div class="action-buttons">
                <button
                    type="button"
                    class="btn btn-commit"
                    onclick={handleCommit}
                    aria-label="Commit arp notes to piano roll"
                >
                    Commit Notes
                </button>
                <button
                    type="button"
                    class="btn btn-clear"
                    onclick={handleClearPreview}
                    aria-label="Clear preview"
                >
                    Clear
                </button>
            </div>
        {:else}
            <p class="hint">Adjust settings to generate preview</p>
        {/if}
    </div>
</div>

<style>
    .arp-controls {
        background: #2a2a2a;
        border-radius: 8px;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .arp-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .arp-header h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #fff;
    }


    .toggle-label {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: #aaa;
        cursor: pointer;
    }

    .toggle-label input {
        width: 16px;
        height: 16px;
        accent-color: #5dade2;
    }

    .header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .info-toggle {
        width: 20px;
        height: 20px;
        border: 1px solid #555;
        border-radius: 50%;
        background: transparent;
        color: #888;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
    }

    .info-toggle:hover,
    .info-toggle.active {
        background: #5dade2;
        border-color: #5dade2;
        color: #fff;
    }

    .info-section {
        background: rgba(93, 173, 226, 0.1);
        border: 1px solid rgba(93, 173, 226, 0.3);
        border-radius: 6px;
        padding: 10px;
    }

    .info-text {
        margin: 0;
        font-size: 11px;
        color: #aaa;
        line-height: 1.5;
    }

    .info-text strong {
        color: #5dade2;
    }

    .control-section {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .control-row {
        display: flex;
        gap: 12px;
    }

    .control-label {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 11px;
        color: #888;
    }

    .control-label.full-width {
        flex: none;
        width: 100%;
    }

    .control-label span {
        font-weight: 500;
    }

    .control-label select,
    .control-label input[type="range"] {
        width: 100%;
        height: 28px;
        background: #333;
        border: 1px solid #444;
        border-radius: 4px;
        color: #fff;
        font-size: 12px;
        padding: 0 8px;
    }

    .control-label input[type="range"] {
        padding: 0;
        cursor: pointer;
    }

    .checkbox-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: #aaa;
        cursor: pointer;
    }

    .checkbox-label input {
        width: 14px;
        height: 14px;
        accent-color: #92d36e;
    }

    .errors {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: 4px;
        padding: 8px;
    }

    .error {
        margin: 0;
        font-size: 11px;
        color: #ef4444;
    }

    .preview-section {
        border-top: 1px solid #3a3a3a;
        padding-top: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .hint {
        margin: 0;
        font-size: 11px;
        color: #666;
        text-align: center;
    }

    .preview-info {
        margin: 0;
        font-size: 12px;
        color: #92d36e;
        text-align: center;
    }

    .action-buttons {
        display: flex;
        gap: 8px;
    }

    .btn {
        flex: 1;
        height: 32px;
        border: none;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s;
    }

    .btn-commit {
        background: #92d36e;
        color: #1a1a1a;
    }

    .btn-commit:hover {
        background: #a8e07a;
    }

    .btn-clear {
        background: #444;
        color: #ccc;
    }

    .btn-clear:hover {
        background: #555;
    }

    @media (max-width: 400px) {
        .control-row {
            flex-direction: column;
            gap: 8px;
        }
    }
</style>


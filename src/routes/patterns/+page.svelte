<!--
  Patterns Page

  MIDI Roll + Drum Rack drum pattern builder.
  Features template selection, ghost kicks, and playback.

  @component
-->
<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { base } from '$app/paths';
    import SEOHead from '$lib/components/SEOHead.svelte';
    import DrumRack from '$lib/patterns/DrumRack.svelte';
    import MidiRoll from '$lib/patterns/MidiRoll.svelte';
    import Transport from '$lib/patterns/Transport.svelte';
    import GhostControls from '$lib/patterns/GhostControls.svelte';
    import TemplateSelector from '$lib/patterns/TemplateSelector.svelte';
    import {
        type DrumPattern,
        type PatternTemplate,
        type GhostConfig,
        createEmptyPattern,
        toggleHit,
        updateGhostConfig,
        loadPatterns,
        addPattern,
        updatePattern,
        PATTERN_TEMPLATES,
        DRUM_LANES,
        initAudio,
        resumeAudio,
        isAudioReady,
        playSound,
        disposeAudio
    } from '$lib/patterns';

    // State
    let pattern: DrumPattern = createEmptyPattern('New Pattern');
    let selectedLaneId: string | null = 'kick';
    let selectedTemplateId: string | null = null;
    let currentStep = -1;
    let isPlaying = false;
    let audioEnabled = false;
    let showVelocity = false;

    // Playback
    let playInterval: ReturnType<typeof setInterval> | null = null;

    onMount(() => {
        // Load last pattern or create new
        const storage = loadPatterns();
        if (storage.lastOpenedId) {
            const existing = storage.patterns.find(p => p.id === storage.lastOpenedId);
            if (existing) {
                pattern = existing;
            }
        }
    });

    onDestroy(() => {
        stopPlayback();
        disposeAudio();
    });

    // Playback functions
    function startPlayback() {
        if (!audioEnabled) return;

        isPlaying = true;
        currentStep = 0;

        const msPerStep = (60 / pattern.bpm) * 1000 / 4; // 16th notes

        playInterval = setInterval(() => {
            playCurrentStep();
            currentStep = (currentStep + 1) % (pattern.stepsPerBar * pattern.bars);
        }, msPerStep);
    }

    function stopPlayback() {
        isPlaying = false;
        currentStep = -1;
        if (playInterval) {
            clearInterval(playInterval);
            playInterval = null;
        }
    }

    function playCurrentStep() {
        for (const lane of pattern.lanes) {
            if (lane.muted) continue;

            // Check solo
            const hasSolo = pattern.lanes.some(l => l.solo);
            if (hasSolo && !lane.solo) continue;

            if (lane.hits[currentStep]) {
                playSound(lane.laneId, lane.velocity[currentStep]);
            }
        }
    }

    async function handleEnableAudio() {
        const success = await resumeAudio();
        if (success) {
            audioEnabled = true;
            initAudio();
        }
    }

    // Pattern editing
    function handleToggleHit(detail: { laneId: string; step: number }) {
        pattern = toggleHit(pattern, detail.laneId, detail.step);
        updatePattern(pattern);
    }

    function handleSelectLane(laneId: string) {
        selectedLaneId = laneId;
    }

    function handleToggleMute(laneId: string) {
        const lane = pattern.lanes.find(l => l.laneId === laneId);
        if (lane) {
            lane.muted = !lane.muted;
            pattern = { ...pattern };
            updatePattern(pattern);
        }
    }

    function handleToggleSolo(laneId: string) {
        const lane = pattern.lanes.find(l => l.laneId === laneId);
        if (lane) {
            lane.solo = !lane.solo;
            pattern = { ...pattern };
            updatePattern(pattern);
        }
    }

    function handleBpmChange(detail: { bpm: number }) {
        pattern = { ...pattern, bpm: detail.bpm };
        updatePattern(pattern);

        // Restart playback if playing
        if (isPlaying) {
            stopPlayback();
            startPlayback();
        }
    }

    function handleSwingChange(detail: { swing: number }) {
        pattern = { ...pattern, swing: detail.swing };
        updatePattern(pattern);
    }

    function handleGhostUpdate(update: Partial<GhostConfig>) {
        pattern = updateGhostConfig(pattern, update);
        updatePattern(pattern);
    }

    function handleTemplateSelect(template: PatternTemplate) {
        selectedTemplateId = template.id;

        // Create new pattern from template
        const now = new Date().toISOString();
        pattern = {
            id: pattern.id,
            name: template.name,
            genre: template.genre,
            bpm: template.bpm,
            swing: template.swing,
            stepsPerBar: template.stepsPerBar,
            bars: template.bars,
            lanes: template.lanes.map(l => ({
                ...l,
                muted: false,
                solo: false
            })),
            ghost: { ...template.ghost },
            createdAt: pattern.createdAt,
            updatedAt: now
        };

        updatePattern(pattern);
    }

    function handlePlay() {
        if (isPlaying) {
            stopPlayback();
        } else {
            startPlayback();
        }
    }
</script>

<SEOHead
    title="Pattern Builder - Producer Hub"
    description="Build and learn drum patterns for House, Techno, Dubstep, Trap, and more"
    path="/patterns"
/>

<div class="patterns-page">
    <!-- Compact Header -->
    <header class="page-header">
        <a href="{base}/" class="back-link" aria-label="Back to home">←</a>
        <div class="header-title">
            <h1>⬢ Pattern Builder</h1>
        </div>
        <div class="header-actions">
            <button class="action-btn" onclick={() => showVelocity = !showVelocity} title="Toggle velocity view">
                ≡
            </button>
        </div>
    </header>

    <!-- Scrollable Content -->
    <main class="main-content">
        <div class="editor-layout">
            <!-- Left sidebar: Drum Rack + Templates -->
            <aside class="sidebar">
                <TemplateSelector
                    {selectedTemplateId}
                    onselect={handleTemplateSelect}
                />

                <GhostControls
                    config={pattern.ghost}
                    laneNames={DRUM_LANES.map(l => ({ id: l.id, name: l.name }))}
                    onupdate={handleGhostUpdate}
                />
            </aside>

            <!-- Main area: MIDI Roll -->
            <div class="editor-main">
                <div class="pattern-info">
                    <input
                        type="text"
                        bind:value={pattern.name}
                        class="pattern-name-input"
                        placeholder="Pattern name"
                        onblur={() => updatePattern(pattern)}
                    />
                    <span class="pattern-meta">{pattern.genre} • {pattern.bpm} BPM</span>
                </div>

                <div class="midi-roll-wrapper">
                    <div class="drum-rack-column">
                        <DrumRack
                            lanes={pattern.lanes}
                            {selectedLaneId}
                            onSelectLane={handleSelectLane}
                            onToggleMute={handleToggleMute}
                            onToggleSolo={handleToggleSolo}
                        />
                    </div>

                    <div class="roll-column">
                        <MidiRoll
                            {pattern}
                            {currentStep}
                            {showVelocity}
                            ontoggleHit={handleToggleHit}
                        />
                    </div>
                </div>

                <div class="view-options">
                    <label class="checkbox-label">
                        <input type="checkbox" bind:checked={showVelocity} />
                        Show velocity
                    </label>
                </div>
            </div>
        </div>
    </main>

    <!-- Sticky transport -->
    <footer class="transport-bar">
        <Transport
            {isPlaying}
            bpm={pattern.bpm}
            swing={pattern.swing}
            {currentStep}
            totalSteps={pattern.stepsPerBar * pattern.bars}
            {audioEnabled}
            onplay={handlePlay}
            onstop={stopPlayback}
            onbpmChange={handleBpmChange}
            onswingChange={handleSwingChange}
            onenableAudio={handleEnableAudio}
        />
    </footer>
</div>

<style>
    .patterns-page {
        display: flex;
        flex-direction: column;
        height: 100vh;
        height: 100dvh; /* Dynamic viewport for iOS */
        overflow: hidden;
        background: var(--bg-primary, #1a1a1a);
    }

    /* Fixed Header */
    .page-header {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        padding-top: calc(12px + env(safe-area-inset-top));
        padding-left: calc(16px + env(safe-area-inset-left));
        padding-right: calc(16px + env(safe-area-inset-right));
        background: var(--bg-secondary, #242424);
        border-bottom: 1px solid var(--border-default, #333);
        z-index: 100;
    }

    .back-link {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        background: var(--bg-tertiary, #333);
        border-radius: 10px;
        color: var(--text-primary, #fff);
        text-decoration: none;
        font-size: 18px;
        flex-shrink: 0;
    }

    .back-link:hover {
        background: var(--surface-hover, #444);
    }

    .header-title {
        flex: 1;
        min-width: 0;
    }

    .header-title h1 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: var(--text-primary, #fff);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .header-actions {
        display: flex;
        gap: 8px;
        flex-shrink: 0;
    }

    .action-btn {
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg-tertiary, #333);
        border: none;
        border-radius: 10px;
        font-size: 18px;
        cursor: pointer;
    }

    .action-btn:hover {
        background: var(--surface-hover, #444);
    }

    /* Scrollable Content */
    .main-content {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        -webkit-overflow-scrolling: touch;
        padding: 16px;
        padding-bottom: 120px; /* Space for transport */
    }

    .editor-layout {
        display: grid;
        grid-template-columns: 280px 1fr;
        gap: 16px;
        max-width: 1200px;
        margin: 0 auto;
    }

    .sidebar {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .editor-main {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .pattern-info {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .pattern-name-input {
        flex: 1;
        max-width: 300px;
        padding: 10px 12px;
        border: 1px solid var(--border-default, #444);
        border-radius: 8px;
        background: var(--bg-secondary, #2d2d2d);
        color: var(--text-primary, #fff);
        font-size: 16px;
        font-weight: 500;
        min-height: 44px;
    }

    .pattern-name-input:focus {
        outline: 2px solid var(--accent-primary, #ff764d);
        outline-offset: 1px;
    }

    .pattern-meta {
        color: var(--text-muted, #888);
        font-size: 13px;
    }

    .midi-roll-wrapper {
        display: flex;
        gap: 0;
        background: var(--bg-secondary, #2d2d2d);
        border-radius: 12px;
        padding: 12px;
        overflow: hidden;
    }

    .drum-rack-column {
        flex-shrink: 0;
    }

    .roll-column {
        flex: 1;
        overflow-x: auto;
    }

    .view-options {
        display: flex;
        gap: 16px;
    }

    .checkbox-label {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: var(--text-secondary, #aaa);
        cursor: pointer;
        min-height: 44px;
    }

    .checkbox-label input {
        accent-color: var(--accent-primary, #ff764d);
        width: 18px;
        height: 18px;
    }

    /* Fixed Transport Bar */
    .transport-bar {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 12px 16px;
        padding-bottom: calc(12px + env(safe-area-inset-bottom));
        padding-left: calc(16px + env(safe-area-inset-left));
        padding-right: calc(16px + env(safe-area-inset-right));
        background: var(--bg-secondary, #242424);
        border-top: 1px solid var(--border-default, #333);
        z-index: 100;
    }

    /* Mobile Layout */
    @media (max-width: 768px) {
        .page-header {
            padding: 8px 12px;
            padding-top: calc(8px + env(safe-area-inset-top));
        }

        .header-title h1 {
            font-size: 16px;
        }

        .main-content {
            padding: 12px;
            padding-bottom: 140px;
        }

        .editor-layout {
            grid-template-columns: 1fr;
            gap: 12px;
        }

        .sidebar {
            order: 1;
        }

        .editor-main {
            order: 0;
        }

        .midi-roll-wrapper {
            flex-direction: column;
            padding: 8px;
        }

        .drum-rack-column {
            display: none;
        }

        .pattern-info {
            flex-wrap: wrap;
        }

        .pattern-name-input {
            width: 100%;
            max-width: none;
        }
    }

    /* iPad */
    @media (min-width: 768px) and (max-width: 1024px) {
        .editor-layout {
            grid-template-columns: 240px 1fr;
        }
    }
</style>

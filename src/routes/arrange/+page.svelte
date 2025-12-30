<script lang="ts">
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import { base } from '$app/paths';
    import SEOHead from '$lib/components/SEOHead.svelte';
    import { Sheet } from '$lib/components/ui';
    import MidiRoll from '$lib/melody/MidiRoll.svelte';
    import ScaleSelector from '$lib/melody/ScaleSelector.svelte';
    import ArpControls from '$lib/melody/ArpControls.svelte';
    import HumanizeControls from '$lib/melody/HumanizeControls.svelte';
    import ControlInfo from '$lib/melody/ControlInfo.svelte';
    import GenrePackSelector from '$lib/melody/GenrePackSelector.svelte';
    import ProgressionSelector from '$lib/melody/ProgressionSelector.svelte';
    import VoicingControls from '$lib/melody/VoicingControls.svelte';
    import { initThemeSystem } from '$lib/themes';
    import {
        type Arrangement,
        type MelodyNote,
        type LaneType,
        type ChordBlock,
        type GenrePack,
        type ChordProgressionTemplate,
        type VoicingStyle,
        type ChordRhythmPattern,
        createArrangement,
        addLane,
        removeLane,
        updateLane,
        saveArrangement,
        loadArrangements,
        encodeArrangementToUrl,
        decodeArrangementFromUrl,
        playNote,
        playClick,
        getVoicedChordNotes,
        generateProgression,
        applyRhythmPattern,
        regenerateVoicings,
        setInversion,
    } from '$lib/melody';

    // State
    let arrangement: Arrangement = createArrangement('New Arrangement');
    let selectedLaneId: string | null = null;
    let currentBeat = -1;
    let isPlaying = false;
    let playbackInterval: ReturnType<typeof setInterval> | null = null;
    let showHelp = false;
    let showShareDialog = false;
    let shareUrl = '';
    let infoTopic = 'general';

    // Device rack state
    let activeDevice: 'none' | 'arp' | 'humanize' | 'scale' | 'progression' | 'voicing' | 'genre' = 'none';

    // Chord/voicing state for melody lanes
    let chordBlocks: ChordBlock[] = [];
    let selectedProgressionId: string | null = null;
    let selectedPackId: string | null = null;
    let currentInversion = 0;
    let currentVoicingStyle: VoicingStyle = 'close';
    let currentRhythmPattern: ChordRhythmPattern = 'whole';
    let hasBass = false;

    // Computed
    $: selectedLane = arrangement.lanes.find(l => l.id === selectedLaneId) ?? null;
    $: totalBeats = arrangement.bars * arrangement.timeSignature[0];
    $: isMelodyLane = selectedLane?.type === 'melody';

    onMount(() => {
        // Initialize theme system
        initThemeSystem();

        // Check URL for embedded arrangement
        const urlParams = new URLSearchParams(window.location.search);
        const encoded = urlParams.get('a');
        if (encoded) {
            const decoded = decodeArrangementFromUrl(encoded);
            if (decoded) {
                arrangement = decoded;
                if (arrangement.lanes.length > 0) {
                    selectedLaneId = arrangement.lanes[0].id;
                }
                return;
            }
        }

        // Load from storage
        const storage = loadArrangements();
        if (storage.lastOpenedId) {
            const saved = storage.arrangements.find(a => a.id === storage.lastOpenedId);
            if (saved) {
                arrangement = saved;
            }
        }

        if (arrangement.lanes.length > 0) {
            selectedLaneId = arrangement.lanes[0].id;
        }
    });

    // Auto-save
    $: if (browser && arrangement.id) {
        saveArrangement(arrangement);
    }

    // Playback
    function handlePlay() {
        if (isPlaying) {
            handleStop();
            return;
        }

        isPlaying = true;
        currentBeat = 0;

        const msPerBeat = 60000 / arrangement.bpm;
        const tickMs = msPerBeat / 4;

        playbackInterval = setInterval(() => {
            // Play metronome
            if (currentBeat % 1 < 0.1) {
                playClick(currentBeat % arrangement.timeSignature[0] === 0);
            }

            // Play notes at current beat
            arrangement.lanes.forEach(lane => {
                if (lane.muted) return;

                lane.notes.forEach(note => {
                    if (Math.abs(note.startBeat - currentBeat) < 0.1) {
                        const instrument = lane.type === 'drums' ? 'drum' : 'grand-piano';
                        playNote(note.pitch, note.duration * (msPerBeat / 1000), note.velocity, instrument as any);
                    }
                });
            });

            currentBeat += 0.25;
            if (currentBeat >= totalBeats) {
                currentBeat = 0;
            }
        }, tickMs);
    }

    function handleStop() {
        isPlaying = false;
        if (playbackInterval) {
            clearInterval(playbackInterval);
            playbackInterval = null;
        }
        currentBeat = -1;
    }

    function handleRewind() {
        currentBeat = 0;
    }

    // Lane operations
    function handleAddLane(type: LaneType) {
        arrangement = addLane(arrangement, type);
        selectedLaneId = arrangement.lanes[arrangement.lanes.length - 1].id;
    }

    function handleDeleteLane(laneId: string) {
        if (arrangement.lanes.length <= 1) return;
        arrangement = removeLane(arrangement, laneId);
        if (selectedLaneId === laneId) {
            selectedLaneId = arrangement.lanes[0]?.id ?? null;
        }
    }

    function handleToggleMute(laneId: string) {
        const lane = arrangement.lanes.find(l => l.id === laneId);
        if (lane) {
            arrangement = updateLane(arrangement, laneId, { muted: !lane.muted });
        }
    }

    function handleToggleSolo(laneId: string) {
        const lane = arrangement.lanes.find(l => l.id === laneId);
        if (lane) {
            arrangement = updateLane(arrangement, laneId, { solo: !lane.solo });
        }
    }

    function handleNotesChange(laneId: string, notes: MelodyNote[]) {
        arrangement = updateLane(arrangement, laneId, { notes });
    }

    function handleScaleChange(scale: any) {
        arrangement = { ...arrangement, scale, updatedAt: new Date().toISOString() };
    }

    function handleHumanizeChange(humanize: any) {
        arrangement = { ...arrangement, humanize, updatedAt: new Date().toISOString() };
    }

    // Progression handlers
    function handleProgressionSelect(template: ChordProgressionTemplate) {
        selectedProgressionId = template.id;
        const newChords = generateProgression(template, arrangement.scale);
        chordBlocks = newChords;
        // Convert chords to notes for the selected melody lane
        if (selectedLane && selectedLane.type === 'melody') {
            const notes = chordsToNotes(newChords);
            handleNotesChange(selectedLane.id, notes);
        }
    }

    function handlePackSelect(pack: GenrePack) {
        selectedPackId = pack.id;
        // Apply pack settings
        arrangement = {
            ...arrangement,
            bpm: pack.bpm,
            bars: pack.bars,
            scale: pack.scale,
            humanize: pack.humanize,
            updatedAt: new Date().toISOString(),
        };

        // Generate progression using pack's progressionId
        // For now, just update settings - progression will be selected separately
    }

    function handleVoicingChange(style: VoicingStyle) {
        currentVoicingStyle = style;
        if (chordBlocks.length > 0) {
            chordBlocks = regenerateVoicings(chordBlocks, style);
            if (selectedLane && selectedLane.type === 'melody') {
                const notes = chordsToNotes(chordBlocks);
                handleNotesChange(selectedLane.id, notes);
            }
        }
    }

    function handleInversionChange(inv: number) {
        currentInversion = inv;
        if (chordBlocks.length > 0) {
            chordBlocks = setInversion(chordBlocks, inv);
            if (selectedLane && selectedLane.type === 'melody') {
                const notes = chordsToNotes(chordBlocks);
                handleNotesChange(selectedLane.id, notes);
            }
        }
    }

    function handleRhythmChange(pattern: ChordRhythmPattern) {
        currentRhythmPattern = pattern;
        if (chordBlocks.length > 0) {
            chordBlocks = applyRhythmPattern(chordBlocks, pattern);
            if (selectedLane && selectedLane.type === 'melody') {
                const notes = chordsToNotes(chordBlocks);
                handleNotesChange(selectedLane.id, notes);
            }
        }
    }

    function handleBassToggle() {
        hasBass = !hasBass;
    }

    function handleRegenerate() {
        if (chordBlocks.length > 0) {
            chordBlocks = regenerateVoicings(chordBlocks, currentVoicingStyle);
            if (selectedLane && selectedLane.type === 'melody') {
                const notes = chordsToNotes(chordBlocks);
                handleNotesChange(selectedLane.id, notes);
            }
        }
    }

    // Convert chord blocks to melody notes
    function chordsToNotes(chords: ChordBlock[]): MelodyNote[] {
        const notes: MelodyNote[] = [];
        chords.forEach(chord => {
            const pitches = getVoicedChordNotes(chord);
            pitches.forEach(pitch => {
                notes.push({
                    id: `${chord.id}_${pitch}`,
                    pitch,
                    startBeat: chord.startBeat,
                    duration: chord.duration,
                    velocity: chord.velocity,
                });
            });
        });
        return notes;
    }

    // Arp commit handler
    function handleArpCommit(notes: MelodyNote[]) {
        if (selectedLane && selectedLane.type === 'melody') {
            handleNotesChange(selectedLane.id, [...selectedLane.notes, ...notes]);
        }
    }

    // Share/Export
    function handleShare() {
        const encoded = encodeArrangementToUrl(arrangement);
        const url = new URL(window.location.href);
        url.searchParams.set('a', encoded);
        shareUrl = url.toString();
        showShareDialog = true;
    }

    async function handleCopyUrl() {
        try {
            await navigator.clipboard.writeText(shareUrl);
        } catch {
            const input = document.createElement('input');
            input.value = shareUrl;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
        }
    }

    function handleNew() {
        arrangement = createArrangement('New Arrangement');
        selectedLaneId = arrangement.lanes[0]?.id ?? null;
        chordBlocks = [];
        selectedProgressionId = null;
        selectedPackId = null;
    }

    function toggleDevice(device: typeof activeDevice) {
        activeDevice = activeDevice === device ? 'none' : device;
    }
</script>

<SEOHead
    title="Arrange | Producer Hub"
    description="Lane-based arrangement view for melody and drum patterns"
/>

<div class="arrange-page">
    <!-- Header -->
    <header class="app-header">
        <div class="header-left">
            <a href="{base}/" class="back-link" aria-label="Back to home">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
            </a>
            <div class="title-group">
                <h1>Arrange</h1>
                <input
                    type="text"
                    class="arrangement-name"
                    bind:value={arrangement.name}
                    placeholder="Arrangement name"
                />
            </div>
        </div>
        <div class="header-actions">
            <button class="header-btn" onclick={handleNew} title="New">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <line x1="12" y1="18" x2="12" y2="12"/>
                    <line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
            </button>
            <button class="header-btn" onclick={handleShare} title="Share">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="18" cy="5" r="3"/>
                    <circle cx="6" cy="12" r="3"/>
                    <circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
            </button>
            <button class="header-btn" onclick={() => showHelp = true} title="Help">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                    <path d="M12 17h.01"/>
                </svg>
            </button>
        </div>
    </header>

    <!-- Transport Bar -->
    <div class="transport-bar">
        <div class="transport-left">
            <button class="transport-btn" onclick={handleRewind} aria-label="Rewind">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 20L9 12l10-8v16zM9 20H7V4h2v16z"/>
                </svg>
            </button>
            <button class="transport-btn play-btn" class:playing={isPlaying} onclick={handlePlay} aria-label="{isPlaying ? 'Stop' : 'Play'}">
                {#if isPlaying}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16"/>
                        <rect x="14" y="4" width="4" height="16"/>
                    </svg>
                {:else}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5,3 19,12 5,21"/>
                    </svg>
                {/if}
            </button>
            <span class="beat-display">
                {#if currentBeat >= 0}
                    {Math.floor(currentBeat / arrangement.timeSignature[0]) + 1}.{Math.floor(currentBeat % arrangement.timeSignature[0]) + 1}.{Math.floor((currentBeat % 1) * 4) + 1}
                {:else}
                    1.1.1
                {/if}
            </span>
        </div>

        <div class="transport-center">
            <label class="transport-setting">
                <span>BPM</span>
                <input type="number" min="40" max="240" bind:value={arrangement.bpm} />
            </label>
            <label class="transport-setting">
                <span>Bars</span>
                <input type="number" min="1" max="32" bind:value={arrangement.bars} />
            </label>
            <label class="transport-setting">
                <span>Key</span>
                <select bind:value={arrangement.scale.root}>
                    {#each ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as note}
                        <option value={note}>{note}</option>
                    {/each}
                </select>
            </label>
            <label class="transport-setting">
                <span>Scale</span>
                <select bind:value={arrangement.scale.type}>
                    <option value="major">Major</option>
                    <option value="minor">Minor</option>
                    <option value="dorian">Dorian</option>
                    <option value="phrygian">Phrygian</option>
                    <option value="lydian">Lydian</option>
                    <option value="mixolydian">Mixolydian</option>
                    <option value="locrian">Locrian</option>
                </select>
            </label>
        </div>

        <div class="transport-right">
            <!-- Empty for now, can add loop controls etc -->
        </div>
    </div>

    <!-- Main Content Area -->
    <div class="main-area">
        <!-- Lane Headers (left sidebar) -->
        <div class="lane-sidebar">
            <div class="lane-header-row add-row">
                <button class="add-lane-btn" onclick={() => handleAddLane('melody')}>+ Melody</button>
                <button class="add-lane-btn" onclick={() => handleAddLane('drums')}>+ Drums</button>
            </div>
            {#each arrangement.lanes as lane (lane.id)}
                <div
                    class="lane-header"
                    class:selected={selectedLaneId === lane.id}
                    class:muted={lane.muted}
                    style="border-left-color: {lane.color};"
                >
                    <button class="lane-name-btn" onclick={() => selectedLaneId = lane.id}>
                        <span class="lane-icon">
                            {#if lane.type === 'melody'}
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M9 18V5l12-2v13"/>
                                    <circle cx="6" cy="18" r="3"/>
                                    <circle cx="18" cy="16" r="3"/>
                                </svg>
                            {:else}
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <circle cx="12" cy="12" r="3"/>
                                </svg>
                            {/if}
                        </span>
                        <span class="lane-label">{lane.name}</span>
                    </button>
                    <div class="lane-btns">
                        <button class="lane-ctrl" class:active={lane.muted} onclick={() => handleToggleMute(lane.id)} aria-label="Mute">M</button>
                        <button class="lane-ctrl" class:active={lane.solo} onclick={() => handleToggleSolo(lane.id)} aria-label="Solo">S</button>
                        {#if arrangement.lanes.length > 1}
                            <button class="lane-ctrl delete" onclick={() => handleDeleteLane(lane.id)} aria-label="Delete">X</button>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>

        <!-- Editor Area -->
        <div class="editor-area">
            {#if selectedLane}
                <MidiRoll
                    mode={selectedLane.type === 'melody' ? 'melody' : 'drums'}
                    notes={selectedLane.notes}
                    scale={selectedLane.type === 'melody' ? arrangement.scale : undefined}
                    bars={arrangement.bars}
                    beatsPerBar={arrangement.timeSignature[0]}
                    {currentBeat}
                    onNotesChange={(notes) => handleNotesChange(selectedLane.id, notes)}
                />
            {:else}
                <div class="no-lane">
                    <p>Select a lane to edit</p>
                </div>
            {/if}
        </div>
    </div>

    <!-- Device Rack (Ableton-style bottom panel) -->
    <div class="device-rack">
        <div class="device-tabs">
            <button
                class="device-tab"
                class:active={activeDevice === 'genre'}
                onclick={() => toggleDevice('genre')}
            >Genre Packs</button>
            <button
                class="device-tab"
                class:active={activeDevice === 'progression'}
                onclick={() => toggleDevice('progression')}
                disabled={!isMelodyLane}
            >Progressions</button>
            <button
                class="device-tab"
                class:active={activeDevice === 'voicing'}
                onclick={() => toggleDevice('voicing')}
                disabled={!isMelodyLane}
            >Voicing</button>
            <button
                class="device-tab"
                class:active={activeDevice === 'arp'}
                onclick={() => toggleDevice('arp')}
                disabled={!isMelodyLane}
            >Arpeggiator</button>
            <button
                class="device-tab"
                class:active={activeDevice === 'humanize'}
                onclick={() => toggleDevice('humanize')}
            >Humanize</button>
            <button
                class="device-tab"
                class:active={activeDevice === 'scale'}
                onclick={() => toggleDevice('scale')}
            >Scale</button>
        </div>

        <div class="device-content">
            {#if activeDevice === 'genre'}
                <div class="device-panel">
                    <GenrePackSelector
                        selectedPackId={selectedPackId}
                        onselect={handlePackSelect}
                    />
                </div>
            {:else if activeDevice === 'progression'}
                <div class="device-panel">
                    <ProgressionSelector
                        selectedTemplateId={selectedProgressionId}
                        onselect={handleProgressionSelect}
                    />
                </div>
            {:else if activeDevice === 'voicing'}
                <div class="device-panel">
                    <VoicingControls
                        inversion={currentInversion}
                        voicingStyle={currentVoicingStyle}
                        rhythmPattern={currentRhythmPattern}
                        {hasBass}
                        onInversionChange={handleInversionChange}
                        onVoicingChange={handleVoicingChange}
                        onRhythmChange={handleRhythmChange}
                        onBassToggle={handleBassToggle}
                        onRegenerate={handleRegenerate}
                    />
                </div>
            {:else if activeDevice === 'arp'}
                <div class="device-panel">
                    <ArpControls
                        chords={chordBlocks}
                        bpm={arrangement.bpm}
                        scale={arrangement.scale}
                        humanize={arrangement.humanize}
                        onCommit={handleArpCommit}
                    />
                </div>
            {:else if activeDevice === 'humanize'}
                <div class="device-panel">
                    <HumanizeControls
                        config={arrangement.humanize}
                        globalSwing={0}
                        onchange={handleHumanizeChange}
                    />
                </div>
            {:else if activeDevice === 'scale'}
                <div class="device-panel">
                    <ScaleSelector
                        scale={arrangement.scale}
                        onchange={handleScaleChange}
                    />
                </div>
            {:else}
                <div class="device-empty">
                    <p>Select a device above to configure</p>
                </div>
            {/if}
        </div>
    </div>

    <!-- Help Sheet -->
    <Sheet bind:open={showHelp} onClose={() => showHelp = false} title="Help">
        <div class="help-content">
            <ControlInfo topic={infoTopic} />
            <div class="help-topics">
                <h4>Quick Reference</h4>
                <button onclick={() => infoTopic = 'lanes'}>Lanes</button>
                <button onclick={() => infoTopic = 'drums'}>Drums</button>
                <button onclick={() => infoTopic = 'scale'}>Scale</button>
                <button onclick={() => infoTopic = 'arp'}>Arpeggiator</button>
                <button onclick={() => infoTopic = 'humanize'}>Humanize</button>
                <button onclick={() => infoTopic = 'bpm'}>Tempo</button>
                <button onclick={() => infoTopic = 'genrePacks'}>Genre Packs</button>
                <button onclick={() => infoTopic = 'progression'}>Progressions</button>
            </div>
        </div>
    </Sheet>

    <!-- Share Dialog -->
    <Sheet bind:open={showShareDialog} onClose={() => showShareDialog = false} title="Share">
        <div class="share-content">
            <p>Share this URL to let others view your arrangement:</p>
            <div class="share-url">
                <input type="text" readonly value={shareUrl} />
                <button onclick={handleCopyUrl}>Copy</button>
            </div>
            <p class="share-note">Note: The arrangement is embedded in the URL.</p>
        </div>
    </Sheet>
</div>

<style>
    .arrange-page {
        display: flex;
        flex-direction: column;
        height: 100vh;
        height: 100dvh;
        background: var(--bg-primary, #1a1a1a);
        color: var(--text-primary, #fff);
        overflow: hidden;
        padding-top: env(safe-area-inset-top);
    }

    /* Header */
    .app-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 16px;
        padding-right: max(16px, env(safe-area-inset-right));
        background: var(--bg-secondary, #222);
        border-bottom: 1px solid var(--border-primary, #333);
        flex-shrink: 0;
        gap: 12px;
    }

    .header-left {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
        min-width: 0;
    }

    .back-link {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        color: var(--text-secondary, #888);
        border-radius: 4px;
        transition: all 0.15s;
        flex-shrink: 0;
    }

    .back-link:hover {
        background: var(--bg-tertiary, #333);
        color: var(--text-primary, #fff);
    }

    .title-group {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
        flex: 1;
    }

    .title-group h1 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--text-secondary, #888);
        flex-shrink: 0;
    }

    .arrangement-name {
        background: transparent;
        border: none;
        border-bottom: 1px solid transparent;
        color: var(--text-primary, #fff);
        font-size: 14px;
        padding: 4px 0;
        min-width: 100px;
        max-width: 200px;
    }

    .arrangement-name:focus {
        outline: none;
        border-bottom-color: var(--accent-primary, #92d36e);
    }

    .header-actions {
        display: flex;
        gap: 4px;
        flex-shrink: 0;
    }

    .header-btn {
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 4px;
        background: transparent;
        color: #888;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .header-btn:hover {
        background: #333;
        color: #fff;
    }

    /* Transport */
    .transport-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 16px;
        background: #252525;
        border-bottom: 1px solid #333;
        flex-shrink: 0;
        gap: 16px;
    }

    .transport-left {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .transport-btn {
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 4px;
        background: #3a3a3a;
        color: #ccc;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .transport-btn:hover {
        background: #4a4a4a;
    }

    .play-btn {
        width: 40px;
        height: 40px;
        background: #92d36e;
        color: #1a1a1a;
    }

    .play-btn:hover {
        background: #a8e07a;
    }

    .play-btn.playing {
        background: #ff5500;
        color: #fff;
    }

    .beat-display {
        font-family: 'SF Mono', 'Monaco', monospace;
        font-size: 18px;
        font-weight: 600;
        color: #92d36e;
        min-width: 70px;
        text-align: center;
    }

    .transport-center {
        display: flex;
        align-items: center;
        gap: 16px;
    }

    .transport-setting {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        color: #888;
    }

    .transport-setting input,
    .transport-setting select {
        height: 26px;
        background: #333;
        border: 1px solid #444;
        border-radius: 3px;
        color: #fff;
        font-size: 12px;
        padding: 0 6px;
    }

    .transport-setting input[type="number"] {
        width: 50px;
        text-align: center;
    }

    .transport-setting select {
        min-width: 70px;
    }

    .transport-right {
        min-width: 100px;
    }

    /* Main Area */
    .main-area {
        display: flex;
        flex: 1;
        overflow: hidden;
    }

    /* Lane Sidebar */
    .lane-sidebar {
        width: 180px;
        flex-shrink: 0;
        background: #1e1e1e;
        border-right: 1px solid #333;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
    }

    .lane-header-row.add-row {
        display: flex;
        gap: 4px;
        padding: 8px;
        border-bottom: 1px solid #333;
    }

    .add-lane-btn {
        flex: 1;
        height: 26px;
        border: 1px dashed #444;
        border-radius: 3px;
        background: transparent;
        color: #666;
        font-size: 10px;
        cursor: pointer;
    }

    .add-lane-btn:hover {
        border-color: #666;
        color: #aaa;
    }

    .lane-header {
        display: flex;
        align-items: center;
        padding: 4px 8px;
        border-left: 3px solid #666;
        border-bottom: 1px solid #2a2a2a;
        background: #222;
    }

    .lane-header.selected {
        background: #2a2a2a;
    }

    .lane-header.muted {
        opacity: 0.4;
    }

    .lane-name-btn {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 4px;
        background: transparent;
        border: none;
        color: #ccc;
        cursor: pointer;
        text-align: left;
        font-size: 12px;
    }

    .lane-name-btn:hover {
        color: #fff;
    }

    .lane-icon {
        font-size: 14px;
    }

    .lane-label {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .lane-btns {
        display: flex;
        gap: 2px;
    }

    .lane-ctrl {
        width: 18px;
        height: 18px;
        border: none;
        border-radius: 2px;
        background: #3a3a3a;
        color: #666;
        font-size: 9px;
        font-weight: 600;
        cursor: pointer;
    }

    .lane-ctrl:hover {
        background: #4a4a4a;
        color: #aaa;
    }

    .lane-ctrl.active {
        background: #ff5500;
        color: #fff;
    }

    .lane-ctrl.delete:hover {
        background: #ef4444;
        color: #fff;
    }

    /* Editor Area */
    .editor-area {
        flex: 1;
        overflow: hidden;
        background: #1a1a1a;
    }

    .no-lane {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #555;
    }

    /* Device Rack */
    .device-rack {
        flex-shrink: 0;
        background: #1e1e1e;
        border-top: 1px solid #333;
    }

    .device-tabs {
        display: flex;
        gap: 2px;
        padding: 4px 8px;
        background: #252525;
        border-bottom: 1px solid #333;
        overflow-x: auto;
    }

    .device-tab {
        padding: 6px 12px;
        border: none;
        border-radius: 3px 3px 0 0;
        background: #333;
        color: #888;
        font-size: 11px;
        cursor: pointer;
        white-space: nowrap;
    }

    .device-tab:hover:not(:disabled) {
        background: #3a3a3a;
        color: #ccc;
    }

    .device-tab.active {
        background: #1e1e1e;
        color: #fff;
    }

    .device-tab:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }

    .device-content {
        min-height: 120px;
        max-height: 200px;
        overflow-y: auto;
    }

    .device-panel {
        padding: 12px;
    }

    .device-empty {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 120px;
        color: #555;
        font-size: 12px;
    }

    /* Help & Share */
    .help-content {
        padding: 16px;
    }

    .help-topics {
        margin-top: 16px;
    }

    .help-topics h4 {
        margin: 0 0 8px;
        font-size: 12px;
        color: #888;
    }

    .help-topics button {
        margin: 4px;
        padding: 6px 12px;
        background: #333;
        border: 1px solid #444;
        border-radius: 4px;
        color: #ccc;
        font-size: 12px;
        cursor: pointer;
    }

    .help-topics button:hover {
        background: #444;
    }

    .share-content {
        padding: 16px;
    }

    .share-content p {
        margin: 0 0 12px;
        color: #aaa;
        font-size: 13px;
    }

    .share-url {
        display: flex;
        gap: 8px;
    }

    .share-url input {
        flex: 1;
        height: 36px;
        padding: 0 12px;
        background: #2a2a2a;
        border: 1px solid #3a3a3a;
        border-radius: 4px;
        color: #fff;
        font-size: 12px;
    }

    .share-url button {
        padding: 0 16px;
        background: #92d36e;
        border: none;
        border-radius: 4px;
        color: #1a1a1a;
        font-weight: 500;
        cursor: pointer;
    }

    .share-url button:hover {
        background: #a8e07a;
    }

    .share-note {
        font-size: 11px;
        color: #666;
    }

    /* Mobile */
    @media (max-width: 768px) {
        .transport-center {
            display: none;
        }

        .lane-sidebar {
            width: 140px;
        }

        .device-tabs {
            padding: 4px;
        }

        .device-tab {
            padding: 4px 8px;
            font-size: 10px;
        }
    }
</style>


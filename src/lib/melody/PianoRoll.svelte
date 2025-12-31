<!--
  PianoRoll Component - Ableton Style

  Piano-roll style editor for melody notes.
  Matches Ableton Live's MIDI editor visual design.

  @component
-->
<script lang="ts">
    import {
        type MelodyNote,
        type ChordBlock,
        type ScaleConfig,
        isInScale,
        midiToNote,
        noteToMidi,
        createNote,
        getVoicedChordNotes,
        detectChordsInSequence,
    } from '$lib/melody';

    export let notes: MelodyNote[] = [];
    export let chords: ChordBlock[] = [];
    export let scale: ScaleConfig;
    export let bars: number = 4;
    export let beatsPerBar: number = 4;
    export let gridResolution: number = 0.25;
    export let currentBeat: number = -1;
    export let selectedNoteId: string | null = null;
    export let selectedChordId: string | null = null;
    export let viewMode: 'melody' | 'chords' | 'both' = 'both';

    export let onNoteAdd: ((note: MelodyNote) => void) | undefined = undefined;
    export let onNoteDelete: ((noteId: string) => void) | undefined = undefined;
    export let onNoteSelect: ((noteId: string | null) => void) | undefined = undefined;
    export let onChordSelect: ((chordId: string | null) => void) | undefined = undefined;
    export let onPlayNote: ((pitch: number) => void) | undefined = undefined;

    // Helper to check if a pitch is the root note of the scale
    function isScaleRoot(pitch: number): boolean {
        const rootMidi = noteToMidi(scale.root, 0);
        return pitch % 12 === rootMidi % 12;
    }

    // Display range (3 octaves: C2 to C5)
    const minDisplayPitch = 36; // C2
    const maxDisplayPitch = 84; // C6
    const displayRange = maxDisplayPitch - minDisplayPitch;

    // Detected chords from notes
    $: detectedChords = detectChordsInSequence(notes);
    $: totalBeats = bars * beatsPerBar;
    $: totalSubdivisions = totalBeats * 4; // 16th notes

    // Dimensions - Ableton-like proportions
    const ROW_HEIGHT = 13;
    const SUBDIVISION_WIDTH = 20; // Width per 16th note
    const KEY_WIDTH = 52;

    $: beatWidth = SUBDIVISION_WIDTH * 4;
    $: gridWidth = totalSubdivisions * SUBDIVISION_WIDTH;
    $: gridHeight = displayRange * ROW_HEIGHT;

    let scrollContainer: HTMLDivElement;

    function getYFromPitch(pitch: number): number {
        return (maxDisplayPitch - 1 - pitch) * ROW_HEIGHT;
    }

    function getPitchFromY(y: number): number {
        return maxDisplayPitch - 1 - Math.floor(y / ROW_HEIGHT);
    }

    function handleGridClick(e: MouseEvent) {
        if (viewMode === 'chords') return;

        const target = e.target as HTMLElement;
        if (target.closest('.note-block') || target.closest('.chord-block')) return;

        const rect = scrollContainer.getBoundingClientRect();
        const scrollLeft = scrollContainer.scrollLeft;
        const x = e.clientX - rect.left + scrollLeft;
        const y = e.clientY - rect.top;

        const pitch = getPitchFromY(y);
        const beat = Math.floor(x / beatWidth);

        if (pitch < minDisplayPitch || pitch >= maxDisplayPitch) return;
        if (beat < 0 || beat >= totalBeats) return;

        // Check for existing note
        const existingNote = notes.find(n =>
            n.pitch === pitch &&
            beat >= n.startBeat &&
            beat < n.startBeat + n.duration
        );

        if (existingNote) {
            onNoteSelect?.(existingNote.id);
            onPlayNote?.(pitch);
            return;
        }

        // Create new note (1 beat = quarter note)
        const newNote = createNote(pitch, beat, 1, 100);
        onNoteAdd?.(newNote);
        onNoteSelect?.(newNote.id);
        onPlayNote?.(pitch);
    }

    function handleNoteClick(e: Event, note: MelodyNote) {
        e.stopPropagation();
        onNoteSelect?.(note.id);
        onPlayNote?.(note.pitch);
    }

    function handleKeyClick(pitch: number) {
        onPlayNote?.(pitch);
    }

    function handleKeydown(e: KeyboardEvent) {
        if (selectedNoteId && (e.key === 'Delete' || e.key === 'Backspace')) {
            e.preventDefault();
            onNoteDelete?.(selectedNoteId);
            onNoteSelect?.(null);
        }
    }

    function isBlackKey(pitch: number): boolean {
        const pc = pitch % 12;
        return [1, 3, 6, 8, 10].includes(pc);
    }

    function getNoteName(pitch: number): string {
        const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        return names[pitch % 12];
    }

    function getNoteLabel(pitch: number): string {
        const octave = Math.floor(pitch / 12) - 1;
        return `${getNoteName(pitch)}${octave}`;
    }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="piano-roll-container">
    <!-- Chord labels header -->
    <div class="chord-header">
        <div class="chord-header-keys"></div>
        <div class="chord-header-grid" style="width: {gridWidth}px;">
            {#each [...detectedChords.entries()] as [beat, chord] (beat)}
                <div class="chord-label" style="left: {beat * beatWidth}px;">
                    {chord.symbol}
                </div>
            {/each}
        </div>
    </div>

    <div class="piano-roll">
        <!-- Piano keyboard -->
        <div class="keyboard">
            {#each Array(displayRange) as _, i}
                {@const pitch = maxDisplayPitch - 1 - i}
                {@const isBlack = isBlackKey(pitch)}
                {@const isC = pitch % 12 === 0}
                {@const inScale = isInScale(pitch, scale)}
                {@const isRoot = isScaleRoot(pitch)}
                <button
                    type="button"
                    class="key"
                    class:black-key={isBlack}
                    class:white-key={!isBlack}
                    class:c-key={isC}
                    class:in-scale={inScale && !isRoot}
                    class:scale-root={isRoot}
                    onclick={() => handleKeyClick(pitch)}
                    aria-label="Play {getNoteLabel(pitch)}"
                >
                    {#if isC}
                        <span class="key-name">{getNoteLabel(pitch)}</span>
                    {/if}
                </button>
            {/each}
        </div>

        <!-- Grid area -->
        <div
            class="grid-scroll"
            bind:this={scrollContainer}
            onclick={handleGridClick}
            role="grid"
            aria-label="Piano roll grid - click to add notes"
        >
            <div class="grid" style="width: {gridWidth}px; height: {gridHeight}px;">
                <!-- Row backgrounds -->
                {#each Array(displayRange) as _, i}
                    {@const pitch = maxDisplayPitch - 1 - i}
                    {@const isBlack = isBlackKey(pitch)}
                    {@const isC = pitch % 12 === 0}
                    {@const inScale = isInScale(pitch, scale)}
                    {@const isRoot = isScaleRoot(pitch)}
                    <div
                        class="grid-row"
                        class:black-row={isBlack}
                        class:white-row={!isBlack}
                        class:c-row={isC}
                        class:scale-row={inScale && !isRoot}
                        class:scale-root-row={isRoot}
                        style="top: {i * ROW_HEIGHT}px; height: {ROW_HEIGHT}px;"
                    ></div>
                {/each}

                <!-- Vertical grid lines -->
                {#each Array(totalSubdivisions + 1) as _, i}
                    {@const isBeat = i % 4 === 0}
                    {@const isBar = i % (beatsPerBar * 4) === 0}
                    <div
                        class="grid-line"
                        class:beat-line={isBeat && !isBar}
                        class:bar-line={isBar}
                        class:subdivision-line={!isBeat}
                        style="left: {i * SUBDIVISION_WIDTH}px;"
                    ></div>
                {/each}

                <!-- Playhead -->
                {#if currentBeat >= 0}
                    <div
                        class="playhead"
                        style="left: {currentBeat * beatWidth}px;"
                    ></div>
                {/if}

                <!-- Notes -->
                {#each notes as note (note.id)}
                    {@const noteY = getYFromPitch(note.pitch)}
                    {@const noteX = note.startBeat * beatWidth}
                    {@const noteW = note.duration * beatWidth}
                    <button
                        type="button"
                        class="note-block"
                        class:selected={selectedNoteId === note.id}
                        class:muted={!isInScale(note.pitch, scale) && scale.snapToScale}
                        style="
                            left: {noteX}px;
                            top: {noteY}px;
                            width: {noteW - 1}px;
                            height: {ROW_HEIGHT - 1}px;
                        "
                        onclick={(e) => handleNoteClick(e, note)}
                        aria-label="{getNoteLabel(note.pitch)} at beat {note.startBeat + 1}"
                    >
                        <span class="note-velocity" style="opacity: {note.velocity / 127}"></span>
                    </button>
                {/each}
            </div>
        </div>
    </div>
</div>

<style>
    /* ========================================
       Ableton-style Piano Roll
       ======================================== */

    .piano-roll-container {
        display: flex;
        flex-direction: column;
        background: #1e1e1e;
        border-radius: 4px;
        overflow: hidden;
        border: 1px solid #3d3d3d;
    }

    /* Chord labels header */
    .chord-header {
        display: flex;
        height: 24px;
        background: #2a2a2a;
        border-bottom: 1px solid #3d3d3d;
    }

    .chord-header-keys {
        width: 52px;
        flex-shrink: 0;
        background: #252525;
        border-right: 1px solid #3d3d3d;
    }

    .chord-header-grid {
        position: relative;
        overflow: hidden;
    }

    .chord-label {
        position: absolute;
        top: 2px;
        padding: 2px 6px;
        background: #5dade2;
        color: #fff;
        font-size: 11px;
        font-weight: 600;
        border-radius: 2px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    /* Main piano roll area */
    .piano-roll {
        display: flex;
        height: 400px;
    }

    /* Keyboard */
    .keyboard {
        width: 52px;
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        background: #1a1a1a;
        border-right: 1px solid #3d3d3d;
    }

    .key {
        height: 13px;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        padding-right: 4px;
        border: none;
        cursor: pointer;
        font-size: 9px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        transition: filter 0.05s;
    }

    .key:active {
        filter: brightness(1.3);
    }

    .white-key {
        background: #4a4a4a;
        border-bottom: 1px solid #3a3a3a;
        color: #999;
    }

    .white-key:hover {
        background: #5a5a5a;
    }

    .black-key {
        background: #2d2d2d;
        border-bottom: 1px solid #252525;
        color: #666;
    }

    .black-key:hover {
        background: #3d3d3d;
    }

    .c-key {
        border-bottom: 1px solid #555;
    }

    /* Scale highlighting for keys */
    .key.in-scale {
        background: rgba(146, 211, 110, 0.15) !important;
        border-left: 2px solid #92d36e;
    }

    /* Root note key - stronger highlight */
    .key.scale-root {
        background: rgba(146, 211, 110, 0.25) !important;
        border-left: 3px solid #92d36e;
    }

    .key-name {
        font-weight: 500;
        font-size: 8px;
        color: #888;
    }

    /* Grid scroll container */
    .grid-scroll {
        flex: 1;
        overflow: auto;
        cursor: crosshair;
    }

    .grid {
        position: relative;
        background: #333;
    }

    /* Row backgrounds */
    .grid-row {
        position: absolute;
        left: 0;
        right: 0;
    }

    .white-row {
        background: #3a3a3a;
    }

    .black-row {
        background: #333;
    }

    .c-row {
        border-bottom: 1px solid #4a4a4a;
    }

    /* Scale highlighting - notes in the current scale */
    .scale-row {
        background: rgba(146, 211, 110, 0.08);
    }

    /* Root note row - stronger highlight */
    .scale-root-row {
        background: rgba(146, 211, 110, 0.15);
    }

    /* Grid lines */
    .grid-line {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 1px;
        pointer-events: none;
    }

    .subdivision-line {
        background: #404040;
    }

    .beat-line {
        background: #4a4a4a;
    }

    .bar-line {
        background: #5a5a5a;
        width: 1px;
    }

    /* Playhead */
    .playhead {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 2px;
        background: #ff5500;
        z-index: 100;
        pointer-events: none;
    }

    /* Notes - Ableton style */
    .note-block {
        position: absolute;
        background: #92d36e;
        border: none;
        border-radius: 2px;
        cursor: pointer;
        z-index: 10;
        padding: 0;
        overflow: hidden;
    }

    .note-block:hover {
        filter: brightness(1.15);
    }

    .note-block.selected {
        background: #a8e07a;
        box-shadow:
            inset 0 0 0 1px rgba(255,255,255,0.5),
            0 0 0 1px #fff;
        z-index: 15;
    }

    .note-block.muted {
        background: #7a7a7a;
    }

    .note-velocity {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: rgba(0,0,0,0.3);
    }

    /* Mobile adjustments */
    @media (max-width: 768px) {
        .piano-roll {
            height: 320px;
        }

        .keyboard {
            width: 40px;
        }

        .chord-header-keys {
            width: 40px;
        }

        .key {
            height: 13px;
        }

        .key-name {
            font-size: 7px;
        }
    }
</style>


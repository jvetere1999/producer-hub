<!--
  MidiRoll Component - Unified MIDI editor for both melody and drums

  Fixed version with synchronized scrolling between keys and grid.
-->
<script lang="ts">
    import {
        type MelodyNote,
        type ScaleConfig,
        isInScale,
        createNote,
        detectChordsInSequence,
        playNote,
    } from '$lib/melody';
    import { playDrumSound } from '$lib/melody/audio';
    import { DRUM_SOUNDS, DEFAULT_DRUM_PITCHES } from '$lib/melody/lanes';

    export let mode: 'melody' | 'drums' = 'melody';
    export let notes: MelodyNote[] = [];
    export let scale: ScaleConfig | undefined = undefined;
    export let bars: number = 4;
    export let beatsPerBar: number = 4;
    export let currentBeat: number = -1;
    export let selectedNoteId: string | null = null;
    export let drumPitches: number[] = DEFAULT_DRUM_PITCHES;
    export let onNoteAdd: ((note: MelodyNote) => void) | undefined = undefined;
    export let onNoteDelete: ((noteId: string) => void) | undefined = undefined;
    export let onNoteSelect: ((noteId: string | null) => void) | undefined = undefined;
    export let onNotesChange: ((notes: MelodyNote[]) => void) | undefined = undefined;

    // Fixed dimensions
    const CELL_SIZE = 20;
    const KEY_WIDTH = 80;

    // Computed values
    $: pitchRange = mode === 'drums' ? drumPitches : generatePitchRange(36, 84);
    $: totalBeats = bars * beatsPerBar;
    $: totalSteps = totalBeats * 4;
    $: gridWidth = totalSteps * CELL_SIZE;
    $: gridHeight = pitchRange.length * CELL_SIZE;

    $: detectedChords = mode === 'melody' ? detectChordsInSequence(notes) : new Map();

    function generatePitchRange(min: number, max: number): number[] {
        const range: number[] = [];
        for (let p = max - 1; p >= min; p--) {
            range.push(p);
        }
        return range;
    }

    function isBlackKey(pitch: number): boolean {
        return [1, 3, 6, 8, 10].includes(pitch % 12);
    }

    function getNoteName(pitch: number): string {
        if (mode === 'drums') {
            const sound = DRUM_SOUNDS[pitch];
            return sound ? sound.name : 'Perc ' + (pitch - 35);
        }
        const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(pitch / 12) - 1;
        return names[pitch % 12] + octave;
    }

    function getRowIndex(pitch: number): number {
        return pitchRange.indexOf(pitch);
    }

    function handleCellClick(pitch: number, step: number) {
        const beat = step / 4;
        const duration = 0.25;

        const existingNote = notes.find(n =>
            n.pitch === pitch && Math.abs(n.startBeat - beat) < 0.01
        );

        if (existingNote) {
            onNoteDelete?.(existingNote.id);
            onNotesChange?.(notes.filter(n => n.id !== existingNote.id));
        } else {
            const newNote = createNote(pitch, beat, duration, 100);
            onNoteAdd?.(newNote);
            onNotesChange?.([...notes, newNote]);

            if (mode === 'drums') {
                playDrumSound(pitch, 100);
            } else {
                playNote(pitch, 0.3, 100, 'grand-piano');
            }
        }
    }

    function handleKeyClick(pitch: number) {
        if (mode === 'drums') {
            playDrumSound(pitch, 100);
        } else {
            playNote(pitch, 0.3, 100, 'grand-piano');
        }
    }

    function hasNoteAt(pitch: number, step: number): MelodyNote | undefined {
        const beat = step / 4;
        return notes.find(n =>
            n.pitch === pitch &&
            beat >= n.startBeat &&
            beat < n.startBeat + n.duration
        );
    }

    function handleKeydown(e: KeyboardEvent) {
        if (selectedNoteId && (e.key === 'Delete' || e.key === 'Backspace')) {
            e.preventDefault();
            onNoteDelete?.(selectedNoteId);
            onNotesChange?.(notes.filter(n => n.id !== selectedNoteId));
            onNoteSelect?.(null);
        }
    }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="midi-roll" class:drums-mode={mode === 'drums'}>
    <div class="scroll-container">
        <div class="inner-container" style="height: {gridHeight}px;">
            <!-- Keys column - scrolls with grid -->
            <div class="keys-column" style="width: {KEY_WIDTH}px;">
                {#each pitchRange as pitch, i}
                    {@const isBlack = mode === 'melody' && isBlackKey(pitch)}
                    <button
                        type="button"
                        class="key"
                        class:black-key={isBlack}
                        class:white-key={mode === 'melody' && !isBlack}
                        class:drum-key={mode === 'drums'}
                        style="height: {CELL_SIZE}px;"
                        onclick={() => handleKeyClick(pitch)}
                        aria-label="Play {getNoteName(pitch)}"
                    >
                        <span class="key-label">{getNoteName(pitch)}</span>
                    </button>
                {/each}
            </div>

            <!-- Grid area - horizontal scroll only -->
            <div class="grid-wrapper">
                <div class="grid" style="width: {gridWidth}px; height: {gridHeight}px;">
                    {#each pitchRange as pitch, rowIdx}
                        {@const isBlack = mode === 'melody' && isBlackKey(pitch)}
                        {@const inScale = mode === 'melody' && scale && isInScale(pitch, scale)}
                        <div
                            class="grid-row"
                            class:black-row={isBlack}
                            class:white-row={mode === 'melody' && !isBlack}
                            class:drum-row={mode === 'drums'}
                            class:scale-row={inScale}
                            style="top: {rowIdx * CELL_SIZE}px; height: {CELL_SIZE}px;"
                        >
                            {#each Array(totalSteps) as _, step}
                                {@const note = hasNoteAt(pitch, step)}
                                {@const isBeat = step % 4 === 0}
                                {@const isBar = step % (beatsPerBar * 4) === 0}
                                <button
                                    type="button"
                                    class="cell"
                                    class:has-note={!!note}
                                    class:selected={note?.id === selectedNoteId}
                                    class:beat-line={isBeat}
                                    class:bar-line={isBar}
                                    style="width: {CELL_SIZE}px; height: {CELL_SIZE}px;"
                                    onclick={() => handleCellClick(pitch, step)}
                                    aria-label="{note ? 'Remove' : 'Add'} note"
                                ></button>
                            {/each}
                        </div>
                    {/each}

                    <!-- Playhead -->
                    {#if currentBeat >= 0}
                        <div class="playhead" style="left: {currentBeat * CELL_SIZE * 4}px;"></div>
                    {/if}
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    .midi-roll {
        display: flex;
        flex-direction: column;
        background: var(--bg-secondary, #1e1e1e);
        border: 1px solid var(--border-primary, #333);
        border-radius: 4px;
        overflow: hidden;
        height: 100%;
        min-height: 300px;
    }

    .scroll-container {
        flex: 1;
        overflow: auto;
    }

    .inner-container {
        display: flex;
        min-width: max-content;
    }

    .keys-column {
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        background: var(--bg-tertiary, #252525);
        border-right: 1px solid var(--border-primary, #333);
        position: sticky;
        left: 0;
        z-index: 10;
    }

    .key {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        padding: 0 6px;
        border: none;
        cursor: pointer;
        font-size: 9px;
        box-sizing: border-box;
        flex-shrink: 0;
    }

    .white-key {
        background: var(--bg-tertiary, #4a4a4a);
        color: var(--text-secondary, #999);
        border-bottom: 1px solid var(--border-secondary, #3a3a3a);
    }

    .white-key:hover {
        background: var(--bg-hover, #5a5a5a);
    }

    .black-key {
        background: var(--bg-primary, #2d2d2d);
        color: var(--text-muted, #666);
        border-bottom: 1px solid var(--border-primary, #252525);
    }

    .black-key:hover {
        background: var(--bg-secondary, #3d3d3d);
    }

    .drum-key {
        background: var(--bg-tertiary, #3a3a3a);
        color: var(--text-primary, #ccc);
        border-bottom: 1px solid var(--border-primary, #333);
        justify-content: flex-start;
        font-weight: 500;
        font-size: 10px;
    }

    .drum-key:hover {
        background: var(--bg-hover, #4a4a4a);
    }

    .key-label {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .grid-wrapper {
        flex: 1;
        overflow-x: auto;
        overflow-y: hidden;
    }

    .grid {
        position: relative;
        background: var(--bg-primary, #2a2a2a);
    }

    .grid-row {
        position: absolute;
        left: 0;
        right: 0;
        display: flex;
    }

    .white-row {
        background: var(--bg-tertiary, #3a3a3a);
    }

    .black-row {
        background: var(--bg-secondary, #333);
    }

    .drum-row {
        background: var(--bg-secondary, #2d2d2d);
    }

    .drum-row:nth-child(even) {
        background: var(--bg-tertiary, #333);
    }

    .scale-row {
        background: rgba(146, 211, 110, 0.08);
    }

    .cell {
        flex-shrink: 0;
        border: none;
        border-right: 1px solid var(--border-secondary, #404040);
        background: transparent;
        cursor: pointer;
        padding: 0;
        box-sizing: border-box;
    }

    .cell:hover {
        background: rgba(146, 211, 110, 0.25);
    }

    .cell.beat-line {
        border-right-color: var(--border-primary, #4a4a4a);
    }

    .cell.bar-line {
        border-right: 2px solid var(--border-accent, #5a5a5a);
    }

    .cell.has-note {
        background: var(--accent-primary, #92d36e);
    }

    .cell.has-note:hover {
        background: var(--accent-hover, #a8e07a);
    }

    .cell.selected {
        box-shadow: inset 0 0 0 2px var(--text-primary, #fff);
    }

    .playhead {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 2px;
        background: #ff5500;
        z-index: 20;
        pointer-events: none;
    }

    @media (max-width: 768px) {
        .midi-roll {
            min-height: 250px;
        }

        .keys-column {
            width: 60px !important;
        }

        .key-label {
            font-size: 8px;
        }
    }
</style>


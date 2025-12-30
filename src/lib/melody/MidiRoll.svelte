<!--
  MidiRoll Component - Unified MIDI editor for both melody and drums

  Features:
  - Click to add/remove notes
  - Drag right to extend note duration (sustain)
  - Visual note bars showing duration
  - Bar and beat grid lines
-->
<script lang="ts">
    import { tick } from 'svelte';
    import {
        type MelodyNote,
        type ScaleConfig,
        isInScale,
        createNote,
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

    // Drag state for extending notes
    let isDragging = false;
    let dragStartStep = -1;
    let dragCurrentStep = -1;
    let dragPitch = -1;

    // Computed values
    $: pitchRange = mode === 'drums' ? drumPitches : generatePitchRange(36, 84);
    $: totalBeats = bars * beatsPerBar;
    $: totalSteps = totalBeats * 4;
    $: gridWidth = totalSteps * CELL_SIZE;
    $: gridHeight = pitchRange.length * CELL_SIZE;

    // Create a note lookup map for O(1) access - reactive to notes changes
    $: noteMap = createNoteMap(notes);

    // Create a map to check if a step is covered by any note (for rendering note bars)
    $: noteCoverageMap = createNoteCoverageMap(notes);

    function createNoteMap(noteList: MelodyNote[]): Map<string, MelodyNote> {
        const map = new Map<string, MelodyNote>();
        for (const note of noteList) {
            const step = Math.round(note.startBeat * 4);
            map.set(`${note.pitch}_${step}`, note);
        }
        return map;
    }

    function createNoteCoverageMap(noteList: MelodyNote[]): Map<string, { note: MelodyNote, isStart: boolean, isEnd: boolean }> {
        const map = new Map<string, { note: MelodyNote, isStart: boolean, isEnd: boolean }>();
        for (const note of noteList) {
            const startStep = Math.round(note.startBeat * 4);
            const durationSteps = Math.round(note.duration * 4);
            for (let i = 0; i < durationSteps; i++) {
                const step = startStep + i;
                map.set(`${note.pitch}_${step}`, {
                    note,
                    isStart: i === 0,
                    isEnd: i === durationSteps - 1
                });
            }
        }
        return map;
    }

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

    function handleMouseDown(pitch: number, step: number, e: MouseEvent) {
        e.preventDefault();
        const coverage = noteCoverageMap.get(`${pitch}_${step}`);

        if (coverage) {
            // Clicking on existing note - delete it
            const newNotes = notes.filter(n => n.id !== coverage.note.id);
            onNoteDelete?.(coverage.note.id);
            onNotesChange?.(newNotes);
        } else {
            // Start new note - begin drag
            isDragging = true;
            dragStartStep = step;
            dragCurrentStep = step;
            dragPitch = pitch;
        }
    }

    function handleMouseMove(step: number) {
        if (isDragging && step >= dragStartStep) {
            dragCurrentStep = step;
        }
    }

    async function handleMouseUp() {
        if (isDragging) {
            const beat = dragStartStep / 4;
            const durationSteps = Math.max(1, dragCurrentStep - dragStartStep + 1);
            const duration = durationSteps / 4; // Convert steps to beats

            const newNote = createNote(dragPitch, beat, duration, 100);
            const newNotes = [...notes, newNote];
            onNoteAdd?.(newNote);
            onNotesChange?.(newNotes);

            if (mode === 'drums') {
                playDrumSound(dragPitch, 100);
            } else {
                playNote(dragPitch, duration, 100, 'grand-piano');
            }

            isDragging = false;
            dragStartStep = -1;
            dragCurrentStep = -1;
            dragPitch = -1;

            await tick();
        }
    }

    function handleMouseLeave() {
        if (isDragging) {
            handleMouseUp();
        }
    }

    function handleKeyClick(pitch: number) {
        if (mode === 'drums') {
            playDrumSound(pitch, 100);
        } else {
            playNote(pitch, 0.3, 100, 'grand-piano');
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (selectedNoteId && (e.key === 'Delete' || e.key === 'Backspace')) {
            e.preventDefault();
            onNoteDelete?.(selectedNoteId);
            onNotesChange?.(notes.filter(n => n.id !== selectedNoteId));
            onNoteSelect?.(null);
        }
    }

    // Check if step is in current drag range
    function isInDragRange(pitch: number, step: number): boolean {
        if (!isDragging || pitch !== dragPitch) return false;
        return step >= dragStartStep && step <= dragCurrentStep;
    }
</script>

<svelte:window onkeydown={handleKeydown} onmouseup={handleMouseUp} />

<div class="midi-roll" class:drums-mode={mode === 'drums'}>
    <!-- Bar numbers header -->
    <div class="bar-header" style="padding-left: {KEY_WIDTH}px;">
        <div class="bar-numbers" style="width: {gridWidth}px;">
            {#each Array(bars) as _, barIdx}
                <div class="bar-number" style="width: {beatsPerBar * 4 * CELL_SIZE}px;">
                    {barIdx + 1}
                </div>
            {/each}
        </div>
    </div>

    <div class="scroll-container" onmouseleave={handleMouseLeave} role="application">
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
                                {@const isBeat = step % 4 === 0}
                                {@const isBar = step % (beatsPerBar * 4) === 0}
                                {@const coverage = noteCoverageMap.get(`${pitch}_${step}`)}
                                {@const inDrag = isInDragRange(pitch, step)}
                                <div
                                    class="cell"
                                    class:has-note={!!coverage}
                                    class:note-start={coverage?.isStart}
                                    class:note-end={coverage?.isEnd}
                                    class:note-middle={coverage && !coverage.isStart && !coverage.isEnd}
                                    class:selected={coverage?.note.id === selectedNoteId}
                                    class:beat-line={isBeat && !isBar}
                                    class:bar-line={isBar}
                                    class:dragging={inDrag}
                                    style="width: {CELL_SIZE}px; height: {CELL_SIZE}px;"
                                    onmousedown={(e) => handleMouseDown(pitch, step, e)}
                                    onmouseenter={() => handleMouseMove(step)}
                                    role="button"
                                    tabindex="-1"
                                    aria-label="{coverage ? 'Remove' : 'Add'} note"
                                ></div>
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

    /* Bar header with bar numbers */
    .bar-header {
        display: flex;
        background: var(--bg-tertiary, #252525);
        border-bottom: 1px solid var(--border-primary, #444);
        height: 24px;
        flex-shrink: 0;
        overflow: hidden;
    }

    .bar-numbers {
        display: flex;
    }

    .bar-number {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        padding-left: 4px;
        font-size: 11px;
        font-weight: 600;
        color: var(--text-secondary, #888);
        border-right: 2px solid var(--border-accent, #555);
        box-sizing: border-box;
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
        min-height: 0;
    }

    .white-key {
        background: var(--bg-tertiary, #4a4a4a);
        color: var(--text-secondary, #999);
        box-shadow: inset 0 -1px 0 var(--border-secondary, #3a3a3a);
    }

    .white-key:hover {
        background: var(--bg-hover, #5a5a5a);
    }

    .black-key {
        background: var(--bg-primary, #2d2d2d);
        color: var(--text-muted, #666);
        box-shadow: inset 0 -1px 0 var(--border-primary, #252525);
    }

    .black-key:hover {
        background: var(--bg-secondary, #3d3d3d);
    }

    .drum-key {
        background: var(--bg-tertiary, #3a3a3a);
        color: var(--text-primary, #ccc);
        box-shadow: inset 0 -1px 0 var(--border-primary, #333);
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
        overflow: hidden;
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
        background: rgba(146, 211, 110, 0.04);
    }

    .cell {
        flex-shrink: 0;
        border: none;
        border-right: 1px solid var(--border-secondary, #383838);
        background: transparent;
        cursor: crosshair;
        padding: 0;
        box-sizing: border-box;
        pointer-events: auto;
        position: relative;
        isolation: isolate;
    }

    .cell:hover {
        background: rgba(146, 211, 110, 0.2);
    }

    /* Beat lines - every 4 steps (quarter note) */
    .cell.beat-line {
        border-right: 1px solid var(--border-primary, #505050);
    }

    /* Bar lines - stronger, every bar */
    .cell.bar-line {
        border-right: 2px solid var(--accent-primary, #92d36e);
    }

    /* Note styling with sustain visualization */
    .cell.has-note {
        background: var(--accent-primary, #92d36e);
        border-right-color: var(--accent-hover, #7bc45a);
    }

    /* Note start - rounded left edge */
    .cell.note-start {
        border-top-left-radius: 3px;
        border-bottom-left-radius: 3px;
    }

    /* Note end - rounded right edge */
    .cell.note-end {
        border-top-right-radius: 3px;
        border-bottom-right-radius: 3px;
        border-right: 1px solid var(--border-secondary, #383838);
    }

    /* Note middle - no rounding, seamless connection */
    .cell.note-middle {
        border-radius: 0;
    }

    /* Single cell note (start and end) */
    .cell.note-start.note-end {
        border-radius: 3px;
    }

    .cell.has-note:hover {
        background: var(--accent-hover, #a8e07a);
    }

    /* Dragging preview */
    .cell.dragging {
        background: rgba(146, 211, 110, 0.5);
        border-top-left-radius: 3px;
        border-bottom-left-radius: 3px;
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
        box-shadow: 0 0 4px rgba(255, 85, 0, 0.5);
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

        .bar-number {
            font-size: 10px;
        }
    }
</style>


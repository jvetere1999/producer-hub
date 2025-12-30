/**
 * MIDI Export Module
 *
 * Exports drum lanes and melody lanes to Standard MIDI File (SMF) format.
 * Fully client-side, no external dependencies.
 *
 * Features:
 * - Drum lane export with GM drum mapping
 * - Melody lane export with note lengths/velocities
 * - Chord block export as simultaneous notes
 * - Tempo meta events
 * - Quantization to grid resolution
 *
 * Security:
 * - Export-only (no parsing of untrusted MIDI)
 * - Validates note ranges, velocities, durations
 */

import type { SyncNote, SyncLaneSettings, LaneTemplateType } from './vaultTypes';

// ============================================
// Constants
// ============================================

/** Ticks per quarter note (PPQN) */
export const MIDI_TICKS_PER_BEAT = 480;

/** Minimum note duration for oneShot mode (1/32 note) */
export const MIN_ONESHOT_TICKS = MIDI_TICKS_PER_BEAT / 8;

/** MIDI channel for drums (channel 10 in 1-indexed = 9 in 0-indexed) */
export const DRUM_CHANNEL = 9;

/** MIDI channel for melody (channel 1 = 0 in 0-indexed) */
export const MELODY_CHANNEL = 0;

/**
 * General MIDI Drum Map
 * Maps our internal drum IDs to GM standard MIDI notes
 */
export const GM_DRUM_MAP: Record<string, number> = {
    // Bass drums
    'kick': 36,
    'bass': 36,
    'bass-drum': 36,
    // Snares
    'snare': 38,
    'snare-drum': 38,
    'sidestick': 37,
    'rim': 37,
    // Hi-hats
    'hihat-closed': 42,
    'hihat': 42,
    'closed-hihat': 42,
    'hihat-open': 46,
    'open-hihat': 46,
    'hihat-pedal': 44,
    // Toms
    'tom-high': 50,
    'tom-mid': 47,
    'tom-low': 45,
    'tom-floor': 43,
    // Cymbals
    'crash': 49,
    'crash-cymbal': 49,
    'ride': 51,
    'ride-cymbal': 51,
    'ride-bell': 53,
    'splash': 55,
    'china': 52,
    // Percussion
    'clap': 39,
    'handclap': 39,
    'tambourine': 54,
    'cowbell': 56,
    'shaker': 70,
    'maracas': 70,
    'clave': 75,
    'woodblock-high': 76,
    'woodblock-low': 77,
    'triangle-open': 81,
    'triangle-mute': 80,
    // Electronic drums (common in production)
    '808-kick': 36,
    '808-snare': 38,
    '808-clap': 39,
    '808-hat': 42,
    '909-kick': 36,
    '909-snare': 40, // Electric snare
    '909-hat': 42,
};

/**
 * Default note for unknown drum sounds
 */
export const DEFAULT_DRUM_NOTE = 36; // Bass drum

// ============================================
// Types
// ============================================

export interface MidiExportOptions {
    /** Tempo in BPM (default: 120) */
    bpm?: number;
    /** Time signature numerator (default: 4) */
    timeSignatureNum?: number;
    /** Time signature denominator (default: 4) */
    timeSignatureDenom?: number;
    /** Key signature (for metadata) */
    key?: string;
    /** Track name */
    trackName?: string;
    /** Quantize grid (applies to start times) */
    quantizeGrid?: '1/4' | '1/8' | '1/16' | '1/32' | 'off';
}

export interface MidiExportResult {
    /** MIDI file as Uint8Array */
    data: Uint8Array;
    /** Suggested filename */
    filename: string;
    /** MIME type */
    mimeType: string;
}

export interface MidiNote {
    pitch: number;
    startTicks: number;
    durationTicks: number;
    velocity: number;
    channel: number;
}

// ============================================
// Validation
// ============================================

/**
 * Validate and clamp a MIDI note number
 */
export function validateNotePitch(pitch: number): number {
    if (!Number.isFinite(pitch)) return 60; // Middle C
    return Math.max(0, Math.min(127, Math.round(pitch)));
}

/**
 * Validate and clamp velocity
 */
export function validateVelocity(velocity: number): number {
    if (!Number.isFinite(velocity)) return 100;
    return Math.max(1, Math.min(127, Math.round(velocity)));
}

/**
 * Validate and clamp duration in ticks
 */
export function validateDuration(ticks: number, minTicks: number = 1): number {
    if (!Number.isFinite(ticks) || ticks < minTicks) return minTicks;
    return Math.round(ticks);
}

// ============================================
// Quantization
// ============================================

/**
 * Get quantize grid in ticks
 */
export function getQuantizeGridTicks(grid: string): number {
    switch (grid) {
        case '1/4': return MIDI_TICKS_PER_BEAT;
        case '1/8': return MIDI_TICKS_PER_BEAT / 2;
        case '1/16': return MIDI_TICKS_PER_BEAT / 4;
        case '1/32': return MIDI_TICKS_PER_BEAT / 8;
        default: return 1; // No quantization
    }
}

/**
 * Quantize a tick value to the nearest grid
 */
export function quantizeTicks(ticks: number, gridTicks: number): number {
    if (gridTicks <= 1) return Math.round(ticks);
    return Math.round(ticks / gridTicks) * gridTicks;
}

// ============================================
// MIDI Byte Encoding
// ============================================

/**
 * Encode variable-length quantity (VLQ) for MIDI delta times
 */
export function encodeVLQ(value: number): number[] {
    if (value < 0) value = 0;
    if (value > 0x0FFFFFFF) value = 0x0FFFFFFF;

    const bytes: number[] = [];
    let v = value;

    // Build bytes from LSB to MSB
    bytes.unshift(v & 0x7F);
    v >>= 7;

    while (v > 0) {
        bytes.unshift((v & 0x7F) | 0x80);
        v >>= 7;
    }

    return bytes;
}

/**
 * Encode a 16-bit big-endian value
 */
function encode16BE(value: number): number[] {
    return [(value >> 8) & 0xFF, value & 0xFF];
}

/**
 * Encode a 32-bit big-endian value
 */
function encode32BE(value: number): number[] {
    return [
        (value >> 24) & 0xFF,
        (value >> 16) & 0xFF,
        (value >> 8) & 0xFF,
        value & 0xFF
    ];
}

/**
 * Encode tempo in microseconds per beat
 */
function encodeTempo(bpm: number): number[] {
    const microsecondsPerBeat = Math.round(60000000 / bpm);
    return [
        (microsecondsPerBeat >> 16) & 0xFF,
        (microsecondsPerBeat >> 8) & 0xFF,
        microsecondsPerBeat & 0xFF
    ];
}

// ============================================
// MIDI Event Builders
// ============================================

/**
 * Build MIDI header chunk
 */
function buildHeaderChunk(format: number, numTracks: number, ticksPerBeat: number): number[] {
    return [
        // "MThd"
        0x4D, 0x54, 0x68, 0x64,
        // Length (always 6)
        0x00, 0x00, 0x00, 0x06,
        // Format
        ...encode16BE(format),
        // Number of tracks
        ...encode16BE(numTracks),
        // Ticks per beat
        ...encode16BE(ticksPerBeat)
    ];
}

/**
 * Build tempo meta event
 */
function buildTempoEvent(bpm: number): number[] {
    const tempoBytes = encodeTempo(bpm);
    return [
        0xFF, 0x51, 0x03, // Meta tempo event, length 3
        ...tempoBytes
    ];
}

/**
 * Build time signature meta event
 */
function buildTimeSignatureEvent(num: number, denom: number): number[] {
    // Denominator is power of 2 (4 = 2^2 = quarter note)
    const denomPow = Math.log2(denom);
    return [
        0xFF, 0x58, 0x04, // Meta time sig, length 4
        num,
        denomPow,
        24, // MIDI clocks per metronome click
        8   // 32nd notes per quarter note
    ];
}

/**
 * Build track name meta event
 */
function buildTrackNameEvent(name: string): number[] {
    const nameBytes = Array.from(new TextEncoder().encode(name.substring(0, 127)));
    return [
        0xFF, 0x03, // Meta track name
        nameBytes.length,
        ...nameBytes
    ];
}

/**
 * Build key signature meta event
 */
function buildKeySignatureEvent(key: string): number[] {
    // Parse key (e.g., "C", "G", "Dm", "Bb")
    const keyMap: Record<string, number> = {
        'Cb': -7, 'Gb': -6, 'Db': -5, 'Ab': -4, 'Eb': -3, 'Bb': -2, 'F': -1,
        'C': 0,
        'G': 1, 'D': 2, 'A': 3, 'E': 4, 'B': 5, 'F#': 6, 'C#': 7
    };

    const isMinor = key.toLowerCase().includes('m') && !key.includes('maj');
    const baseKey = key.replace(/m$|minor$|maj$|major$/i, '').trim();
    const sharpsFlats = keyMap[baseKey] ?? 0;

    return [
        0xFF, 0x59, 0x02, // Meta key signature, length 2
        sharpsFlats & 0xFF, // Signed byte
        isMinor ? 1 : 0
    ];
}

/**
 * Build note on event
 */
function buildNoteOn(channel: number, pitch: number, velocity: number): number[] {
    return [
        0x90 | (channel & 0x0F),
        pitch & 0x7F,
        velocity & 0x7F
    ];
}

/**
 * Build note off event
 */
function buildNoteOff(channel: number, pitch: number): number[] {
    return [
        0x80 | (channel & 0x0F),
        pitch & 0x7F,
        0x00 // Release velocity
    ];
}

/**
 * Build end of track meta event
 */
function buildEndOfTrack(): number[] {
    return [0xFF, 0x2F, 0x00];
}

// ============================================
// Track Builder
// ============================================

interface TrackEvent {
    absoluteTick: number;
    data: number[];
    priority: number; // Lower = earlier for same tick (note-off before note-on)
}

/**
 * Build a complete MIDI track from events
 */
function buildTrack(events: TrackEvent[]): number[] {
    // Sort by absolute tick, then priority
    events.sort((a, b) => {
        if (a.absoluteTick !== b.absoluteTick) {
            return a.absoluteTick - b.absoluteTick;
        }
        return a.priority - b.priority;
    });

    const trackData: number[] = [];
    let lastTick = 0;

    for (const event of events) {
        const deltaTick = event.absoluteTick - lastTick;
        trackData.push(...encodeVLQ(deltaTick));
        trackData.push(...event.data);
        lastTick = event.absoluteTick;
    }

    // Wrap in track chunk
    return [
        // "MTrk"
        0x4D, 0x54, 0x72, 0x6B,
        // Length
        ...encode32BE(trackData.length),
        // Data
        ...trackData
    ];
}

// ============================================
// Drum Lane Export
// ============================================

/**
 * Map a drum sound ID to MIDI note number
 */
export function mapDrumToMidi(drumId: string, pitch?: number): number {
    // If explicit pitch provided, use it
    if (pitch !== undefined && pitch >= 35 && pitch <= 81) {
        return validateNotePitch(pitch);
    }

    // Try to map by ID
    const normalized = drumId.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    return GM_DRUM_MAP[normalized] ?? DEFAULT_DRUM_NOTE;
}

/**
 * Export drum lane notes to MIDI
 */
export function exportDrumLaneToMidi(
    notes: SyncNote[],
    laneSettings: Partial<SyncLaneSettings>,
    options: MidiExportOptions = {}
): MidiExportResult {
    const {
        bpm = 120,
        timeSignatureNum = 4,
        timeSignatureDenom = 4,
        key = 'C',
        trackName = 'Drums',
        quantizeGrid = laneSettings.quantizeGrid ?? 'off'
    } = options;

    const gridTicks = getQuantizeGridTicks(quantizeGrid);
    const isOneShot = laneSettings.noteMode === 'oneShot';

    // Build events
    const events: TrackEvent[] = [];

    // Meta events at tick 0
    events.push({
        absoluteTick: 0,
        data: buildTrackNameEvent(trackName),
        priority: 0
    });
    events.push({
        absoluteTick: 0,
        data: buildTempoEvent(bpm),
        priority: 1
    });
    events.push({
        absoluteTick: 0,
        data: buildTimeSignatureEvent(timeSignatureNum, timeSignatureDenom),
        priority: 2
    });
    events.push({
        absoluteTick: 0,
        data: buildKeySignatureEvent(key),
        priority: 3
    });

    // Convert notes to MIDI events
    let maxTick = 0;

    for (const note of notes) {
        const pitch = validateNotePitch(note.pitch);
        const velocity = validateVelocity(note.velocity);
        const startTicks = quantizeTicks(note.startBeat * MIDI_TICKS_PER_BEAT, gridTicks);

        // Duration: oneShot uses minimum, sustain uses actual duration
        let durationTicks: number;
        if (isOneShot) {
            durationTicks = MIN_ONESHOT_TICKS;
        } else {
            durationTicks = validateDuration(
                note.duration * MIDI_TICKS_PER_BEAT,
                MIN_ONESHOT_TICKS
            );
        }

        const endTicks = startTicks + durationTicks;

        // Note on
        events.push({
            absoluteTick: startTicks,
            data: buildNoteOn(DRUM_CHANNEL, pitch, velocity),
            priority: 10
        });

        // Note off
        events.push({
            absoluteTick: endTicks,
            data: buildNoteOff(DRUM_CHANNEL, pitch),
            priority: 5 // Note off before note on at same tick
        });

        maxTick = Math.max(maxTick, endTicks);
    }

    // End of track (at least 1 beat after last note)
    const endTick = Math.max(maxTick + MIDI_TICKS_PER_BEAT, MIDI_TICKS_PER_BEAT * 4);
    events.push({
        absoluteTick: endTick,
        data: buildEndOfTrack(),
        priority: 100
    });

    // Build MIDI file
    const header = buildHeaderChunk(0, 1, MIDI_TICKS_PER_BEAT); // Format 0, single track
    const track = buildTrack(events);

    const midiData = new Uint8Array([...header, ...track]);

    return {
        data: midiData,
        filename: `${trackName.replace(/[^a-zA-Z0-9-_]/g, '_')}_drums.mid`,
        mimeType: 'audio/midi'
    };
}

// ============================================
// Melody Lane Export
// ============================================

/**
 * Export melody lane notes to MIDI
 */
export function exportMelodyLaneToMidi(
    notes: SyncNote[],
    laneSettings: Partial<SyncLaneSettings>,
    options: MidiExportOptions = {}
): MidiExportResult {
    const {
        bpm = 120,
        timeSignatureNum = 4,
        timeSignatureDenom = 4,
        key = 'C',
        trackName = 'Melody',
        quantizeGrid = laneSettings.quantizeGrid ?? 'off'
    } = options;

    const gridTicks = getQuantizeGridTicks(quantizeGrid);

    // Build events
    const events: TrackEvent[] = [];

    // Meta events at tick 0
    events.push({
        absoluteTick: 0,
        data: buildTrackNameEvent(trackName),
        priority: 0
    });
    events.push({
        absoluteTick: 0,
        data: buildTempoEvent(bpm),
        priority: 1
    });
    events.push({
        absoluteTick: 0,
        data: buildTimeSignatureEvent(timeSignatureNum, timeSignatureDenom),
        priority: 2
    });
    events.push({
        absoluteTick: 0,
        data: buildKeySignatureEvent(key),
        priority: 3
    });

    // Convert notes to MIDI events
    let maxTick = 0;

    for (const note of notes) {
        const pitch = validateNotePitch(note.pitch);
        const velocity = validateVelocity(note.velocity);
        const startTicks = quantizeTicks(note.startBeat * MIDI_TICKS_PER_BEAT, gridTicks);
        const durationTicks = validateDuration(
            note.duration * MIDI_TICKS_PER_BEAT,
            MIDI_TICKS_PER_BEAT / 4 // Minimum 16th note for melody
        );

        const endTicks = startTicks + durationTicks;

        // Note on
        events.push({
            absoluteTick: startTicks,
            data: buildNoteOn(MELODY_CHANNEL, pitch, velocity),
            priority: 10
        });

        // Note off
        events.push({
            absoluteTick: endTicks,
            data: buildNoteOff(MELODY_CHANNEL, pitch),
            priority: 5
        });

        maxTick = Math.max(maxTick, endTicks);
    }

    // End of track
    const endTick = Math.max(maxTick + MIDI_TICKS_PER_BEAT, MIDI_TICKS_PER_BEAT * 4);
    events.push({
        absoluteTick: endTick,
        data: buildEndOfTrack(),
        priority: 100
    });

    // Build MIDI file
    const header = buildHeaderChunk(0, 1, MIDI_TICKS_PER_BEAT);
    const track = buildTrack(events);

    const midiData = new Uint8Array([...header, ...track]);

    return {
        data: midiData,
        filename: `${trackName.replace(/[^a-zA-Z0-9-_]/g, '_')}_melody.mid`,
        mimeType: 'audio/midi'
    };
}

// ============================================
// Chord Export
// ============================================

/**
 * Convert chord numerals to MIDI notes
 */
export function chordToNotes(
    numeral: string,
    rootNote: number,
    duration: number
): SyncNote[] {
    // Map numerals to semitone offsets
    const numeralMap: Record<string, number> = {
        'I': 0, 'i': 0,
        'II': 2, 'ii': 2,
        'III': 4, 'iii': 4,
        'IV': 5, 'iv': 5,
        'V': 7, 'v': 7,
        'VI': 9, 'vi': 9,
        'VII': 11, 'vii': 11,
        'bII': 1, 'bii': 1,
        'bIII': 3, 'biii': 3,
        'bVI': 8, 'bvi': 8,
        'bVII': 10, 'bvii': 10,
    };

    const isMinor = numeral === numeral.toLowerCase();
    const baseNumeral = numeral.replace(/b/g, '').toUpperCase();
    const offset = numeralMap[numeral] ?? numeralMap[baseNumeral] ?? 0;
    const chordRoot = rootNote + offset;

    // Build triad
    const notes: SyncNote[] = [];
    const third = isMinor ? 3 : 4;
    const fifth = 7;

    notes.push({ pitch: chordRoot, startBeat: 0, duration, velocity: 80 });
    notes.push({ pitch: chordRoot + third, startBeat: 0, duration, velocity: 75 });
    notes.push({ pitch: chordRoot + fifth, startBeat: 0, duration, velocity: 75 });

    return notes;
}

/**
 * Export chord progression to MIDI
 */
export function exportChordsToMidi(
    numerals: string[],
    durations: number[],
    options: MidiExportOptions & { rootNote?: number } = {}
): MidiExportResult {
    const {
        bpm = 120,
        timeSignatureNum = 4,
        timeSignatureDenom = 4,
        key = 'C',
        trackName = 'Chords',
        rootNote = 48 // C3
    } = options;

    // Build note list from chords
    const allNotes: SyncNote[] = [];
    let currentBeat = 0;

    for (let i = 0; i < numerals.length; i++) {
        const chordDuration = durations[i] ?? 4; // Default 4 beats
        const chordNotes = chordToNotes(numerals[i], rootNote, chordDuration);

        for (const note of chordNotes) {
            allNotes.push({
                ...note,
                startBeat: currentBeat + note.startBeat
            });
        }

        currentBeat += chordDuration;
    }

    // Use melody export for the notes
    return exportMelodyLaneToMidi(allNotes, {}, {
        ...options,
        trackName,
        bpm,
        timeSignatureNum,
        timeSignatureDenom,
        key
    });
}

// ============================================
// Multi-Lane Export
// ============================================

export interface LaneExportInput {
    type: LaneTemplateType;
    name: string;
    notes: SyncNote[];
    laneSettings: Partial<SyncLaneSettings>;
}

/**
 * Export multiple lanes to a single MIDI file (Format 1)
 */
export function exportLanesToMidi(
    lanes: LaneExportInput[],
    options: MidiExportOptions = {}
): MidiExportResult {
    const {
        bpm = 120,
        timeSignatureNum = 4,
        timeSignatureDenom = 4,
        key = 'C',
        trackName = 'Lane Export'
    } = options;

    const tracks: number[][] = [];

    // Track 0: Tempo/time sig only (conductor track)
    const conductorEvents: TrackEvent[] = [
        { absoluteTick: 0, data: buildTrackNameEvent(trackName), priority: 0 },
        { absoluteTick: 0, data: buildTempoEvent(bpm), priority: 1 },
        { absoluteTick: 0, data: buildTimeSignatureEvent(timeSignatureNum, timeSignatureDenom), priority: 2 },
        { absoluteTick: 0, data: buildKeySignatureEvent(key), priority: 3 },
        { absoluteTick: MIDI_TICKS_PER_BEAT * 4, data: buildEndOfTrack(), priority: 100 }
    ];
    tracks.push(buildTrack(conductorEvents));

    // One track per lane
    let maxTick = 0;
    for (let i = 0; i < lanes.length; i++) {
        const lane = lanes[i];
        const channel = lane.type === 'drums' ? DRUM_CHANNEL : (i % 9); // Avoid channel 10 for non-drums
        const gridTicks = getQuantizeGridTicks(lane.laneSettings.quantizeGrid ?? 'off');
        const isOneShot = lane.type === 'drums' && lane.laneSettings.noteMode === 'oneShot';

        const events: TrackEvent[] = [
            { absoluteTick: 0, data: buildTrackNameEvent(lane.name), priority: 0 }
        ];

        for (const note of lane.notes) {
            const pitch = validateNotePitch(note.pitch);
            const velocity = validateVelocity(note.velocity);
            const startTicks = quantizeTicks(note.startBeat * MIDI_TICKS_PER_BEAT, gridTicks);

            let durationTicks: number;
            if (isOneShot) {
                durationTicks = MIN_ONESHOT_TICKS;
            } else {
                durationTicks = validateDuration(note.duration * MIDI_TICKS_PER_BEAT, MIDI_TICKS_PER_BEAT / 8);
            }

            const endTicks = startTicks + durationTicks;

            events.push({
                absoluteTick: startTicks,
                data: buildNoteOn(channel, pitch, velocity),
                priority: 10
            });
            events.push({
                absoluteTick: endTicks,
                data: buildNoteOff(channel, pitch),
                priority: 5
            });

            maxTick = Math.max(maxTick, endTicks);
        }

        const endTick = Math.max(maxTick + MIDI_TICKS_PER_BEAT, MIDI_TICKS_PER_BEAT * 4);
        events.push({ absoluteTick: endTick, data: buildEndOfTrack(), priority: 100 });

        tracks.push(buildTrack(events));
    }

    // Build header (Format 1 = multi-track)
    const header = buildHeaderChunk(1, tracks.length, MIDI_TICKS_PER_BEAT);

    // Combine all chunks
    const allBytes: number[] = [...header];
    for (const track of tracks) {
        allBytes.push(...track);
    }

    return {
        data: new Uint8Array(allBytes),
        filename: `${trackName.replace(/[^a-zA-Z0-9-_]/g, '_')}.mid`,
        mimeType: 'audio/midi'
    };
}

// ============================================
// Download Helper
// ============================================

/**
 * Trigger a file download in the browser
 */
export function downloadMidi(result: MidiExportResult): void {
    const blob = new Blob([result.data.buffer], { type: result.mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = result.filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}


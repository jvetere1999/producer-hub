/**
 * Unit tests for MIDI Export Module
 *
 * Tests MIDI header/track structure, delta-time ordering, note encoding,
 * and validation of ranges/velocities/durations.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    // Constants
    MIDI_TICKS_PER_BEAT,
    MIN_ONESHOT_TICKS,
    DRUM_CHANNEL,
    MELODY_CHANNEL,
    GM_DRUM_MAP,
    // Validation
    validateNotePitch,
    validateVelocity,
    validateDuration,
    // Quantization
    getQuantizeGridTicks,
    quantizeTicks,
    // VLQ encoding
    encodeVLQ,
    // Drum mapping
    mapDrumToMidi,
    // Export functions
    exportDrumLaneToMidi,
    exportMelodyLaneToMidi,
    exportChordsToMidi,
    exportLanesToMidi,
    chordToNotes,
    // Types
    type MidiExportResult,
} from '../midiExport';
import type { SyncNote } from '../vaultTypes';

// ============================================
// Helper Functions
// ============================================

/**
 * Parse MIDI header from bytes
 */
function parseMidiHeader(data: Uint8Array): {
    format: number;
    numTracks: number;
    ticksPerBeat: number;
} | null {
    if (data.length < 14) return null;

    // Check "MThd"
    if (data[0] !== 0x4D || data[1] !== 0x54 || data[2] !== 0x68 || data[3] !== 0x64) {
        return null;
    }

    const format = (data[8] << 8) | data[9];
    const numTracks = (data[10] << 8) | data[11];
    const ticksPerBeat = (data[12] << 8) | data[13];

    return { format, numTracks, ticksPerBeat };
}

/**
 * Find track chunks in MIDI data
 */
function findTrackChunks(data: Uint8Array): { offset: number; length: number }[] {
    const tracks: { offset: number; length: number }[] = [];
    let offset = 14; // Skip header

    while (offset < data.length - 8) {
        // Check for "MTrk"
        if (data[offset] === 0x4D && data[offset + 1] === 0x54 &&
            data[offset + 2] === 0x72 && data[offset + 3] === 0x6B) {
            const length = (data[offset + 4] << 24) | (data[offset + 5] << 16) |
                (data[offset + 6] << 8) | data[offset + 7];
            tracks.push({ offset: offset + 8, length });
            offset += 8 + length;
        } else {
            break;
        }
    }

    return tracks;
}

/**
 * Extract note events from track data
 */
function extractNoteEvents(data: Uint8Array, trackOffset: number, trackLength: number): {
    type: 'on' | 'off';
    channel: number;
    pitch: number;
    velocity: number;
    absoluteTick: number;
}[] {
    const events: {
        type: 'on' | 'off';
        channel: number;
        pitch: number;
        velocity: number;
        absoluteTick: number;
    }[] = [];

    let offset = trackOffset;
    let absoluteTick = 0;
    const endOffset = trackOffset + trackLength;

    while (offset < endOffset) {
        // Read VLQ delta time
        let delta = 0;
        while (offset < endOffset) {
            const byte = data[offset++];
            delta = (delta << 7) | (byte & 0x7F);
            if ((byte & 0x80) === 0) break;
        }
        absoluteTick += delta;

        if (offset >= endOffset) break;

        const status = data[offset++];

        // Meta event
        if (status === 0xFF) {
            if (offset >= endOffset) break;
            const type = data[offset++];
            if (offset >= endOffset) break;

            // Read length
            let length = 0;
            while (offset < endOffset) {
                const byte = data[offset++];
                length = (length << 7) | (byte & 0x7F);
                if ((byte & 0x80) === 0) break;
            }

            offset += length; // Skip data
            continue;
        }

        // Note on (0x9n)
        if ((status & 0xF0) === 0x90) {
            const channel = status & 0x0F;
            const pitch = data[offset++];
            const velocity = data[offset++];
            events.push({
                type: velocity > 0 ? 'on' : 'off',
                channel,
                pitch,
                velocity,
                absoluteTick
            });
            continue;
        }

        // Note off (0x8n)
        if ((status & 0xF0) === 0x80) {
            const channel = status & 0x0F;
            const pitch = data[offset++];
            const velocity = data[offset++];
            events.push({
                type: 'off',
                channel,
                pitch,
                velocity: 0,
                absoluteTick
            });
            continue;
        }

        // Other events - skip (simplified parsing)
        if ((status & 0x80) !== 0) {
            // Skip 2 bytes for most channel messages
            offset += 2;
        }
    }

    return events;
}

// ============================================
// Validation Tests
// ============================================

describe('MIDI Export - Validation', () => {
    it('validates note pitch within 0-127 range', () => {
        expect(validateNotePitch(60)).toBe(60);
        expect(validateNotePitch(0)).toBe(0);
        expect(validateNotePitch(127)).toBe(127);
        expect(validateNotePitch(-1)).toBe(0);
        expect(validateNotePitch(128)).toBe(127);
        expect(validateNotePitch(NaN)).toBe(60);
        expect(validateNotePitch(Infinity)).toBe(127);
    });

    it('validates velocity within 1-127 range', () => {
        expect(validateVelocity(100)).toBe(100);
        expect(validateVelocity(1)).toBe(1);
        expect(validateVelocity(127)).toBe(127);
        expect(validateVelocity(0)).toBe(1);
        expect(validateVelocity(128)).toBe(127);
        expect(validateVelocity(NaN)).toBe(100);
    });

    it('validates duration with minimum', () => {
        expect(validateDuration(100, 10)).toBe(100);
        expect(validateDuration(5, 10)).toBe(10);
        expect(validateDuration(NaN, 10)).toBe(10);
        expect(validateDuration(-5, 10)).toBe(10);
    });
});

// ============================================
// Quantization Tests
// ============================================

describe('MIDI Export - Quantization', () => {
    it('calculates correct grid ticks', () => {
        expect(getQuantizeGridTicks('1/4')).toBe(MIDI_TICKS_PER_BEAT);
        expect(getQuantizeGridTicks('1/8')).toBe(MIDI_TICKS_PER_BEAT / 2);
        expect(getQuantizeGridTicks('1/16')).toBe(MIDI_TICKS_PER_BEAT / 4);
        expect(getQuantizeGridTicks('1/32')).toBe(MIDI_TICKS_PER_BEAT / 8);
        expect(getQuantizeGridTicks('off')).toBe(1);
    });

    it('quantizes tick values correctly', () => {
        const grid = MIDI_TICKS_PER_BEAT; // Quarter note
        expect(quantizeTicks(0, grid)).toBe(0);
        expect(quantizeTicks(240, grid)).toBe(480); // Rounds up
        expect(quantizeTicks(239, grid)).toBe(0);   // Rounds down
        expect(quantizeTicks(480, grid)).toBe(480);
    });
});

// ============================================
// VLQ Encoding Tests
// ============================================

describe('MIDI Export - VLQ Encoding', () => {
    it('encodes single-byte values', () => {
        expect(encodeVLQ(0)).toEqual([0x00]);
        expect(encodeVLQ(0x7F)).toEqual([0x7F]);
    });

    it('encodes two-byte values', () => {
        expect(encodeVLQ(0x80)).toEqual([0x81, 0x00]);
        expect(encodeVLQ(0x3FFF)).toEqual([0xFF, 0x7F]);
    });

    it('encodes three-byte values', () => {
        expect(encodeVLQ(0x4000)).toEqual([0x81, 0x80, 0x00]);
    });

    it('handles common tick values', () => {
        // 480 ticks (1 beat at 480 PPQN)
        expect(encodeVLQ(480)).toEqual([0x83, 0x60]);
        // 960 ticks (2 beats)
        expect(encodeVLQ(960)).toEqual([0x87, 0x40]);
    });
});

// ============================================
// Drum Mapping Tests
// ============================================

describe('MIDI Export - Drum Mapping', () => {
    it('maps known drum sounds to GM notes', () => {
        expect(mapDrumToMidi('kick')).toBe(36);
        expect(mapDrumToMidi('snare')).toBe(38);
        expect(mapDrumToMidi('hihat-closed')).toBe(42);
        expect(mapDrumToMidi('hihat-open')).toBe(46);
        expect(mapDrumToMidi('crash')).toBe(49);
        expect(mapDrumToMidi('ride')).toBe(51);
    });

    it('uses explicit pitch when provided', () => {
        expect(mapDrumToMidi('custom', 50)).toBe(50);
        expect(mapDrumToMidi('kick', 41)).toBe(41);
    });

    it('falls back to default for unknown sounds', () => {
        expect(mapDrumToMidi('unknown-sound')).toBe(36);
        expect(mapDrumToMidi('')).toBe(36);
    });
});

// ============================================
// Chord Export Tests
// ============================================

describe('MIDI Export - Chord Conversion', () => {
    it('converts major chord numerals', () => {
        const notes = chordToNotes('I', 60, 4); // C major at C4
        expect(notes).toHaveLength(3);
        expect(notes[0].pitch).toBe(60); // Root
        expect(notes[1].pitch).toBe(64); // Major third
        expect(notes[2].pitch).toBe(67); // Fifth
    });

    it('converts minor chord numerals', () => {
        const notes = chordToNotes('vi', 60, 4); // Am at C4
        // vi = 9 semitones up from root = A
        expect(notes[0].pitch).toBe(69); // A
        expect(notes[1].pitch).toBe(72); // Minor third (3 semitones)
        expect(notes[2].pitch).toBe(76); // Fifth
    });

    it('sets duration for all notes', () => {
        const notes = chordToNotes('IV', 60, 2);
        expect(notes[0].duration).toBe(2);
        expect(notes[1].duration).toBe(2);
        expect(notes[2].duration).toBe(2);
    });
});

// ============================================
// Drum Lane Export Tests
// ============================================

describe('MIDI Export - Drum Lane', () => {
    const testNotes: SyncNote[] = [
        { pitch: 36, startBeat: 0, duration: 0.5, velocity: 100 },
        { pitch: 38, startBeat: 1, duration: 0.25, velocity: 90 },
        { pitch: 42, startBeat: 2, duration: 0.125, velocity: 80 },
    ];

    it('exports valid MIDI file structure', () => {
        const result = exportDrumLaneToMidi(testNotes, {});

        expect(result.data).toBeInstanceOf(Uint8Array);
        expect(result.data.length).toBeGreaterThan(14);
        expect(result.mimeType).toBe('audio/midi');
        expect(result.filename).toContain('.mid');

        const header = parseMidiHeader(result.data);
        expect(header).not.toBeNull();
        expect(header!.format).toBe(0);
        expect(header!.numTracks).toBe(1);
        expect(header!.ticksPerBeat).toBe(MIDI_TICKS_PER_BEAT);
    });

    it('uses drum channel (channel 10)', () => {
        const result = exportDrumLaneToMidi(testNotes, {});
        const tracks = findTrackChunks(result.data);
        expect(tracks.length).toBe(1);

        const events = extractNoteEvents(result.data, tracks[0].offset, tracks[0].length);
        const noteOns = events.filter(e => e.type === 'on');

        expect(noteOns.length).toBe(3);
        expect(noteOns.every(e => e.channel === DRUM_CHANNEL)).toBe(true);
    });

    it('uses minimum duration for oneShot mode', () => {
        const result = exportDrumLaneToMidi(testNotes, { noteMode: 'oneShot' });
        const tracks = findTrackChunks(result.data);
        const events = extractNoteEvents(result.data, tracks[0].offset, tracks[0].length);

        // Check note durations (off - on tick)
        const noteOns = events.filter(e => e.type === 'on' && e.pitch === 36);
        const noteOffs = events.filter(e => e.type === 'off' && e.pitch === 36);

        expect(noteOns.length).toBe(1);
        expect(noteOffs.length).toBe(1);

        const duration = noteOffs[0].absoluteTick - noteOns[0].absoluteTick;
        expect(duration).toBe(MIN_ONESHOT_TICKS);
    });

    it('preserves actual duration for sustain mode', () => {
        const result = exportDrumLaneToMidi(testNotes, { noteMode: 'sustain' });
        const tracks = findTrackChunks(result.data);
        const events = extractNoteEvents(result.data, tracks[0].offset, tracks[0].length);

        const noteOns = events.filter(e => e.type === 'on' && e.pitch === 36);
        const noteOffs = events.filter(e => e.type === 'off' && e.pitch === 36);

        const duration = noteOffs[0].absoluteTick - noteOns[0].absoluteTick;
        expect(duration).toBe(0.5 * MIDI_TICKS_PER_BEAT); // 0.5 beats
    });

    it('orders note-off before note-on at same tick', () => {
        const overlappingNotes: SyncNote[] = [
            { pitch: 36, startBeat: 0, duration: 1, velocity: 100 },
            { pitch: 36, startBeat: 1, duration: 1, velocity: 100 }, // Starts when first ends
        ];

        const result = exportDrumLaneToMidi(overlappingNotes, { noteMode: 'sustain' });
        const tracks = findTrackChunks(result.data);
        const events = extractNoteEvents(result.data, tracks[0].offset, tracks[0].length);

        // At tick 480 (beat 1), note-off should come before note-on
        const eventsAtTick480 = events.filter(e => e.absoluteTick === MIDI_TICKS_PER_BEAT);
        expect(eventsAtTick480.length).toBe(2);
        expect(eventsAtTick480[0].type).toBe('off');
        expect(eventsAtTick480[1].type).toBe('on');
    });

    it('includes tempo meta event', () => {
        const result = exportDrumLaneToMidi(testNotes, {}, { bpm: 140 });

        // Check for tempo meta (0xFF 0x51 0x03)
        let foundTempo = false;
        for (let i = 0; i < result.data.length - 6; i++) {
            if (result.data[i] === 0xFF && result.data[i + 1] === 0x51 && result.data[i + 2] === 0x03) {
                foundTempo = true;
                const tempo = (result.data[i + 3] << 16) | (result.data[i + 4] << 8) | result.data[i + 5];
                const bpm = Math.round(60000000 / tempo);
                expect(bpm).toBe(140);
                break;
            }
        }
        expect(foundTempo).toBe(true);
    });
});

// ============================================
// Melody Lane Export Tests
// ============================================

describe('MIDI Export - Melody Lane', () => {
    const testNotes: SyncNote[] = [
        { pitch: 60, startBeat: 0, duration: 1, velocity: 100 },
        { pitch: 64, startBeat: 1, duration: 0.5, velocity: 90 },
        { pitch: 67, startBeat: 1.5, duration: 0.5, velocity: 85 },
    ];

    it('exports valid MIDI file structure', () => {
        const result = exportMelodyLaneToMidi(testNotes, {});

        expect(result.data).toBeInstanceOf(Uint8Array);
        const header = parseMidiHeader(result.data);
        expect(header).not.toBeNull();
        expect(header!.format).toBe(0);
        expect(header!.numTracks).toBe(1);
    });

    it('uses melody channel (channel 1)', () => {
        const result = exportMelodyLaneToMidi(testNotes, {});
        const tracks = findTrackChunks(result.data);
        const events = extractNoteEvents(result.data, tracks[0].offset, tracks[0].length);
        const noteOns = events.filter(e => e.type === 'on');

        expect(noteOns.every(e => e.channel === MELODY_CHANNEL)).toBe(true);
    });

    it('preserves note pitches correctly', () => {
        const result = exportMelodyLaneToMidi(testNotes, {});
        const tracks = findTrackChunks(result.data);
        const events = extractNoteEvents(result.data, tracks[0].offset, tracks[0].length);
        const noteOns = events.filter(e => e.type === 'on');

        expect(noteOns.map(e => e.pitch)).toEqual([60, 64, 67]);
    });

    it('preserves note velocities', () => {
        const result = exportMelodyLaneToMidi(testNotes, {});
        const tracks = findTrackChunks(result.data);
        const events = extractNoteEvents(result.data, tracks[0].offset, tracks[0].length);
        const noteOns = events.filter(e => e.type === 'on');

        expect(noteOns[0].velocity).toBe(100);
        expect(noteOns[1].velocity).toBe(90);
        expect(noteOns[2].velocity).toBe(85);
    });

    it('calculates correct delta times', () => {
        const result = exportMelodyLaneToMidi(testNotes, {});
        const tracks = findTrackChunks(result.data);
        const events = extractNoteEvents(result.data, tracks[0].offset, tracks[0].length);
        const noteOns = events.filter(e => e.type === 'on');

        expect(noteOns[0].absoluteTick).toBe(0);
        expect(noteOns[1].absoluteTick).toBe(MIDI_TICKS_PER_BEAT); // Beat 1
        expect(noteOns[2].absoluteTick).toBe(MIDI_TICKS_PER_BEAT * 1.5); // Beat 1.5
    });

    it('applies quantization when specified', () => {
        const unevenNotes: SyncNote[] = [
            { pitch: 60, startBeat: 0.1, duration: 1, velocity: 100 }, // Slightly off grid
            { pitch: 64, startBeat: 0.9, duration: 1, velocity: 100 }, // Should round to 1
        ];

        const result = exportMelodyLaneToMidi(unevenNotes, { quantizeGrid: '1/4' });
        const tracks = findTrackChunks(result.data);
        const events = extractNoteEvents(result.data, tracks[0].offset, tracks[0].length);
        const noteOns = events.filter(e => e.type === 'on');

        expect(noteOns[0].absoluteTick).toBe(0); // Quantized to 0
        expect(noteOns[1].absoluteTick).toBe(MIDI_TICKS_PER_BEAT); // Quantized to 1 beat
    });
});

// ============================================
// Multi-Lane Export Tests
// ============================================

describe('MIDI Export - Multi-Lane', () => {
    it('exports Format 1 MIDI with multiple tracks', () => {
        const lanes = [
            {
                type: 'drums' as const,
                name: 'Drums',
                notes: [{ pitch: 36, startBeat: 0, duration: 0.5, velocity: 100 }],
                laneSettings: {}
            },
            {
                type: 'melody' as const,
                name: 'Lead',
                notes: [{ pitch: 60, startBeat: 0, duration: 1, velocity: 100 }],
                laneSettings: {}
            }
        ];

        const result = exportLanesToMidi(lanes, { trackName: 'Multi-Lane Test' });
        const header = parseMidiHeader(result.data);

        expect(header).not.toBeNull();
        expect(header!.format).toBe(1); // Multi-track
        expect(header!.numTracks).toBe(3); // Conductor + 2 lanes
    });

    it('includes conductor track with tempo', () => {
        const lanes = [
            {
                type: 'melody' as const,
                name: 'Test',
                notes: [{ pitch: 60, startBeat: 0, duration: 1, velocity: 100 }],
                laneSettings: {}
            }
        ];

        const result = exportLanesToMidi(lanes, { bpm: 160 });

        // Check for tempo meta event
        let foundTempo = false;
        for (let i = 0; i < result.data.length - 6; i++) {
            if (result.data[i] === 0xFF && result.data[i + 1] === 0x51 && result.data[i + 2] === 0x03) {
                foundTempo = true;
                break;
            }
        }
        expect(foundTempo).toBe(true);
    });

    it('assigns correct channels per lane type', () => {
        const lanes = [
            {
                type: 'drums' as const,
                name: 'Drums',
                notes: [{ pitch: 36, startBeat: 0, duration: 0.5, velocity: 100 }],
                laneSettings: {}
            },
            {
                type: 'melody' as const,
                name: 'Lead',
                notes: [{ pitch: 60, startBeat: 0, duration: 1, velocity: 100 }],
                laneSettings: {}
            }
        ];

        const result = exportLanesToMidi(lanes);
        const tracks = findTrackChunks(result.data);

        // Skip conductor track (tracks[0])
        const drumEvents = extractNoteEvents(result.data, tracks[1].offset, tracks[1].length);
        const melodyEvents = extractNoteEvents(result.data, tracks[2].offset, tracks[2].length);

        expect(drumEvents.filter(e => e.type === 'on')[0].channel).toBe(DRUM_CHANNEL);
        expect(melodyEvents.filter(e => e.type === 'on')[0].channel).toBe(0); // Channel 1
    });
});

// ============================================
// Security Tests
// ============================================

describe('MIDI Export - Security', () => {
    it('sanitizes out-of-range pitch values', () => {
        const badNotes: SyncNote[] = [
            { pitch: 200, startBeat: 0, duration: 1, velocity: 100 }, // Too high
            { pitch: -10, startBeat: 1, duration: 1, velocity: 100 }, // Negative
        ];

        const result = exportMelodyLaneToMidi(badNotes, {});
        const tracks = findTrackChunks(result.data);
        const events = extractNoteEvents(result.data, tracks[0].offset, tracks[0].length);
        const noteOns = events.filter(e => e.type === 'on');

        expect(noteOns[0].pitch).toBe(127); // Clamped to max
        expect(noteOns[1].pitch).toBe(0);   // Clamped to min
    });

    it('sanitizes out-of-range velocity values', () => {
        const badNotes: SyncNote[] = [
            { pitch: 60, startBeat: 0, duration: 1, velocity: 200 }, // Too high
            { pitch: 60, startBeat: 1, duration: 1, velocity: 0 },   // Zero
        ];

        const result = exportMelodyLaneToMidi(badNotes, {});
        const tracks = findTrackChunks(result.data);
        const events = extractNoteEvents(result.data, tracks[0].offset, tracks[0].length);
        const noteOns = events.filter(e => e.type === 'on');

        expect(noteOns[0].velocity).toBe(127);
        expect(noteOns[1].velocity).toBe(1); // Minimum
    });

    it('handles empty note array gracefully', () => {
        const result = exportMelodyLaneToMidi([], {});

        expect(result.data).toBeInstanceOf(Uint8Array);
        const header = parseMidiHeader(result.data);
        expect(header).not.toBeNull();
    });

    it('handles NaN values in notes', () => {
        const badNotes: SyncNote[] = [
            { pitch: NaN, startBeat: NaN, duration: NaN, velocity: NaN },
        ];

        // Should not throw
        expect(() => exportMelodyLaneToMidi(badNotes, {})).not.toThrow();

        const result = exportMelodyLaneToMidi(badNotes, {});
        expect(result.data).toBeInstanceOf(Uint8Array);
    });
});

// ============================================
// Export Result Tests
// ============================================

describe('MIDI Export - Result Structure', () => {
    it('generates appropriate filename for drums', () => {
        const result = exportDrumLaneToMidi([], {}, { trackName: 'My Drums' });
        expect(result.filename).toBe('My_Drums_drums.mid');
    });

    it('generates appropriate filename for melody', () => {
        const result = exportMelodyLaneToMidi([], {}, { trackName: 'Lead Synth' });
        expect(result.filename).toBe('Lead_Synth_melody.mid');
    });

    it('sanitizes special characters in filename', () => {
        const result = exportMelodyLaneToMidi([], {}, { trackName: 'My Song #1 (Final)' });
        expect(result.filename).not.toContain('#');
        expect(result.filename).not.toContain('(');
        expect(result.filename).not.toContain(')');
    });

    it('returns correct MIME type', () => {
        const result = exportMelodyLaneToMidi([], {});
        expect(result.mimeType).toBe('audio/midi');
    });
});


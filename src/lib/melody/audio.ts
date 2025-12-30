/**
 * Simple Audio Engine for Melody Templater
 *
 * Uses Web Audio API to generate and play notes.
 * No external dependencies.
 */

let audioContext: AudioContext | null = null;

/**
 * Get or create the audio context (must be called after user interaction)
 */
export function getAudioContext(): AudioContext {
    if (!audioContext) {
        audioContext = new AudioContext();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    return audioContext;
}

/**
 * Convert MIDI note number to frequency (Hz)
 */
export function midiToFrequency(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
}

export type InstrumentType = 'triangle' | 'grand-piano' | 'electric-piano' | 'synth-lead' | 'synth-pad' | 'bass' | 'drum';

/**
 * Play a soft grand piano note
 * Uses multiple detuned oscillators with a piano-like envelope
 */
export function playPianoNote(
    pitch: number,
    duration: number = 0.5,
    velocity: number = 100
): void {
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;
        const freq = midiToFrequency(pitch);
        const vol = (velocity / 127) * 0.25;

        // Create master gain
        const masterGain = ctx.createGain();
        masterGain.connect(ctx.destination);

        // Piano-like envelope - soft attack, gradual decay
        masterGain.gain.setValueAtTime(0, now);
        masterGain.gain.linearRampToValueAtTime(vol, now + 0.008); // Soft attack
        masterGain.gain.exponentialRampToValueAtTime(vol * 0.6, now + 0.15); // Initial decay
        masterGain.gain.exponentialRampToValueAtTime(vol * 0.3, now + duration * 0.5); // Sustain decay
        masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration + 0.3); // Release

        // Lowpass filter for warmth
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(Math.min(freq * 6, 8000), now);
        filter.frequency.exponentialRampToValueAtTime(Math.min(freq * 2, 3000), now + duration);
        filter.Q.value = 0.5;
        filter.connect(masterGain);

        // Fundamental with sine wave
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(freq, now);

        const gain1 = ctx.createGain();
        gain1.gain.value = 0.5;
        osc1.connect(gain1);
        gain1.connect(filter);

        // 2nd harmonic (octave)
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq * 2, now);

        const gain2 = ctx.createGain();
        gain2.gain.setValueAtTime(0.25, now);
        gain2.gain.exponentialRampToValueAtTime(0.05, now + duration * 0.3);
        osc2.connect(gain2);
        gain2.connect(filter);

        // 3rd harmonic for brightness
        const osc3 = ctx.createOscillator();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(freq * 3, now);

        const gain3 = ctx.createGain();
        gain3.gain.setValueAtTime(0.1, now);
        gain3.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.2);
        osc3.connect(gain3);
        gain3.connect(filter);

        // Slightly detuned oscillator for richness
        const osc4 = ctx.createOscillator();
        osc4.type = 'sine';
        osc4.frequency.setValueAtTime(freq * 1.002, now); // Slight detune

        const gain4 = ctx.createGain();
        gain4.gain.value = 0.15;
        osc4.connect(gain4);
        gain4.connect(filter);

        // Start and stop
        const stopTime = now + duration + 0.5;
        [osc1, osc2, osc3, osc4].forEach(osc => {
            osc.start(now);
            osc.stop(stopTime);
        });
    } catch (e) {
        console.warn('Piano playback failed:', e);
    }
}

/**
 * Play a drum sound
 */
export function playDrumSound(
    drumPitch: number,
    velocity: number = 100
): void {
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;
        const vol = (velocity / 127) * 0.4;

        switch (drumPitch) {
            case 36: // Kick
                playKick(ctx, now, vol);
                break;
            case 38: // Snare
            case 40:
                playSnare(ctx, now, vol);
                break;
            case 37: // Rim
            case 39: // Clap
                playClap(ctx, now, vol);
                break;
            case 42: // Closed hi-hat
            case 44:
                playHiHat(ctx, now, vol, 0.08);
                break;
            case 46: // Open hi-hat
                playHiHat(ctx, now, vol, 0.3);
                break;
            case 49: // Crash
            case 52:
            case 55:
                playCymbal(ctx, now, vol, 0.8);
                break;
            case 51: // Ride
            case 53:
                playCymbal(ctx, now, vol, 0.4);
                break;
            default:
                // Generic tom/percussion
                playTom(ctx, now, vol, drumPitch);
        }
    } catch (e) {
        console.warn('Drum playback failed:', e);
    }
}

function playKick(ctx: AudioContext, now: number, vol: number): void {
    // Sine wave with pitch envelope for punch
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.5);

    // Add click transient
    const click = ctx.createOscillator();
    click.type = 'square';
    click.frequency.value = 80;

    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(vol * 0.3, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

    click.connect(clickGain);
    clickGain.connect(ctx.destination);

    click.start(now);
    click.stop(now + 0.05);
}

function playSnare(ctx: AudioContext, now: number, vol: number): void {
    // Noise for snare body
    const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 2000;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(vol * 0.6, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.2);

    // Tone body
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.05);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(vol * 0.4, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
}

function playClap(ctx: AudioContext, now: number, vol: number): void {
    // Multiple noise bursts
    for (let i = 0; i < 3; i++) {
        const delay = i * 0.01;
        const bufferSize = ctx.sampleRate * 0.05;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let j = 0; j < bufferSize; j++) {
            data[j] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2500;
        filter.Q.value = 1;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(vol * 0.4, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.1);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        noise.start(now + delay);
        noise.stop(now + delay + 0.15);
    }
}

function playHiHat(ctx: AudioContext, now: number, vol: number, decay: number): void {
    const bufferSize = ctx.sampleRate * decay;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + decay);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + decay + 0.1);
}

function playCymbal(ctx: AudioContext, now: number, vol: number, decay: number): void {
    const bufferSize = ctx.sampleRate * decay;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 5000;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + decay);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + decay + 0.1);
}

function playTom(ctx: AudioContext, now: number, vol: number, pitch: number): void {
    // Map pitch to frequency (higher MIDI = higher tom)
    const baseFreq = 80 + (pitch - 41) * 15;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 1.5, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.1);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
}

/**
 * Play a single note with the given MIDI pitch
 */
export function playNote(
    pitch: number,
    duration: number = 0.3,
    velocity: number = 100,
    instrument: InstrumentType = 'grand-piano'
): void {
    if (instrument === 'grand-piano') {
        playPianoNote(pitch, duration, velocity);
        return;
    }

    if (instrument === 'drum') {
        playDrumSound(pitch, velocity);
        return;
    }

    // Original simple synth for other types
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        const waveform: OscillatorType = instrument === 'synth-lead' ? 'sawtooth'
            : instrument === 'synth-pad' ? 'sine'
            : instrument === 'bass' ? 'sawtooth'
            : 'triangle';

        // Create oscillator
        const osc = ctx.createOscillator();
        osc.type = waveform;
        osc.frequency.setValueAtTime(midiToFrequency(pitch), now);

        // Create gain for envelope
        const gain = ctx.createGain();
        const vol = (velocity / 127) * 0.3;

        // ADSR-ish envelope
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(vol * 0.7, now + 0.1);
        gain.gain.setValueAtTime(vol * 0.7, now + duration - 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + duration + 0.1);
    } catch (e) {
        console.warn('Audio playback failed:', e);
    }
}

/**
 * Play a chord (multiple notes)
 */
export function playChord(
    pitches: number[],
    duration: number = 0.5,
    velocity: number = 80
): void {
    // Reduce velocity for chords to prevent clipping
    const chordVelocity = Math.floor(velocity / Math.sqrt(pitches.length));
    pitches.forEach(pitch => {
        playNote(pitch, duration, chordVelocity, 'triangle');
    });
}

/**
 * Play a metronome click
 */
export function playClick(isDownbeat: boolean = false): void {
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(isDownbeat ? 1000 : 800, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.1);
    } catch (e) {
        // Ignore audio errors
    }
}

/**
 * Schedule notes for playback at specific times
 */
export function scheduleNotes(
    notes: Array<{ pitch: number; startTime: number; duration: number; velocity: number }>,
    bpm: number,
    startTime: number = 0
): void {
    const ctx = getAudioContext();
    const secondsPerBeat = 60 / bpm;
    const baseTime = ctx.currentTime + startTime;

    notes.forEach(note => {
        const noteStartTime = baseTime + note.startTime * secondsPerBeat;
        const noteDuration = note.duration * secondsPerBeat;

        // Schedule the note
        setTimeout(() => {
            playNote(note.pitch, noteDuration, note.velocity);
        }, (noteStartTime - ctx.currentTime) * 1000);
    });
}


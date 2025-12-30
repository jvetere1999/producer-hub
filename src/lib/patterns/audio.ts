/**
 * Drum Audio Synthesis
 *
 * Simple WebAudio-based drum synthesis for pattern playback.
 * Implements basic kick, snare, and hi-hat sounds.
 */

let audioContext: AudioContext | null = null;
let isAudioEnabled = false;

/**
 * Initialize audio context (must be called after user gesture)
 */
export function initAudio(): boolean {
    if (audioContext) {
        return true;
    }

    // Check for WebAudio API support
    if (typeof window === 'undefined' || (!window.AudioContext && !(window as any).webkitAudioContext)) {
        console.error('Browser does not support WebAudio API');
        return false;
    }

    try {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        isAudioEnabled = true;
        return true;
    } catch (e) {
        console.error('Failed to initialize audio:', e);
        return false;
    }
}

/**
 * Check if audio is ready
 */
export function isAudioReady(): boolean {
    return isAudioEnabled && audioContext !== null && audioContext.state === 'running';
}

/**
 * Resume audio context if suspended
 */
export async function resumeAudio(): Promise<boolean> {
    if (!audioContext) {
        return initAudio();
    }

    if (audioContext.state === 'suspended') {
        try {
            await audioContext.resume();
        } catch (e) {
            console.error('Failed to resume audio:', e);
            return false;
        }
    }

    return audioContext.state === 'running';
}

/**
 * Play a kick drum sound
 */
export function playKick(velocity: number = 100, time?: number): void {
    if (!audioContext || !isAudioEnabled) return;

    const now = time ?? audioContext.currentTime;
    const vol = (velocity / 127) * 0.8;

    // Oscillator for the body
    const osc = audioContext.createOscillator();
    const oscGain = audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);

    oscGain.gain.setValueAtTime(vol, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(oscGain);
    oscGain.connect(audioContext.destination);

    osc.start(now);
    osc.stop(now + 0.3);

    // Click for attack
    const clickOsc = audioContext.createOscillator();
    const clickGain = audioContext.createGain();

    clickOsc.type = 'square';
    clickOsc.frequency.setValueAtTime(400, now);
    clickOsc.frequency.exponentialRampToValueAtTime(100, now + 0.02);

    clickGain.gain.setValueAtTime(vol * 0.3, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

    clickOsc.connect(clickGain);
    clickGain.connect(audioContext.destination);

    clickOsc.start(now);
    clickOsc.stop(now + 0.02);
}

/**
 * Play a snare drum sound
 */
export function playSnare(velocity: number = 100, time?: number): void {
    if (!audioContext || !isAudioEnabled) return;

    const now = time ?? audioContext.currentTime;
    const vol = (velocity / 127) * 0.6;

    // Noise for the snares
    const bufferSize = audioContext.sampleRate * 0.2;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1);
    }

    const noise = audioContext.createBufferSource();
    const noiseFilter = audioContext.createBiquadFilter();
    const noiseGain = audioContext.createGain();

    noise.buffer = buffer;
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(2000, now);

    noiseGain.gain.setValueAtTime(vol, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioContext.destination);

    noise.start(now);
    noise.stop(now + 0.15);

    // Tone body
    const osc = audioContext.createOscillator();
    const oscGain = audioContext.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);

    oscGain.gain.setValueAtTime(vol * 0.5, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(oscGain);
    oscGain.connect(audioContext.destination);

    osc.start(now);
    osc.stop(now + 0.1);
}

/**
 * Play a clap sound
 */
export function playClap(velocity: number = 100, time?: number): void {
    if (!audioContext || !isAudioEnabled) return;

    const now = time ?? audioContext.currentTime;
    const vol = (velocity / 127) * 0.5;

    // Create multiple noise bursts for clap effect
    const bufferSize = audioContext.sampleRate * 0.15;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1);
    }

    for (let i = 0; i < 3; i++) {
        const noise = audioContext.createBufferSource();
        const filter = audioContext.createBiquadFilter();
        const gain = audioContext.createGain();

        noise.buffer = buffer;
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1500, now);
        filter.Q.setValueAtTime(0.5, now);

        const startTime = now + i * 0.01;
        gain.gain.setValueAtTime(vol * (1 - i * 0.2), startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(audioContext.destination);

        noise.start(startTime);
        noise.stop(startTime + 0.1);
    }
}

/**
 * Play a hi-hat sound
 */
export function playHiHat(velocity: number = 100, open: boolean = false, time?: number): void {
    if (!audioContext || !isAudioEnabled) return;

    const now = time ?? audioContext.currentTime;
    const vol = (velocity / 127) * 0.4;
    const duration = open ? 0.3 : 0.08;

    // Noise source
    const bufferSize = audioContext.sampleRate * duration;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1);
    }

    const noise = audioContext.createBufferSource();
    const highpass = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();

    noise.buffer = buffer;

    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(8000, now);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(highpass);
    highpass.connect(gain);
    gain.connect(audioContext.destination);

    noise.start(now);
    noise.stop(now + duration);
}

/**
 * Play a percussion sound (generic)
 */
export function playPerc(velocity: number = 100, time?: number): void {
    if (!audioContext || !isAudioEnabled) return;

    const now = time ?? audioContext.currentTime;
    const vol = (velocity / 127) * 0.5;

    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.start(now);
    osc.stop(now + 0.1);
}

/**
 * Play a tom sound
 */
export function playTom(velocity: number = 100, time?: number): void {
    if (!audioContext || !isAudioEnabled) return;

    const now = time ?? audioContext.currentTime;
    const vol = (velocity / 127) * 0.6;

    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.start(now);
    osc.stop(now + 0.2);
}

/**
 * Play a rim shot sound
 */
export function playRim(velocity: number = 100, time?: number): void {
    if (!audioContext || !isAudioEnabled) return;

    const now = time ?? audioContext.currentTime;
    const vol = (velocity / 127) * 0.4;

    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.02);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.start(now);
    osc.stop(now + 0.05);
}

/**
 * Play a sound by lane ID
 */
export function playSound(laneId: string, velocity: number = 100, time?: number): void {
    switch (laneId) {
        case 'kick':
            playKick(velocity, time);
            break;
        case 'snare':
            playSnare(velocity, time);
            break;
        case 'clap':
            playClap(velocity, time);
            break;
        case 'hihat':
            playHiHat(velocity, false, time);
            break;
        case 'openhat':
            playHiHat(velocity, true, time);
            break;
        case 'perc':
            playPerc(velocity, time);
            break;
        case 'tom':
            playTom(velocity, time);
            break;
        case 'rim':
            playRim(velocity, time);
            break;
    }
}

/**
 * Get current audio time
 */
export function getCurrentTime(): number {
    return audioContext?.currentTime ?? 0;
}

/**
 * Clean up audio resources
 */
export function disposeAudio(): void {
    if (audioContext) {
        audioContext.close();
        audioContext = null;
        isAudioEnabled = false;
    }
}


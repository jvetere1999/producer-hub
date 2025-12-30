<!--
  Waveform Component

  Displays an audio waveform with playback progress and seek-on-click.
  Respects prefers-reduced-motion for animations.

  @component
-->
<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { browser } from '$app/environment';
    import { generateWaveform, getCachedWaveform, type WaveformData } from './waveform';

    // Props
    export let audioUrl: string = '';
    export let trackId: string = '';
    export let currentTime: number = 0;
    export let duration: number = 0;
    export let onSeek: ((time: number) => void) | undefined = undefined;
    export let height: number = 40;
    export let barWidth: number = 2;
    export let barGap: number = 1;
    export let playedColor: string = 'var(--accent-primary, #ff764d)';
    export let unplayedColor: string = 'var(--bg-tertiary, #444)';

    // State
    let waveformData: WaveformData | null = null;
    let loading = false;
    let container: HTMLDivElement;
    let prefersReducedMotion = false;
    let hoverPosition: number | null = null;

    // Media query for reduced motion
    let motionQuery: MediaQueryList | null = null;

    onMount(() => {
        if (browser) {
            motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            prefersReducedMotion = motionQuery.matches;
            motionQuery.addEventListener('change', handleMotionChange);
        }
    });

    onDestroy(() => {
        if (motionQuery) {
            motionQuery.removeEventListener('change', handleMotionChange);
        }
    });

    function handleMotionChange(e: MediaQueryListEvent) {
        prefersReducedMotion = e.matches;
    }

    // Load waveform when track changes
    $: if (trackId && audioUrl) {
        loadWaveform(audioUrl, trackId);
    }

    async function loadWaveform(url: string, id: string) {
        // Check cache first (sync)
        const cached = getCachedWaveform(id);
        if (cached) {
            waveformData = cached;
            return;
        }

        // Generate asynchronously (non-blocking)
        loading = true;
        waveformData = null;

        try {
            const data = await generateWaveform(url, id);
            if (data) {
                waveformData = data;
            }
        } finally {
            loading = false;
        }
    }

    // Calculate progress
    $: progress = duration > 0 ? currentTime / duration : 0;

    // Handle click/tap to seek
    function handleClick(e: MouseEvent | TouchEvent) {
        if (!container || !duration || !onSeek) return;

        const rect = container.getBoundingClientRect();
        let clientX: number;

        if ('touches' in e) {
            clientX = e.touches[0]?.clientX ?? e.changedTouches[0]?.clientX ?? 0;
        } else {
            clientX = e.clientX;
        }

        const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const seekTime = percent * duration;
        onSeek(seekTime);
    }

    function handleMouseMove(e: MouseEvent) {
        if (!container) return;
        const rect = container.getBoundingClientRect();
        hoverPosition = (e.clientX - rect.left) / rect.width;
    }

    function handleMouseLeave() {
        hoverPosition = null;
    }

    function handleKeydown(e: KeyboardEvent) {
        if (!duration || !onSeek) return;
        const step = duration * 0.05; // 5% increments

        if (e.key === 'ArrowRight') {
            e.preventDefault();
            onSeek(Math.min(duration, currentTime + step));
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            onSeek(Math.max(0, currentTime - step));
        }
    }
</script>

<div
    class="waveform-container"
    class:loading
    class:reduced-motion={prefersReducedMotion}
    bind:this={container}
    onclick={handleClick}
    ontouchend={handleClick}
    onmousemove={handleMouseMove}
    onmouseleave={handleMouseLeave}
    onkeydown={handleKeydown}
    role="slider"
    aria-label="Audio waveform - click to seek"
    aria-valuemin={0}
    aria-valuemax={duration}
    aria-valuenow={currentTime}
    tabindex="0"
    style="--waveform-height: {height}px; --bar-width: {barWidth}px; --bar-gap: {barGap}px; --played-color: {playedColor}; --unplayed-color: {unplayedColor};"
>
    {#if loading}
        <div class="loading-indicator" aria-label="Loading waveform">
            <div class="loading-bars">
                {#each Array(20) as _, i}
                    <div
                        class="loading-bar"
                        style="animation-delay: {i * 0.05}s; height: {20 + Math.random() * 60}%;"
                    ></div>
                {/each}
            </div>
        </div>
    {:else if waveformData}
        <svg
            class="waveform-svg"
            viewBox="0 0 {waveformData.normalizedPeaks.length * (barWidth + barGap)} {height}"
            preserveAspectRatio="none"
            aria-hidden="true"
        >
            {#each waveformData.normalizedPeaks as peak, i}
                {@const barHeight = Math.max(2, peak * height * 0.9)}
                {@const x = i * (barWidth + barGap)}
                {@const y = (height - barHeight) / 2}
                {@const isPlayed = (i / waveformData.normalizedPeaks.length) <= progress}
                <rect
                    {x}
                    {y}
                    width={barWidth}
                    height={barHeight}
                    rx="1"
                    fill={isPlayed ? playedColor : unplayedColor}
                    class="waveform-bar"
                    class:played={isPlayed}
                />
            {/each}
        </svg>

        <!-- Hover indicator -->
        {#if hoverPosition !== null && !prefersReducedMotion}
            <div
                class="hover-indicator"
                style="left: {hoverPosition * 100}%;"
            ></div>
        {/if}

        <!-- Progress playhead -->
        <div
            class="playhead"
            style="left: {progress * 100}%;"
        ></div>
    {:else}
        <!-- Fallback progress bar when no waveform -->
        <div class="fallback-progress">
            <div class="fallback-track"></div>
            <div class="fallback-fill" style="width: {progress * 100}%"></div>
        </div>
    {/if}
</div>

<style>
    .waveform-container {
        position: relative;
        width: 100%;
        height: var(--waveform-height);
        cursor: pointer;
        user-select: none;
        -webkit-user-select: none;
        touch-action: none;
        overflow: hidden;
        border-radius: 4px;
        background: var(--bg-tertiary, #333);
    }

    .waveform-container:focus-visible {
        outline: 2px solid var(--accent-primary, #ff764d);
        outline-offset: 2px;
    }

    .waveform-svg {
        width: 100%;
        height: 100%;
        display: block;
    }

    .waveform-bar {
        transition: fill 0.1s ease;
    }

    .reduced-motion .waveform-bar {
        transition: none;
    }

    .playhead {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 2px;
        background: var(--played-color);
        box-shadow: 0 0 4px var(--played-color);
        pointer-events: none;
        z-index: 2;
    }

    .reduced-motion .playhead {
        box-shadow: none;
    }

    .hover-indicator {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 1px;
        background: rgba(255, 255, 255, 0.3);
        pointer-events: none;
        z-index: 1;
    }

    /* Loading animation */
    .loading-indicator {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .loading-bars {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 2px;
        height: 100%;
        padding: 4px;
    }

    .loading-bar {
        width: 2px;
        background: var(--unplayed-color);
        border-radius: 1px;
        animation: pulse 1s ease-in-out infinite;
    }

    .reduced-motion .loading-bar {
        animation: none;
        opacity: 0.5;
    }

    @keyframes pulse {
        0%, 100% {
            opacity: 0.3;
            transform: scaleY(0.5);
        }
        50% {
            opacity: 1;
            transform: scaleY(1);
        }
    }

    /* Fallback progress bar */
    .fallback-progress {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        padding: 0 8px;
    }

    .fallback-track {
        position: absolute;
        left: 8px;
        right: 8px;
        height: 4px;
        background: var(--unplayed-color);
        border-radius: 2px;
    }

    .fallback-fill {
        position: absolute;
        left: 8px;
        height: 4px;
        background: var(--played-color);
        border-radius: 2px;
        transition: width 0.1s linear;
    }

    .reduced-motion .fallback-fill {
        transition: none;
    }
</style>


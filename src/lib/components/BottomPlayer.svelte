<!--
  BottomPlayer Component

  Global persistent audio player that appears at the bottom of the screen.
  Shows waveform, playback controls, and track info.

  @component
-->
<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import {
        playerStore,
        playerVisible,
        isPlaying,
        playerSettings,
        initAudioController,
        loadAndPlay,
        togglePlayPause,
        seek,
        setVolume,
        disposeAudioController,
        loadPlayerSettings,
        savePlayerSettings,
        type QueueTrack
    } from '$lib/player';

    let currentTime = 0;
    let duration = 0;
    let volume = 0.8;
    let showVolumeSlider = false;
    let progressBar: HTMLDivElement;
    let lastLoadedTrackId: string | null = null;  // Guard against infinite loop

    // Subscribe to store
    let unsubscribe: () => void;

    onMount(() => {
        initAudioController();

        // Load saved settings
        const savedSettings = loadPlayerSettings();
        playerStore.updateSettings(savedSettings);
        volume = savedSettings.volume;
        setVolume(volume);

        unsubscribe = playerStore.subscribe(state => {
            currentTime = state.currentTime;
            duration = state.duration;

            // Load new track when it changes (with guard to prevent infinite loop)
            if (state.currentTrack && state.status === 'loading' && state.currentTrack.id !== lastLoadedTrackId) {
                lastLoadedTrackId = state.currentTrack.id;
                loadAndPlay(state.currentTrack.audioUrl);
            }
        });
    });

    onDestroy(() => {
        if (unsubscribe) unsubscribe();
    });

    function formatTime(seconds: number): string {
        if (!isFinite(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function handleProgressClick(e: MouseEvent) {
        if (!progressBar || !duration) return;
        const rect = progressBar.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        seek(percent * duration);
    }

    function handleVolumeChange(e: Event) {
        const value = parseFloat((e.target as HTMLInputElement).value);
        volume = value;
        setVolume(value);

        // Save settings
        playerStore.updateSettings({ volume: value });
        savePlayerSettings({ ...$playerSettings, volume: value });
    }

    function handlePrevious() {
        playerStore.previous();
    }

    function handleNext() {
        playerStore.next();
    }

    function toggleRepeat() {
        const modes: ('off' | 'one' | 'all')[] = ['off', 'one', 'all'];
        const currentIndex = modes.indexOf($playerSettings.repeatMode);
        const nextMode = modes[(currentIndex + 1) % modes.length];

        playerStore.updateSettings({ repeatMode: nextMode });
        savePlayerSettings({ ...$playerSettings, repeatMode: nextMode });
    }

    function handleClose() {
        lastLoadedTrackId = null;  // Reset guard so track can be loaded again
        playerStore.setVisible(false);
    }

    $: progress = duration > 0 ? (currentTime / duration) * 100 : 0;
    $: track = $playerStore.currentTrack;

    function handleProgressKeydown(e: KeyboardEvent) {
        if (!duration) return;
        const step = duration * 0.05; // 5% increments
        if (e.key === 'ArrowRight') {
            seek(Math.min(duration, currentTime + step));
        } else if (e.key === 'ArrowLeft') {
            seek(Math.max(0, currentTime - step));
        }
    }
</script>

{#if $playerVisible && track}
    <div class="bottom-player" role="region" aria-label="Audio player">
        <!-- Progress bar (clickable) -->
        <div
            class="progress-track"
            bind:this={progressBar}
            onclick={handleProgressClick}
            onkeydown={handleProgressKeydown}
            role="slider"
            aria-label="Seek"
            aria-valuemin="0"
            aria-valuemax={duration}
            aria-valuenow={currentTime}
            tabindex="0"
        >
            <div class="progress-fill" style="width: {progress}%"></div>
        </div>

        <div class="player-content">
            <!-- Track info -->
            <div class="track-info">
                <span class="track-title">{track.title}</span>
                {#if track.artist}
                    <span class="track-artist">{track.artist}</span>
                {/if}
            </div>

            <!-- Main controls -->
            <div class="main-controls">
                <button
                    class="control-btn"
                    onclick={handlePrevious}
                    aria-label="Previous track"
                >
                    ⏮
                </button>

                <button
                    class="control-btn play-btn"
                    onclick={togglePlayPause}
                    aria-label={$isPlaying ? 'Pause' : 'Play'}
                >
                    {$isPlaying ? '⏸' : '▶'}
                </button>

                <button
                    class="control-btn"
                    onclick={handleNext}
                    aria-label="Next track"
                >
                    ⏭
                </button>
            </div>

            <!-- Time display -->
            <div class="time-display">
                <span>{formatTime(currentTime)}</span>
                <span class="time-separator">/</span>
                <span>{formatTime(duration)}</span>
            </div>

            <!-- Secondary controls -->
            <div class="secondary-controls">
                <button
                    class="control-btn repeat-btn"
                    class:active={$playerSettings.repeatMode !== 'off'}
                    onclick={toggleRepeat}
                    aria-label="Repeat mode: {$playerSettings.repeatMode}"
                    title="Repeat: {$playerSettings.repeatMode}"
                >
                    {#if $playerSettings.repeatMode === 'one'}
                        🔂
                    {:else}
                        🔁
                    {/if}
                </button>

                <div class="volume-control">
                    <button
                        class="control-btn volume-btn"
                        onclick={() => showVolumeSlider = !showVolumeSlider}
                        aria-label="Volume"
                    >
                        {volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
                    </button>

                    {#if showVolumeSlider}
                        <div class="volume-slider-container">
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={volume}
                                oninput={handleVolumeChange}
                                class="volume-slider"
                                aria-label="Volume level"
                            />
                        </div>
                    {/if}
                </div>

                <button
                    class="control-btn close-btn"
                    onclick={handleClose}
                    aria-label="Close player"
                >
                    ✕
                </button>
            </div>
        </div>

        <!-- Error message -->
        {#if $playerStore.error}
            <div class="error-message">
                {$playerStore.error}
                <button onclick={handleNext}>Skip →</button>
            </div>
        {/if}
    </div>
{/if}

<style>
    .bottom-player {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: var(--bg-secondary, #2d2d2d);
        border-top: 1px solid var(--border-default, #444);
        z-index: 1000;
        padding-bottom: env(safe-area-inset-bottom);
    }

    .progress-track {
        height: 4px;
        background: var(--bg-tertiary, #444);
        cursor: pointer;
        position: relative;
    }

    .progress-track:hover {
        height: 6px;
    }

    .progress-fill {
        height: 100%;
        background: var(--accent-primary, #ff764d);
        transition: width 0.1s linear;
    }

    .player-content {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 8px 16px;
        min-height: 56px;
    }

    .track-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .track-title {
        font-size: 14px;
        font-weight: 500;
        color: var(--text-primary, #fff);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .track-artist {
        font-size: 12px;
        color: var(--text-muted, #888);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .main-controls {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .control-btn {
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        border-radius: 50%;
        background: transparent;
        color: var(--text-primary, #fff);
        font-size: 18px;
        cursor: pointer;
        transition: all 0.15s;
    }

    .control-btn:hover {
        background: var(--surface-hover, #444);
    }

    .play-btn {
        width: 48px;
        height: 48px;
        background: var(--accent-primary, #ff764d);
        font-size: 20px;
    }

    .play-btn:hover {
        filter: brightness(1.1);
        background: var(--accent-primary, #ff764d);
    }

    .time-display {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        color: var(--text-muted, #888);
        font-family: monospace;
        min-width: 80px;
    }

    .time-separator {
        opacity: 0.5;
    }

    .secondary-controls {
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .repeat-btn.active {
        color: var(--accent-primary, #ff764d);
    }

    .volume-control {
        position: relative;
    }

    .volume-slider-container {
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        background: var(--bg-tertiary, #333);
        padding: 12px 8px;
        border-radius: 8px;
        margin-bottom: 8px;
    }

    .volume-slider {
        writing-mode: vertical-lr;
        direction: rtl;
        height: 80px;
        accent-color: var(--accent-primary, #ff764d);
    }

    .close-btn {
        font-size: 14px;
        color: var(--text-muted, #888);
    }

    .close-btn:hover {
        color: var(--text-primary, #fff);
    }

    .error-message {
        padding: 8px 16px;
        background: rgba(255, 82, 82, 0.13);
        color: var(--accent-error, #ff5252);
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .error-message button {
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        text-decoration: underline;
    }

    @media (max-width: 600px) {
        .player-content {
            flex-wrap: wrap;
            gap: 8px;
            padding: 8px 12px;
        }

        .track-info {
            width: 100%;
            order: -1;
        }

        .time-display {
            display: none;
        }

        .secondary-controls {
            margin-left: auto;
        }
    }
</style>


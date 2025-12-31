<!--
  InfoBlurb.svelte - Customization Info Panel/Tooltips

  Explains lane types, note modes, quantize/grid, velocity,
  instrument/preset, and export/share behavior.
-->
<script lang="ts">
    export let topic: string = 'general';
    export let compact: boolean = false;

    interface InfoSection {
        title: string;
        icon: string;
        content: string;
        tips?: string[];
    }

    const INFO_SECTIONS: Record<string, InfoSection> = {
        general: {
            title: 'Lane Builder',
            icon: '🎛️',
            content: 'Create drum patterns and melodies with a visual lane-based editor. Each lane represents a separate instrument or part.',
            tips: [
                'Add lanes using the "+ Add Lane" button',
                'Click a lane to select it and edit notes',
                'Use Share to create a shareable link',
            ],
        },
        laneTypes: {
            title: 'Lane Types',
            icon: '🎼',
            content: 'Choose from three lane types based on your needs:',
            tips: [
                '🥁 Drum Lane: Step sequencer for percussion. Uses General MIDI drum mapping.',
                '🎹 Melody Lane: Piano roll for melodies and basslines. Full chromatic range.',
                '🎵 Chord Lane: Block-based chord progressions. Automatically voices chords.',
            ],
        },
        noteModes: {
            title: 'Note Modes',
            icon: '🎵',
            content: 'Control how notes are played and displayed:',
            tips: [
                'One-Shot: Notes trigger instantly and play their full sample. Best for drums.',
                'Sustain: Notes hold for their full duration. Best for melodies and pads.',
                'Drum lanes support sustain mode for long hits like cymbals or 808s.',
            ],
        },
        quantize: {
            title: 'Quantize / Grid',
            icon: '📐',
            content: 'Snap notes to a rhythmic grid for precise timing:',
            tips: [
                '1/4: Quarter notes (standard beat grid)',
                '1/8: Eighth notes (half a beat)',
                '1/16: Sixteenth notes (most common for drums)',
                '1/32: Thirty-second notes (for detailed patterns)',
                'Off: Free placement without snapping',
            ],
        },
        velocity: {
            title: 'Velocity',
            icon: '💪',
            content: 'Velocity controls how hard a note is played (1-127). Higher values mean louder, more intense notes.',
            tips: [
                'Vary velocity for more natural, human-like performances',
                'Use lower velocity for ghost notes in drums',
                'Accents typically use velocity 110-127',
            ],
        },
        instruments: {
            title: 'Instruments & Presets',
            icon: '🎹',
            content: 'Choose from built-in instruments for preview playback:',
            tips: [
                'Soft Grand Piano: Default for melodies (warm, expressive)',
                'Electric Piano: Vintage Rhodes-style sound',
                'Synth Lead: Bright synthesizer for hooks',
                'Acoustic Kit: Standard drum kit',
                'Electronic: 808/909 style drums',
                'MIDI export is instrument-agnostic - use any sound in your DAW',
            ],
        },
        export: {
            title: 'Export & Share',
            icon: '📤',
            content: 'Save and share your creations:',
            tips: [
                'MIDI Export: Download a .mid file for your DAW',
                'Share URL: Create a link that recreates your arrangement',
                'Share URLs are size-capped (max ~8KB) and versioned',
                'Private data is never included in share URLs',
            ],
        },
        midiRoll: {
            title: 'MIDI Roll Editor',
            icon: '🎼',
            content: 'The note editor uses standard DAW conventions:',
            tips: [
                'Click to add notes at the grid position',
                'Drag notes to move them',
                'Drag note edges to resize (change duration)',
                'Right-click or double-click to delete',
                'Hold Shift to add multiple notes',
            ],
        },
    };

    $: section = INFO_SECTIONS[topic] || INFO_SECTIONS.general;
</script>

<div class="info-blurb" class:compact role="complementary" aria-label="Help information">
    <header class="info-header">
        <span class="info-icon" aria-hidden="true">{section.icon}</span>
        <h3 class="info-title">{section.title}</h3>
    </header>

    <p class="info-content">{section.content}</p>

    {#if section.tips && section.tips.length > 0}
        <ul class="info-tips">
            {#each section.tips as tip}
                <li>{tip}</li>
            {/each}
        </ul>
    {/if}

    {#if !compact}
        <nav class="info-nav" aria-label="Help topics">
            <span class="nav-label">More topics:</span>
            <div class="nav-links">
                {#each Object.entries(INFO_SECTIONS) as [key, info]}
                    {#if key !== topic}
                        <button
                            class="nav-link"
                            on:click={() => topic = key}
                            aria-label="View {info.title} help"
                        >
                            {info.icon}
                        </button>
                    {/if}
                {/each}
            </div>
        </nav>
    {/if}
</div>

<style>
    .info-blurb {
        background: var(--bg-secondary);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-lg);
        padding: var(--space-4);
    }

    .info-blurb.compact {
        padding: var(--space-3);
    }

    .info-header {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        margin-bottom: var(--space-3);
    }

    .info-icon {
        font-size: 24px;
    }

    .compact .info-icon {
        font-size: 18px;
    }

    .info-title {
        font-size: var(--font-base);
        font-weight: 600;
        margin: 0;
        color: var(--fg-primary);
    }

    .compact .info-title {
        font-size: var(--font-sm);
    }

    .info-content {
        font-size: var(--font-sm);
        color: var(--fg-secondary);
        margin: 0 0 var(--space-3);
        line-height: 1.5;
    }

    .compact .info-content {
        font-size: var(--font-xs);
        margin-bottom: var(--space-2);
    }

    .info-tips {
        list-style: none;
        margin: 0;
        padding: 0;
    }

    .info-tips li {
        font-size: var(--font-sm);
        color: var(--fg-primary);
        padding: var(--space-2) 0;
        border-top: 1px solid var(--border-subtle);
        line-height: 1.4;
    }

    .compact .info-tips li {
        font-size: var(--font-xs);
        padding: var(--space-1) 0;
    }

    .info-tips li:first-child {
        border-top: none;
    }

    .info-nav {
        margin-top: var(--space-4);
        padding-top: var(--space-3);
        border-top: 1px solid var(--border-default);
    }

    .nav-label {
        font-size: var(--font-xs);
        color: var(--fg-tertiary);
        display: block;
        margin-bottom: var(--space-2);
    }

    .nav-links {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
    }

    .nav-link {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg-tertiary);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-md);
        cursor: pointer;
        font-size: 16px;
        transition: transform 0.15s, box-shadow 0.15s;
    }

    .nav-link:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
        border-color: var(--accent-primary);
    }

    .nav-link:focus-visible {
        outline: 2px solid var(--accent-primary);
        outline-offset: 2px;
    }
</style>


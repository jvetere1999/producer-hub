<!--
  ControlInfo Component

  Displays helpful information about template engine controls.
  Can be toggled to show/hide info blurbs.

  @component
-->
<script lang="ts">
    export let topic: string = 'general';
    export let compact: boolean = false;

    const infoContent: Record<string, { title: string; description: string; tips?: string[] }> = {
        // Scale & Key
        scale: {
            title: 'Scale & Key',
            description: 'Sets the musical key and scale for your composition. Notes can be highlighted or snapped to stay within the selected scale.',
            tips: [
                'Major scales sound bright and happy',
                'Minor scales sound darker and emotional',
                'Enable "Snap to Scale" to auto-correct out-of-key notes',
            ],
        },

        // Arpeggiator
        arp: {
            title: 'Arpeggiator',
            description: 'Converts held chords into sequential note patterns. Great for creating rhythmic melodic lines from chord progressions.',
            tips: [
                'Up/Down patterns are classic arp sounds',
                'Random adds variation and interest',
                'Higher octaves span more range',
                'Gate controls note length (100% = full, 50% = staccato)',
            ],
        },

        // Strum
        strum: {
            title: 'Strum',
            description: 'Plays chord notes with slight timing offsets, simulating a guitar strum or harp glissando.',
            tips: [
                'Lower time values = tighter strum',
                'Alternate direction creates natural feel',
                'Accent First emphasizes the bass note',
            ],
        },

        // Pattern
        pattern: {
            title: 'Arp Pattern',
            description: 'Determines the order notes are played in the arpeggio.',
            tips: [
                'Up: Low to high pitch',
                'Down: High to low pitch',
                'Up/Down: Ascending then descending',
                'Random: Unpredictable order',
                'As Played: Order you entered the notes',
            ],
        },

        // Rate
        rate: {
            title: 'Rate',
            description: 'How fast the arpeggiator plays through notes. Measured in note divisions.',
            tips: [
                '1/4 = Quarter notes (slower)',
                '1/8 = Eighth notes (medium)',
                '1/16 = Sixteenth notes (faster)',
                'Match to your tempo for rhythmic feel',
            ],
        },

        // Gate
        gate: {
            title: 'Gate',
            description: 'Controls how long each arpeggiated note plays as a percentage of the rate.',
            tips: [
                '100% = Notes connect (legato)',
                '50% = Notes have gaps (staccato)',
                '150%+ = Notes overlap (for pad sounds)',
            ],
        },

        // Humanize
        humanize: {
            title: 'Humanize',
            description: 'Adds subtle random variations to timing and velocity, making patterns sound less robotic.',
            tips: [
                'Timing: Slight variations in note start times',
                'Velocity: Variations in note loudness',
                'Swing: Delays every other note for groove',
                'Use subtle amounts (5-15%) for natural feel',
            ],
        },

        // Voicing
        voicing: {
            title: 'Chord Voicing',
            description: 'How chord notes are arranged vertically. Affects the character and spread of chords.',
            tips: [
                'Close: Notes clustered together',
                'Open: Notes spread across octaves',
                'Drop 2: Jazz voicing with 2nd note dropped an octave',
                'Inversion: Which note is in the bass',
            ],
        },

        // Drums
        drums: {
            title: 'Drum Sequencer',
            description: 'Step-based drum programming. Click cells to toggle hits on/off.',
            tips: [
                'Kick on beats 1 and 3 for standard feel',
                'Snare on beats 2 and 4',
                'Hi-hats fill in the spaces',
                'Vary velocities for natural groove',
            ],
        },

        // Lanes
        lanes: {
            title: 'Lanes',
            description: 'Separate tracks for different instruments. Each lane has its own notes and settings.',
            tips: [
                'Mute (M) to silence a lane',
                'Solo (S) to hear only that lane',
                'Drag to reorder lanes',
                'Add as many lanes as needed',
            ],
        },

        // BPM
        bpm: {
            title: 'Tempo (BPM)',
            description: 'Beats per minute - how fast the music plays. Standard range is 60-180 BPM.',
            tips: [
                '70-90: Slow ballads, ambient',
                '100-120: Pop, rock, house',
                '120-140: Dance, techno, DnB',
                '140+: Fast genres like drum & bass',
            ],
        },

        // Progression
        progression: {
            title: 'Chord Progression',
            description: 'Pre-made sequences of chords that work well together. A starting point for your composition.',
            tips: [
                'I-V-vi-IV is the most popular progression',
                'Minor progressions work for emotional music',
                'Customize after loading a template',
            ],
        },

        // Genre Packs
        genrePacks: {
            title: 'Genre Packs',
            description: 'Pre-configured setups for specific music styles. Loads appropriate BPM, scale, progression, and rhythm patterns.',
            tips: [
                'Great starting point for new projects',
                'All settings can be customized after loading',
                'Try different packs for inspiration',
            ],
        },

        // General
        general: {
            title: 'Template Engine',
            description: 'A creative tool for building chord progressions, melodies, and drum patterns. Combine with arpeggiator and humanize for expressive results.',
            tips: [
                'Start with a genre pack or progression',
                'Add notes by clicking the grid',
                'Use arpeggiator to create movement',
                'Humanize for natural feel',
                'Export to share or use in your DAW',
            ],
        },
    };

    $: info = infoContent[topic] || infoContent.general;
</script>

<div class="control-info" class:compact>
    <div class="info-header">
        <svg class="info-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4"/>
            <path d="M12 8h.01"/>
        </svg>
        <h4>{info.title}</h4>
    </div>
    <p class="info-description">{info.description}</p>
    {#if info.tips && !compact}
        <ul class="info-tips">
            {#each info.tips as tip}
                <li>{tip}</li>
            {/each}
        </ul>
    {/if}
</div>

<style>
    .control-info {
        background: rgba(93, 173, 226, 0.1);
        border: 1px solid rgba(93, 173, 226, 0.3);
        border-radius: 6px;
        padding: 12px;
        font-size: 12px;
    }

    .control-info.compact {
        padding: 8px 10px;
    }

    .info-header {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 6px;
    }

    .info-icon {
        color: #5dade2;
        flex-shrink: 0;
    }

    .info-header h4 {
        margin: 0;
        font-size: 13px;
        font-weight: 600;
        color: #5dade2;
    }

    .info-description {
        margin: 0;
        color: #aaa;
        line-height: 1.5;
    }

    .compact .info-description {
        font-size: 11px;
    }

    .info-tips {
        margin: 8px 0 0 0;
        padding-left: 16px;
        color: #888;
    }

    .info-tips li {
        margin-bottom: 4px;
        line-height: 1.4;
    }

    .info-tips li:last-child {
        margin-bottom: 0;
    }
</style>


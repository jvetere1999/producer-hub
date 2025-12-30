<!--
  Template Detail Page

  SEO-optimized individual template page with:
  - Full meta tags and JSON-LD
  - Template preview visualization
  - "Open in Lane Builder" button
  - MIDI export option
  - Related templates
-->
<script lang="ts">
    import { base } from '$app/paths';
    import type { BuiltInTemplate } from '$lib/storage/builtinTemplates';
    import { getOpenInLaneBuilderUrl } from '$lib/storage/builtinTemplates';
    import { exportDrumLaneToMidi, exportMelodyLaneToMidi, downloadMidi } from '$lib/storage/midiExport';

    export let data: {
        template: BuiltInTemplate;
        relatedTemplates: BuiltInTemplate[];
    };

    $: template = data.template;
    $: relatedTemplates = data.relatedTemplates;

    $: pageTitle = `${template.name} - Free ${template.type === 'drums' ? 'Drum Pattern' : template.type === 'chord' ? 'Chord Progression' : 'Melody'} Template`;
    $: pageDescription = template.longDescription || template.description;
    $: canonicalUrl = `https://producerhub.ecent.online/templates/${template.slug}`;
    $: laneBuilderUrl = getOpenInLaneBuilderUrl(template, base);

    // Get type icon
    function getTypeIcon(type: string): string {
        switch (type) {
            case 'drums': return '🥁';
            case 'melody': return '🎹';
            case 'chord': return '🎵';
            default: return '🎼';
        }
    }

    // Export as MIDI
    function handleExportMidi() {
        try {
            let result;
            if (template.type === 'drums') {
                result = exportDrumLaneToMidi(
                    template.notes,
                    template.laneSettings,
                    {
                        bpm: template.bpm,
                        timeSignatureNum: template.timeSignature[0],
                        timeSignatureDenom: template.timeSignature[1],
                        key: template.key,
                        trackName: template.name,
                    }
                );
            } else {
                result = exportMelodyLaneToMidi(
                    template.notes,
                    template.laneSettings,
                    {
                        bpm: template.bpm,
                        timeSignatureNum: template.timeSignature[0],
                        timeSignatureDenom: template.timeSignature[1],
                        key: template.key,
                        trackName: template.name,
                    }
                );
            }
            downloadMidi(result);
        } catch (e) {
            console.error('Failed to export MIDI:', e);
            alert('Failed to export MIDI file');
        }
    }

    // Note pitch to name
    function pitchToName(pitch: number): string {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(pitch / 12) - 1;
        const note = notes[pitch % 12];
        return `${note}${octave}`;
    }

    // JSON-LD structured data
    $: jsonLd = {
        "@context": "https://schema.org",
        "@type": "MusicComposition",
        "name": template.name,
        "description": pageDescription,
        "url": canonicalUrl,
        "musicalKey": template.key,
        "isFamilyFriendly": true,
        "genre": template.genre,
        "dateCreated": template.createdAt,
        "creator": {
            "@type": "Organization",
            "name": template.author
        },
        "educationalLevel": template.difficulty,
        "keywords": template.tags.join(', '),
    };
</script>

<svelte:head>
    <title>{pageTitle}</title>
    <meta name="description" content={pageDescription} />
    <link rel="canonical" href={canonicalUrl} />

    <!-- Open Graph -->
    <meta property="og:title" content={pageTitle} />
    <meta property="og:description" content={pageDescription} />
    <meta property="og:type" content="music.song" />
    <meta property="og:url" content={canonicalUrl} />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content={pageTitle} />
    <meta name="twitter:description" content={pageDescription} />

    <!-- Keywords -->
    <meta name="keywords" content={template.tags.join(', ')} />

    <!-- JSON-LD Structured Data -->
    {@html `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`}
</svelte:head>

<main class="template-detail">
    <!-- Breadcrumb -->
    <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="{base}/templates">Templates</a>
        <span class="separator">/</span>
        <a href="{base}/templates/{template.type === 'chord' ? 'chords' : template.type}">{template.type === 'chord' ? 'Chords' : template.type === 'drums' ? 'Drums' : 'Melody'}</a>
        <span class="separator">/</span>
        <span class="current">{template.name}</span>
    </nav>

    <!-- Header -->
    <header class="template-header">
        <div class="header-top">
            <span class="type-icon">{getTypeIcon(template.type)}</span>
            <div class="badges">
                <span class="type-badge {template.type}">{template.type}</span>
                <span class="difficulty-badge {template.difficulty}">{template.difficulty}</span>
            </div>
        </div>
        <h1>{template.name}</h1>
        <p class="description">{pageDescription}</p>

        <!-- Action Buttons -->
        <div class="actions">
            <a href={laneBuilderUrl} class="btn btn-primary" data-testid="open-lane-builder">
                🎛️ Open in Lane Builder
            </a>
            <button class="btn btn-secondary" on:click={handleExportMidi} data-testid="export-midi">
                📥 Download MIDI
            </button>
        </div>
    </header>

    <!-- Template Info Grid -->
    <section class="info-grid">
        <div class="info-card">
            <span class="info-label">Tempo</span>
            <span class="info-value">{template.bpm} BPM</span>
        </div>
        <div class="info-card">
            <span class="info-label">Time Signature</span>
            <span class="info-value">{template.timeSignature[0]}/{template.timeSignature[1]}</span>
        </div>
        <div class="info-card">
            <span class="info-label">Key</span>
            <span class="info-value">{template.key} {template.scaleType}</span>
        </div>
        <div class="info-card">
            <span class="info-label">Length</span>
            <span class="info-value">{template.bars} bars</span>
        </div>
        <div class="info-card">
            <span class="info-label">Notes</span>
            <span class="info-value">{template.notes.length}</span>
        </div>
        <div class="info-card">
            <span class="info-label">Genre</span>
            <span class="info-value">{template.genre}</span>
        </div>
    </section>

    <!-- Note Preview -->
    <section class="note-preview">
        <h2>Pattern Preview</h2>
        <div class="piano-roll" role="img" aria-label="Piano roll visualization of {template.name}">
            {#each template.notes.slice(0, 24) as note}
                <div
                    class="note"
                    style="
                        left: {(note.startBeat / (template.bars * template.timeSignature[0])) * 100}%;
                        bottom: {((note.pitch - 36) / 48) * 100}%;
                        width: {(note.duration / (template.bars * template.timeSignature[0])) * 100}%;
                        opacity: {0.5 + (note.velocity / 254)};
                    "
                    title="{pitchToName(note.pitch)} at beat {note.startBeat}"
                ></div>
            {/each}
        </div>
        {#if template.notes.length > 24}
            <p class="more-notes">+{template.notes.length - 24} more notes</p>
        {/if}
    </section>

    <!-- Note Details Table -->
    <section class="note-details">
        <h2>Note Data</h2>
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>Note</th>
                        <th>Start</th>
                        <th>Duration</th>
                        <th>Velocity</th>
                    </tr>
                </thead>
                <tbody>
                    {#each template.notes.slice(0, 12) as note}
                        <tr>
                            <td>{pitchToName(note.pitch)}</td>
                            <td>Beat {note.startBeat.toFixed(2)}</td>
                            <td>{note.duration.toFixed(2)} beats</td>
                            <td>{note.velocity}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
            {#if template.notes.length > 12}
                <p class="more-notes">+{template.notes.length - 12} more notes</p>
            {/if}
        </div>
    </section>

    <!-- Tags -->
    <section class="tags-section">
        <h2>Tags</h2>
        <div class="tags">
            {#each template.tags as tag}
                <span class="tag">{tag}</span>
            {/each}
        </div>
    </section>

    <!-- Related Templates -->
    {#if relatedTemplates.length > 0}
        <section class="related-templates">
            <h2>Related Templates</h2>
            <div class="related-grid">
                {#each relatedTemplates as related}
                    <a href="{base}/templates/{related.slug}" class="related-card">
                        <span class="related-icon">{getTypeIcon(related.type)}</span>
                        <div class="related-info">
                            <h3>{related.name}</h3>
                            <p>{related.description}</p>
                        </div>
                    </a>
                {/each}
            </div>
        </section>
    {/if}

    <!-- Internal Links -->
    <nav class="internal-links">
        <h2>Explore More</h2>
        <ul>
            <li><a href="{base}/templates">← All Templates</a></li>
            <li><a href="{base}/templates/drums">Drum Pattern Templates</a></li>
            <li><a href="{base}/templates/melody">Melody Templates</a></li>
            <li><a href="{base}/templates/chords">Chord Progression Templates</a></li>
            <li><a href="{base}/arrange">Lane Builder Tool</a></li>
            <li><a href="{base}/">DAW Shortcuts Reference</a></li>
        </ul>
    </nav>
</main>

<style>
    .template-detail {
        max-width: 900px;
        margin: 0 auto;
        padding: var(--space-6) var(--space-4);
        padding-bottom: calc(var(--player-height, 80px) + var(--space-8));
    }

    /* Breadcrumb */
    .breadcrumb {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        font-size: var(--font-sm);
        margin-bottom: var(--space-6);
        color: var(--fg-secondary);
    }

    .breadcrumb a {
        color: var(--accent-primary);
        text-decoration: none;
    }

    .breadcrumb a:hover {
        text-decoration: underline;
    }

    .separator {
        color: var(--fg-tertiary);
    }

    .current {
        color: var(--fg-primary);
        font-weight: 500;
    }

    /* Header */
    .template-header {
        margin-bottom: var(--space-8);
    }

    .header-top {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        margin-bottom: var(--space-3);
    }

    .type-icon {
        font-size: 48px;
    }

    .badges {
        display: flex;
        gap: var(--space-2);
    }

    .type-badge {
        padding: var(--space-1) var(--space-3);
        border-radius: var(--radius-full);
        font-weight: 600;
        text-transform: uppercase;
        font-size: var(--font-xs);
    }

    .type-badge.drums { background: #ffcdd2; color: #c62828; }
    .type-badge.melody { background: #bbdefb; color: #1565c0; }
    .type-badge.chord { background: #e1bee7; color: #7b1fa2; }

    .difficulty-badge {
        padding: var(--space-1) var(--space-3);
        border-radius: var(--radius-full);
        font-size: var(--font-xs);
        font-weight: 500;
    }

    .difficulty-badge.beginner { background: #e8f5e9; color: #2e7d32; }
    .difficulty-badge.intermediate { background: #fff3e0; color: #ef6c00; }
    .difficulty-badge.advanced { background: #fce4ec; color: #c2185b; }

    .template-header h1 {
        font-size: var(--font-3xl);
        margin: 0 0 var(--space-3);
        color: var(--fg-primary);
    }

    .template-header .description {
        color: var(--fg-secondary);
        font-size: var(--font-lg);
        line-height: 1.6;
        margin: 0 0 var(--space-5);
    }

    /* Actions */
    .actions {
        display: flex;
        gap: var(--space-3);
        flex-wrap: wrap;
    }

    .btn {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-3) var(--space-5);
        border-radius: var(--radius-md);
        font-weight: 600;
        font-size: var(--font-base);
        text-decoration: none;
        cursor: pointer;
        border: none;
        transition: transform 0.2s, box-shadow 0.2s;
    }

    .btn:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
    }

    .btn-primary {
        background: var(--accent-primary);
        color: white;
    }

    .btn-secondary {
        background: var(--bg-secondary);
        color: var(--fg-primary);
        border: 1px solid var(--border-default);
    }

    /* Info Grid */
    .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: var(--space-3);
        margin-bottom: var(--space-8);
    }

    .info-card {
        background: var(--bg-secondary);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-md);
        padding: var(--space-3);
        text-align: center;
    }

    .info-label {
        display: block;
        font-size: var(--font-xs);
        color: var(--fg-tertiary);
        margin-bottom: var(--space-1);
    }

    .info-value {
        font-size: var(--font-lg);
        font-weight: 600;
        color: var(--fg-primary);
    }

    /* Note Preview */
    .note-preview {
        margin-bottom: var(--space-8);
    }

    .note-preview h2 {
        font-size: var(--font-lg);
        margin: 0 0 var(--space-4);
        color: var(--fg-primary);
    }

    .piano-roll {
        position: relative;
        height: 200px;
        background: var(--bg-secondary);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-md);
        overflow: hidden;
    }

    .note {
        position: absolute;
        height: 8px;
        min-width: 4px;
        background: var(--accent-primary);
        border-radius: 2px;
    }

    .more-notes {
        text-align: center;
        color: var(--fg-tertiary);
        font-size: var(--font-sm);
        margin-top: var(--space-2);
    }

    /* Note Details */
    .note-details {
        margin-bottom: var(--space-8);
    }

    .note-details h2 {
        font-size: var(--font-lg);
        margin: 0 0 var(--space-4);
        color: var(--fg-primary);
    }

    .table-wrapper {
        overflow-x: auto;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        background: var(--bg-secondary);
        border-radius: var(--radius-md);
        overflow: hidden;
    }

    th, td {
        padding: var(--space-3);
        text-align: left;
        border-bottom: 1px solid var(--border-default);
    }

    th {
        background: var(--bg-tertiary);
        font-weight: 600;
        font-size: var(--font-sm);
        color: var(--fg-secondary);
    }

    td {
        font-size: var(--font-sm);
        color: var(--fg-primary);
    }

    /* Tags */
    .tags-section {
        margin-bottom: var(--space-8);
    }

    .tags-section h2 {
        font-size: var(--font-lg);
        margin: 0 0 var(--space-3);
        color: var(--fg-primary);
    }

    .tags {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
    }

    .tag {
        padding: var(--space-1) var(--space-3);
        background: var(--bg-secondary);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-full);
        font-size: var(--font-sm);
        color: var(--fg-secondary);
    }

    /* Related Templates */
    .related-templates {
        margin-bottom: var(--space-8);
    }

    .related-templates h2 {
        font-size: var(--font-lg);
        margin: 0 0 var(--space-4);
        color: var(--fg-primary);
    }

    .related-grid {
        display: grid;
        gap: var(--space-3);
    }

    .related-card {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        padding: var(--space-4);
        background: var(--bg-secondary);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-md);
        text-decoration: none;
        transition: transform 0.2s, box-shadow 0.2s;
    }

    .related-card:hover {
        transform: translateX(4px);
        box-shadow: var(--shadow-md);
    }

    .related-icon {
        font-size: 32px;
    }

    .related-info h3 {
        font-size: var(--font-base);
        margin: 0 0 var(--space-1);
        color: var(--fg-primary);
    }

    .related-info p {
        font-size: var(--font-sm);
        margin: 0;
        color: var(--fg-secondary);
    }

    /* Internal Links */
    .internal-links {
        background: var(--bg-secondary);
        border-radius: var(--radius-lg);
        padding: var(--space-5);
    }

    .internal-links h2 {
        font-size: var(--font-base);
        margin: 0 0 var(--space-3);
        color: var(--fg-primary);
    }

    .internal-links ul {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2) var(--space-4);
    }

    .internal-links a {
        color: var(--accent-primary);
        text-decoration: none;
        font-size: var(--font-sm);
    }

    .internal-links a:hover {
        text-decoration: underline;
    }

    @media (max-width: 640px) {
        .template-detail {
            padding: var(--space-4) var(--space-3);
        }

        .template-header h1 {
            font-size: var(--font-2xl);
        }

        .type-icon {
            font-size: 36px;
        }

        .actions {
            flex-direction: column;
        }

        .btn {
            justify-content: center;
        }

        .info-grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }
</style>


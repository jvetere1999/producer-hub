<!--
  Templates Index Page

  SEO-optimized listing of all built-in lane templates.
  Provides navigation to drum, melody, and chord templates.
-->
<script lang="ts">
    import { base } from '$app/paths';
    import type { BuiltInTemplate } from '$lib/storage/builtinTemplates';

    export let data: {
        drums: BuiltInTemplate[];
        melody: BuiltInTemplate[];
        chords: BuiltInTemplate[];
        total: number;
    };

    const pageTitle = 'Free Music Production Templates | Lane Builder';
    const pageDescription = 'Discover free drum patterns, melody templates, and chord progressions for music production. Use our Lane Builder to customize and export as MIDI.';
</script>

<svelte:head>
    <title>{pageTitle}</title>
    <meta name="description" content={pageDescription} />
    <link rel="canonical" href="https://producerhub.ecent.online/templates" />

    <!-- Open Graph -->
    <meta property="og:title" content={pageTitle} />
    <meta property="og:description" content={pageDescription} />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://producerhub.ecent.online/templates" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={pageTitle} />
    <meta name="twitter:description" content={pageDescription} />

    <!-- JSON-LD Structured Data -->
    {@html `<script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "${pageTitle}",
        "description": "${pageDescription}",
        "url": "https://producerhub.ecent.online/templates",
        "numberOfItems": ${data.total},
        "hasPart": [
            {
                "@type": "ItemList",
                "name": "Drum Templates",
                "numberOfItems": ${data.drums.length}
            },
            {
                "@type": "ItemList",
                "name": "Melody Templates",
                "numberOfItems": ${data.melody.length}
            },
            {
                "@type": "ItemList",
                "name": "Chord Templates",
                "numberOfItems": ${data.chords.length}
            }
        ]
    }
    </script>`}
</svelte:head>

<main class="templates-page">
    <header class="page-header">
        <h1>Music Production Templates</h1>
        <p class="subtitle">
            Free drum patterns, melodies, and chord progressions for your productions.
            Open any template in our Lane Builder to customize, preview, and export as MIDI.
        </p>
    </header>

    <nav class="quick-nav" aria-label="Template categories">
        <a href="#drums" class="nav-chip drums">🥁 Drum Patterns</a>
        <a href="#melody" class="nav-chip melody">🎹 Melodies</a>
        <a href="#chords" class="nav-chip chords">🎵 Chord Progressions</a>
    </nav>

    <!-- Drum Templates Section -->
    <section id="drums" class="template-section">
        <header class="section-header">
            <h2>🥁 Drum Pattern Templates</h2>
            <p>Classic beats and modern rhythms for any genre.</p>
            <a href="{base}/templates/drums" class="view-all">View all drums →</a>
        </header>
        <div class="template-grid">
            {#each data.drums as template}
                <article class="template-card" data-type="drums">
                    <a href="{base}/templates/{template.slug}" class="card-link">
                        <div class="card-header">
                            <span class="type-badge drums">Drums</span>
                            <span class="difficulty {template.difficulty}">{template.difficulty}</span>
                        </div>
                        <h3>{template.name}</h3>
                        <p class="description">{template.description}</p>
                        <div class="meta">
                            <span class="bpm">{template.bpm} BPM</span>
                            <span class="bars">{template.bars} bars</span>
                            <span class="genre">{template.genre}</span>
                        </div>
                        <div class="tags">
                            {#each template.tags.slice(0, 3) as tag}
                                <span class="tag">{tag}</span>
                            {/each}
                        </div>
                    </a>
                </article>
            {/each}
        </div>
    </section>

    <!-- Melody Templates Section -->
    <section id="melody" class="template-section">
        <header class="section-header">
            <h2>🎹 Melody Templates</h2>
            <p>Inspiring melodic ideas with Soft Grand Piano preview.</p>
            <a href="{base}/templates/melody" class="view-all">View all melodies →</a>
        </header>
        <div class="template-grid">
            {#each data.melody as template}
                <article class="template-card" data-type="melody">
                    <a href="{base}/templates/{template.slug}" class="card-link">
                        <div class="card-header">
                            <span class="type-badge melody">Melody</span>
                            <span class="difficulty {template.difficulty}">{template.difficulty}</span>
                        </div>
                        <h3>{template.name}</h3>
                        <p class="description">{template.description}</p>
                        <div class="meta">
                            <span class="bpm">{template.bpm} BPM</span>
                            <span class="key">{template.key} {template.scaleType}</span>
                            <span class="bars">{template.bars} bars</span>
                        </div>
                        <div class="tags">
                            {#each template.tags.slice(0, 3) as tag}
                                <span class="tag">{tag}</span>
                            {/each}
                        </div>
                    </a>
                </article>
            {/each}
        </div>
    </section>

    <!-- Chord Templates Section -->
    <section id="chords" class="template-section">
        <header class="section-header">
            <h2>🎵 Chord Progression Templates</h2>
            <p>Popular progressions from pop to jazz.</p>
            <a href="{base}/templates/chords" class="view-all">View all chords →</a>
        </header>
        <div class="template-grid">
            {#each data.chords as template}
                <article class="template-card" data-type="chord">
                    <a href="{base}/templates/{template.slug}" class="card-link">
                        <div class="card-header">
                            <span class="type-badge chord">Chords</span>
                            <span class="difficulty {template.difficulty}">{template.difficulty}</span>
                        </div>
                        <h3>{template.name}</h3>
                        <p class="description">{template.description}</p>
                        <div class="meta">
                            <span class="bpm">{template.bpm} BPM</span>
                            <span class="key">{template.key} {template.scaleType}</span>
                            <span class="genre">{template.genre}</span>
                        </div>
                        <div class="tags">
                            {#each template.tags.slice(0, 3) as tag}
                                <span class="tag">{tag}</span>
                            {/each}
                        </div>
                    </a>
                </article>
            {/each}
        </div>
    </section>

    <!-- Internal Links / Related Tools -->
    <section class="related-tools">
        <h2>Production Tools</h2>
        <div class="tools-grid">
            <a href="{base}/arrange" class="tool-link">
                <span class="tool-icon">🎛️</span>
                <span class="tool-name">Lane Builder</span>
                <span class="tool-desc">Create and edit patterns</span>
            </a>
            <a href="{base}/" class="tool-link">
                <span class="tool-icon">⌨️</span>
                <span class="tool-name">Shortcut Reference</span>
                <span class="tool-desc">DAW keyboard shortcuts</span>
            </a>
        </div>
    </section>
</main>

<style>
    .templates-page {
        max-width: 1200px;
        margin: 0 auto;
        padding: var(--space-6) var(--space-4);
        padding-bottom: calc(var(--player-height, 80px) + var(--space-8));
    }

    .page-header {
        text-align: center;
        margin-bottom: var(--space-8);
    }

    .page-header h1 {
        font-size: var(--font-3xl);
        color: var(--fg-primary);
        margin: 0 0 var(--space-3);
    }

    .subtitle {
        color: var(--fg-secondary);
        font-size: var(--font-lg);
        max-width: 600px;
        margin: 0 auto;
    }

    .quick-nav {
        display: flex;
        justify-content: center;
        gap: var(--space-3);
        flex-wrap: wrap;
        margin-bottom: var(--space-8);
    }

    .nav-chip {
        padding: var(--space-2) var(--space-4);
        border-radius: var(--radius-full);
        text-decoration: none;
        font-weight: 500;
        transition: transform 0.2s, box-shadow 0.2s;
    }

    .nav-chip:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
    }

    .nav-chip.drums {
        background: #ffebee;
        color: #c62828;
    }

    .nav-chip.melody {
        background: #e3f2fd;
        color: #1565c0;
    }

    .nav-chip.chords {
        background: #f3e5f5;
        color: #7b1fa2;
    }

    .template-section {
        margin-bottom: var(--space-10);
    }

    .section-header {
        margin-bottom: var(--space-5);
    }

    .section-header h2 {
        font-size: var(--font-xl);
        margin: 0 0 var(--space-2);
        color: var(--fg-primary);
    }

    .section-header p {
        color: var(--fg-secondary);
        margin: 0 0 var(--space-2);
    }

    .view-all {
        color: var(--accent-primary);
        text-decoration: none;
        font-weight: 500;
    }

    .view-all:hover {
        text-decoration: underline;
    }

    .template-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: var(--space-4);
    }

    .template-card {
        background: var(--bg-secondary);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-lg);
        overflow: hidden;
        transition: transform 0.2s, box-shadow 0.2s;
    }

    .template-card:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-lg);
    }

    .card-link {
        display: block;
        padding: var(--space-4);
        text-decoration: none;
        color: inherit;
    }

    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--space-2);
    }

    .type-badge {
        font-size: var(--font-xs);
        font-weight: 600;
        padding: var(--space-1) var(--space-2);
        border-radius: var(--radius-sm);
        text-transform: uppercase;
    }

    .type-badge.drums {
        background: #ffcdd2;
        color: #c62828;
    }

    .type-badge.melody {
        background: #bbdefb;
        color: #1565c0;
    }

    .type-badge.chord {
        background: #e1bee7;
        color: #7b1fa2;
    }

    .difficulty {
        font-size: var(--font-xs);
        padding: var(--space-1) var(--space-2);
        border-radius: var(--radius-sm);
        background: var(--bg-tertiary);
        color: var(--fg-secondary);
    }

    .difficulty.beginner {
        background: #e8f5e9;
        color: #2e7d32;
    }

    .difficulty.intermediate {
        background: #fff3e0;
        color: #ef6c00;
    }

    .difficulty.advanced {
        background: #fce4ec;
        color: #c2185b;
    }

    .template-card h3 {
        font-size: var(--font-lg);
        margin: 0 0 var(--space-2);
        color: var(--fg-primary);
    }

    .description {
        color: var(--fg-secondary);
        font-size: var(--font-sm);
        margin: 0 0 var(--space-3);
        line-height: 1.5;
    }

    .meta {
        display: flex;
        gap: var(--space-3);
        font-size: var(--font-xs);
        color: var(--fg-tertiary);
        margin-bottom: var(--space-3);
    }

    .tags {
        display: flex;
        gap: var(--space-1);
        flex-wrap: wrap;
    }

    .tag {
        font-size: 10px;
        padding: 2px 6px;
        background: var(--bg-tertiary);
        color: var(--fg-secondary);
        border-radius: var(--radius-sm);
    }

    .related-tools {
        background: var(--bg-secondary);
        border-radius: var(--radius-lg);
        padding: var(--space-6);
        text-align: center;
    }

    .related-tools h2 {
        font-size: var(--font-lg);
        margin: 0 0 var(--space-4);
        color: var(--fg-primary);
    }

    .tools-grid {
        display: flex;
        justify-content: center;
        gap: var(--space-4);
        flex-wrap: wrap;
    }

    .tool-link {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: var(--space-4);
        background: var(--bg-primary);
        border-radius: var(--radius-md);
        text-decoration: none;
        min-width: 150px;
        transition: transform 0.2s;
    }

    .tool-link:hover {
        transform: translateY(-2px);
    }

    .tool-icon {
        font-size: 32px;
        margin-bottom: var(--space-2);
    }

    .tool-name {
        font-weight: 600;
        color: var(--fg-primary);
    }

    .tool-desc {
        font-size: var(--font-xs);
        color: var(--fg-secondary);
    }

    @media (max-width: 640px) {
        .templates-page {
            padding: var(--space-4) var(--space-3);
        }

        .page-header h1 {
            font-size: var(--font-2xl);
        }

        .template-grid {
            grid-template-columns: 1fr;
        }

        .quick-nav {
            flex-direction: column;
            align-items: center;
        }
    }
</style>


<!--
  Chord Templates Category Page
  SEO-optimized listing of all chord progression templates
-->
<script lang="ts">
    import { base } from '$app/paths';
    import type { BuiltInTemplate } from '$lib/storage/builtinTemplates';

    export let data: { templates: BuiltInTemplate[] };

    const pageTitle = 'Free Chord Progression Templates | Music Theory';
    const pageDescription = 'Learn popular chord progressions from pop to jazz. Download free templates and export as MIDI for songwriting and music production.';
</script>

<svelte:head>
    <title>{pageTitle}</title>
    <meta name="description" content={pageDescription} />
    <link rel="canonical" href="https://producerhub.ecent.online/templates/chords" />
    <meta property="og:title" content={pageTitle} />
    <meta property="og:description" content={pageDescription} />
    <meta property="og:type" content="website" />
    <meta name="keywords" content="chord progressions, music theory, I-V-vi-IV, jazz chords, songwriting, MIDI chords, harmony" />
    {@html `<script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Chord Progression Templates",
        "description": "${pageDescription}",
        "numberOfItems": ${data.templates.length},
        "itemListElement": [
            ${data.templates.map((t, i) => `{
                "@type": "ListItem",
                "position": ${i + 1},
                "name": "${t.name}",
                "url": "https://producerhub.ecent.online/templates/${t.slug}"
            }`).join(',')}
        ]
    }
    </script>`}
</svelte:head>

<main class="category-page">
    <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="{base}/templates">Templates</a>
        <span>/</span>
        <span>Chords</span>
    </nav>

    <header class="page-header">
        <span class="category-icon">🎵</span>
        <h1>Chord Progression Templates</h1>
        <p>{data.templates.length} essential progressions for songwriting</p>
    </header>

    <div class="theory-note">
        <span class="icon">📚</span>
        <p>Chord progressions are the harmonic foundation of songs. Each template shows the roman numeral analysis so you can transpose to any key.</p>
    </div>

    <div class="template-grid">
        {#each data.templates as template}
            <article class="template-card">
                <a href="{base}/templates/{template.slug}" class="card-link">
                    <div class="card-header">
                        <span class="difficulty {template.difficulty}">{template.difficulty}</span>
                        <span class="genre">{template.genre}</span>
                    </div>
                    <h2>{template.name}</h2>
                    <p>{template.description}</p>
                    <div class="meta">
                        <span>{template.key} {template.scaleType}</span>
                        <span>{template.bpm} BPM</span>
                        <span>{template.bars} bars</span>
                    </div>
                    <div class="tags">
                        {#each template.tags.slice(0, 4) as tag}
                            <span class="tag">{tag}</span>
                        {/each}
                    </div>
                </a>
            </article>
        {/each}
    </div>

    <nav class="internal-links">
        <a href="{base}/templates">← All Templates</a>
        <a href="{base}/templates/drums">Drum Templates</a>
        <a href="{base}/templates/melody">Melody Templates</a>
        <a href="{base}/arrange">Lane Builder</a>
    </nav>
</main>

<style>
    .category-page {
        max-width: 1000px;
        margin: 0 auto;
        padding: var(--space-6) var(--space-4);
    }

    .breadcrumb {
        display: flex;
        gap: var(--space-2);
        font-size: var(--font-sm);
        color: var(--fg-secondary);
        margin-bottom: var(--space-6);
    }

    .breadcrumb a {
        color: var(--accent-primary);
        text-decoration: none;
    }

    .page-header {
        text-align: center;
        margin-bottom: var(--space-6);
    }

    .category-icon {
        font-size: 64px;
        display: block;
        margin-bottom: var(--space-3);
    }

    .page-header h1 {
        font-size: var(--font-2xl);
        margin: 0 0 var(--space-2);
        color: var(--fg-primary);
    }

    .page-header p {
        color: var(--fg-secondary);
    }

    .theory-note {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        background: linear-gradient(135deg, #f3e5f5, #e1bee7);
        border-radius: var(--radius-md);
        padding: var(--space-4);
        margin-bottom: var(--space-6);
    }

    .theory-note .icon {
        font-size: 24px;
    }

    .theory-note p {
        margin: 0;
        color: #7b1fa2;
        font-size: var(--font-sm);
    }

    .template-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: var(--space-4);
        margin-bottom: var(--space-8);
    }

    .template-card {
        background: var(--bg-secondary);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-lg);
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
        margin-bottom: var(--space-2);
    }

    .difficulty {
        font-size: var(--font-xs);
        padding: 2px 8px;
        border-radius: var(--radius-sm);
    }

    .difficulty.beginner { background: #e8f5e9; color: #2e7d32; }
    .difficulty.intermediate { background: #fff3e0; color: #ef6c00; }
    .difficulty.advanced { background: #fce4ec; color: #c2185b; }

    .genre {
        font-size: var(--font-xs);
        color: var(--fg-tertiary);
        font-weight: 500;
    }

    .template-card h2 {
        font-size: var(--font-lg);
        margin: 0 0 var(--space-2);
        color: var(--fg-primary);
    }

    .template-card p {
        font-size: var(--font-sm);
        color: var(--fg-secondary);
        margin: 0 0 var(--space-3);
    }

    .meta {
        display: flex;
        gap: var(--space-3);
        font-size: var(--font-xs);
        color: var(--fg-tertiary);
        margin-bottom: var(--space-2);
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
        border-radius: var(--radius-sm);
        color: var(--fg-secondary);
    }

    .internal-links {
        display: flex;
        justify-content: center;
        gap: var(--space-4);
        flex-wrap: wrap;
        padding: var(--space-4);
        background: var(--bg-secondary);
        border-radius: var(--radius-md);
    }

    .internal-links a {
        color: var(--accent-primary);
        text-decoration: none;
        font-size: var(--font-sm);
    }

    .internal-links a:hover {
        text-decoration: underline;
    }
</style>


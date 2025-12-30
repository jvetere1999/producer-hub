<!--
  ProgressionSelector Component

  Chord progression template selector with genre filtering.

  @component
-->
<script lang="ts">
    import {
        type ChordProgressionTemplate,
        PROGRESSION_TEMPLATES,
        getGenres,
        getTemplatesByGenre,
    } from '$lib/melody';

    export let selectedTemplateId: string | null = null;
    export let onselect: ((template: ChordProgressionTemplate) => void) | undefined = undefined;

    let selectedGenre: string | null = null;

    $: genres = getGenres();
    $: templates = selectedGenre
        ? getTemplatesByGenre(selectedGenre)
        : PROGRESSION_TEMPLATES;

    function handleGenreClick(genre: string | null) {
        selectedGenre = genre === selectedGenre ? null : genre;
    }

    function handleTemplateClick(template: ChordProgressionTemplate) {
        selectedTemplateId = template.id;
        onselect?.(template);
    }
</script>

<div class="progression-selector">
    <div class="section-header">
        <h4>Progressions</h4>
    </div>

    <!-- Genre filters -->
    <div class="genre-filters" role="group" aria-label="Genre filter">
        <button
            class="genre-btn"
            class:active={selectedGenre === null}
            onclick={() => handleGenreClick(null)}
        >
            All
        </button>
        {#each genres as genre}
            <button
                class="genre-btn"
                class:active={selectedGenre === genre}
                onclick={() => handleGenreClick(genre)}
            >
                {genre}
            </button>
        {/each}
    </div>

    <!-- Template list -->
    <div class="template-list">
        {#each templates as template (template.id)}
            <button
                class="template-item"
                class:selected={selectedTemplateId === template.id}
                onclick={() => handleTemplateClick(template)}
                title={template.description}
            >
                <span class="template-name">{template.name}</span>
                <span class="template-numerals">{template.numerals.join(' → ')}</span>
            </button>
        {/each}
    </div>
</div>

<style>
    .progression-selector {
        display: flex;
        flex-direction: column;
        gap: var(--space-3, 12px);
        padding: var(--space-3, 12px);
        background: var(--bg-secondary, #2d2d2d);
        border-radius: var(--radius-lg, 12px);
    }

    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .section-header h4 {
        margin: 0;
        font-size: var(--text-sm, 13px);
        font-weight: 600;
        color: var(--text-primary, #fff);
    }

    .genre-filters {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-1, 4px);
    }

    .genre-btn {
        padding: var(--space-1, 4px) var(--space-2, 8px);
        background: var(--bg-tertiary, #333);
        border: 1px solid var(--border-default, #444);
        border-radius: var(--radius-full, 999px);
        color: var(--text-secondary, #aaa);
        font-size: var(--text-xs, 11px);
        cursor: pointer;
        transition: all 0.15s;
    }

    .genre-btn:hover {
        border-color: var(--accent-primary, #ff764d);
        color: var(--text-primary, #fff);
    }

    .genre-btn.active {
        background: var(--accent-primary, #ff764d);
        border-color: var(--accent-primary, #ff764d);
        color: white;
    }

    .genre-btn:focus-visible {
        outline: 2px solid var(--accent-primary, #ff764d);
        outline-offset: 2px;
    }

    .template-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-1, 4px);
        max-height: 200px;
        overflow-y: auto;
    }

    .template-item {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: var(--space-2, 8px);
        background: var(--bg-tertiary, #333);
        border: 1px solid var(--border-subtle, #3a3a3a);
        border-radius: var(--radius-md, 8px);
        text-align: left;
        cursor: pointer;
        transition: all 0.15s;
    }

    .template-item:hover {
        border-color: var(--accent-secondary, #50b8b8);
        background: var(--surface-hover, #3d3d3d);
    }

    .template-item.selected {
        border-color: var(--accent-secondary, #50b8b8);
        background: rgba(80, 184, 184, 0.15);
    }

    .template-item:focus-visible {
        outline: 2px solid var(--accent-secondary, #50b8b8);
        outline-offset: 1px;
    }

    .template-name {
        font-size: var(--text-sm, 13px);
        font-weight: 500;
        color: var(--text-primary, #fff);
    }

    .template-numerals {
        font-size: var(--text-xs, 11px);
        color: var(--text-muted, #888);
        font-family: monospace;
    }
</style>


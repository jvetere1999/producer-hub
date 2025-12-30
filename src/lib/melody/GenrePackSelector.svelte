<!--
  GenrePackSelector Component

  Genre pack selector with filtering by genre.
  Selecting a pack instantly applies all settings.

  @component
-->
<script lang="ts">
    import {
        type GenrePack,
        GENRE_PACKS,
        getPackGenres,
        getPacksByGenre,
    } from '$lib/melody';

    export let selectedPackId: string | null = null;
    export let onselect: ((pack: GenrePack) => void) | undefined = undefined;

    let selectedGenre: string | null = null;

    $: genres = getPackGenres();
    $: packs = selectedGenre
        ? getPacksByGenre(selectedGenre)
        : GENRE_PACKS;

    function handleGenreClick(genre: string | null) {
        selectedGenre = genre === selectedGenre ? null : genre;
    }

    function handlePackClick(pack: GenrePack) {
        selectedPackId = pack.id;
        onselect?.(pack);
    }
</script>

<div class="genre-pack-selector">
    <div class="section-header">
        <h4>Genre Packs</h4>
        <span class="badge">Quick Start</span>
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

    <!-- Pack grid -->
    <div class="pack-grid">
        {#each packs as pack (pack.id)}
            <button
                class="pack-card"
                class:selected={selectedPackId === pack.id}
                onclick={() => handlePackClick(pack)}
                title={pack.description}
            >
                <span class="pack-icon">{pack.icon}</span>
                <div class="pack-info">
                    <span class="pack-name">{pack.name}</span>
                    <span class="pack-meta">{pack.bpm} BPM · {pack.scale.root} {pack.scale.type}</span>
                </div>
            </button>
        {/each}
    </div>
</div>

<style>
    .genre-pack-selector {
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

    .badge {
        padding: 2px 8px;
        background: var(--accent-primary, #ff764d);
        border-radius: var(--radius-full, 999px);
        font-size: 10px;
        font-weight: 600;
        color: white;
        text-transform: uppercase;
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

    .pack-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: var(--space-2, 8px);
        max-height: 240px;
        overflow-y: auto;
    }

    .pack-card {
        display: flex;
        align-items: center;
        gap: var(--space-2, 8px);
        padding: var(--space-2, 8px);
        background: var(--bg-tertiary, #333);
        border: 1px solid var(--border-subtle, #3a3a3a);
        border-radius: var(--radius-md, 8px);
        text-align: left;
        cursor: pointer;
        transition: all 0.15s;
    }

    .pack-card:hover {
        border-color: var(--accent-primary, #ff764d);
        background: var(--surface-hover, #3d3d3d);
    }

    .pack-card.selected {
        border-color: var(--accent-primary, #ff764d);
        background: rgba(255, 118, 77, 0.15);
    }

    .pack-card:focus-visible {
        outline: 2px solid var(--accent-primary, #ff764d);
        outline-offset: 1px;
    }

    .pack-icon {
        font-size: 20px;
        flex-shrink: 0;
    }

    .pack-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
    }

    .pack-name {
        font-size: var(--text-sm, 13px);
        font-weight: 500;
        color: var(--text-primary, #fff);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .pack-meta {
        font-size: var(--text-xs, 10px);
        color: var(--text-muted, #888);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    @media (max-width: 480px) {
        .pack-grid {
            grid-template-columns: 1fr 1fr;
        }
    }
</style>


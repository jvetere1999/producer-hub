<script lang="ts">
    import { onMount } from 'svelte';
    import { allProducts, allShortcuts, typesForProduct } from '$lib/shortcuts';
    import type { ShortcutWithProduct } from '$lib/types';
    import { loadFavorites, toggleFavorite } from '$lib/favorites';
    import { searchShortcutIds } from '$lib/search';
    import { getThemeChoice, setThemeChoice, applyTheme, watchSystemTheme, type ThemeChoice } from '$lib/theme';
    import { getKeyOSPreference, setKeyOSPreference, resolveKeysForOS, type KeyOS } from '$lib/platform';

    type ProductFilter = 'all' | (typeof allProducts)[number]['productId'];
    type TypeFilter = 'all' | string;

    let query = '';
    let product: ProductFilter = 'all';
    let type: TypeFilter = 'all';
    let favoritesOnly = false;

    let favorites = new Set<string>();

    let themeChoice: ThemeChoice = 'system';
    let keyOS: KeyOS = 'mac';

    let stopWatch = () => {};

    onMount(() => {
        favorites = loadFavorites();

        themeChoice = getThemeChoice();
        applyTheme(themeChoice);
        stopWatch = watchSystemTheme(themeChoice, () => applyTheme(themeChoice));

        keyOS = getKeyOSPreference();

        return () => stopWatch();
    });

    function cycleTheme() {
        const next: ThemeChoice =
            themeChoice === 'system' ? 'dark' : themeChoice === 'dark' ? 'light' : 'system';
        themeChoice = next;
        setThemeChoice(next);
        stopWatch();
        stopWatch = watchSystemTheme(themeChoice, () => applyTheme(themeChoice));
    }

    function toggleKeyOS() {
        keyOS = keyOS === 'mac' ? 'win' : 'mac';
        setKeyOSPreference(keyOS);
    }

    $: typeOptions = ['all', ...typesForProduct(product)];
    $: if (!typeOptions.includes(type)) type = 'all';

    function matchesFilters(s: ShortcutWithProduct) {
        if (product !== 'all' && s.productId !== product) return false;
        if (type !== 'all' && s.type !== type) return false;
        if (favoritesOnly && !favorites.has(s.id)) return false;
        return true;
    }

    function baseList(): ShortcutWithProduct[] {
        return allShortcuts
            .filter(matchesFilters)
            .sort((a, b) => (a.productName.localeCompare(b.productName) || a.command.localeCompare(b.command)));
    }

    function searchedList(): ShortcutWithProduct[] {
        const ids = searchShortcutIds(query, allShortcuts, { limit: 300, fuzzy: true });
        if (ids.length === 0) return [];

        const rank = new Map<string, number>();
        ids.forEach((id, i) => rank.set(id, i));

        return allShortcuts
            .filter((s) => rank.has(s.id))
            .filter(matchesFilters)
            .sort((a, b) => (rank.get(a.id)! - rank.get(b.id)!) || a.command.localeCompare(b.command));
    }

    // Include filter vars to ensure reactivity picks them up
    $: results = (() => {
        // Reference all reactive dependencies
        void product; void type; void favoritesOnly; void favorites;
        return query.trim() ? searchedList() : baseList();
    })();

    function onToggleFav(id: string) {
        favorites = toggleFavorite(favorites, id);
    }

    function prettyType(t: string) {
        return t.replace(/[-_]/g, ' ');
    }

    function keysFor(s: ShortcutWithProduct) {
        return resolveKeysForOS(s, keyOS);
    }
</script>

<svelte:head>
    <title>DAW Shortcuts</title>
</svelte:head>

<style>
    :global(html) {
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji',
        'Segoe UI Emoji';
    }
    :global(html[data-theme='dark']) {
        color-scheme: dark;
    }
    :global(body) {
        margin: 0;
        background: var(--bg);
        color: var(--fg);
    }

    :global(html[data-theme='light']) {
        --bg: #ffffff;
        --fg: #121212;
        --muted: #666;
        --card: #f6f6f6;
        --border: rgba(0, 0, 0, 0.12);
        --accent: rgba(0, 0, 0, 0.06);
    }

    :global(html[data-theme='dark']) {
        --bg: #0f0f10;
        --fg: #f2f2f2;
        --muted: #a7a7a7;
        --card: #151518;
        --border: rgba(255, 255, 255, 0.14);
        --accent: rgba(255, 255, 255, 0.08);
    }

    .wrap {
        max-width: 980px;
        margin: 0 auto;
        padding: 16px;
    }

    header {
        display: flex;
        gap: 12px;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
    }

    .title {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .title h1 {
        margin: 0;
        font-size: 18px;
        letter-spacing: -0.01em;
    }
    .title p {
        margin: 0;
        color: var(--muted);
        font-size: 12px;
    }

    .controls {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
    }

    .searchRow {
        margin-top: 12px;
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        align-items: center;
    }

    input[type='text'] {
        flex: 1 1 360px;
        padding: 10px 12px;
        border-radius: 10px;
        border: 1px solid var(--border);
        background: transparent;
        color: inherit;
        outline: none;
    }

    select, button {
        padding: 10px 12px;
        border-radius: 10px;
        border: 1px solid var(--border);
        background: transparent;
        color: inherit;
        cursor: pointer;
    }

    .pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        border-radius: 999px;
        border: 1px solid var(--border);
        background: transparent;
    }

    .checkbox {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        border-radius: 999px;
        border: 1px solid var(--border);
    }

    .list {
        margin-top: 14px;
        display: grid;
        gap: 10px;
    }

    .card {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 12px;
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 10px;
    }

    .cmd {
        font-size: 14px;
        font-weight: 600;
        margin: 0;
    }

    .meta {
        margin-top: 4px;
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        color: var(--muted);
        font-size: 12px;
    }

    .keys {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
        background: var(--accent);
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 8px 10px;
        font-size: 12px;
        align-self: start;
        white-space: nowrap;
    }

    .star {
        border: 1px solid var(--border);
        background: transparent;
        border-radius: 10px;
        padding: 8px 10px;
        font-size: 12px;
        min-width: 74px;
    }

    .tags {
        margin-top: 8px;
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
    }
    .tag {
        font-size: 11px;
        color: var(--muted);
        border: 1px solid var(--border);
        padding: 3px 8px;
        border-radius: 999px;
    }

    .footerRow {
        margin-top: 10px;
        color: var(--muted);
        font-size: 12px;
        display: flex;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 8px;
    }
</style>

<div class="wrap">
    <header>
        <div class="title">
            <h1>DAW Shortcuts</h1>
            <p>Searchable shortcuts. Keys adapt to macOS/Windows display.</p>
        </div>

        <div class="controls">
            <button on:click={toggleKeyOS} title="Toggle key display OS">
                Keys: {keyOS === 'mac' ? 'macOS' : 'Windows'}
            </button>

            <button on:click={cycleTheme} title="Cycle theme (system/dark/light)">
                Theme: {themeChoice}
            </button>

            <label class="checkbox" title="Show favorites only">
                <input data-testid="favorites-only" type="checkbox" bind:checked={favoritesOnly} />
                Favorites only
            </label>
        </div>
    </header>

    <div class="searchRow">
        <input type="text" placeholder="Search (command, keys, tags, context, product)..." bind:value={query} />

        <select data-testid="product-filter" bind:value={product} title="Filter by product">
            <option value="all">All products</option>
            {#each allProducts as p}
                <option value={p.productId}>{p.name}</option>
            {/each}
        </select>

        <select bind:value={type} title="Filter by type">
            {#each typeOptions as t}
                <option value={t}>{t === 'all' ? 'All types' : prettyType(t)}</option>
            {/each}
        </select>
    </div>

    <div class="footerRow">
        <div data-testid="results-count">{results.length} result{results.length === 1 ? '' : 's'}</div>
        <div>Tip: Search keys like “⌘J” or “Ctrl+J”.</div>
    </div>

    <div class="list">
        {#if results.length === 0}
            <div class="pill">No shortcuts match your search/filters.</div>
        {:else}
            {#each results as s (s.id)}
                <div class="card">
                    <div>
                        <p class="cmd">{s.command}</p>
                        <div class="meta">
                            <span>{s.productName}</span>
                            <span>•</span>
                            <span>{prettyType(s.type)}</span>
                            {#if s.context}
                                <span>•</span>
                                <span>{s.context}</span>
                            {/if}
                        </div>

                        {#if s.tags?.length}
                            <div class="tags">
                                {#each s.tags as tag}
                                    <span class="tag">{tag}</span>
                                {/each}
                            </div>
                        {/if}
                    </div>

                    <div style="display:flex; flex-direction:column; gap:8px; align-items:flex-end;">
                        <div class="keys">{keysFor(s)}</div>
                        <button class="star" on:click={() => onToggleFav(s.id)}>
                            {favorites.has(s.id) ? '★ Starred' : '☆ Star'}
                        </button>
                    </div>
                </div>
            {/each}
        {/if}
    </div>
</div>

<!--
  Main Page Component

  This is the primary UI for Producer Hub, providing:
  - Full-text search across all entries (commands, keys, tags, notes, etc.)
  - Filtering by product, type, group, facets, and entry kind
  - Favorites management with localStorage persistence
  - Theme switching (system/light/dark)
  - Platform-aware key display (Mac/Windows)

  State Management:
  - URL state: Not persisted (resets on reload)
  - Favorites: Persisted in localStorage
  - Theme: Persisted in localStorage
  - Platform: Persisted in localStorage

  Data Flow:
  1. allShortcuts loaded from lib/shortcuts.ts (includes shortcuts + features)
  2. Filters applied via filterShortcuts()
  3. Search results ranked via searchShortcutIds()
  4. Results grouped by group field for display
-->
<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { allProducts, allShortcuts, typesForProduct, groupsForProduct, facetsForProduct, kindsForProduct } from '$lib/shortcuts';
    import type { ShortcutWithProduct } from '$lib/types';
    import { loadFavorites, toggleFavorite } from '$lib/favorites';
    import { searchShortcutIds } from '$lib/search';
    import { getThemeChoice, setThemeChoice, applyTheme, watchSystemTheme, type ThemeChoice } from '$lib/theme';
    import { getKeyOSPreference, setKeyOSPreference, resolveKeysForOS, type KeyOS } from '$lib/platform';
    import { filterShortcuts, groupShortcutsByGroup } from '$lib/filter';
    import KeyCaps from '$lib/components/KeyCaps.svelte';
    import InfoBase from '$lib/components/InfoBase.svelte';
    import CommandPalette from '$lib/components/CommandPalette.svelte';
    import Projects from '$lib/components/Projects.svelte';
    import Inbox from '$lib/components/Inbox.svelte';
    import References from '$lib/components/References.svelte';
    import Collections from '$lib/components/Collections.svelte';
    import GlobalSearch from '$lib/components/GlobalSearch.svelte';
    import SEOHead from '$lib/components/SEOHead.svelte';
    import { pageMeta, getWebSiteSchema, getSoftwareAppSchema } from '$lib/seo';
    import { base } from '$app/paths';
    import {
        initGlobalKeyboard,
        registerDefaultCommands,
        registerCreateCommands,
        setPlayPauseCallback,
        setAddMarkerCallback
    } from '$lib/hub';

    // ============================================
    // Filter State Types
    // ============================================
    type ProductFilter = 'all' | (typeof allProducts)[number]['productId'];
    type TypeFilter = 'all' | string;
    type GroupFilter = 'all' | string;
    type KindFilter = 'all' | 'shortcut' | 'feature';

    // ============================================
    // Reactive State
    // ============================================

    /** Search query string */
    let query = '';
    /** Selected product filter */
    let product: ProductFilter = 'all';
    /** Selected type filter */
    let type: TypeFilter = 'all';
    /** Selected group filter */
    let group: GroupFilter = 'all';
    /** Selected entry kind filter */
    let kind: KindFilter = 'all';
    /** Selected facets (AND logic) */
    let selectedFacets: string[] = [];
    /** Show only favorites */
    let favoritesOnly = false;

    /** Set of favorited entry IDs */
    let favorites = new Set<string>();

    /** Current theme choice */
    let themeChoice: ThemeChoice = 'system';
    /** Current key display OS */
    let keyOS: KeyOS = 'mac';

    /** Active tab */
    let activeTab: 'shortcuts' | 'infobase' | 'projects' | 'inbox' | 'references' | 'collections' | 'search' = 'shortcuts';

    /** Command palette open state */
    let commandPaletteOpen = false;

    /** Cleanup function for system theme watcher */
    let stopWatch = () => {};

    /** Cleanup function for keyboard handler */
    let stopKeyboard = () => {};

    // ============================================
    // Tab Persistence
    // ============================================

    const TAB_STORAGE_KEY = 'producerhub_active_tab';
    const VALID_TABS = ['shortcuts', 'infobase', 'projects', 'inbox', 'references', 'collections', 'search'] as const;

    function loadActiveTab(): typeof activeTab {
        try {
            const stored = localStorage.getItem(TAB_STORAGE_KEY);
            if (stored && VALID_TABS.includes(stored as any)) {
                return stored as typeof activeTab;
            }
        } catch (e) {
            // Ignore localStorage errors
        }
        return 'shortcuts';
    }

    function saveActiveTab(tab: typeof activeTab) {
        try {
            localStorage.setItem(TAB_STORAGE_KEY, tab);
        } catch (e) {
            // Ignore localStorage errors
        }
    }

    // Save tab whenever it changes
    $: saveActiveTab(activeTab);

    // ============================================
    // Lifecycle
    // ============================================

    onMount(() => {
        // Load persisted state
        favorites = loadFavorites();
        themeChoice = getThemeChoice();
        applyTheme(themeChoice);
        stopWatch = watchSystemTheme(themeChoice, () => applyTheme(themeChoice));
        keyOS = getKeyOSPreference();
        activeTab = loadActiveTab();

        // Initialize hub commands
        registerDefaultCommands((tab) => {
            activeTab = tab as typeof activeTab;
        });

        registerCreateCommands(
            () => { activeTab = 'projects'; },
            () => { activeTab = 'infobase'; },
            () => { activeTab = 'collections'; },
            () => { activeTab = 'inbox'; }
        );

        // Initialize global keyboard shortcuts
        stopKeyboard = initGlobalKeyboard();

        return () => {
            stopWatch();
            stopKeyboard();
        };
    });

    // ============================================
    // Event Handlers
    // ============================================

    /** Cycles through theme options: system → dark → light → system */
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

    function toggleFacet(facet: string) {
        if (selectedFacets.includes(facet)) {
            selectedFacets = selectedFacets.filter(f => f !== facet);
        } else {
            selectedFacets = [...selectedFacets, facet];
        }
    }

    $: typeOptions = ['all', ...typesForProduct(product)];
    $: if (!typeOptions.includes(type)) type = 'all';

    $: groupOptions = ['all', ...groupsForProduct(product)];
    $: if (!groupOptions.includes(group)) group = 'all';

    $: kindOptions = kindsForProduct(product);
    $: if (kind !== 'all' && !kindOptions.includes(kind)) kind = 'all';

    $: facetOptions = facetsForProduct(product);
    // Reset facets if product changes and selected facets are no longer available
    $: {
        const available = new Set(facetOptions);
        selectedFacets = selectedFacets.filter(f => available.has(f));
    }

    function getFilteredList(): ShortcutWithProduct[] {
        return filterShortcuts(allShortcuts, {
            productId: product,
            type,
            group,
            kind: kind as 'shortcut' | 'feature' | 'all',
            facets: selectedFacets,
            favoriteIds: favorites,
            favoritesOnly
        });
    }

    function baseList(): ShortcutWithProduct[] {
        return getFilteredList()
            .sort((a, b) => (a.group.localeCompare(b.group) || a.productName.localeCompare(b.productName) || a.command.localeCompare(b.command)));
    }

    function searchedList(): ShortcutWithProduct[] {
        const ids = searchShortcutIds(query, allShortcuts, { limit: 300, fuzzy: true });
        if (ids.length === 0) return [];

        const rank = new Map<string, number>();
        ids.forEach((id, i) => rank.set(id, i));

        return getFilteredList()
            .filter((s) => rank.has(s.id))
            .sort((a, b) => (rank.get(a.id)! - rank.get(b.id)!) || a.command.localeCompare(b.command));
    }

    // Include filter vars to ensure reactivity picks them up
    $: results = (() => {
        // Reference all reactive dependencies
        void product; void type; void group; void kind; void selectedFacets; void favoritesOnly; void favorites;
        return query.trim() ? searchedList() : baseList();
    })();

    // Group results by group for display
    $: groupedResults = groupShortcutsByGroup(results);
    $: sortedGroupNames = [...groupedResults.keys()].sort((a, b) => a.localeCompare(b));

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

<SEOHead
    title={pageMeta.home.title}
    description={pageMeta.home.description}
    path="/"
    keywords={pageMeta.home.keywords || []}
    ogType="website"
    includeWebsiteSchema={true}
    structuredData={[getSoftwareAppSchema()]}
/>

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

    /* Tab Navigation */
    .tabs {
        display: flex;
        gap: 0;
        margin-top: 16px;
        border-bottom: 1px solid var(--border);
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
    }

    .tab {
        padding: 12px 20px;
        border: none;
        background: transparent;
        color: var(--muted);
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        border-bottom: 2px solid transparent;
        margin-bottom: -1px;
        transition: color 0.15s, border-color 0.15s;
        white-space: nowrap;
    }

    .tab:hover {
        color: var(--fg);
    }

    .tab.active {
        color: var(--fg);
        border-bottom-color: var(--fg);
    }

    .tab-content {
        margin-top: 16px;
    }

    .hub-tab {
        min-height: 600px;
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

    .filterRow {
        margin-top: 10px;
        display: flex;
        gap: 10px;
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
        margin-top: 16px;
        display: grid;
        gap: 14px;
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

    .card-left {
        display: flex;
        gap: 12px;
        align-items: flex-start;
    }

    .product-icon {
        width: 28px;
        height: 28px;
        border-radius: 6px;
        flex-shrink: 0;
    }

    .card-content {
        flex: 1;
        min-width: 0;
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

    .description {
        margin: 8px 0 0;
        font-size: 12px;
        color: var(--muted);
        line-height: 1.4;
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

    .facetRow {
        margin-top: 8px;
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        align-items: center;
    }

    .facetLabel {
        color: var(--muted);
        font-size: 12px;
    }

    .facetChip {
        padding: 8px 10px;
        border-radius: 999px;
        border: 1px solid var(--border);
        background: transparent;
        color: inherit;
        cursor: pointer;
        font-size: 12px;
    }

    .facetChip.selected {
        background: var(--accent);
    }

    .groupSection {
        margin-top: 16px;
    }

    .groupHeader {
        font-size: 16px;
        font-weight: 500;
        margin: 0 0 8px 0;
        color: var(--fg);
    }

    .tagsRow {
        margin-top: 8px;
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: flex-start;
    }

    .tags {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
    }

    .facets {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
    }

    .facet {
        font-size: 11px;
        color: var(--muted);
        border: 1px solid var(--border);
        padding: 3px 8px;
        border-radius: 999px;
    }

    .cmdRow {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 4px;
        flex-wrap: wrap;
    }

    .kindBadge {
        font-size: 10px;
        padding: 3px 8px;
        border-radius: 4px;
        text-transform: uppercase;
        font-weight: 600;
        letter-spacing: 0.5px;
        flex-shrink: 0;
        margin-top: 1px; /* Align with text baseline */
    }

    .kindBadge.shortcut {
        background: rgba(59, 130, 246, 0.15);
        color: rgb(59, 130, 246);
        border: 1px solid rgba(59, 130, 246, 0.3);
    }

    .kindBadge.feature {
        background: rgba(168, 85, 247, 0.15);
        color: rgb(168, 85, 247);
        border: 1px solid rgba(168, 85, 247, 0.3);
    }

    .note {
        margin-top: 10px;
        font-size: 12px;
        color: var(--muted);
        line-height: 1.5;
        padding: 10px;
        background: var(--accent);
        border-radius: 8px;
        border: 1px solid var(--border);
        word-break: break-word;
    }

    .defaultVal {
        margin-top: 8px;
        font-size: 11px;
        color: var(--muted);
        line-height: 1.4;
        word-break: break-word;
    }

    /* Responsive improvements for better spacing and layout */
    @media (max-width: 768px) {
        .card {
            padding: 12px;
            gap: 12px;
        }

        .card-left {
            gap: 10px;
        }

        .product-icon {
            width: 28px;
            height: 28px;
        }

        .cmd {
            font-size: 13px;
        }

        .meta {
            gap: 6px;
            font-size: 11px;
        }

        .cmdRow {
            gap: 8px;
        }

        .kindBadge {
            padding: 2px 6px;
            font-size: 9px;
        }
    }

    @media (max-width: 480px) {
        .card {
            grid-template-columns: 1fr;
            gap: 10px;
        }

        .card-left {
            gap: 8px;
        }

        .product-icon {
            width: 24px;
            height: 24px;
        }

        .list {
            gap: 12px;
        }
    }
</style>

<div class="wrap">
    <header>
        <div class="title">
            <h1>🎵 Producer Hub</h1>
            <p>Your comprehensive music production workspace</p>
        </div>

        <div class="controls">
            <button on:click={toggleKeyOS} title="Toggle key display OS">
                Keys: {keyOS === 'mac' ? 'macOS' : 'Windows'}
            </button>

            <button on:click={cycleTheme} title="Cycle theme (system/dark/light)">
                Theme: {themeChoice}
            </button>
        </div>
    </header>

    <!-- Tab Navigation -->
    <nav class="tabs">
        <button
            class="tab"
            class:active={activeTab === 'shortcuts'}
            on:click={() => activeTab = 'shortcuts'}
            data-testid="tab-shortcuts"
        >
            ⌨ Shortcuts
        </button>
        <button
            class="tab"
            class:active={activeTab === 'infobase'}
            on:click={() => activeTab = 'infobase'}
            data-testid="tab-infobase"
        >
            ✎ Info Base
        </button>
        <button
            class="tab"
            class:active={activeTab === 'projects'}
            on:click={() => activeTab = 'projects'}
            data-testid="tab-projects"
        >
            ◈ Projects
        </button>
        <button
            class="tab"
            class:active={activeTab === 'inbox'}
            on:click={() => activeTab = 'inbox'}
            data-testid="tab-inbox"
        >
            ◉ Inbox
        </button>
        <button
            class="tab"
            class:active={activeTab === 'references'}
            on:click={() => activeTab = 'references'}
            data-testid="tab-references"
        >
            ♫ References
        </button>
        <button
            class="tab"
            class:active={activeTab === 'collections'}
            on:click={() => activeTab = 'collections'}
            data-testid="tab-collections"
        >
            ◆ Collections
        </button>
        <button
            class="tab"
            class:active={activeTab === 'search'}
            on:click={() => activeTab = 'search'}
            data-testid="tab-search"
        >
            ⚲ Search
        </button>
    </nav>

    <!-- Shortcuts Tab -->
    {#if activeTab === 'shortcuts'}
    <div class="tab-content" data-testid="shortcuts-tab-content">
        <div class="searchRow">
            <input type="text" placeholder="Search (command, keys, tags, context, product, group, facets)..." bind:value={query} />

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

            <select data-testid="group-filter" bind:value={group} title="Filter by group">
                {#each groupOptions as g}
                    <option value={g}>{g === 'all' ? 'All groups' : g}</option>
                {/each}
            </select>

            {#if kindOptions.length > 1}
                <select data-testid="kind-filter" bind:value={kind} title="Filter by entry type">
                    <option value="all">All entries</option>
                    <option value="shortcut">Shortcuts only</option>
                    <option value="feature">Features only</option>
                </select>
            {/if}
        </div>

        <div class="filterRow">
            <label class="checkbox" title="Show favorites only">
                <input data-testid="favorites-only" type="checkbox" bind:checked={favoritesOnly} />
                Favorites only
            </label>
        </div>

    {#if facetOptions.length > 0}
        <div class="facetRow" data-testid="facet-filter">
            <span class="facetLabel">Facets:</span>
            {#each facetOptions as facet}
                <button
                    class="facetChip"
                    class:selected={selectedFacets.includes(facet)}
                    on:click={() => toggleFacet(facet)}
                    title={selectedFacets.includes(facet) ? `Remove ${facet} filter` : `Filter by ${facet}`}
                >
                    {facet}
                </button>
            {/each}
        </div>
    {/if}

    <div class="footerRow">
        <div data-testid="results-count">{results.length} result{results.length === 1 ? '' : 's'}</div>
        <div>Tip: Search keys like "⌘J" or "Ctrl+J".</div>
    </div>

    <div class="list">
        {#if results.length === 0}
            <div class="pill">No shortcuts match your search/filters.</div>
        {:else}
            {#each sortedGroupNames as groupName}
                <div class="groupSection">
                    <h2 class="groupHeader" data-testid="group-header">{groupName}</h2>
                    {#each groupedResults.get(groupName) ?? [] as s (s.id)}
                        <div class="card">
                            <div class="card-left">
                                {#if s.productIcon}
                                    <img class="product-icon" src={base + s.productIcon} alt={s.productName} data-testid="product-icon" />
                                {/if}
                                <div class="card-content">
                                    <div class="cmdRow">
                                        <p class="cmd">{s.command}</p>
                                        {#if s.kind === 'feature'}
                                            <span class="kindBadge feature" data-testid="kind-badge">Feature</span>
                                        {:else}
                                            <span class="kindBadge shortcut" data-testid="kind-badge">Shortcut</span>
                                        {/if}
                                    </div>
                                    <div class="meta">
                                        <span>{s.productName}</span>
                                        <span>•</span>
                                        <span>{prettyType(s.type)}</span>
                                        {#if s.context}
                                            <span>•</span>
                                            <span>{s.context}</span>
                                        {/if}
                                    </div>

                                    {#if s.description}
                                        <p class="description">{s.description}</p>
                                    {/if}

                                    {#if s.note}
                                        <div class="note" data-testid="feature-note">{s.note}</div>
                                    {/if}

                                    {#if s.default}
                                        <div class="defaultVal" data-testid="feature-default">
                                            <strong>Default:</strong> {s.default}
                                        </div>
                                    {/if}

                                    <div class="tagsRow">
                                        {#if s.tags?.length}
                                            <div class="tags">
                                                {#each s.tags as tag}
                                                    <span class="tag">{tag}</span>
                                                {/each}
                                            </div>
                                        {/if}
                                        {#if s.facets?.length}
                                            <div class="facets">
                                                {#each s.facets as facet}
                                                    <span class="facet" data-testid="shortcut-facet">{facet}</span>
                                                {/each}
                                            </div>
                                        {/if}
                                    </div>
                                </div>
                            </div>

                            <div style="display:flex; flex-direction:column; gap:8px; align-items:flex-end;">
                                <KeyCaps keys={keysFor(s)} />
                                <button class="star" on:click={() => onToggleFav(s.id)}>
                                    {favorites.has(s.id) ? '★ Starred' : '☆ Star'}
                                </button>
                            </div>
                        </div>
                    {/each}
                </div>
            {/each}
        {/if}
    </div>
    </div>
    {/if}

    <!-- Info Base Tab -->
    {#if activeTab === 'infobase'}
    <div class="tab-content" data-testid="infobase-tab-content">
        <InfoBase />
    </div>
    {/if}

    <!-- Projects Tab -->
    {#if activeTab === 'projects'}
    <div class="tab-content hub-tab" data-testid="projects-tab-content">
        <Projects />
    </div>
    {/if}

    <!-- Inbox Tab -->
    {#if activeTab === 'inbox'}
    <div class="tab-content" data-testid="inbox-tab-content">
        <Inbox />
    </div>
    {/if}

    <!-- References Tab -->
    {#if activeTab === 'references'}
    <div class="tab-content hub-tab" data-testid="references-tab-content">
        <References />
    </div>
    {/if}

    <!-- Collections Tab -->
    {#if activeTab === 'collections'}
    <div class="tab-content hub-tab" data-testid="collections-tab-content">
        <Collections />
    </div>
    {/if}

    <!-- Search Tab -->
    {#if activeTab === 'search'}
    <div class="tab-content" data-testid="search-tab-content">
        <GlobalSearch on:navigate={(e) => activeTab = e.detail.tab as typeof activeTab} />
    </div>
    {/if}
</div>

<!-- Command Palette -->
<CommandPalette bind:open={commandPaletteOpen} />

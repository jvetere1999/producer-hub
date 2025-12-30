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
    import { allProducts, allShortcuts } from '$lib/shortcuts';
    import type { ShortcutWithProduct } from '$lib/types';
    import { loadFavorites, toggleFavorite } from '$lib/favorites';
    import { searchShortcutIds } from '$lib/search';
    import { initThemeSystem, loadThemePreferences } from '$lib/themes';
    import { getKeyOSPreference, setKeyOSPreference, resolveKeysForOS, type KeyOS } from '$lib/platform';
    import { filterShortcuts, groupShortcutsByGroup } from '$lib/filter';
    import { loadOnboardingSettings } from '$lib/onboarding';
    import KeyCaps from '$lib/components/KeyCaps.svelte';
    import InfoBase from '$lib/components/InfoBase.svelte';
    import CommandPalette from '$lib/components/CommandPalette.svelte';
    import Projects from '$lib/components/Projects.svelte';
    import Inbox from '$lib/components/Inbox.svelte';
    import References from '$lib/components/References.svelte';
    import Collections from '$lib/components/Collections.svelte';
    import GlobalSearch from '$lib/components/GlobalSearch.svelte';
    import SEOHead from '$lib/components/SEOHead.svelte';
    import ProducerHubLogo from '$lib/components/ProducerHubLogo.svelte';
    import { pageMeta, getWebSiteSchema, getSoftwareAppSchema } from '$lib/seo';
    import { base, assets } from '$app/paths';
    import {
        initGlobalKeyboard,
        registerDefaultCommands,
        registerCreateCommands,
        setPlayPauseCallback,
        setAddMarkerCallback,
        setTabNavigationCallback
    } from '$lib/hub';

    // ============================================
    // Filter State Types
    // ============================================
    type ProductFilter = 'all' | (typeof allProducts)[number]['productId'];
    type TypeFilter = 'all' | string;
    type GroupFilter = 'all' | string;
    type KindFilter = 'all' | 'shortcut' | 'feature';

    // ============================================
    // State Persistence Keys
    // ============================================
    const STATE_STORAGE_KEY = 'producerhub_ui_state_v1';

    interface UIState {
        query: string;
        product: ProductFilter;
        type: TypeFilter;
        group: GroupFilter;
        kind: KindFilter;
        selectedFacets: string[];
        favoritesOnly: boolean;
    }

    function loadUIState(): Partial<UIState> {
        try {
            const stored = localStorage.getItem(STATE_STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            // Ignore localStorage errors
        }
        return {};
    }

    function saveUIState() {
        try {
            const state: UIState = {
                query,
                product,
                type,
                group,
                kind,
                selectedFacets,
                favoritesOnly
            };
            localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            // Ignore localStorage errors
        }
    }

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

    /** Current key display OS */
    let keyOS: KeyOS = 'mac';

    /** Selected product IDs from onboarding - default to all products until onboarding loads */
    let selectedProductIds: string[] = allProducts.map(p => p.productId);

    /** Products filtered by onboarding selection */
    $: availableProducts = selectedProductIds.length > 0
        ? allProducts.filter(p => selectedProductIds.includes(p.productId))
        : allProducts;

    /** Shortcuts filtered by onboarding-selected products (pre-filter for efficiency) */
    $: availableShortcuts = selectedProductIds.length > 0
        ? allShortcuts.filter(s => selectedProductIds.includes(s.productId))
        : allShortcuts;

    /** Active tab */
    let activeTab: 'shortcuts' | 'infobase' | 'projects' | 'inbox' | 'references' | 'collections' | 'search' = 'shortcuts';

    /** Active dropdown menu */
    let activeDropdown: 'shortcuts' | 'tools' | 'create' | null = null;

    /** Command palette open state */
    let commandPaletteOpen = false;


    /** Cleanup function for keyboard handler */
    let stopKeyboard = () => {};

    // Save UI state whenever filters change
    $: if (typeof window !== 'undefined') {
        saveUIState();
    }

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

        // Load selected products from onboarding
        const onboardingSettings = loadOnboardingSettings();
        selectedProductIds = onboardingSettings.selectedProductIds;

        // Initialize theme system (uses the new $lib/themes system)
        initThemeSystem();

        keyOS = getKeyOSPreference();
        activeTab = loadActiveTab();

        // Restore UI state (filters, search query)
        const savedState = loadUIState();
        if (savedState.query !== undefined) query = savedState.query;
        if (savedState.product !== undefined) product = savedState.product;
        if (savedState.type !== undefined) type = savedState.type;
        if (savedState.group !== undefined) group = savedState.group;
        if (savedState.kind !== undefined) kind = savedState.kind;
        if (savedState.selectedFacets !== undefined) selectedFacets = savedState.selectedFacets;
        if (savedState.favoritesOnly !== undefined) favoritesOnly = savedState.favoritesOnly;

        // Set up tab navigation callback for keyboard shortcuts
        setTabNavigationCallback((tab) => {
            activeTab = tab as typeof activeTab;
        });

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

        // Test helper: Listen for custom event to switch tabs (used by Playwright tests)
        const testTabHandler = (e: CustomEvent) => {
            const tab = e.detail;
            if (VALID_TABS.includes(tab)) {
                activeTab = tab;
            }
        };
        window.addEventListener('test:switch-tab', testTabHandler as EventListener);

        return () => {
            stopKeyboard();
            window.removeEventListener('test:switch-tab', testTabHandler as EventListener);
        };
    });

    // ============================================
    // Event Handlers
    // ============================================


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

    // Compute available options based on filtered shortcuts
    $: typeOptions = ['all', ...new Set(
        availableShortcuts
            .filter(s => product === 'all' || s.productId === product)
            .map(s => s.type)
    )].sort();
    $: if (!typeOptions.includes(type)) type = 'all';

    $: groupOptions = ['all', ...new Set(
        availableShortcuts
            .filter(s => product === 'all' || s.productId === product)
            .map(s => s.group)
    )].sort();
    $: if (!groupOptions.includes(group)) group = 'all';

    $: kindOptions = [...new Set(
        availableShortcuts
            .filter(s => product === 'all' || s.productId === product)
            .map(s => s.kind ?? 'shortcut')
    )].sort();
    $: if (kind !== 'all' && !kindOptions.includes(kind)) kind = 'all';

    $: facetOptions = [...new Set(
        availableShortcuts
            .filter(s => product === 'all' || s.productId === product)
            .flatMap(s => s.facets ?? [])
    )].sort();
    // Reset facets if product changes and selected facets are no longer available
    $: {
        const available = new Set(facetOptions);
        selectedFacets = selectedFacets.filter(f => available.has(f));
    }

    // Computed results with explicit reactivity - filter shortcuts based on all criteria
    $: filteredResults = filterShortcuts(availableShortcuts, {
        productId: product,
        type,
        group,
        kind: kind as 'shortcut' | 'feature' | 'all',
        facets: selectedFacets,
        favoriteIds: favorites,
        favoritesOnly
    });

    // Apply search if there's a query, otherwise just sort
    $: results = (() => {
        if (query.trim()) {
            // Search within available shortcuts only (pre-filtered by onboarding)
            const ids = searchShortcutIds(query, availableShortcuts, { limit: 300, fuzzy: true });
            if (ids.length === 0) return [];
            const rank = new Map<string, number>();
            ids.forEach((id, i) => rank.set(id, i));
            return filteredResults
                .filter((s) => rank.has(s.id))
                .sort((a, b) => (rank.get(a.id)! - rank.get(b.id)!) || a.command.localeCompare(b.command));
        } else {
            return filteredResults
                .sort((a, b) => (a.group.localeCompare(b.group) || a.productName.localeCompare(b.productName) || a.command.localeCompare(b.command)));
        }
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
    :global(html[data-theme='light']) {
        color-scheme: light;
    }
    :global(body) {
        margin: 0;
        background: var(--bg-primary, #0f0f10);
        color: var(--text-primary, #f2f2f2);
        overflow: hidden;
    }

    /* CSS variable aliases for backwards compatibility */
    :global(html) {
        --bg: var(--bg-primary);
        --fg: var(--text-primary);
        --muted: var(--text-muted);
        --card: var(--card-bg, var(--bg-secondary));
        --border: var(--border-default);
        --accent: var(--accent-primary);
    }

    /* App Container */
    .app-container {
        display: flex;
        flex-direction: column;
        height: 100vh;
        height: 100dvh;
        overflow: hidden;
    }

    /* Fixed Header */
    .app-header {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 16px;
        padding-top: calc(10px + env(safe-area-inset-top));
        padding-left: calc(16px + env(safe-area-inset-left));
        padding-right: calc(16px + env(safe-area-inset-right));
        background: var(--bg-secondary, #1a1a1c);
        border-bottom: 1px solid var(--border-default, #333);
        z-index: 100;
    }

    .header-left {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-shrink: 0;
    }

    .header-left h1 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: var(--text-primary, #fff);
        white-space: nowrap;
    }

    .header-nav {
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .nav-dropdown {
        position: relative;
    }

    .nav-trigger {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 10px 14px;
        background: transparent;
        border: none;
        border-radius: 8px;
        color: var(--text-secondary, #aaa);
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        min-height: 44px;
        transition: all 0.15s;
        white-space: nowrap;
    }

    .nav-trigger:hover,
    .nav-trigger.active {
        background: var(--bg-tertiary, #2a2a2c);
        color: var(--text-primary, #fff);
    }

    .dropdown-menu {
        position: absolute;
        top: calc(100% + 4px);
        left: 50%;
        transform: translateX(-50%);
        min-width: 180px;
        max-width: calc(100vw - 32px);
        background: var(--bg-secondary, #242426);
        border: 1px solid var(--border-default, #444);
        border-radius: 12px;
        padding: 6px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        z-index: 200;
    }

    /* Last dropdown (Create) - align to right edge */
    .nav-dropdown:last-child .dropdown-menu {
        left: auto;
        right: 0;
        transform: none;
    }

    .dropdown-item {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 12px 14px;
        background: transparent;
        border: none;
        border-radius: 8px;
        color: var(--text-primary, #fff);
        font-size: 14px;
        text-align: left;
        text-decoration: none;
        cursor: pointer;
        min-height: 44px;
        transition: background 0.15s;
    }

    .dropdown-item:hover:not(.disabled) {
        background: var(--surface-hover, #333);
    }

    .dropdown-item.current {
        background: var(--accent-primary, #3b82f6)22;
        color: var(--accent-primary, #3b82f6);
    }

    .dropdown-item.disabled {
        opacity: 0.5;
        cursor: not-allowed;
        color: var(--text-muted, #666);
    }

    .coming-soon {
        font-size: 10px;
        padding: 2px 6px;
        margin-left: auto;
        background: var(--accent-secondary, #50b8b8)22;
        color: var(--accent-secondary, #50b8b8);
        border-radius: 4px;
        text-transform: uppercase;
        font-weight: 600;
    }

    .dropdown-backdrop {
        position: fixed;
        inset: 0;
        background: transparent;
        border: none;
        z-index: 50;
        cursor: default;
    }

    .header-right {
        display: flex;
        gap: 8px;
        flex-shrink: 0;
    }

    .os-toggle {
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg-tertiary, #2a2a2c);
        border: none;
        border-radius: 10px;
        font-size: 18px;
        cursor: pointer;
    }

    .os-toggle:hover {
        background: var(--surface-hover, #333);
    }

    /* Scrollable Content */
    .app-content {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        -webkit-overflow-scrolling: touch;
        padding: 16px;
        padding-bottom: calc(16px + env(safe-area-inset-bottom));
    }

    .tab-content {
        max-width: 980px;
        margin: 0 auto;
    }

    .hub-tab {
        min-height: 400px;
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
        .app-header {
            flex-wrap: wrap;
            padding: 8px 12px;
            padding-top: calc(8px + env(safe-area-inset-top));
        }

        .header-left h1 {
            font-size: 16px;
        }

        .header-nav {
            order: 3;
            width: 100%;
            overflow-x: auto;
            gap: 2px;
            padding-top: 8px;
            scrollbar-width: none;
        }

        .header-nav::-webkit-scrollbar {
            display: none;
        }

        .nav-trigger {
            padding: 8px 12px;
            font-size: 13px;
        }

        .dropdown-menu {
            left: 0;
            transform: none;
        }

        .app-content {
            padding: 12px;
        }
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
        border: 1px solid var(--input-border, var(--border-default));
        background: var(--input-bg, var(--bg-secondary));
        color: var(--text-primary);
    }

    input[type='text']::placeholder {
        color: var(--text-muted);
    }

    input[type='text']:focus {
        outline: none;
        border-color: var(--accent-primary);
        box-shadow: 0 0 0 2px var(--accent-primary, #ff764d)33;
    }

    select, button {
        padding: 10px 12px;
        border-radius: 10px;
        border: 1px solid var(--border-default);
        background: var(--button-bg, var(--bg-tertiary));
        color: var(--text-primary);
        cursor: pointer;
        transition: background 0.15s, border-color 0.15s;
    }

    select:hover, button:hover {
        background: var(--button-hover, var(--surface-hover));
        border-color: var(--accent-primary);
    }

    select:focus, button:focus {
        outline: none;
        border-color: var(--accent-primary);
    }

    .pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        border-radius: 999px;
        border: 1px solid var(--border-default);
        background: var(--button-bg, var(--bg-tertiary));
        color: var(--text-primary);
        transition: background 0.15s;
    }

    .pill:hover {
        background: var(--button-hover, var(--surface-hover));
    }

    .checkbox {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        border-radius: 999px;
        border: 1px solid var(--border-default);
        background: var(--button-bg, var(--bg-tertiary));
        color: var(--text-primary);
    }

    .checkbox:hover {
        background: var(--button-hover, var(--surface-hover));
    }

    .list {
        margin-top: 16px;
        display: grid;
        gap: 20px;  /* Increased from 14px for better vertical spacing */
    }

    .card {
        background: var(--card-bg, var(--bg-secondary));
        border: 1px solid var(--card-border, var(--border-default));
        border-radius: 14px;
        padding: 16px;  /* Increased from 12px for more breathing room */
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 12px;  /* Increased from 10px */
        transition: border-color 0.15s, background 0.15s;
    }

    .card:hover {
        border-color: var(--accent-primary);
        background: var(--surface-hover);
    }

    .card-left {
        display: flex;
        gap: 14px;  /* Increased from 12px */
        align-items: flex-start;
    }

    .product-icon {
        width: 32px;  /* Slightly larger for better visibility */
        height: 32px;
        border-radius: 6px;
        flex-shrink: 0;
    }

    .card-content {
        flex: 1;
        min-width: 0;
    }

    .cmd {
        font-size: 15px;  /* Slightly larger for emphasis */
        font-weight: 600;
        margin: 0;
        color: var(--text-primary);
        line-height: 1.4;
    }

    .meta {
        margin-top: 6px;  /* Increased from 4px */
        display: flex;
        gap: 12px;  /* Increased from 10px */
        flex-wrap: wrap;
        color: var(--text-muted);
        font-size: 12px;
    }

    .description {
        margin: 10px 0 0;  /* Increased from 8px */
        font-size: 13px;  /* Slightly larger */
        color: var(--text-secondary);
        line-height: 1.5;  /* Improved line height */
    }


    .star {
        border: 1px solid var(--border-default);
        background: var(--button-bg, var(--bg-tertiary));
        border-radius: 10px;
        padding: 8px 10px;
        font-size: 12px;
        min-width: 74px;
        color: var(--star-inactive, var(--text-muted));
        transition: all 0.15s;
    }

    .star:hover {
        border-color: var(--star-active, #ffc107);
        color: var(--star-active, #ffc107);
    }


    .tags {
        margin-top: 8px;
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
    }
    .tag {
        font-size: 11px;
        color: var(--tag-text, var(--text-primary));
        background: var(--tag-bg, var(--bg-tertiary));
        border: 1px solid var(--border-subtle);
        padding: 3px 8px;
        border-radius: 999px;
    }

    .footerRow {
        margin-top: 10px;
        color: var(--text-muted);
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
        color: var(--text-muted);
        font-size: 12px;
    }

    .facetChip {
        padding: 8px 10px;
        border-radius: 999px;
        border: 1px solid var(--border-default);
        background: transparent;
        color: inherit;
        cursor: pointer;
        font-size: 12px;
    }

    .facetChip.selected {
        background: var(--accent);
    }

    .groupSection {
        margin-top: 24px;  /* Increased from 16px for better separation between groups */
    }

    .groupSection:first-child {
        margin-top: 0;
    }

    .groupHeader {
        font-size: 17px;  /* Slightly larger */
        font-weight: 600;  /* Bolder */
        margin: 0 0 12px 0;  /* Increased bottom margin */
        color: var(--text-primary);
        padding-bottom: 8px;
        border-bottom: 1px solid var(--border-subtle, var(--border-default));
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
        color: var(--text-muted);
        border: 1px solid var(--border-default);
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
        color: var(--text-muted);
        line-height: 1.5;
        padding: 10px;
        background: var(--accent);
        border-radius: 8px;
        border: 1px solid var(--border-default);
        word-break: break-word;
    }

    .defaultVal {
        margin-top: 8px;
        font-size: 11px;
        color: var(--text-muted);
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

<div class="app-container">
    <!-- Fixed Header -->
    <header class="app-header">
        <div class="header-left">
            <ProducerHubLogo size={28} />
            <h1>Producer Hub</h1>
        </div>

        <!-- Dropdown Navigation -->
        <nav class="header-nav">
            <!-- Shortcuts Dropdown -->
            <div class="nav-dropdown">
                <button
                    class="nav-trigger"
                    class:active={activeTab === 'shortcuts' || activeTab === 'infobase'}
                    onclick={() => activeDropdown = activeDropdown === 'shortcuts' ? null : 'shortcuts'}
                >
                    ⌨ Shortcuts ▼
                </button>
                {#if activeDropdown === 'shortcuts'}
                    <div class="dropdown-menu">
                        <button class="dropdown-item" class:current={activeTab === 'shortcuts'} onclick={() => { activeTab = 'shortcuts'; activeDropdown = null; }}>
                            ⌨ Keyboard Shortcuts
                        </button>
                        <button class="dropdown-item" class:current={activeTab === 'infobase'} onclick={() => { activeTab = 'infobase'; activeDropdown = null; }}>
                            ✎ Info Base
                        </button>
                    </div>
                {/if}
            </div>

            <!-- Tools Dropdown -->
            <div class="nav-dropdown">
                <button
                    class="nav-trigger"
                    class:active={activeTab === 'projects' || activeTab === 'inbox' || activeTab === 'collections' || activeTab === 'search'}
                    onclick={() => activeDropdown = activeDropdown === 'tools' ? null : 'tools'}
                >
                    ⚙ Tools ▼
                </button>
                {#if activeDropdown === 'tools'}
                    <div class="dropdown-menu">
                        <button class="dropdown-item" class:current={activeTab === 'projects'} onclick={() => { activeTab = 'projects'; activeDropdown = null; }}>
                            ◈ Projects
                        </button>
                        <button class="dropdown-item" class:current={activeTab === 'inbox'} onclick={() => { activeTab = 'inbox'; activeDropdown = null; }}>
                            ◉ Inbox
                        </button>
                        <button class="dropdown-item" class:current={activeTab === 'collections'} onclick={() => { activeTab = 'collections'; activeDropdown = null; }}>
                            ◆ Collections
                        </button>
                        <button class="dropdown-item" class:current={activeTab === 'references'} onclick={() => { activeTab = 'references'; activeDropdown = null; }}>
                            ♫ References
                        </button>
                        <button class="dropdown-item" class:current={activeTab === 'search'} onclick={() => { activeTab = 'search'; activeDropdown = null; }}>
                            ⚲ Global Search
                        </button>
                    </div>
                {/if}
            </div>

            <!-- Create Dropdown -->
            <div class="nav-dropdown">
                <button
                    class="nav-trigger"
                    onclick={() => activeDropdown = activeDropdown === 'create' ? null : 'create'}
                >
                    ♪ Create ▼
                </button>
                {#if activeDropdown === 'create'}
                    <div class="dropdown-menu">
                        <a class="dropdown-item" href="{base}/patterns" onclick={() => activeDropdown = null}>
                            ⬢ Drum Patterns
                        </a>
                        <span class="dropdown-item disabled">
                            ♬ Piano Roll <span class="coming-soon">Soon</span>
                        </span>
                    </div>
                {/if}
            </div>
        </nav>

        <div class="header-right">
            <button class="os-toggle" onclick={toggleKeyOS} title="Toggle key display OS">
                {keyOS === 'mac' ? '🍎' : '🪟'}
            </button>
        </div>
    </header>

    <!-- Click outside to close -->
    {#if activeDropdown}
        <button class="dropdown-backdrop" onclick={() => activeDropdown = null} aria-label="Close menu"></button>
    {/if}

    <!-- Scrollable Content -->
    <main class="app-content">
    {#if activeTab === 'shortcuts'}
    <div class="tab-content" data-testid="shortcuts-tab-content">
        <div class="searchRow">
            <input type="text" placeholder="Search (command, keys, tags, context, product, group, facets)..." bind:value={query} />

            <select data-testid="product-filter" bind:value={product} title="Filter by product">
                <option value="all">All products</option>
                {#each availableProducts as p}
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
                    onclick={() => toggleFacet(facet)}
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
                                    <img class="product-icon" src="{assets}/{s.productIcon}" alt={s.productName} data-testid="product-icon" />
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
                                <button class="star" onclick={() => onToggleFav(s.id)}>
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
    </main>
</div>

<!-- Command Palette -->
<CommandPalette bind:open={commandPaletteOpen} />

<!--
  AppShell Component

  Provides a consistent app-like layout with:
  - Fixed header with navigation dropdowns
  - Scrollable content area
  - iOS/iPad PWA compatibility
  - Mobile-optimized navigation with Sheet overlay

  @component
-->
<script lang="ts">
    import { base } from '$app/paths';
    import { page } from '$app/stores';
    import { playerVisible } from '$lib/player';
    import { Sheet } from '$lib/components/ui';
    import { onMount } from 'svelte';

    export let title: string = 'Producer Hub';
    export let showBackButton: boolean = false;
    export let onBack: (() => void) | undefined = undefined;

    // Reactive check for player visibility
    $: isPlayerVisible = $playerVisible ?? false;

    // Mobile detection for Sheet vs dropdown
    let isMobile = $state(false);
    let mobileSheetOpen = $state(false);
    let activeSheetCategory = $state<NavCategoryKey | null>(null);

    onMount(() => {
        const mediaQuery = window.matchMedia('(max-width: 640px)');
        isMobile = mediaQuery.matches;

        const handleChange = (e: MediaQueryListEvent) => {
            isMobile = e.matches;
            // Close sheet if switching to desktop
            if (!e.matches) {
                mobileSheetOpen = false;
                activeSheetCategory = null;
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    });

    // Navigation types
    type NavCategoryKey = 'shortcuts' | 'tools' | 'create';

    interface NavItem {
        id: string;
        label: string;
        icon: string;
        href: string;
        tab?: string;
        disabled?: boolean;
    }

    interface NavCategoryConfig {
        label: string;
        items: NavItem[];
    }

    let activeDropdown: NavCategoryKey | null = null;

    const navigation: Record<NavCategoryKey, NavCategoryConfig> = {
        shortcuts: {
            label: '⌨ Shortcuts',
            items: [
                { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: '⌨', href: `${base}/`, tab: 'shortcuts' },
                { id: 'infobase', label: 'Info Base', icon: '✎', href: `${base}/`, tab: 'infobase' }
            ]
        },
        tools: {
            label: '⚙ Tools',
            items: [
                { id: 'projects', label: 'Projects', icon: '◈', href: `${base}/`, tab: 'projects' },
                { id: 'inbox', label: 'Inbox', icon: '◉', href: `${base}/`, tab: 'inbox' },
                { id: 'collections', label: 'Collections', icon: '◆', href: `${base}/`, tab: 'collections' },
                { id: 'references', label: 'References', icon: '♫', href: `${base}/`, tab: 'references' },
                { id: 'search', label: 'Global Search', icon: '⚲', href: `${base}/`, tab: 'search' }
            ]
        },
        create: {
            label: '♪ Create',
            items: [
                { id: 'patterns', label: 'Drum Patterns', icon: '⬢', href: `${base}/patterns` },
                { id: 'piano', label: 'Piano Roll', icon: '♬', href: `${base}/piano`, disabled: true }
            ]
        }
    };

    function toggleDropdown(category: NavCategoryKey) {
        // Check viewport width directly for reliable mobile detection
        const isMobileViewport = typeof window !== 'undefined' && window.innerWidth <= 640;

        if (isMobileViewport) {
            // On mobile, open Sheet
            activeSheetCategory = category;
            mobileSheetOpen = true;
            activeDropdown = null;
        } else {
            // On desktop, use dropdown
            activeDropdown = activeDropdown === category ? null : category;
        }
    }

    function closeDropdowns() {
        activeDropdown = null;
    }

    function closeMobileSheet() {
        mobileSheetOpen = false;
        activeSheetCategory = null;
    }

    function handleNavClick(item: NavItem) {
        closeDropdowns();
        closeMobileSheet();
        if (item.tab) {
            // Dispatch custom event for tab switching
            window.dispatchEvent(new CustomEvent('navigate-tab', { detail: { tab: item.tab } }));
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            closeDropdowns();
        }
    }

    // Check if current page matches
    $: currentPath = $page.url.pathname;
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="app-shell">
    <!-- Fixed Header -->
    <header class="app-header">
        <div class="header-left">
            {#if showBackButton}
                <button class="back-btn" onclick={onBack} aria-label="Go back">
                    ← Back
                </button>
            {/if}
            <h1 class="app-title">{title}</h1>
        </div>

        <nav class="header-nav">
            {#each Object.entries(navigation) as [key, category]}
                <div class="nav-dropdown">
                    <button
                        class="nav-trigger"
                        class:active={activeDropdown === key}
                        onclick={() => toggleDropdown(key as NavCategoryKey)}
                        aria-expanded={activeDropdown === key}
                        aria-haspopup="menu"
                    >
                        {category.label}
                        <span class="dropdown-arrow">{activeDropdown === key ? '▲' : '▼'}</span>
                    </button>

                    {#if activeDropdown === key}
                        <div class="dropdown-menu" role="menu">
                            {#each category.items as item}
                                {#if item.href && !item.tab}
                                    <a
                                        href={item.disabled ? undefined : item.href}
                                        class="dropdown-item"
                                        class:disabled={item.disabled}
                                        class:current={currentPath === item.href}
                                        role="menuitem"
                                        onclick={closeDropdowns}
                                    >
                                        <span class="item-icon">{item.icon}</span>
                                        <span class="item-label">{item.label}</span>
                                        {#if item.disabled}
                                            <span class="coming-soon">Soon</span>
                                        {/if}
                                    </a>
                                {:else}
                                    <button
                                        class="dropdown-item"
                                        role="menuitem"
                                        onclick={() => handleNavClick(item)}
                                    >
                                        <span class="item-icon">{item.icon}</span>
                                        <span class="item-label">{item.label}</span>
                                    </button>
                                {/if}
                            {/each}
                        </div>
                    {/if}
                </div>
            {/each}
        </nav>

        <div class="header-right">
            <slot name="header-actions" />
        </div>
    </header>

    <!-- Scrollable Content Area -->
    <main class="app-content" class:has-player={isPlayerVisible}>
        <slot />
    </main>
</div>

<!-- Click outside to close dropdowns -->
{#if activeDropdown}
    <button class="backdrop" onclick={closeDropdowns} aria-label="Close menu"></button>
{/if}

<!-- Mobile Navigation Sheet -->
{#if activeSheetCategory && navigation[activeSheetCategory]}
    <Sheet
        bind:open={mobileSheetOpen}
        onClose={closeMobileSheet}
        title={navigation[activeSheetCategory].label}
        size="full"
    >
        <nav class="mobile-nav-menu" role="menu">
            {#each navigation[activeSheetCategory].items as item}
                {#if item.href && !item.tab}
                    <a
                        href={item.disabled ? undefined : item.href}
                        class="mobile-nav-item"
                        class:disabled={item.disabled}
                        class:current={currentPath === item.href}
                        role="menuitem"
                        onclick={closeMobileSheet}
                    >
                        <span class="mobile-nav-icon">{item.icon}</span>
                        <span class="mobile-nav-label">{item.label}</span>
                        {#if item.disabled}
                            <span class="mobile-coming-soon">Coming Soon</span>
                        {/if}
                    </a>
                {:else}
                    <button
                        class="mobile-nav-item"
                        role="menuitem"
                        onclick={() => handleNavClick(item)}
                    >
                        <span class="mobile-nav-icon">{item.icon}</span>
                        <span class="mobile-nav-label">{item.label}</span>
                    </button>
                {/if}
            {/each}
        </nav>
    </Sheet>
{/if}

<style>
    .app-shell {
        display: flex;
        flex-direction: column;
        /* Fill the parent container (main-wrapper) */
        height: 100%;
        width: 100%;
        /* Prevent shell from scrolling - only content scrolls */
        overflow: hidden;
        background: var(--bg-primary, #1a1a1a);
    }

    .app-header {
        flex-shrink: 0;
        position: sticky;
        top: 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-4);
        padding: var(--space-3) var(--space-4);
        background: var(--bg-secondary, #242424);
        border-bottom: var(--border-1) solid var(--border-default, #333);
        z-index: var(--z-sticky);
        /* iOS safe area */
        padding-top: calc(var(--space-3) + env(safe-area-inset-top));
        padding-left: calc(var(--space-4) + env(safe-area-inset-left));
        padding-right: calc(var(--space-4) + env(safe-area-inset-right));
    }

    .header-left {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        flex-shrink: 0;
    }

    .back-btn {
        padding: var(--space-2) var(--space-3);
        background: var(--bg-tertiary, #333);
        border: none;
        border-radius: var(--radius-md);
        color: var(--text-primary, #fff);
        font-size: var(--text-base);
        cursor: pointer;
        min-height: var(--touch-target);
        transition: background var(--transition-base);
    }

    .back-btn:hover {
        background: var(--surface-hover, #444);
    }

    .back-btn:focus-visible {
        outline: var(--focus-ring);
        outline-offset: var(--focus-ring-offset);
    }

    .app-title {
        font-size: var(--text-xl);
        font-weight: var(--font-semibold);
        color: var(--text-primary, #fff);
        margin: 0;
        white-space: nowrap;
    }

    .header-nav {
        display: flex;
        align-items: center;
        gap: var(--space-1);
        flex: 1;
        justify-content: center;
    }

    .nav-dropdown {
        position: relative;
    }

    .nav-trigger {
        display: flex;
        align-items: center;
        gap: var(--space-1-5);
        padding: var(--space-2-5) var(--space-3-5);
        background: transparent;
        border: none;
        border-radius: var(--radius-lg);
        color: var(--text-secondary, #aaa);
        font-size: var(--text-base);
        font-weight: var(--font-medium);
        cursor: pointer;
        min-height: var(--touch-target);
        transition: all var(--transition-base);
    }

    .nav-trigger:hover,
    .nav-trigger.active {
        background: var(--bg-tertiary, #333);
        color: var(--text-primary, #fff);
    }

    .nav-trigger:focus-visible {
        outline: var(--focus-ring);
        outline-offset: var(--focus-ring-offset);
    }

    .dropdown-arrow {
        font-size: var(--text-xs);
        opacity: 0.6;
    }

    .dropdown-menu {
        position: absolute;
        top: calc(100% + var(--space-1));
        left: 50%;
        transform: translateX(-50%);
        min-width: 200px;
        background: var(--bg-secondary, #2a2a2a);
        border: var(--border-1) solid var(--border-default, #444);
        border-radius: var(--radius-xl);
        padding: var(--space-1-5);
        box-shadow: var(--shadow-elevated);
        z-index: var(--z-overlay);
    }

    .dropdown-item {
        display: flex;
        align-items: center;
        gap: var(--space-2-5);
        width: 100%;
        padding: var(--space-3) var(--space-3-5);
        background: transparent;
        border: none;
        border-radius: var(--radius-lg);
        color: var(--text-primary, #fff);
        font-size: var(--text-base);
        text-align: left;
        text-decoration: none;
        cursor: pointer;
        min-height: var(--touch-target);
        transition: background var(--transition-base);
    }

    .dropdown-item:hover:not(.disabled) {
        background: var(--surface-hover, #3a3a3a);
    }

    .dropdown-item:focus-visible {
        outline: var(--focus-ring);
        outline-offset: calc(-1 * var(--focus-ring-offset));
    }

    .dropdown-item.current {
        background: var(--accent-primary, #3b82f6)22;
        color: var(--accent-primary, #3b82f6);
    }

    .dropdown-item.disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .item-icon {
        font-size: var(--text-lg);
        width: var(--space-6);
        text-align: center;
    }

    .item-label {
        flex: 1;
    }

    .coming-soon {
        font-size: var(--text-xs);
        padding: var(--space-0-5) var(--space-1-5);
        background: var(--accent-secondary, #50b8b8)33;
        color: var(--accent-secondary, #50b8b8);
        border-radius: var(--radius-sm);
        text-transform: uppercase;
        font-weight: var(--font-semibold);
    }

    .header-right {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        flex-shrink: 0;
    }

    .app-content {
        flex: 1;
        /* This is the scroll container */
        overflow-y: auto;
        overflow-x: hidden;
        /* Smooth momentum scrolling on iOS */
        -webkit-overflow-scrolling: touch;
        /* Prevent scroll chaining to parent */
        overscroll-behavior: contain;
        /* iOS safe area for sides */
        padding-left: var(--safe-area-inset-left);
        padding-right: var(--safe-area-inset-right);
        /* Bottom safe area handled by layout wrapper when player visible */
        padding-bottom: var(--safe-area-inset-bottom);
    }

    .app-content.has-player {
        /* When player is visible, the layout wrapper handles bottom offset */
        /* Just need minimal bottom padding for spacing */
        padding-bottom: var(--space-4);
    }

    .backdrop {
        position: fixed;
        inset: 0;
        background: transparent;
        border: none;
        z-index: var(--z-dropdown);
        cursor: default;
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
        .app-header {
            flex-wrap: wrap;
            gap: var(--space-2);
            padding: var(--space-2) var(--space-3);
            padding-top: calc(var(--space-2) + var(--safe-area-inset-top));
        }

        .app-title {
            font-size: var(--text-lg);
        }

        .header-nav {
            order: 3;
            width: 100%;
            justify-content: flex-start;
            overflow-x: auto;
            gap: var(--space-0-5);
            padding-bottom: var(--space-1);
            /* Hide scrollbar but keep functionality */
            scrollbar-width: none;
            -ms-overflow-style: none;
        }

        .header-nav::-webkit-scrollbar {
            display: none;
        }

        .nav-trigger {
            padding: var(--space-2) var(--space-3);
            font-size: var(--text-sm);
            white-space: nowrap;
        }

        .dropdown-menu {
            left: 0;
            transform: none;
            min-width: 180px;
        }
    }

    /* iPad specific */
    @media (min-width: 768px) and (max-width: 1024px) {
        .app-header {
            padding: var(--space-3) var(--space-5);
            padding-top: calc(var(--space-3) + env(safe-area-inset-top));
        }
    }

    /* Mobile Navigation Sheet Menu */
    .mobile-nav-menu {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        padding: var(--space-2) 0;
    }

    .mobile-nav-item {
        display: flex;
        align-items: center;
        gap: var(--space-4);
        width: 100%;
        padding: var(--space-4) var(--space-4);
        background: var(--bg-tertiary, #333);
        border: none;
        border-radius: var(--radius-xl);
        color: var(--text-primary, #fff);
        font-size: var(--text-lg);
        text-align: left;
        text-decoration: none;
        cursor: pointer;
        min-height: var(--space-14);
        transition: all var(--transition-base);
    }

    .mobile-nav-item:hover:not(.disabled) {
        background: var(--surface-hover, #444);
    }

    .mobile-nav-item:focus-visible {
        outline: var(--focus-ring);
        outline-offset: var(--focus-ring-offset);
    }

    .mobile-nav-item:active:not(.disabled) {
        background: var(--surface-active, #555);
        transform: scale(0.98);
    }

    .mobile-nav-item.current {
        background: var(--accent-primary, #3b82f6)22;
        border: var(--border-2) solid var(--accent-primary, #3b82f6);
    }

    .mobile-nav-item.disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .mobile-nav-icon {
        font-size: var(--text-2xl);
        width: var(--space-10);
        text-align: center;
        flex-shrink: 0;
    }

    .mobile-nav-label {
        flex: 1;
        font-weight: var(--font-medium);
    }

    .mobile-coming-soon {
        font-size: var(--text-xs);
        padding: var(--space-1) var(--space-2);
        background: var(--accent-secondary, #50b8b8)33;
        color: var(--accent-secondary, #50b8b8);
        border-radius: var(--radius-md);
        text-transform: uppercase;
        font-weight: var(--font-semibold);
    }
</style>


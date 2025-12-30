<!--
  AppShell Component

  Provides a consistent app-like layout with:
  - Fixed header with navigation dropdowns
  - Scrollable content area
  - iOS/iPad PWA compatibility

  @component
-->
<script lang="ts">
    import { base } from '$app/paths';
    import { page } from '$app/stores';

    export let title: string = 'Producer Hub';
    export let showBackButton: boolean = false;
    export let onBack: (() => void) | undefined = undefined;

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
        activeDropdown = activeDropdown === category ? null : category;
    }

    function closeDropdowns() {
        activeDropdown = null;
    }

    function handleNavClick(item: NavItem) {
        closeDropdowns();
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
    <main class="app-content">
        <slot />
    </main>
</div>

<!-- Click outside to close dropdowns -->
{#if activeDropdown}
    <button class="backdrop" onclick={closeDropdowns} aria-label="Close menu"></button>
{/if}

<style>
    .app-shell {
        display: flex;
        flex-direction: column;
        height: 100vh;
        height: 100dvh; /* Dynamic viewport height for iOS */
        overflow: hidden;
        background: var(--bg-primary, #1a1a1a);
    }

    .app-header {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 12px 16px;
        background: var(--bg-secondary, #242424);
        border-bottom: 1px solid var(--border-default, #333);
        z-index: 100;
        /* iOS safe area */
        padding-top: calc(12px + env(safe-area-inset-top));
        padding-left: calc(16px + env(safe-area-inset-left));
        padding-right: calc(16px + env(safe-area-inset-right));
    }

    .header-left {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-shrink: 0;
    }

    .back-btn {
        padding: 8px 12px;
        background: var(--bg-tertiary, #333);
        border: none;
        border-radius: 6px;
        color: var(--text-primary, #fff);
        font-size: 14px;
        cursor: pointer;
        min-height: 44px;
    }

    .back-btn:hover {
        background: var(--surface-hover, #444);
    }

    .app-title {
        font-size: 18px;
        font-weight: 600;
        color: var(--text-primary, #fff);
        margin: 0;
        white-space: nowrap;
    }

    .header-nav {
        display: flex;
        align-items: center;
        gap: 4px;
        flex: 1;
        justify-content: center;
    }

    .nav-dropdown {
        position: relative;
    }

    .nav-trigger {
        display: flex;
        align-items: center;
        gap: 6px;
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
    }

    .nav-trigger:hover,
    .nav-trigger.active {
        background: var(--bg-tertiary, #333);
        color: var(--text-primary, #fff);
    }

    .dropdown-arrow {
        font-size: 10px;
        opacity: 0.6;
    }

    .dropdown-menu {
        position: absolute;
        top: calc(100% + 4px);
        left: 50%;
        transform: translateX(-50%);
        min-width: 200px;
        background: var(--bg-secondary, #2a2a2a);
        border: 1px solid var(--border-default, #444);
        border-radius: 12px;
        padding: 6px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        z-index: 200;
    }

    .dropdown-item {
        display: flex;
        align-items: center;
        gap: 10px;
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
        background: var(--surface-hover, #3a3a3a);
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
        font-size: 16px;
        width: 24px;
        text-align: center;
    }

    .item-label {
        flex: 1;
    }

    .coming-soon {
        font-size: 10px;
        padding: 2px 6px;
        background: var(--accent-secondary, #50b8b8)33;
        color: var(--accent-secondary, #50b8b8);
        border-radius: 4px;
        text-transform: uppercase;
        font-weight: 600;
    }

    .header-right {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
    }

    .app-content {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        /* Smooth scrolling on iOS */
        -webkit-overflow-scrolling: touch;
        /* iOS safe area for bottom */
        padding-bottom: env(safe-area-inset-bottom);
    }

    .backdrop {
        position: fixed;
        inset: 0;
        background: transparent;
        border: none;
        z-index: 50;
        cursor: default;
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
        .app-header {
            flex-wrap: wrap;
            gap: 8px;
            padding: 8px 12px;
            padding-top: calc(8px + env(safe-area-inset-top));
        }

        .app-title {
            font-size: 16px;
        }

        .header-nav {
            order: 3;
            width: 100%;
            justify-content: flex-start;
            overflow-x: auto;
            gap: 2px;
            padding-bottom: 4px;
            /* Hide scrollbar but keep functionality */
            scrollbar-width: none;
            -ms-overflow-style: none;
        }

        .header-nav::-webkit-scrollbar {
            display: none;
        }

        .nav-trigger {
            padding: 8px 12px;
            font-size: 13px;
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
            padding: 12px 20px;
            padding-top: calc(12px + env(safe-area-inset-top));
        }
    }
</style>


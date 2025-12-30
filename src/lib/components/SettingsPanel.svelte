<!--
  Settings Panel Component

  Provides a settings cog button that opens a modal with user preferences:
  - Theme selection
  - Product selection
  - iCloud sync settings
  - Keyboard shortcuts reference
-->
<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import {
        loadOnboardingSettings,
        saveOnboardingSettings,
        type OnboardingSettings
    } from '$lib/onboarding';
    import { products } from '$lib/products';
    import { getThemes, setTheme } from '$lib/themes';
    import { base } from '$app/paths';

    const dispatch = createEventDispatcher();

    export let isOpen = false;

    let settings: OnboardingSettings;
    let activeSection: 'general' | 'products' | 'sync' | 'keyboard' = 'general';

    const themes = getThemes();

    // Keyboard shortcuts reference
    const keyboardShortcuts = [
        { keys: '⌘ K', action: 'Open command palette' },
        { keys: '⌘ /', action: 'Toggle command palette' },
        { keys: '1-7', action: 'Switch tabs (Shortcuts, Info Base, etc.)' },
        { keys: 'Space', action: 'Play/Pause audio' },
        { keys: 'M', action: 'Add marker at current position' },
        { keys: '?', action: 'Show keyboard shortcuts' },
        { keys: 'Escape', action: 'Close modals/panels' },
        { keys: '↑ ↓', action: 'Navigate lists' },
        { keys: 'Enter', action: 'Select/confirm' },
    ];

    function loadSettings() {
        settings = loadOnboardingSettings();
    }

    function saveSettings() {
        saveOnboardingSettings(settings);
        dispatch('settingsChanged', settings);
    }

    function toggleProduct(productId: string) {
        if (settings.selectedProductIds.includes(productId)) {
            settings.selectedProductIds = settings.selectedProductIds.filter(id => id !== productId);
        } else {
            settings.selectedProductIds = [...settings.selectedProductIds, productId];
        }
        saveSettings();
    }

    function handleThemeChange(themeId: string) {
        settings.themeId = themeId;
        setTheme(themeId);
        saveSettings();
    }

    function close() {
        isOpen = false;
        dispatch('close');
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            close();
        }
    }

    function openOnboarding() {
        close();
        window.location.href = `${base}/onboarding`;
    }

    $: if (isOpen) {
        loadSettings();
    }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="settings-overlay" on:click={close}>
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="settings-modal" on:click|stopPropagation>
            <header class="settings-header">
                <h2>Settings</h2>
                <button class="close-btn" on:click={close} aria-label="Close settings">
                    ✕
                </button>
            </header>

            <div class="settings-content">
                <nav class="settings-nav">
                    <button
                        class="nav-item"
                        class:active={activeSection === 'general'}
                        on:click={() => activeSection = 'general'}
                    >
                        ⚙️ General
                    </button>
                    <button
                        class="nav-item"
                        class:active={activeSection === 'products'}
                        on:click={() => activeSection = 'products'}
                    >
                        🎹 Products
                    </button>
                    <button
                        class="nav-item"
                        class:active={activeSection === 'sync'}
                        on:click={() => activeSection = 'sync'}
                    >
                        ☁️ Sync
                    </button>
                    <button
                        class="nav-item"
                        class:active={activeSection === 'keyboard'}
                        on:click={() => activeSection = 'keyboard'}
                    >
                        ⌨️ Keyboard
                    </button>
                </nav>

                <div class="settings-panel">
                    {#if activeSection === 'general'}
                        <section>
                            <h3>Appearance</h3>
                            <div class="setting-row">
                                <label for="theme-select">Theme</label>
                                <select
                                    id="theme-select"
                                    bind:value={settings.themeId}
                                    on:change={(e) => handleThemeChange(e.currentTarget.value)}
                                >
                                    <option value="system">System</option>
                                    {#each themes as theme}
                                        <option value={theme.id}>{theme.name}</option>
                                    {/each}
                                </select>
                            </div>

                            <h3>Setup</h3>
                            <p class="section-desc">Re-configure your preferences including products and sync settings.</p>
                            <button class="btn-secondary" on:click={openOnboarding}>
                                Re-run Setup Wizard
                            </button>

                            <h3>About</h3>
                            <div class="about-info">
                                <p><strong>Producer Hub</strong></p>
                                <p class="version-text">Comprehensive music production workspace</p>
                            </div>
                        </section>
                    {:else if activeSection === 'products'}
                        <section>
                            <h3>Enabled Products</h3>
                            <p class="section-desc">Select which products to show shortcuts for.</p>

                            <div class="products-list">
                                {#each products as product}
                                    <label class="product-toggle">
                                        <input
                                            type="checkbox"
                                            checked={settings?.selectedProductIds?.includes(product.productId)}
                                            on:change={() => toggleProduct(product.productId)}
                                        />
                                        <span class="product-info">
                                            <img src="{base}/{product.icon}" alt="" class="product-icon" />
                                            <span>{product.name}</span>
                                        </span>
                                    </label>
                                {/each}
                            </div>
                        </section>
                    {:else if activeSection === 'sync'}
                        <section>
                            <h3>iCloud Sync</h3>
                            <p class="section-desc">
                                Sync your data across devices using iCloud Drive.
                            </p>

                            <div class="sync-status">
                                <div class="status-row">
                                    <span>Status:</span>
                                    <span class="status-value">
                                        {#if settings?.iCloud?.enabled}
                                            {#if settings.iCloud.syncStatus === 'ready'}
                                                ✅ Connected
                                            {:else if settings.iCloud.syncStatus === 'error'}
                                                ❌ Error
                                            {:else}
                                                ⏳ Connecting...
                                            {/if}
                                        {:else}
                                            Disabled
                                        {/if}
                                    </span>
                                </div>

                                {#if settings?.iCloud?.lastConnectedAt}
                                    <div class="status-row">
                                        <span>Last sync:</span>
                                        <span class="status-value">
                                            {new Date(settings.iCloud.lastConnectedAt).toLocaleString()}
                                        </span>
                                    </div>
                                {/if}
                            </div>

                            <p class="coming-soon">
                                Full sync controls coming soon. Use the Setup Wizard to configure.
                            </p>
                        </section>
                    {:else if activeSection === 'keyboard'}
                        <section>
                            <h3>Keyboard Shortcuts</h3>
                            <p class="section-desc">
                                Use these shortcuts for faster navigation.
                            </p>

                            <div class="shortcuts-list">
                                {#each keyboardShortcuts as shortcut}
                                    <div class="shortcut-row">
                                        <kbd class="shortcut-keys">{shortcut.keys}</kbd>
                                        <span class="shortcut-action">{shortcut.action}</span>
                                    </div>
                                {/each}
                            </div>
                        </section>
                    {/if}
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    .settings-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: var(--z-tooltip);
        padding: var(--space-4);
    }

    .settings-modal {
        background: var(--bg-secondary, #2d2d2d);
        border-radius: var(--radius-xl);
        width: 100%;
        max-width: 550px;
        min-height: 400px;
        max-height: 70vh;
        display: flex;
        flex-direction: column;
        box-shadow: var(--shadow-modal);
        overflow: hidden;
    }

    .settings-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--space-3-5) var(--space-5);
        border-bottom: var(--border-1) solid var(--border-default, #3d3d3d);
        flex-shrink: 0;
    }

    .settings-header h2 {
        margin: 0;
        font-size: var(--text-xl);
        color: var(--text-primary, #fff);
    }

    .close-btn {
        background: none;
        border: none;
        font-size: var(--text-2xl);
        color: var(--text-secondary, #999);
        cursor: pointer;
        padding: var(--space-2);
        min-height: auto;
        border-radius: var(--radius-md);
        transition: color var(--transition-base);
    }

    .close-btn:hover {
        color: var(--text-primary, #fff);
    }

    .close-btn:focus-visible {
        outline: var(--focus-ring);
        outline-offset: var(--focus-ring-offset);
    }

    .settings-content {
        display: flex;
        flex: 1;
        overflow: hidden;
        min-height: 0;
    }

    .settings-nav {
        width: 140px;
        border-right: var(--border-1) solid var(--border-default, #3d3d3d);
        padding: var(--space-2);
        flex-shrink: 0;
        overflow-y: auto;
    }

    .nav-item {
        display: block;
        width: 100%;
        padding: var(--space-2-5) var(--space-3);
        background: none;
        border: none;
        border-radius: var(--radius-md);
        text-align: left;
        color: var(--text-secondary, #999);
        cursor: pointer;
        font-size: var(--text-sm);
        min-height: auto;
        transition: background var(--transition-base);
    }

    .nav-item:hover {
        background: var(--surface-hover, #3d3d3d);
    }

    .nav-item.active {
        background: var(--accent-primary, #3b82f6);
        color: white;
    }

    .nav-item:focus-visible {
        outline: var(--focus-ring);
        outline-offset: var(--focus-ring-offset);
    }

    .settings-panel {
        flex: 1;
        padding: var(--space-4) var(--space-5);
        overflow-y: auto;
        min-height: 0;
    }

    .settings-panel h3 {
        margin: 0 0 var(--space-3) 0;
        font-size: var(--text-base);
        color: var(--text-primary, #fff);
    }

    .settings-panel h3:not(:first-child) {
        margin-top: var(--space-5);
    }

    .section-desc {
        color: var(--text-secondary, #999);
        font-size: var(--text-sm);
        margin: 0 0 var(--space-3) 0;
        line-height: var(--leading-snug);
    }

    .setting-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--space-2) 0;
        border-bottom: var(--border-1) solid var(--border-subtle, #3d3d3d);
    }

    .setting-row label {
        color: var(--text-primary, #fff);
        font-size: var(--text-base);
    }

    .setting-row select {
        padding: var(--space-1-5) var(--space-2);
        border-radius: var(--radius-md);
        border: var(--border-1) solid var(--border-default, #3d3d3d);
        background: var(--bg-tertiary, #3d3d3d);
        color: var(--text-primary, #fff);
        font-size: var(--text-base);
        min-width: 140px;
    }

    .setting-row select:focus {
        outline: var(--focus-ring);
        outline-offset: var(--focus-ring-offset);
    }

    .btn-secondary {
        padding: var(--space-2) var(--space-4);
        background: var(--bg-tertiary, #3d3d3d);
        border: none;
        border-radius: var(--radius-md);
        color: var(--text-primary, #fff);
        cursor: pointer;
        font-size: var(--text-sm);
        min-height: auto;
        transition: background var(--transition-base);
    }

    .btn-secondary:hover {
        background: var(--surface-hover, #4d4d4d);
    }

    .btn-secondary:focus-visible {
        outline: var(--focus-ring);
        outline-offset: var(--focus-ring-offset);
    }

    .products-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-1-5);
        max-height: 250px;
        overflow-y: auto;
    }

    .product-toggle {
        display: flex;
        align-items: center;
        gap: var(--space-2-5);
        padding: var(--space-2) var(--space-2-5);
        background: var(--bg-tertiary, #3d3d3d);
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: background var(--transition-base);
    }

    .product-toggle:hover {
        background: var(--surface-hover, #4d4d4d);
    }

    .product-toggle input {
        width: var(--space-4);
        height: var(--space-4);
    }

    .product-toggle input:focus-visible {
        outline: var(--focus-ring);
        outline-offset: var(--focus-ring-offset);
    }

    .product-info {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        color: var(--text-primary, #fff);
        font-size: var(--text-base);
    }

    .product-icon {
        width: var(--space-5);
        height: var(--space-5);
    }

    .sync-status {
        background: var(--bg-tertiary, #3d3d3d);
        border-radius: var(--radius-md);
        padding: var(--space-3);
        margin-bottom: var(--space-3);
    }

    .status-row {
        display: flex;
        justify-content: space-between;
        padding: var(--space-0-5) 0;
        color: var(--text-secondary, #999);
        font-size: var(--text-sm);
    }

    .status-value {
        color: var(--text-primary, #fff);
    }

    .coming-soon {
        font-size: var(--text-sm);
        color: var(--text-muted, #666);
        font-style: italic;
    }

    .shortcuts-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
    }

    .shortcut-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--space-1-5) 0;
        border-bottom: var(--border-1) solid var(--border-subtle, #3d3d3d);
    }

    .shortcut-keys {
        font-family: monospace;
        font-size: var(--text-xs);
        background: var(--keycap-bg, #3d3d3d);
        color: var(--keycap-text, #fff);
        padding: var(--space-0-5) var(--space-1-5);
        border-radius: var(--radius-sm);
        border: var(--border-1) solid var(--keycap-border, #5d5d5d);
    }

    .shortcut-action {
        color: var(--text-secondary, #999);
        font-size: var(--text-sm);
    }

    @media (max-width: 600px) {
        .settings-modal {
            max-height: 85vh;
            min-height: 300px;
        }

        .settings-content {
            flex-direction: column;
        }

        .settings-nav {
            width: 100%;
            display: flex;
            overflow-x: auto;
            border-right: none;
            border-bottom: var(--border-1) solid var(--border-default, #3d3d3d);
            padding: var(--space-1-5);
            gap: var(--space-1-5);
        }

        .nav-item {
            flex-shrink: 0;
            white-space: nowrap;
            padding: var(--space-2) var(--space-2-5);
        }
    }
</style>


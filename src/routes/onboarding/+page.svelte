<!--
  Onboarding Wizard

  First-run setup flow with three steps:
  1. Programs - Select which DAWs/plugins to show
  2. iCloud Sync - Enable cloud sync (stub)
  3. Theme - Choose visual theme
-->
<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { base } from '$app/paths';
    import { products } from '$lib/products';
    import {
        loadOnboardingSettings,
        completeOnboarding,
        skipOnboarding,
        connectICloud,
        disconnectICloud
    } from '$lib/onboarding';
    import { getThemes, setTheme } from '$lib/themes';

    // Current step (1-3)
    let currentStep = 1;

    // Step 1: Products
    let selectedProductIds: string[] = [];

    // Step 2: iCloud
    let iCloudEnabled = false;
    let iCloudStatus = 'disabled';

    // Step 3: Theme
    let selectedThemeId = 'system';

    // Available themes
    const themes = getThemes();

    onMount(() => {
        const settings = loadOnboardingSettings();
        selectedProductIds = settings.selectedProductIds;
        iCloudEnabled = settings.iCloud.enabled;
        iCloudStatus = settings.iCloud.syncStatus;
        selectedThemeId = settings.themeId;
    });

    function toggleProduct(productId: string) {
        if (selectedProductIds.includes(productId)) {
            selectedProductIds = selectedProductIds.filter(id => id !== productId);
        } else {
            selectedProductIds = [...selectedProductIds, productId];
        }
    }

    function selectAll() {
        selectedProductIds = products.map(p => p.productId);
    }

    function selectNone() {
        selectedProductIds = [];
    }

    function handleICloudToggle() {
        iCloudEnabled = !iCloudEnabled;
        if (iCloudEnabled) {
            connectICloud();
            iCloudStatus = 'ready';
        } else {
            disconnectICloud();
            iCloudStatus = 'disabled';
        }
    }

    function handleThemeChange(themeId: string) {
        selectedThemeId = themeId;
        setTheme(themeId);
    }

    function nextStep() {
        if (currentStep < 3) {
            currentStep++;
        } else {
            finishOnboarding();
        }
    }

    function prevStep() {
        if (currentStep > 1) {
            currentStep--;
        }
    }

    function finishOnboarding() {
        completeOnboarding({
            selectedProductIds,
            themeId: selectedThemeId,
            iCloud: {
                enabled: iCloudEnabled,
                syncStatus: iCloudStatus as any,
                lastConnectedAt: iCloudEnabled ? new Date().toISOString() : null,
                lastError: null
            }
        });
        goto(`${base}/`);
    }

    function handleSkip() {
        skipOnboarding();
        goto(`${base}/`);
    }
</script>

<svelte:head>
    <title>Welcome to Producer Hub</title>
</svelte:head>

<div class="onboarding">
    <div class="onboarding-container">
        <header class="onboarding-header">
            <h1>Welcome to Producer Hub</h1>
            <p>Let's set up your workspace</p>
        </header>

        <!-- Progress Steps -->
        <div class="steps">
            <div class="step" class:active={currentStep >= 1} class:completed={currentStep > 1}>
                <span class="step-number">1</span>
                <span class="step-label">Programs</span>
            </div>
            <div class="step-line" class:active={currentStep > 1}></div>
            <div class="step" class:active={currentStep >= 2} class:completed={currentStep > 2}>
                <span class="step-number">2</span>
                <span class="step-label">Sync</span>
            </div>
            <div class="step-line" class:active={currentStep > 2}></div>
            <div class="step" class:active={currentStep >= 3}>
                <span class="step-number">3</span>
                <span class="step-label">Theme</span>
            </div>
        </div>

        <!-- Step Content -->
        <div class="step-content">
            {#if currentStep === 1}
                <!-- Step 1: Programs -->
                <div class="step-panel">
                    <h2>Select Your Programs</h2>
                    <p>Choose which DAWs and plugins you want to see shortcuts for.</p>

                    <div class="selection-actions">
                        <button class="btn-text" on:click={selectAll}>Select All</button>
                        <button class="btn-text" on:click={selectNone}>Clear All</button>
                    </div>

                    <div class="products-grid">
                        {#each products as product}
                            <button
                                class="product-card"
                                class:selected={selectedProductIds.includes(product.productId)}
                                on:click={() => toggleProduct(product.productId)}
                            >
                                <div class="product-icon">
                                    <img src="{base}/{product.icon}" alt="" />
                                </div>
                                <div class="product-info">
                                    <span class="product-name">{product.name}</span>
                                    <span class="product-vendor">{product.vendor}</span>
                                </div>
                                <div class="product-check">
                                    {#if selectedProductIds.includes(product.productId)}
                                        ✓
                                    {/if}
                                </div>
                            </button>
                        {/each}
                    </div>
                </div>
            {:else if currentStep === 2}
                <!-- Step 2: iCloud Sync -->
                <div class="step-panel">
                    <h2>Cloud Sync</h2>
                    <p>Sync your data across devices using iCloud Drive.</p>

                    <div class="sync-option">
                        <div class="sync-info">
                            <span class="sync-icon">☁️</span>
                            <div class="sync-text">
                                <strong>iCloud Sync</strong>
                                <span>Keep your projects, notes, and preferences in sync</span>
                            </div>
                        </div>
                        <button
                            class="toggle-btn"
                            class:active={iCloudEnabled}
                            on:click={handleICloudToggle}
                            aria-label={iCloudEnabled ? 'Disable iCloud sync' : 'Enable iCloud sync'}
                        >
                            <span class="toggle-track">
                                <span class="toggle-thumb"></span>
                            </span>
                        </button>
                    </div>

                    {#if iCloudEnabled}
                        <div class="sync-status">
                            <span class="status-icon">✓</span>
                            <span>Connected to iCloud</span>
                        </div>
                    {:else}
                        <p class="sync-note">
                            You can enable this later in Settings. Your data is always stored locally first.
                        </p>
                    {/if}
                </div>
            {:else if currentStep === 3}
                <!-- Step 3: Theme -->
                <div class="step-panel">
                    <h2>Choose Your Theme</h2>
                    <p>Select a visual theme for the interface.</p>

                    <div class="themes-grid">
                        <button
                            class="theme-card"
                            class:selected={selectedThemeId === 'system'}
                            on:click={() => handleThemeChange('system')}
                        >
                            <div class="theme-preview system">
                                <div class="preview-half light"></div>
                                <div class="preview-half dark"></div>
                            </div>
                            <span class="theme-name">System</span>
                        </button>

                        {#each themes as theme}
                            <button
                                class="theme-card"
                                class:selected={selectedThemeId === theme.id}
                                on:click={() => handleThemeChange(theme.id)}
                            >
                                <div
                                    class="theme-preview"
                                    style="background: {theme.vars['--bg-primary']}; border-color: {theme.vars['--border-default']}"
                                >
                                    <div
                                        class="preview-accent"
                                        style="background: {theme.vars['--accent-primary']}"
                                    ></div>
                                </div>
                                <span class="theme-name">{theme.name}</span>
                            </button>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>

        <!-- Navigation -->
        <div class="onboarding-nav">
            <button class="btn-ghost" on:click={handleSkip}>
                Skip for now
            </button>

            <div class="nav-buttons">
                {#if currentStep > 1}
                    <button class="btn-secondary" on:click={prevStep}>
                        Back
                    </button>
                {/if}
                <button
                    class="btn-primary"
                    on:click={nextStep}
                    disabled={currentStep === 1 && selectedProductIds.length === 0}
                >
                    {currentStep === 3 ? 'Get Started' : 'Continue'}
                </button>
            </div>
        </div>
    </div>
</div>

<style>
    .onboarding {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        background: var(--bg-primary, #1a1a1a);
    }

    .onboarding-container {
        width: 100%;
        max-width: 600px;
        background: var(--bg-secondary, #2d2d2d);
        border-radius: 16px;
        padding: 2rem;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    .onboarding-header {
        text-align: center;
        margin-bottom: 2rem;
    }

    .onboarding-header h1 {
        font-size: 1.75rem;
        margin: 0 0 0.5rem 0;
        color: var(--text-primary, #fff);
    }

    .onboarding-header p {
        color: var(--text-secondary, #999);
        margin: 0;
    }

    /* Steps */
    .steps {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        margin-bottom: 2rem;
    }

    .step {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25rem;
        opacity: 0.5;
        transition: opacity 0.2s;
    }

    .step.active {
        opacity: 1;
    }

    .step-number {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: var(--bg-tertiary, #3d3d3d);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        color: var(--text-primary, #fff);
    }

    .step.active .step-number {
        background: var(--accent-primary, #3b82f6);
    }

    .step.completed .step-number {
        background: var(--accent-success, #22c55e);
    }

    .step-label {
        font-size: 0.75rem;
        color: var(--text-secondary, #999);
    }

    .step-line {
        width: 40px;
        height: 2px;
        background: var(--border-default, #3d3d3d);
        margin-bottom: 1rem;
    }

    .step-line.active {
        background: var(--accent-primary, #3b82f6);
    }

    /* Step Content */
    .step-content {
        min-height: 300px;
    }

    .step-panel h2 {
        font-size: 1.25rem;
        margin: 0 0 0.5rem 0;
        color: var(--text-primary, #fff);
    }

    .step-panel > p {
        color: var(--text-secondary, #999);
        margin: 0 0 1.5rem 0;
    }

    /* Products Grid */
    .selection-actions {
        display: flex;
        gap: 1rem;
        margin-bottom: 1rem;
    }

    .btn-text {
        background: none;
        border: none;
        color: var(--accent-primary, #3b82f6);
        cursor: pointer;
        font-size: 0.875rem;
    }

    .products-grid {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        max-height: 250px;
        overflow-y: auto;
    }

    .product-card {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.75rem;
        background: var(--bg-tertiary, #3d3d3d);
        border: 2px solid transparent;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
    }

    .product-card:hover {
        background: var(--surface-hover, #4d4d4d);
    }

    .product-card.selected {
        border-color: var(--accent-primary, #3b82f6);
        background: var(--selection-bg, rgba(59, 130, 246, 0.1));
    }

    .product-icon {
        width: 40px;
        height: 40px;
        border-radius: 8px;
        background: var(--bg-secondary, #2d2d2d);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .product-icon img {
        width: 24px;
        height: 24px;
    }

    .product-info {
        flex: 1;
        display: flex;
        flex-direction: column;
    }

    .product-name {
        font-weight: 500;
        color: var(--text-primary, #fff);
    }

    .product-vendor {
        font-size: 0.75rem;
        color: var(--text-muted, #666);
    }

    .product-check {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: var(--accent-primary, #3b82f6);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.875rem;
        opacity: 0;
    }

    .product-card.selected .product-check {
        opacity: 1;
    }

    /* Sync Option */
    .sync-option {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem;
        background: var(--bg-tertiary, #3d3d3d);
        border-radius: 8px;
        margin-bottom: 1rem;
    }

    .sync-info {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .sync-icon {
        font-size: 1.5rem;
    }

    .sync-text {
        display: flex;
        flex-direction: column;
    }

    .sync-text strong {
        color: var(--text-primary, #fff);
    }

    .sync-text span {
        font-size: 0.75rem;
        color: var(--text-muted, #666);
    }

    .toggle-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;
    }

    .toggle-track {
        display: block;
        width: 48px;
        height: 28px;
        background: var(--border-default, #3d3d3d);
        border-radius: 14px;
        position: relative;
        transition: background 0.2s;
    }

    .toggle-btn.active .toggle-track {
        background: var(--accent-primary, #3b82f6);
    }

    .toggle-thumb {
        position: absolute;
        top: 2px;
        left: 2px;
        width: 24px;
        height: 24px;
        background: white;
        border-radius: 50%;
        transition: transform 0.2s;
    }

    .toggle-btn.active .toggle-thumb {
        transform: translateX(20px);
    }

    .sync-status {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--accent-success, #22c55e);
        font-size: 0.875rem;
    }

    .sync-note {
        font-size: 0.875rem;
        color: var(--text-muted, #666);
    }

    /* Themes Grid */
    .themes-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1rem;
    }

    .theme-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem;
        background: var(--bg-tertiary, #3d3d3d);
        border: 2px solid transparent;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
    }

    .theme-card:hover {
        background: var(--surface-hover, #4d4d4d);
    }

    .theme-card.selected {
        border-color: var(--accent-primary, #3b82f6);
    }

    .theme-preview {
        width: 100%;
        height: 60px;
        border-radius: 6px;
        border: 1px solid var(--border-default, #3d3d3d);
        overflow: hidden;
        display: flex;
    }

    .theme-preview.system {
        display: flex;
    }

    .preview-half {
        flex: 1;
    }

    .preview-half.light {
        background: #f5f5f5;
    }

    .preview-half.dark {
        background: #1e1e1e;
    }

    .preview-accent {
        width: 30%;
        height: 100%;
    }

    .theme-name {
        font-size: 0.75rem;
        color: var(--text-primary, #fff);
    }

    /* Navigation */
    .onboarding-nav {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 2rem;
        padding-top: 1.5rem;
        border-top: 1px solid var(--border-default, #3d3d3d);
    }

    .nav-buttons {
        display: flex;
        gap: 0.75rem;
    }

    .btn-ghost {
        background: none;
        border: none;
        color: var(--text-muted, #666);
        cursor: pointer;
        font-size: 0.875rem;
    }

    .btn-ghost:hover {
        color: var(--text-secondary, #999);
    }

    .btn-secondary {
        padding: 0.75rem 1.5rem;
        background: var(--bg-tertiary, #3d3d3d);
        border: none;
        border-radius: 8px;
        color: var(--text-primary, #fff);
        cursor: pointer;
        font-size: 0.875rem;
    }

    .btn-primary {
        padding: 0.75rem 1.5rem;
        background: var(--accent-primary, #3b82f6);
        border: none;
        border-radius: 8px;
        color: white;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
    }

    .btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
</style>


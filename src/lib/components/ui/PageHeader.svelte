<!--
  PageHeader Component

  A standardized header for page/section titles with optional action buttons.
  Provides consistent spacing, alignment, and responsive behavior.

  @component
  @prop title - The main title text
  @prop subtitle - Optional subtitle or description
  @prop icon - Optional icon (emoji or text) before title
  @prop size - Size variant: 'sm' | 'md' | 'lg'
  @prop sticky - Whether header sticks to top on scroll
  @prop backHref - Optional back link href
  @prop backLabel - Accessible label for back button

  Usage:
  <PageHeader title="Projects" icon="◈">
    {#snippet actions()}
      <button>+ New</button>
    {/snippet}
  </PageHeader>
-->
<script lang="ts">
    import type { Snippet } from 'svelte';

    interface Props {
        title: string;
        subtitle?: string;
        icon?: string;
        size?: 'sm' | 'md' | 'lg';
        sticky?: boolean;
        backHref?: string;
        backLabel?: string;
        actions?: Snippet;
        class?: string;
    }

    let {
        title,
        subtitle = '',
        icon = '',
        size = 'md',
        sticky = false,
        backHref = '',
        backLabel = 'Go back',
        actions,
        class: className = ''
    }: Props = $props();
</script>

<header
    class="page-header page-header-{size} {sticky ? 'sticky' : ''} {className}"
>
    <div class="page-header-content">
        {#if backHref}
            <a href={backHref} class="page-header-back" aria-label={backLabel}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
            </a>
        {/if}

        <div class="page-header-title-group">
            <h2 class="page-header-title">
                {#if icon}
                    <span class="page-header-icon" aria-hidden="true">{icon}</span>
                {/if}
                {title}
            </h2>
            {#if subtitle}
                <p class="page-header-subtitle">{subtitle}</p>
            {/if}
        </div>
    </div>

    {#if actions}
        <div class="page-header-actions">
            {@render actions()}
        </div>
    {/if}
</header>

<style>
    .page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-4);
        padding: var(--space-4) var(--space-4);
        background: var(--bg-secondary, #242424);
        border-bottom: var(--border-1, 1px) solid var(--border-default, #333);
        flex-shrink: 0;
    }

    .page-header.sticky {
        position: sticky;
        top: 0;
        z-index: var(--z-sticky, 100);
    }

    /* Size variants */
    .page-header-sm {
        padding: var(--space-2) var(--space-3);
    }

    .page-header-sm .page-header-title {
        font-size: var(--text-base, 0.875rem);
    }

    .page-header-md {
        padding: var(--space-3) var(--space-4);
    }

    .page-header-md .page-header-title {
        font-size: var(--text-lg, 1rem);
    }

    .page-header-lg {
        padding: var(--space-4) var(--space-5);
    }

    .page-header-lg .page-header-title {
        font-size: var(--text-xl, 1.125rem);
    }

    .page-header-content {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        min-width: 0;
        flex: 1;
    }

    .page-header-back {
        display: flex;
        align-items: center;
        justify-content: center;
        width: var(--touch-target, 44px);
        height: var(--touch-target, 44px);
        margin: calc(-1 * var(--space-2));
        border-radius: var(--radius-full, 9999px);
        color: var(--text-secondary, #999);
        text-decoration: none;
        transition: all var(--transition-base, 0.15s);
        flex-shrink: 0;
    }

    .page-header-back:hover {
        background: var(--surface-hover, #3d3d3d);
        color: var(--text-primary, #fff);
    }

    .page-header-back:focus-visible {
        outline: var(--focus-ring, 2px solid var(--accent-primary));
        outline-offset: var(--focus-ring-offset, 2px);
    }

    .page-header-title-group {
        min-width: 0;
        flex: 1;
    }

    .page-header-title {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        margin: 0;
        font-weight: var(--font-semibold, 600);
        color: var(--text-primary, #fff);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .page-header-icon {
        flex-shrink: 0;
    }

    .page-header-subtitle {
        margin: var(--space-0-5) 0 0;
        font-size: var(--text-sm, 0.8125rem);
        color: var(--text-muted, #888);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .page-header-actions {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        flex-shrink: 0;
    }

    /* Ensure action buttons have consistent styling */
    .page-header-actions :global(button),
    .page-header-actions :global(a) {
        min-height: var(--touch-target, 44px);
    }

    /* Mobile responsive */
    @media (max-width: 640px) {
        .page-header {
            padding: var(--space-3);
            gap: var(--space-2);
        }

        .page-header-sm {
            padding: var(--space-2);
        }

        .page-header-lg {
            padding: var(--space-3) var(--space-4);
        }

        .page-header-title {
            font-size: var(--text-base, 0.875rem);
        }

        .page-header-lg .page-header-title {
            font-size: var(--text-lg, 1rem);
        }

        .page-header-subtitle {
            display: none;
        }
    }
</style>


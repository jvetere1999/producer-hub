<!--
  EmptyState Component

  A consistent empty state display with icon, title, body text, and optional CTA.
  Used across Projects, Inbox, Collections, References tabs.

  @component
  @prop icon - Emoji or icon character to display
  @prop title - Main heading text
  @prop body - Optional descriptive body text
  @prop ctaLabel - Optional call-to-action button label
  @prop onCta - Optional callback when CTA is clicked

  Usage:
  <EmptyState
    icon="📁"
    title="No projects yet"
    body="Create your first project to get started"
    ctaLabel="New Project"
    onCta={() => createProject()}
  />
-->
<script lang="ts">
    interface Props {
        icon?: string;
        title: string;
        body?: string;
        ctaLabel?: string;
        onCta?: () => void;
    }

    let {
        icon = '📭',
        title,
        body,
        ctaLabel,
        onCta
    }: Props = $props();
</script>

<div class="empty-state" role="status" aria-label={title}>
    {#if icon}
        <span class="empty-icon" aria-hidden="true">{icon}</span>
    {/if}
    <h3 class="empty-title">{title}</h3>
    {#if body}
        <p class="empty-body">{body}</p>
    {/if}
    {#if ctaLabel && onCta}
        <button class="empty-cta" onclick={onCta}>
            {ctaLabel}
        </button>
    {/if}
</div>

<style>
    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--space-8, 2rem) var(--space-4, 1rem);
        text-align: center;
        min-height: 200px;
    }

    .empty-icon {
        font-size: 3rem;
        margin-bottom: var(--space-4, 1rem);
        opacity: 0.8;
    }

    .empty-title {
        margin: 0;
        font-size: var(--text-lg, 1rem);
        font-weight: var(--font-semibold, 600);
        color: var(--text-primary, #fff);
        margin-bottom: var(--space-2, 0.5rem);
    }

    .empty-body {
        margin: 0;
        font-size: var(--text-sm, 0.875rem);
        color: var(--text-muted, #888);
        max-width: 280px;
        line-height: var(--leading-relaxed, 1.625);
    }

    .empty-cta {
        margin-top: var(--space-4, 1rem);
        padding: var(--space-2, 0.5rem) var(--space-4, 1rem);
        background: var(--accent-primary, #ff764d);
        color: white;
        border: none;
        border-radius: var(--radius-lg, 8px);
        font-size: var(--text-sm, 0.875rem);
        font-weight: var(--font-medium, 500);
        cursor: pointer;
        transition: all var(--transition-base, 0.15s);
        min-height: var(--touch-target, 44px);
    }

    .empty-cta:hover {
        filter: brightness(1.1);
    }

    .empty-cta:focus-visible {
        outline: 2px solid var(--accent-primary, #ff764d);
        outline-offset: 2px;
    }
</style>


<!--
  IconButton Component

  A standardized icon-only button primitive with consistent sizing, focus states,
  and mandatory ARIA labels for accessibility. Enforces minimum 44px touch target.

  @component
  @prop ariaLabel - Required accessible label for screen readers
  @prop variant - Visual style: 'primary' | 'secondary' | 'ghost'
  @prop size - Size preset: 'sm' | 'md' | 'lg'
  @prop disabled - Whether the button is disabled
  @prop active - Whether button is in active state
  @prop title - Optional tooltip text (defaults to ariaLabel)
  @prop type - HTML button type

  Usage:
  <IconButton ariaLabel="Play" onclick={handlePlay}>
    <svg>...</svg>
  </IconButton>
-->
<script lang="ts">
    import type { Snippet } from 'svelte';

    interface Props {
        ariaLabel: string;
        variant?: 'primary' | 'secondary' | 'ghost';
        size?: 'sm' | 'md' | 'lg';
        disabled?: boolean;
        active?: boolean;
        title?: string;
        type?: 'button' | 'submit' | 'reset';
        onclick?: (e: MouseEvent) => void;
        children: Snippet;
        class?: string;
    }

    let {
        ariaLabel,
        variant = 'ghost',
        size = 'md',
        disabled = false,
        active = false,
        title,
        type = 'button',
        onclick,
        children,
        class: className = ''
    }: Props = $props();

    // Default title to ariaLabel if not provided
    const tooltipTitle = $derived(title ?? ariaLabel);
</script>

<button
    {type}
    {disabled}
    class="icon-btn icon-btn-{variant} icon-btn-{size} {active ? 'active' : ''} {className}"
    aria-label={ariaLabel}
    title={tooltipTitle}
    {onclick}
>
    <span class="icon-wrapper" aria-hidden="true">
        {@render children()}
    </span>
</button>

<style>
    .icon-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: none;
        border-radius: var(--radius-full);
        cursor: pointer;
        transition: all var(--transition-base);
        flex-shrink: 0;
        /* Ensure minimum touch target for all sizes */
        min-width: var(--touch-target);
        min-height: var(--touch-target);
    }

    .icon-btn:focus-visible {
        outline: var(--focus-ring);
        outline-offset: var(--focus-ring-offset);
    }

    .icon-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .icon-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    /* Size variants - all maintain 44px minimum touch area */
    .icon-btn-sm {
        width: var(--touch-target);
        height: var(--touch-target);
    }

    .icon-btn-sm .icon-wrapper {
        width: var(--space-4);
        height: var(--space-4);
    }

    .icon-btn-sm .icon-wrapper :global(svg),
    .icon-btn-sm .icon-wrapper :global(.icon) {
        width: var(--space-4);
        height: var(--space-4);
    }

    .icon-btn-md {
        width: var(--touch-target);
        height: var(--touch-target);
    }

    .icon-btn-md .icon-wrapper {
        width: var(--space-6);
        height: var(--space-6);
    }

    .icon-btn-md .icon-wrapper :global(svg),
    .icon-btn-md .icon-wrapper :global(.icon) {
        width: var(--space-6);
        height: var(--space-6);
    }

    .icon-btn-lg {
        width: var(--space-12);
        height: var(--space-12);
    }

    .icon-btn-lg .icon-wrapper {
        width: var(--space-7);
        height: var(--space-7);
    }

    .icon-btn-lg .icon-wrapper :global(svg),
    .icon-btn-lg .icon-wrapper :global(.icon) {
        width: var(--space-7);
        height: var(--space-7);
    }

    /* Variant styles */
    .icon-btn-primary {
        background: var(--accent-primary, #3b82f6);
        color: white;
    }

    .icon-btn-primary:hover:not(:disabled) {
        filter: brightness(1.1);
    }

    .icon-btn-primary:active:not(:disabled) {
        filter: brightness(0.95);
    }

    .icon-btn-secondary {
        background: var(--bg-tertiary, #3d3d3d);
        color: var(--text-primary, #fff);
    }

    .icon-btn-secondary:hover:not(:disabled) {
        background: var(--surface-hover, #4d4d4d);
    }

    .icon-btn-secondary:active:not(:disabled) {
        background: var(--surface-active, #5d5d5d);
    }

    .icon-btn-ghost {
        background: transparent;
        color: var(--text-primary, #fff);
    }

    .icon-btn-ghost:hover:not(:disabled) {
        background: var(--surface-hover, #3d3d3d);
    }

    .icon-btn-ghost:active:not(:disabled) {
        background: var(--surface-active, #4d4d4d);
    }

    /* Active state */
    .icon-btn.active {
        color: var(--accent-primary, #ff764d);
    }
</style>


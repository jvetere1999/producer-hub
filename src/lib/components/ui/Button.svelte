Implement a shared “Sheet” component for mobile overlays.

Scope:
- Create a reusable Sheet/BottomSheet component (no external libs).
- Supports open/close, esc to close, click-backdrop to close, focus trap if feasible.
- Add basic animation respecting prefers-reduced-motion.

Acceptance:
- Works on mobile and desktop.
- No scroll bleed when open.
- Unit tests for open/close state + Playwright smoke test.
<!--
  Button Component

  A standardized button primitive with consistent sizing, focus states, and variants.
  Enforces minimum 44px touch target on all interactive sizes.

  @component
  @prop variant - Visual style: 'primary' | 'secondary' | 'ghost' | 'danger'
  @prop size - Size preset: 'sm' | 'md' | 'lg'
  @prop disabled - Whether the button is disabled
  @prop type - HTML button type
  @prop fullWidth - Whether button takes full container width

  Usage:
  <Button variant="primary" size="md" onclick={handleClick}>Click me</Button>
-->
<script lang="ts">
    import type { Snippet } from 'svelte';

    interface Props {
        variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
        size?: 'sm' | 'md' | 'lg';
        disabled?: boolean;
        type?: 'button' | 'submit' | 'reset';
        fullWidth?: boolean;
        onclick?: (e: MouseEvent) => void;
        children: Snippet;
        class?: string;
    }

    let {
        variant = 'secondary',
        size = 'md',
        disabled = false,
        type = 'button',
        fullWidth = false,
        onclick,
        children,
        class: className = ''
    }: Props = $props();
</script>

<button
    {type}
    {disabled}
    class="btn btn-{variant} btn-{size} {fullWidth ? 'btn-full' : ''} {className}"
    {onclick}
>
    {@render children()}
</button>

<style>
    .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-2);
        border: none;
        border-radius: var(--radius-lg);
        font-weight: var(--font-medium);
        cursor: pointer;
        transition: all var(--transition-base);
        white-space: nowrap;
        text-decoration: none;
        /* Ensure minimum touch target */
        min-height: var(--touch-target);
    }

    .btn:focus-visible {
        outline: var(--focus-ring);
        outline-offset: var(--focus-ring-offset);
    }

    .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    /* Size variants */
    .btn-sm {
        padding: var(--space-1-5) var(--space-3);
        font-size: var(--text-sm);
        min-height: var(--touch-target);
    }

    .btn-md {
        padding: var(--space-2) var(--space-4);
        font-size: var(--text-base);
        min-height: var(--touch-target);
    }

    .btn-lg {
        padding: var(--space-3) var(--space-6);
        font-size: var(--text-lg);
        min-height: var(--space-12);
    }

    /* Variant styles */
    .btn-primary {
        background: var(--accent-primary, #3b82f6);
        color: white;
    }

    .btn-primary:hover:not(:disabled) {
        filter: brightness(1.1);
    }

    .btn-primary:active:not(:disabled) {
        filter: brightness(0.95);
    }

    .btn-secondary {
        background: var(--bg-tertiary, #3d3d3d);
        color: var(--text-primary, #fff);
    }

    .btn-secondary:hover:not(:disabled) {
        background: var(--surface-hover, #4d4d4d);
    }

    .btn-secondary:active:not(:disabled) {
        background: var(--surface-active, #5d5d5d);
    }

    .btn-ghost {
        background: transparent;
        color: var(--text-secondary, #999);
    }

    .btn-ghost:hover:not(:disabled) {
        background: var(--surface-hover, #3d3d3d);
        color: var(--text-primary, #fff);
    }

    .btn-ghost:active:not(:disabled) {
        background: var(--surface-active, #4d4d4d);
    }

    .btn-danger {
        background: var(--accent-error, #ef4444);
        color: white;
    }

    .btn-danger:hover:not(:disabled) {
        filter: brightness(1.1);
    }

    .btn-danger:active:not(:disabled) {
        filter: brightness(0.95);
    }

    /* Full width */
    .btn-full {
        width: 100%;
    }
</style>


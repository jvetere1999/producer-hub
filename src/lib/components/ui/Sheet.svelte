<!--
  Sheet Component (Bottom Sheet / Modal Overlay)

  A reusable overlay component that slides up from the bottom on mobile
  and appears as a centered modal on desktop. Supports:
  - Open/close with animation
  - Escape key to close
  - Click backdrop to close
  - Focus trap for accessibility
  - Respects prefers-reduced-motion
  - Prevents scroll bleed when open

  @component
  @prop open - Whether the sheet is visible
  @prop onClose - Callback when sheet should close
  @prop title - Optional title for the sheet header
  @prop size - Size preset: 'sm' | 'md' | 'lg' | 'full'
  @prop showCloseButton - Whether to show close button in header

  Usage:
  <Sheet bind:open onClose={() => open = false} title="My Sheet">
    <p>Sheet content here</p>
  </Sheet>
-->
<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import type { Snippet } from 'svelte';

    interface Props {
        open?: boolean;
        onClose?: () => void;
        title?: string;
        size?: 'sm' | 'md' | 'lg' | 'full';
        showCloseButton?: boolean;
        children: Snippet;
        header?: Snippet;
        footer?: Snippet;
    }

    let {
        open = $bindable(false),
        onClose,
        title = '',
        size = 'md',
        showCloseButton = true,
        children,
        header,
        footer
    }: Props = $props();

    let sheetElement = $state<HTMLElement | null>(null);
    let previouslyFocusedElement: HTMLElement | null = null;
    let isClosing = $state(false);
    let isVisible = $state(false);

    // Animation duration in ms
    const ANIMATION_DURATION = 300;

    // Handle escape key
    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape' && open) {
            e.preventDefault();
            close();
        }
    }

    // Handle backdrop click
    function handleBackdropClick(e: MouseEvent) {
        if (e.target === e.currentTarget) {
            close();
        }
    }

    // Close with animation
    function close() {
        if (isClosing) return;
        isClosing = true;

        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const duration = prefersReducedMotion ? 0 : ANIMATION_DURATION;

        setTimeout(() => {
            open = false;
            isClosing = false;
            isVisible = false;
            onClose?.();
        }, duration);
    }

    // Focus trap - get focusable elements
    function getFocusableElements(): HTMLElement[] {
        if (!sheetElement) return [];
        const focusableSelectors = [
            'button:not([disabled])',
            'a[href]',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])'
        ].join(', ');
        return Array.from(sheetElement.querySelectorAll<HTMLElement>(focusableSelectors));
    }

    // Handle tab key for focus trap
    function handleTabKey(e: KeyboardEvent) {
        if (!open || e.key !== 'Tab') return;

        const focusable = getFocusableElements();
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }

    // Lock body scroll when open
    function lockScroll() {
        document.body.style.overflow = 'hidden';
        document.body.style.paddingRight = `${window.innerWidth - document.documentElement.clientWidth}px`;
    }

    // Unlock body scroll when closed
    function unlockScroll() {
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }

    // Watch for open changes
    $effect(() => {
        if (open) {
            isVisible = true;
            isClosing = false;
            previouslyFocusedElement = document.activeElement as HTMLElement;
            lockScroll();

            // Focus first focusable element after render
            requestAnimationFrame(() => {
                const focusable = getFocusableElements();
                if (focusable.length > 0) {
                    focusable[0].focus();
                } else {
                    sheetElement?.focus();
                }
            });
        } else {
            unlockScroll();
            // Restore focus to previously focused element
            if (previouslyFocusedElement) {
                previouslyFocusedElement.focus();
                previouslyFocusedElement = null;
            }
        }
    });

    onDestroy(() => {
        unlockScroll();
    });
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isVisible}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
        class="sheet-backdrop"
        class:closing={isClosing}
        onclick={handleBackdropClick}
        onkeydown={handleTabKey}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'sheet-title' : undefined}
        tabindex="-1"
    >
        <div
            bind:this={sheetElement}
            class="sheet sheet-{size}"
            class:closing={isClosing}
            tabindex="-1"
        >
            {#if title || showCloseButton || header}
                <header class="sheet-header">
                    {#if header}
                        {@render header()}
                    {:else}
                        {#if title}
                            <h2 id="sheet-title" class="sheet-title">{title}</h2>
                        {:else}
                            <div></div>
                        {/if}
                        {#if showCloseButton}
                            <button
                                type="button"
                                class="sheet-close"
                                onclick={close}
                                aria-label="Close"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M18 6L6 18M6 6l12 12"/>
                                </svg>
                            </button>
                        {/if}
                    {/if}
                </header>
            {/if}

            <div class="sheet-content">
                {@render children()}
            </div>

            {#if footer}
                <footer class="sheet-footer">
                    {@render footer()}
                </footer>
            {/if}
        </div>
    </div>
{/if}

<style>
    .sheet-backdrop {
        position: fixed;
        inset: 0;
        z-index: var(--z-modal, 1000);
        display: flex;
        align-items: flex-end;
        justify-content: center;
        background: rgba(0, 0, 0, 0);
        animation: backdrop-fade-in var(--transition-slower, 0.3s) ease forwards;
    }

    .sheet-backdrop.closing {
        animation: backdrop-fade-out var(--transition-slower, 0.3s) ease forwards;
    }

    @keyframes backdrop-fade-in {
        from { background: rgba(0, 0, 0, 0); }
        to { background: rgba(0, 0, 0, 0.5); }
    }

    @keyframes backdrop-fade-out {
        from { background: rgba(0, 0, 0, 0.5); }
        to { background: rgba(0, 0, 0, 0); }
    }

    .sheet {
        position: relative;
        display: flex;
        flex-direction: column;
        width: 100%;
        max-height: 90vh;
        max-height: 90dvh;
        background: var(--bg-secondary, #2d2d2d);
        border-top-left-radius: var(--radius-2xl, 1rem);
        border-top-right-radius: var(--radius-2xl, 1rem);
        box-shadow: var(--shadow-modal, 0 -8px 32px rgba(0, 0, 0, 0.4));
        overflow: hidden;
        animation: sheet-slide-up var(--transition-slower, 0.3s) ease forwards;
        /* iOS safe area */
        padding-bottom: env(safe-area-inset-bottom);
    }

    .sheet.closing {
        animation: sheet-slide-down var(--transition-slower, 0.3s) ease forwards;
    }

    @keyframes sheet-slide-up {
        from {
            transform: translateY(100%);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }

    @keyframes sheet-slide-down {
        from {
            transform: translateY(0);
            opacity: 1;
        }
        to {
            transform: translateY(100%);
            opacity: 0;
        }
    }

    /* Size variants */
    .sheet-sm {
        max-width: 400px;
    }

    .sheet-md {
        max-width: 540px;
    }

    .sheet-lg {
        max-width: 720px;
    }

    .sheet-full {
        max-width: 100%;
        max-height: 100vh;
        max-height: 100dvh;
        border-radius: 0;
    }

    /* Desktop: center the sheet */
    @media (min-width: 640px) {
        .sheet-backdrop {
            align-items: center;
        }

        .sheet {
            border-radius: var(--radius-2xl, 1rem);
            max-height: 85vh;
            margin: var(--space-4, 1rem);
            animation-name: sheet-scale-up;
        }

        .sheet.closing {
            animation-name: sheet-scale-down;
        }

        @keyframes sheet-scale-up {
            from {
                transform: scale(0.95);
                opacity: 0;
            }
            to {
                transform: scale(1);
                opacity: 1;
            }
        }

        @keyframes sheet-scale-down {
            from {
                transform: scale(1);
                opacity: 1;
            }
            to {
                transform: scale(0.95);
                opacity: 0;
            }
        }
    }

    /* Reduced motion preference */
    @media (prefers-reduced-motion: reduce) {
        .sheet-backdrop,
        .sheet-backdrop.closing {
            animation-duration: 0.01ms;
        }

        .sheet,
        .sheet.closing {
            animation-duration: 0.01ms;
        }
    }

    .sheet-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--space-4, 1rem) var(--space-5, 1.25rem);
        border-bottom: var(--border-1, 1px) solid var(--border-default, #444);
        flex-shrink: 0;
    }

    .sheet-title {
        margin: 0;
        font-size: var(--text-xl, 1.125rem);
        font-weight: var(--font-semibold, 600);
        color: var(--text-primary, #fff);
    }

    .sheet-close {
        display: flex;
        align-items: center;
        justify-content: center;
        width: var(--touch-target, 44px);
        height: var(--touch-target, 44px);
        margin: calc(-1 * var(--space-2, 0.5rem));
        background: transparent;
        border: none;
        border-radius: var(--radius-full, 9999px);
        color: var(--text-secondary, #999);
        cursor: pointer;
        transition: all var(--transition-base, 0.15s);
    }

    .sheet-close:hover {
        background: var(--surface-hover, #3d3d3d);
        color: var(--text-primary, #fff);
    }

    .sheet-close:focus-visible {
        outline: var(--focus-ring, 2px solid var(--accent-primary, #3b82f6));
        outline-offset: var(--focus-ring-offset, 2px);
    }

    .sheet-content {
        flex: 1;
        padding: var(--space-4, 1rem) var(--space-5, 1.25rem);
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
    }

    .sheet-footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: var(--space-3, 0.75rem);
        padding: var(--space-4, 1rem) var(--space-5, 1.25rem);
        border-top: var(--border-1, 1px) solid var(--border-default, #444);
        flex-shrink: 0;
    }
</style>


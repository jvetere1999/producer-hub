<!--
  ToastContainer Component

  Renders toast notifications in a fixed position.
  Supports error, success, and info types with auto-dismiss.

  @component

  Usage:
  1. Import toasts store: import { toasts } from '$lib/stores/toast';
  2. Add <ToastContainer /> to your layout
  3. Show toasts: toasts.error('Something went wrong');
-->
<script lang="ts">
    import { toasts, type Toast } from '$lib/stores/toast';
    import { fly, fade } from 'svelte/transition';

    function getIcon(type: Toast['type']): string {
        switch (type) {
            case 'error': return '⚠';
            case 'success': return '✓';
            case 'info': return 'ℹ';
            default: return 'ℹ';
        }
    }

    function handleDismiss(id: string) {
        toasts.dismiss(id);
    }

    function handleKeydown(e: KeyboardEvent, id: string) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleDismiss(id);
        }
    }
</script>

{#if $toasts.length > 0}
    <div class="toast-container" role="region" aria-label="Notifications" aria-live="polite">
        {#each $toasts as toast (toast.id)}
            <div
                class="toast toast-{toast.type}"
                role="alert"
                in:fly={{ y: 50, duration: 200 }}
                out:fade={{ duration: 150 }}
            >
                <span class="toast-icon" aria-hidden="true">{getIcon(toast.type)}</span>
                <span class="toast-message">{toast.message}</span>
                <button
                    class="toast-dismiss"
                    onclick={() => handleDismiss(toast.id)}
                    onkeydown={(e) => handleKeydown(e, toast.id)}
                    aria-label="Dismiss notification"
                >
                    ✕
                </button>
            </div>
        {/each}
    </div>
{/if}

<style>
    .toast-container {
        position: fixed;
        bottom: calc(var(--space-4, 1rem) + var(--safe-area-inset-bottom, 0px));
        left: 50%;
        transform: translateX(-50%);
        z-index: var(--z-tooltip, 1200);
        display: flex;
        flex-direction: column;
        gap: var(--space-2, 0.5rem);
        width: 100%;
        max-width: 400px;
        padding: 0 var(--space-4, 1rem);
        pointer-events: none;
    }

    /* When player is visible, move toasts above it */
    :global(.has-player) .toast-container {
        bottom: calc(var(--player-total-height, 90px) + var(--space-4, 1rem));
    }

    .toast {
        display: flex;
        align-items: center;
        gap: var(--space-3, 0.75rem);
        padding: var(--space-3, 0.75rem) var(--space-4, 1rem);
        background: var(--bg-elevated, #3d3d3d);
        border-radius: var(--radius-lg, 8px);
        box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1));
        pointer-events: auto;
        border-left: 4px solid;
    }

    .toast-error {
        border-color: var(--accent-error, #ef4444);
        background: rgba(239, 68, 68, 0.15);
    }

    .toast-success {
        border-color: #22c55e;
        background: rgba(34, 197, 94, 0.15);
    }

    .toast-info {
        border-color: var(--accent-primary, #3b82f6);
        background: rgba(59, 130, 246, 0.15);
    }

    .toast-icon {
        font-size: var(--text-lg, 1rem);
        flex-shrink: 0;
    }

    .toast-error .toast-icon {
        color: var(--accent-error, #ef4444);
    }

    .toast-success .toast-icon {
        color: #22c55e;
    }

    .toast-info .toast-icon {
        color: var(--accent-primary, #3b82f6);
    }

    .toast-message {
        flex: 1;
        font-size: var(--text-sm, 0.875rem);
        color: var(--text-primary, #fff);
        line-height: var(--leading-snug, 1.375);
    }

    .toast-dismiss {
        flex-shrink: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        border-radius: var(--radius-full, 9999px);
        color: var(--text-muted, #888);
        cursor: pointer;
        font-size: 12px;
        transition: all var(--transition-fast, 0.1s);
    }

    .toast-dismiss:hover {
        background: rgba(255, 255, 255, 0.1);
        color: var(--text-primary, #fff);
    }

    .toast-dismiss:focus-visible {
        outline: 2px solid var(--accent-primary, #ff764d);
        outline-offset: 2px;
    }

    /* Mobile: full width toasts */
    @media (max-width: 480px) {
        .toast-container {
            max-width: 100%;
            padding: 0 var(--space-3, 0.75rem);
        }

        .toast {
            padding: var(--space-3, 0.75rem);
        }

        .toast-message {
            font-size: var(--text-base, 0.875rem);
        }
    }
</style>


<!--
  InlineError.svelte - Inline Error Display

  A standardized inline error component for displaying
  validation errors, load failures, etc.

  Security:
  - Does not include sensitive data in error messages
-->
<script lang="ts">
    interface Props {
        message?: string;
        type?: 'error' | 'warning' | 'info';
        dismissable?: boolean;
        onDismiss?: () => void;
        onRetry?: () => void;
    }

    let {
        message = 'An error occurred',
        type = 'error',
        dismissable = false,
        onDismiss,
        onRetry,
    }: Props = $props();

    let dismissed = $state(false);

    function handleDismiss() {
        dismissed = true;
        onDismiss?.();
    }

    const icons: Record<typeof type, string> = {
        error: '⚠️',
        warning: '⚡',
        info: 'ℹ️',
    };
</script>

{#if !dismissed}
    <div class="inline-error" class:error={type === 'error'} class:warning={type === 'warning'} class:info={type === 'info'} role="alert">
        <span class="icon" aria-hidden="true">{icons[type]}</span>
        <span class="message">{message}</span>

        <div class="actions">
            {#if onRetry}
                <button class="action-btn retry" onclick={onRetry} aria-label="Retry">
                    ↻
                </button>
            {/if}
            {#if dismissable}
                <button class="action-btn dismiss" onclick={handleDismiss} aria-label="Dismiss">
                    ✕
                </button>
            {/if}
        </div>
    </div>
{/if}

<style>
    .inline-error {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-2) var(--space-3);
        border-radius: var(--radius-md);
        font-size: var(--text-sm);
    }

    .inline-error.error {
        background: color-mix(in srgb, #e74c3c 10%, var(--bg-secondary));
        border: 1px solid color-mix(in srgb, #e74c3c 30%, transparent);
        color: var(--fg-primary);
    }

    .inline-error.warning {
        background: color-mix(in srgb, #f39c12 10%, var(--bg-secondary));
        border: 1px solid color-mix(in srgb, #f39c12 30%, transparent);
        color: var(--fg-primary);
    }

    .inline-error.info {
        background: color-mix(in srgb, #3498db 10%, var(--bg-secondary));
        border: 1px solid color-mix(in srgb, #3498db 30%, transparent);
        color: var(--fg-primary);
    }

    .icon {
        flex-shrink: 0;
    }

    .message {
        flex: 1;
    }

    .actions {
        display: flex;
        gap: var(--space-1);
    }

    .action-btn {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        border-radius: var(--radius-sm);
        cursor: pointer;
        opacity: 0.6;
        font-size: 12px;
    }

    .action-btn:hover {
        opacity: 1;
        background: rgba(0, 0, 0, 0.1);
    }
</style>

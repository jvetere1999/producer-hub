<!--
  ErrorBoundary.svelte - Error Boundary Component

  Catches and displays errors gracefully, preventing crashes from
  breaking the entire UI. Provides recovery options.

  Security:
  - Does not display sensitive error details
  - Sanitizes error messages
-->
<script lang="ts">
    import { onMount } from 'svelte';
    import type { Snippet } from 'svelte';
    import { toasts } from '$lib/stores/toast';

    interface Props {
        fallback?: 'inline' | 'page';
        showDetails?: boolean;
        children: Snippet<[{ handleError: (error: unknown) => void }]>;
    }

    let {
        fallback = 'inline',
        showDetails = false,
        children,
    }: Props = $props();

    let hasError = $state(false);
    let errorMessage = $state('');
    let errorId = $state('');

    // Generate a random error ID for support reference
    function generateErrorId(): string {
        return `ERR-${Date.now().toString(36).toUpperCase()}`;
    }

    // Sanitize error message (remove sensitive info)
    function sanitizeError(error: unknown): string {
        if (!error) return 'An unknown error occurred';

        const message = error instanceof Error ? error.message : String(error);

        // Remove potential sensitive data patterns
        return message
            .replace(/password[=:]\s*\S+/gi, 'password=***')
            .replace(/token[=:]\s*\S+/gi, 'token=***')
            .replace(/key[=:]\s*\S+/gi, 'key=***')
            .replace(/secret[=:]\s*\S+/gi, 'secret=***')
            .replace(/https?:\/\/[^\s]+/g, '[URL]')
            .substring(0, 200);
    }

    // Handle errors
    function handleError(error: unknown) {
        hasError = true;
        errorId = generateErrorId();
        errorMessage = sanitizeError(error);

        // Log sanitized error (no sensitive data)
        console.error(`[${errorId}] Component error:`, sanitizeError(error));

        // Show toast notification
        toasts.error('Something went wrong. Please try again.');
    }

    // Reset error state
    function handleRetry() {
        hasError = false;
        errorMessage = '';
        errorId = '';
    }

    // Global error handler for unhandled promise rejections
    onMount(() => {
        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            // Prevent default browser error logging
            event.preventDefault();
            handleError(event.reason);
        };

        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        return () => {
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    });
</script>

{#if hasError}
    {#if fallback === 'page'}
        <div class="error-page">
            <div class="error-content">
                <span class="error-icon">⚠️</span>
                <h1>Something went wrong</h1>
                <p>We're sorry, but something unexpected happened. Please try again.</p>

                {#if showDetails}
                    <details class="error-details">
                        <summary>Error details</summary>
                        <code>{errorMessage}</code>
                        <small>Error ID: {errorId}</small>
                    </details>
                {/if}

                <div class="error-actions">
                    <button class="btn btn-primary" onclick={handleRetry}>
                        Try Again
                    </button>
                    <button class="btn btn-secondary" onclick={() => window.location.reload()}>
                        Reload Page
                    </button>
                </div>
            </div>
        </div>
    {:else}
        <div class="error-inline">
            <span class="error-icon">⚠️</span>
            <div class="error-text">
                <strong>Error loading content</strong>
                <p>{errorMessage}</p>
            </div>
            <button class="btn-retry" onclick={handleRetry} aria-label="Retry">
                ↻
            </button>
        </div>
    {/if}
{:else}
    {@render children({ handleError })}
{/if}

<style>
    /* Page-level error */
    .error-page {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 50vh;
        padding: var(--space-8);
        text-align: center;
    }

    .error-content {
        max-width: 400px;
    }

    .error-icon {
        font-size: 48px;
        display: block;
        margin-bottom: var(--space-4);
    }

    .error-page h1 {
        font-size: var(--text-2xl);
        margin: 0 0 var(--space-2);
        color: var(--fg-primary);
    }

    .error-page p {
        color: var(--fg-secondary);
        margin: 0 0 var(--space-6);
    }

    .error-details {
        background: var(--bg-tertiary);
        border-radius: var(--radius-md);
        padding: var(--space-3);
        margin-bottom: var(--space-4);
        text-align: left;
    }

    .error-details summary {
        cursor: pointer;
        font-size: var(--text-sm);
        color: var(--fg-secondary);
    }

    .error-details code {
        display: block;
        font-size: var(--text-xs);
        color: var(--fg-tertiary);
        word-break: break-word;
        margin-top: var(--space-2);
    }

    .error-details small {
        display: block;
        margin-top: var(--space-2);
        color: var(--fg-tertiary);
    }

    .error-actions {
        display: flex;
        gap: var(--space-3);
        justify-content: center;
    }

    .btn {
        padding: var(--space-2) var(--space-4);
        border-radius: var(--radius-md);
        font-size: var(--text-sm);
        cursor: pointer;
        border: none;
    }

    .btn-primary {
        background: var(--accent-primary);
        color: white;
    }

    .btn-secondary {
        background: var(--bg-tertiary);
        color: var(--fg-primary);
    }

    /* Inline error */
    .error-inline {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        padding: var(--space-3);
        background: color-mix(in srgb, var(--error-color, #e74c3c) 10%, var(--bg-secondary));
        border: 1px solid color-mix(in srgb, var(--error-color, #e74c3c) 30%, transparent);
        border-radius: var(--radius-md);
    }

    .error-inline .error-icon {
        font-size: 20px;
    }

    .error-text {
        flex: 1;
    }

    .error-text strong {
        display: block;
        font-size: var(--text-sm);
        color: var(--fg-primary);
    }

    .error-text p {
        font-size: var(--text-xs);
        color: var(--fg-secondary);
        margin: var(--space-1) 0 0;
    }

    .btn-retry {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg-tertiary);
        border: none;
        border-radius: var(--radius-full);
        font-size: 16px;
        cursor: pointer;
    }

    .btn-retry:hover {
        background: var(--bg-secondary);
    }
</style>


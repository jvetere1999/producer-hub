<!--
  KeyCaps Component

  Renders keyboard shortcuts as styled keycap pills.
  Handles:
  - Single key combos (⌘C)
  - Multi-key combos (Ctrl+Shift+Z)
  - OR alternatives (Shift+Tab OR F12)
  - Hold patterns (Hold Alt)

  @component
-->
<script lang="ts">
    import { parseKeys, keysToAriaLabel } from '$lib/keys/parse';

    /** The raw keys string to render */
    export let keys: string;

    /** Parsed key structure */
    $: parsed = parseKeys(keys);

    /** Aria label for accessibility */
    $: ariaLabel = keysToAriaLabel(parsed);
</script>

<div class="keycaps" role="group" aria-label={ariaLabel}>
    {#each parsed.combos as combo, comboIdx}
        {#if comboIdx > 0}
            <span class="or-separator">or</span>
        {/if}
        <span class="combo">
            {#each combo.tokens as token}
                <kbd
                    class="keycap {token.type}"
                    data-type={token.type}
                >
                    {token.label}
                </kbd>
            {/each}
        </span>
    {/each}
</div>

<style>
    .keycaps {
        display: inline-flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px;
    }

    .combo {
        display: inline-flex;
        align-items: center;
        gap: 2px;
    }

    .or-separator {
        font-size: 10px;
        color: var(--muted);
        padding: 0 4px;
        text-transform: uppercase;
        font-weight: 500;
    }

    .keycap {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 22px;
        height: 22px;
        padding: 0 6px;
        border-radius: 4px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 11px;
        font-weight: 500;
        line-height: 1;
        white-space: nowrap;
        background: var(--accent);
        border: 1px solid var(--border);
        color: var(--fg);
        box-shadow: 0 1px 0 var(--border);
    }

    .keycap.modifier {
        background: rgba(59, 130, 246, 0.12);
        border-color: rgba(59, 130, 246, 0.25);
        color: rgb(59, 130, 246);
    }

    .keycap.special {
        background: rgba(168, 85, 247, 0.12);
        border-color: rgba(168, 85, 247, 0.25);
        color: rgb(168, 85, 247);
    }

    .keycap.hold {
        background: rgba(245, 158, 11, 0.12);
        border-color: rgba(245, 158, 11, 0.25);
        color: rgb(245, 158, 11);
        font-style: italic;
    }

    /* Dark theme adjustments */
    :global(html[data-theme='dark']) .keycap.modifier {
        background: rgba(59, 130, 246, 0.2);
        color: rgb(96, 165, 250);
    }

    :global(html[data-theme='dark']) .keycap.special {
        background: rgba(168, 85, 247, 0.2);
        color: rgb(192, 132, 252);
    }

    :global(html[data-theme='dark']) .keycap.hold {
        background: rgba(245, 158, 11, 0.2);
        color: rgb(251, 191, 36);
    }
</style>


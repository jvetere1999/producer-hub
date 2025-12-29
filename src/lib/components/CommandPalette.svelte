<!--
  Command Palette Component

  Global command palette for keyboard-driven navigation and actions.
  Opens with Cmd/Ctrl+K, searchable list of commands.

  @component
-->
<script lang="ts">
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import {
		getAllCommands,
		searchCommands,
		executeCommand,
		setCommandPaletteCallback,
		type Command
	} from '$lib/hub';

	const dispatch = createEventDispatcher<{ close: void }>();

	export let open = false;

	let query = '';
	let results: Command[] = [];
	let selectedIndex = 0;
	let inputEl: HTMLInputElement;
	let dialogEl: HTMLDialogElement;

	$: if (open) {
		query = '';
		selectedIndex = 0;
		results = getAllCommands();
		setTimeout(() => inputEl?.focus(), 10);
	}

	$: {
		results = searchCommands(query);
		selectedIndex = Math.min(selectedIndex, Math.max(0, results.length - 1));
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = Math.max(selectedIndex - 1, 0);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			runSelected();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			close();
		}
	}

	async function runSelected() {
		const cmd = results[selectedIndex];
		if (cmd) {
			close();
			await executeCommand(cmd.id);
		}
	}

	function selectItem(index: number) {
		selectedIndex = index;
		runSelected();
	}

	function close() {
		open = false;
		dispatch('close');
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === dialogEl) {
			close();
		}
	}

	onMount(() => {
		setCommandPaletteCallback((shouldOpen) => {
			open = shouldOpen;
		});
	});

	onDestroy(() => {
		setCommandPaletteCallback(() => {});
	});

	// Group commands by category
	function groupByCategory(commands: Command[]): Map<string, Command[]> {
		const groups = new Map<string, Command[]>();
		for (const cmd of commands) {
			const cat = cmd.category || 'General';
			if (!groups.has(cat)) groups.set(cat, []);
			groups.get(cat)!.push(cmd);
		}
		return groups;
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<dialog
		bind:this={dialogEl}
		class="palette-backdrop"
		open
		onclick={handleBackdropClick}
		aria-modal="true"
		aria-label="Command palette"
	>
		<div class="palette">
			<div class="search-row">
				<svg class="search-icon" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
				</svg>
				<input
					bind:this={inputEl}
					bind:value={query}
					type="text"
					placeholder="Type a command..."
					class="search-input"
					onkeydown={handleKeydown}
					role="combobox"
					aria-autocomplete="list"
					aria-controls="command-list"
					aria-expanded="true"
					aria-activedescendant={results.length > 0 ? `cmd-${selectedIndex}` : undefined}
				/>
				<kbd class="kbd">Esc</kbd>
			</div>

			<div class="results" id="command-list" role="listbox">
				{#if results.length === 0}
					<div class="empty">No commands found</div>
				{:else}
					{#each results as cmd, i}
						{@const isSelected = i === selectedIndex}
						<button
							id="cmd-{i}"
							class="result-item"
							class:selected={isSelected}
							onclick={() => selectItem(i)}
							role="option"
							aria-selected={isSelected}
						>
							<div class="result-content">
								<span class="result-title">{cmd.title}</span>
								{#if cmd.description}
									<span class="result-desc">{cmd.description}</span>
								{/if}
							</div>
							{#if cmd.hotkey}
								<kbd class="kbd small">{cmd.hotkey}</kbd>
							{/if}
						</button>
					{/each}
				{/if}
			</div>

			<div class="footer">
				<span class="hint">
					<kbd class="kbd tiny">↑↓</kbd> navigate
					<kbd class="kbd tiny">↵</kbd> select
					<kbd class="kbd tiny">esc</kbd> close
				</span>
			</div>
		</div>
	</dialog>
{/if}

<style>
	.palette-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding-top: 15vh;
		border: none;
		width: 100%;
		height: 100%;
		z-index: 9999;
	}

	.palette {
		background: var(--card, #1a1a1c);
		border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
		border-radius: 12px;
		width: 100%;
		max-width: 560px;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
		overflow: hidden;
	}

	.search-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 16px;
		border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.1));
	}

	.search-icon {
		width: 20px;
		height: 20px;
		color: var(--muted, #888);
		flex-shrink: 0;
	}

	.search-input {
		flex: 1;
		background: transparent;
		border: none;
		outline: none;
		font-size: 16px;
		color: var(--fg, #fff);
	}

	.search-input::placeholder {
		color: var(--muted, #888);
	}

	.results {
		max-height: 320px;
		overflow-y: auto;
		padding: 8px;
	}

	.empty {
		padding: 24px;
		text-align: center;
		color: var(--muted, #888);
	}

	.result-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 10px 12px;
		background: transparent;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		text-align: left;
		color: var(--fg, #fff);
	}

	.result-item:hover,
	.result-item.selected {
		background: var(--accent, rgba(255, 255, 255, 0.08));
	}

	.result-content {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.result-title {
		font-size: 14px;
		font-weight: 500;
	}

	.result-desc {
		font-size: 12px;
		color: var(--muted, #888);
	}

	.kbd {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 4px 8px;
		background: var(--accent, rgba(255, 255, 255, 0.08));
		border-radius: 4px;
		font-size: 12px;
		font-family: inherit;
		color: var(--muted, #888);
		border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
	}

	.kbd.small {
		padding: 2px 6px;
		font-size: 11px;
	}

	.kbd.tiny {
		padding: 1px 4px;
		font-size: 10px;
	}

	.footer {
		padding: 10px 16px;
		border-top: 1px solid var(--border, rgba(255, 255, 255, 0.1));
		background: var(--accent, rgba(255, 255, 255, 0.02));
	}

	.hint {
		font-size: 11px;
		color: var(--muted, #888);
		display: flex;
		gap: 12px;
		align-items: center;
	}
</style>


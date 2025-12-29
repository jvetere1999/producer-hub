<!--
  Global Search Component

  Unified search across shortcuts, features, projects, references, and notes.
  Merges results from existing shortcut index and hub index.

  @component
-->
<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import {
		loadInbox,
		loadProjects,
		loadReferences,
		loadCollections,
		searchHub,
		parseHubResultId,
		type HubSearchResult,
		type SearchDocKind
	} from '$lib/hub';
	import { searchShortcutIds } from '$lib/search';
	import { allShortcuts } from '$lib/shortcuts';
	import type { ShortcutWithProduct } from '$lib/types';

	const dispatch = createEventDispatcher<{
		navigate: { tab: string; id?: string };
	}>();

	export let initialQuery = '';

	let query = initialQuery;
	let searchMode: 'all' | 'shortcuts' | 'hub' = 'all';
	let shortcutResults: ShortcutWithProduct[] = [];
	let hubResults: HubSearchResult[] = [];
	let isSearching = false;

	function performSearch() {
		if (!query.trim()) {
			shortcutResults = [];
			hubResults = [];
			return;
		}

		isSearching = true;

		// Search shortcuts
		if (searchMode === 'all' || searchMode === 'shortcuts') {
			const ids = searchShortcutIds(query, allShortcuts, { limit: 20, fuzzy: true });
			const idSet = new Set(ids);
			shortcutResults = allShortcuts.filter(s => idSet.has(s.id)).slice(0, 20);
		} else {
			shortcutResults = [];
		}

		// Search hub
		if (searchMode === 'all' || searchMode === 'hub') {
			const inbox = loadInbox();
			const projects = loadProjects();
			const references = loadReferences();
			const collections = loadCollections();
			hubResults = searchHub(query, inbox, projects, references, collections, { limit: 20 });
		} else {
			hubResults = [];
		}

		isSearching = false;
	}

	$: {
		void query;
		void searchMode;
		performSearch();
	}

	function getKindIcon(kind: SearchDocKind): string {
		switch (kind) {
			case 'project': return '◉';
			case 'inbox': return '⬇';
			case 'reference': return '◈';
			case 'collection': return '⊞';
			case 'infobaseNote': return '⊞';
			default: return '◦';
		}
	}

	function getKindLabel(kind: SearchDocKind): string {
		switch (kind) {
			case 'project': return 'Project';
			case 'inbox': return 'Inbox';
			case 'reference': return 'Reference';
			case 'collection': return 'Collection';
			case 'infobaseNote': return 'Note';
			default: return kind;
		}
	}

	function navigateToResult(result: HubSearchResult) {
		const { kind, id } = parseHubResultId(result.id);

		switch (kind) {
			case 'project':
				dispatch('navigate', { tab: 'projects', id });
				break;
			case 'inbox':
				dispatch('navigate', { tab: 'inbox', id });
				break;
			case 'reference':
				dispatch('navigate', { tab: 'references', id });
				break;
			case 'collection':
				dispatch('navigate', { tab: 'collections', id });
				break;
			case 'infobaseNote':
				dispatch('navigate', { tab: 'infobase', id });
				break;
		}
	}

	function navigateToShortcut(shortcut: ShortcutWithProduct) {
		dispatch('navigate', { tab: 'shortcuts', id: shortcut.id });
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && query.trim()) {
			performSearch();
		}
	}

	onMount(() => {
		if (initialQuery) {
			performSearch();
		}
	});
</script>

<div class="global-search">
	<div class="search-header">
		<h2>Search Everything</h2>
	</div>

	<div class="search-box">
		<div class="search-input-wrapper">
			<svg class="search-icon" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
			</svg>
			<input
				type="text"
				bind:value={query}
				placeholder="Search shortcuts, projects, references, notes..."
				class="search-input"
				onkeydown={handleKeydown}
			/>
		</div>

		<div class="mode-tabs">
			<button
				class="mode-tab"
				class:active={searchMode === 'all'}
				onclick={() => searchMode = 'all'}
			>All</button>
			<button
				class="mode-tab"
				class:active={searchMode === 'shortcuts'}
				onclick={() => searchMode = 'shortcuts'}
			>Shortcuts</button>
			<button
				class="mode-tab"
				class:active={searchMode === 'hub'}
				onclick={() => searchMode = 'hub'}
			>Projects & Notes</button>
		</div>
	</div>

	<div class="results">
		{#if !query.trim()}
			<div class="empty">Type to search across all your data</div>
		{:else if shortcutResults.length === 0 && hubResults.length === 0}
			<div class="empty">No results found for "{query}"</div>
		{:else}
			<!-- Hub Results -->
			{#if hubResults.length > 0}
				<div class="results-section">
					<h3>Projects & Notes</h3>
					<div class="results-list">
						{#each hubResults as result (result.id)}
							<button class="result-item" onclick={() => navigateToResult(result)}>
								<span class="result-icon">{getKindIcon(result.kind)}</span>
								<div class="result-content">
									<span class="result-title">{result.title}</span>
									<span class="result-kind">{getKindLabel(result.kind)}</span>
								</div>
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Shortcut Results -->
			{#if shortcutResults.length > 0}
				<div class="results-section">
					<h3>Shortcuts & Features</h3>
					<div class="results-list">
						{#each shortcutResults as shortcut (shortcut.id)}
							<button class="result-item" onclick={() => navigateToShortcut(shortcut)}>
								<span class="result-icon">⌨</span>
								<div class="result-content">
									<span class="result-title">{shortcut.command}</span>
									<span class="result-meta">
										{shortcut.productName}
										{#if shortcut.keys}
											<kbd class="key-hint">{shortcut.keys}</kbd>
										{/if}
									</span>
								</div>
							</button>
						{/each}
					</div>
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	.global-search {
		padding: 16px;
		max-width: 800px;
		margin: 0 auto;
		overflow: auto;
		height: 100%;
	}

	.search-header {
		margin-bottom: 16px;
	}

	.search-header h2 {
		margin: 0;
		font-size: 20px;
	}

	.search-box {
		margin-bottom: 24px;
	}

	.search-input-wrapper {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px;
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: 8px;
		margin-bottom: 12px;
	}

	.search-icon {
		width: 20px;
		height: 20px;
		color: var(--muted);
		flex-shrink: 0;
	}

	.search-input {
		flex: 1;
		background: transparent;
		border: none;
		outline: none;
		font-size: 16px;
		color: var(--fg);
	}

	.search-input::placeholder {
		color: var(--muted);
	}

	.mode-tabs {
		display: flex;
		gap: 4px;
	}

	.mode-tab {
		padding: 8px 16px;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 6px;
		color: var(--muted);
		font-size: 13px;
		cursor: pointer;
	}

	.mode-tab:hover {
		background: var(--accent);
	}

	.mode-tab.active {
		background: var(--accent);
		color: var(--fg);
		border-color: var(--fg);
	}

	.results-section {
		margin-bottom: 24px;
	}

	.results-section h3 {
		margin: 0 0 12px 0;
		font-size: 14px;
		font-weight: 600;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.results-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.result-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 14px;
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: 8px;
		cursor: pointer;
		text-align: left;
		color: var(--fg);
		width: 100%;
	}

	.result-item:hover {
		background: var(--accent);
	}

	.result-icon {
		font-size: 20px;
		flex-shrink: 0;
	}

	.result-content {
		flex: 1;
		min-width: 0;
	}

	.result-title {
		display: block;
		font-size: 14px;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.result-kind,
	.result-meta {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		color: var(--muted);
	}

	.key-hint {
		padding: 2px 6px;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 4px;
		font-family: monospace;
		font-size: 11px;
	}

	.empty {
		padding: 48px 24px;
		text-align: center;
		color: var(--muted);
		font-size: 14px;
	}
</style>

